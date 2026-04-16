from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class WorkExperience(BaseModel):
    """Extracted work experience from CV."""
    company: str = ""
    title: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration_months: Optional[int] = None
    description: str = ""
    technologies: list[str] = []


class Education(BaseModel):
    """Extracted education from CV."""
    institution: str = ""
    degree: str = ""
    field_of_study: str = ""
    year: Optional[str] = None
    gpa: Optional[str] = None


class ExtractedProfile(BaseModel):
    """Structured profile extracted from CV by AI."""
    name: str = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    summary: str = ""
    skills: list[str] = []
    work_experience: list[WorkExperience] = []
    education: list[Education] = []
    certifications: list[str] = []
    languages: list[str] = []
    total_experience_years: Optional[float] = None


class CandidateCreate(BaseModel):
    """Internal model for creating a candidate entry."""
    job_id: str
    filename: str
    raw_text: str = ""
    profile: Optional[ExtractedProfile] = None
    status: str = "uploaded"  # uploaded, parsed, scored, error
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CandidateResponse(BaseModel):
    """Response model for candidate."""
    id: str
    job_id: str
    filename: str
    profile: Optional[ExtractedProfile] = None
    status: str
    created_at: datetime
