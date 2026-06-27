from typing import Optional
from sqlmodel import Field, SQLModel

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    password_hash: str
    role: str  # Will accept 'candidate' or 'hr'

class Job(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    required_skills: str  # Stored as a comma-separated string or JSON string for simplicity
    owner_id: Optional[int] = Field(default=None, foreign_key="user.id")

class Application(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="job.id")
    candidate_id: int = Field(foreign_key="user.id")
    match_score: float
    missing_skills: str  # Stored as a comma-separated string
    status: str = Field(default="Applied")  # Default status string
    resume_path: Optional[str] = Field(default=None)
