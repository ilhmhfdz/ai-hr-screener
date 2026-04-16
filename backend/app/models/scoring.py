from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class DimensionScore(BaseModel):
    """Score for a single dimension with detailed reasoning."""
    score: float = Field(default=0, ge=0, le=100)
    reasoning: str = ""
    positives: list[str] = []
    negatives: list[str] = []


class RedFlag(BaseModel):
    """A detected red flag in candidate's CV."""
    flag_type: str  # job_hopping, employment_gap, inconsistency, overqualified, underqualified
    description: str
    severity: str  # high, medium, low


class RedFlagAssessment(BaseModel):
    """Red flag assessment for a candidate."""
    score: float = Field(default=100, ge=0, le=100)  # 100 = no red flags
    flags: list[RedFlag] = []
    reasoning: str = ""


class CandidateScore(BaseModel):
    """Complete scoring result for a candidate."""
    candidate_id: str
    job_id: str
    overall_score: float = Field(default=0, ge=0, le=100)
    skill_match: DimensionScore = Field(default_factory=DimensionScore)
    experience_relevance: DimensionScore = Field(default_factory=DimensionScore)
    culture_fit: DimensionScore = Field(default_factory=DimensionScore)
    red_flags: RedFlagAssessment = Field(default_factory=RedFlagAssessment)
    recommendation: str = "not_evaluated"  # strongly_recommended, recommended, maybe, not_recommended
    xai_summary: str = ""
    scored_at: datetime = Field(default_factory=datetime.utcnow)


class ScoringResultResponse(BaseModel):
    """Response model for scoring results with candidate info."""
    id: str
    candidate_id: str
    candidate_name: str
    candidate_filename: str
    job_id: str
    overall_score: float
    skill_match: DimensionScore
    experience_relevance: DimensionScore
    culture_fit: DimensionScore
    red_flags: RedFlagAssessment
    recommendation: str
    xai_summary: str
    rank: Optional[int] = None
    scored_at: datetime


class ScreeningResponse(BaseModel):
    """Response model for screening session results."""
    job_id: str
    job_title: str
    total_candidates: int
    scored_candidates: int
    status: str
    results: list[ScoringResultResponse] = []
