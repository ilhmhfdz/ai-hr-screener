from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ScoringRubric(BaseModel):
    """Custom scoring rubric with adjustable weights."""
    skill_weight: float = Field(default=35.0, ge=0, le=100)
    experience_weight: float = Field(default=30.0, ge=0, le=100)
    culture_fit_weight: float = Field(default=20.0, ge=0, le=100)
    red_flags_weight: float = Field(default=15.0, ge=0, le=100)

    def validate_total(self) -> bool:
        total = (
            self.skill_weight
            + self.experience_weight
            + self.culture_fit_weight
            + self.red_flags_weight
        )
        return abs(total - 100.0) < 0.01


class JobRequirements(BaseModel):
    """Structured job requirements extracted from JD."""
    title: str = ""
    department: Optional[str] = None
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    min_experience_years: Optional[float] = None
    max_experience_years: Optional[float] = None
    education_requirements: list[str] = []
    responsibilities: list[str] = []
    culture_keywords: list[str] = []
    location: Optional[str] = None
    employment_type: Optional[str] = None


class BiasFlag(BaseModel):
    """A detected bias in job description."""
    phrase: str
    bias_type: str  # gender, age, exclusionary, unnecessary
    severity: str  # high, medium, low
    explanation: str
    suggested_alternative: str


class BiasReport(BaseModel):
    """Bias detection report for a job description."""
    has_bias: bool = False
    overall_score: float = 100.0  # 100 = no bias, 0 = very biased
    flags: list[BiasFlag] = []
    summary: str = ""


class JobCreate(BaseModel):
    """Schema for creating a job."""
    title: str = Field(..., min_length=2, max_length=200)
    description_text: Optional[str] = None
    rubric: ScoringRubric = Field(default_factory=ScoringRubric)


class JobResponse(BaseModel):
    """Response model for job."""
    id: str
    user_id: str
    title: str
    description_text: str
    requirements: Optional[JobRequirements] = None
    rubric: ScoringRubric
    bias_report: Optional[BiasReport] = None
    candidate_count: int = 0
    screening_status: str = "pending"  # pending, processing, completed
    created_at: datetime
    updated_at: Optional[datetime] = None
