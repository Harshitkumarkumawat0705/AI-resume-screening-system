import pdfplumber
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def calculate_match_and_gaps(resume_text, job_description, required_skills, candidate_skills):
    """
    An optimized, industry-standard resume evaluation engine.
    Combines hard technical skill keyword intersections with broad 
    contextual TF-IDF matching.
    """
    # 1. Setup TF-IDF Vectorizer with Stop Words for Full Text Context Match
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_text = vectorizer.fit_transform([resume_text, job_description])
    text_sim = cosine_similarity(tfidf_text[0:1], tfidf_text[1:2])[0][0]
    
    # 2. Clean and Set-ize skills for precise mathematical operations
    # This completely bypasses the punctuation stripping errors of TF-IDF
    job_skills_set = set([skill.lower().strip() for skill in required_skills])
    candidate_skills_set = set([skill.lower().strip() for skill in candidate_skills])
    
    # Calculate Intersections and Gaps
    matched_skills = job_skills_set.intersection(candidate_skills_set)
    missing_skills = list(job_skills_set - candidate_skills_set)
    
    # 3. Calculate an explicit Hard Skills Score
    if len(job_skills_set) > 0:
        skills_score = len(matched_skills) / len(job_skills_set)
    else:
        skills_score = 0.0
        
    # 4. Hybrid Scoring Formula
    # 50% weight on owning the right skills, 50% on context density alignment
    hybrid_score = (skills_score * 0.85) + (text_sim * 0.15)
    final_match_score = round(float(hybrid_score) * 100, 2)
    
    return {
        "match_score": final_match_score,
        "missing_skills": missing_skills,
        "debug_text_score": round(text_sim * 100, 2),
        "debug_hard_skills_score": round(skills_score * 100, 2)
    }

def parse_resume_details(raw_text, required_skills=None):
    text_lower = raw_text.lower()
    email_pattern = r'[\w\.-]+@[\w\.-]+\w+'
    email_match = re.search(email_pattern, raw_text)
    email = email_match.group(0) if email_match else "Not Found"

    phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}'
    phone_match = re.search(phone_pattern, raw_text)
    phone = phone_match.group(0) if phone_match else "Not Found"

    if required_skills:
        skills_bank = set([s.strip().lower() for s in required_skills])
    else:
        skills_bank = {
            "python", "c++", "c", "numpy", "pandas", "matplotlib", 
            "machine learning", "manual testing", "functional testing", 
            "ui testing", "sql", "fastapi", "react"
        }
    found_skills = []
    for skill in skills_bank:
        if skill in text_lower:
            found_skills.append(skill)
    return {
        "email": email,
        "phone": phone,
        "skills": found_skills
    }

def extract_text_from_pdf(pdf_path):
    compiled_text = ""
    
    with pdfplumber.open(pdf_path) as pdf:
        for page_number, page in enumerate(pdf.pages, start=1):
            page_text = page.extract_text()
            
            if page_text:
                lines = page_text.split('\n')
                cleaned_page_lines = []
                
                for line in lines:
                    cleaned_line = line.strip()
                    if cleaned_line:
                        cleaned_page_lines.append(cleaned_line)
                
                compiled_text += "\n".join(cleaned_page_lines) + "\n"
                print(f"Successfully extracted and cleaned Page {page_number}")
            else:
                print(f"Warning: Page {page_number} appears to be blank.")
                
    return compiled_text
