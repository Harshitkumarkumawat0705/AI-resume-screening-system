from contextlib import asynccontextmanager
import os
import shutil
from typing import List
import uuid

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.database import init_db, get_session
from app.models import User, Job, Application
from app.auth import hash_password, verify_password, create_access_token, get_current_user, CurrentUser
from app.pipeline.engine import extract_text_from_pdf, parse_resume_details, calculate_match_and_gaps

# Configuration for file storage
UPLOAD_DIR = "storage"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Request schemas for authentication and job endpoints
class RegisterRequest(BaseModel):
    email: str = Field(..., description="The user's email address")
    password: str = Field(..., description="The user's password")
    role: str = Field(..., description="The user's role: 'candidate' or 'hr'")

class LoginRequest(BaseModel):
    email: str = Field(..., description="The user's email address")
    password: str = Field(..., description="The user's password")

class JobCreate(BaseModel):
    title: str = Field(..., description="The job title")
    description: str = Field(..., description="The job description")
    required_skills: List[str] = Field(..., description="List of required skills")

# Lifespan context manager for database initialization
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on application startup
    init_db()
    yield

# Initialize FastAPI application
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Resume RMS Backend",
    description="FastAPI Backend for Resume RMS with SQLModel and JWT Authentication",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://[::1]:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://[::1]:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://[::1]:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, session: Session = Depends(get_session)):
    """
    Register a new user (candidate or HR).
    Verifies that the role is valid and that the email is not already registered.
    """
    # Validate the role
    if request.role not in ("candidate", "hr"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be either 'candidate' or 'hr'"
        )

    # Check if user already exists
    statement = select(User).where(User.email == request.email)
    existing_user = session.exec(statement).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash the password and save the new user
    hashed = hash_password(request.password)
    new_user = User(
        email=request.email,
        password_hash=hashed,
        role=request.role
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role
    }

@app.post("/api/auth/login")
def login(request: LoginRequest, session: Session = Depends(get_session)):
    """
    Authenticate a user and generate a JWT access token.
    Raises an HTTP 401 Unauthorized exception if verification fails.
    """
    # Fetch user by email
    statement = select(User).where(User.email == request.email)
    user = session.exec(statement).first()

    # Verify user existence and password hash
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate access token
    token_data = {"id": user.id, "role": user.role}
    access_token = create_access_token(data=token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.post("/api/jobs", status_code=status.HTTP_201_CREATED)
def create_job(
    request: JobCreate,
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a new job posting.
    Accessible only to users with the 'hr' role.
    """
    if current_user.role != "hr":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR users can create jobs"
        )
    
    # Process required_skills list into a clean comma-separated string
    skills_list = [skill.strip() for skill in request.required_skills if skill.strip()]
    skills_str = ",".join(skills_list)

    new_job = Job(
        title=request.title,
        description=request.description,
        required_skills=skills_str,
        owner_id=current_user.id
    )
    session.add(new_job)
    session.commit()
    session.refresh(new_job)

    return new_job

@app.get("/api/jobs")
def list_jobs(
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Fetch and return a list of job postings.
    If the current user's role is 'hr', filter by their user ID.
    Candidates can view all jobs.
    """
    statement = select(Job)
    if current_user.role == "hr":
        statement = statement.where(Job.owner_id == current_user.id)
    jobs = session.exec(statement).all()
    return jobs

@app.post("/api/jobs/{job_id}/preview-match")
def preview_match(
    job_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Candidate sandbox route to preview match score and skill gaps without saving to the database.
    """
    if current_user.get("role") != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can preview job matches"
        )

    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    # Save uploaded file to temp path
    file_ext = os.path.splitext(file.filename)[1]
    temp_filename = f"preview_{uuid.uuid4()}{file_ext}"
    temp_file_path = os.path.join(UPLOAD_DIR, temp_filename)

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run pipeline
        resume_text = extract_text_from_pdf(temp_file_path)
        parsed_details = parse_resume_details(resume_text)
        required_skills_list = [s.strip() for s in job.required_skills.split(",") if s.strip()] if job.required_skills else []

        ml_results = calculate_match_and_gaps(
            resume_text=resume_text,
            job_description=job.description,
            required_skills=required_skills_list,
            candidate_skills=parsed_details["skills"]
        )

        return {
            "match_score": ml_results["match_score"],
            "missing_skills": ml_results["missing_skills"],
            "extracted_skills": parsed_details["skills"]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing the resume: {str(e)}"
        )
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.post("/api/jobs/{job_id}/apply")
def apply(
    job_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Apply for a job with a resume PDF.
    Extracts candidate skills, calculates match metrics, and persists the application record.
    """
    if current_user.get("role") != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidates can apply to jobs"
        )

    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    # Save uploaded file
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"resume_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    success = False
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run pipeline
        resume_text = extract_text_from_pdf(file_path)
        parsed_details = parse_resume_details(resume_text)
        required_skills_list = [s.strip() for s in job.required_skills.split(",") if s.strip()] if job.required_skills else []

        ml_results = calculate_match_and_gaps(
            resume_text=resume_text,
            job_description=job.description,
            required_skills=required_skills_list,
            candidate_skills=parsed_details["skills"]
        )

        missing_skills_str = ",".join(ml_results["missing_skills"])

        # Create and save Application record
        new_application = Application(
            job_id=job.id,
            candidate_id=current_user.get("id"),
            match_score=ml_results["match_score"],
            missing_skills=missing_skills_str,
            status="Applied",
            resume_path=filename
        )
        session.add(new_application)
        session.commit()
        session.refresh(new_application)
        success = True
        return new_application
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing the application: {str(e)}"
        )
    finally:
        if not success and os.path.exists(file_path):
            os.remove(file_path)

@app.get("/api/jobs/{job_id}/applicants")
def get_applicants_for_job(
    job_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Fetch all application records for a specific job, joined with candidate email.
    Accessible only to users with the 'hr' role who own the job posting.
    """
    if current_user.role != "hr":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HR users can view applicants"
        )
    
    # Check if job exists
    job = session.get(Job, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )

    # Verify that the current HR user owns this job posting
    if job.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this job's applicants"
        )
    
    # Query applications and join with User to get candidate email, sorted by match_score descending
    statement = (
        select(Application, User.email)
        .join(User, Application.candidate_id == User.id)
        .where(Application.job_id == job_id)
        .order_by(Application.match_score.desc())
    )
    
    results = session.exec(statement).all()
    
    applicants_list = []
    for app_record, email in results:
        applicants_list.append({
            "id": app_record.id,
            "job_id": app_record.job_id,
            "candidate_id": app_record.candidate_id,
            "candidate_email": email,
            "match_score": app_record.match_score,
            "missing_skills": app_record.missing_skills,
            "status": app_record.status,
            "resume_path": app_record.resume_path
        })
        
    return applicants_list

@app.get("/api/applications/{application_id}/resume")
def download_resume(
    application_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Download the resume PDF for a specific application.
    Accessible only to the candidate who owns the application, or the HR user who owns the associated job posting.
    """
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found"
        )
        
    # Check permissions: HR or Candidate themselves
    if current_user.role != "hr" and current_user.id != application.candidate_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied"
        )

    # For HR, verify that they own the job posting associated with this application
    if current_user.role == "hr":
        job = session.get(Job, application.job_id)
        if not job or job.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this resume"
            )
        
    if not application.resume_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found for this application"
        )
        
    file_path = os.path.join(UPLOAD_DIR, application.resume_path)
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume file not found on server"
        )
        
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=f"resume_{application_id}.pdf"
    )
