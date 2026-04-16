import json
from openai import AsyncOpenAI
from app.config import get_settings
from app.models.scoring import (
    CandidateScore,
    DimensionScore,
    RedFlagAssessment,
    RedFlag,
)
from app.models.candidate import ExtractedProfile
from app.models.job import JobRequirements, ScoringRubric

settings = get_settings()
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def score_candidate(
    candidate_id: str,
    job_id: str,
    profile: ExtractedProfile,
    requirements: JobRequirements,
    rubric: ScoringRubric,
    job_description: str,
) -> CandidateScore:
    """Score a candidate using GPT-4o with multi-dimensional analysis."""

    system_prompt = f"""You are an expert HR recruiter and talent evaluator. Your task is to perform a deep, contextual evaluation of a candidate against specific job requirements.

CRITICAL RULES:
1. Use SEMANTIC understanding, not simple keyword matching
2. "Built recommendation engine for e-commerce" IS relevant for ML Engineer even without explicit "machine learning" mention
3. "3 years at startup" may be MORE valuable than "5 years at corporate" depending on the position
4. Consider transferable skills and adjacent experience
5. Be fair and objective - focus on capability indicators

SCORING RUBRIC WEIGHTS:
- Skill Match: {rubric.skill_weight}%
- Experience Relevance: {rubric.experience_weight}%
- Culture Fit: {rubric.culture_fit_weight}%
- Red Flags (inverted - lower is worse): {rubric.red_flags_weight}%

Return a JSON object with this EXACT structure:
{{
    "skill_match": {{
        "score": <0-100>,
        "reasoning": "Detailed explanation of skill alignment",
        "positives": ["specific positive point 1", "specific positive point 2"],
        "negatives": ["specific gap or weakness 1"]
    }},
    "experience_relevance": {{
        "score": <0-100>,
        "reasoning": "Detailed explanation of experience relevance",
        "positives": ["specific relevant experience 1"],
        "negatives": ["specific gap 1"]
    }},
    "culture_fit": {{
        "score": <0-100>,
        "reasoning": "Analysis of culture fit indicators from CV",
        "positives": ["positive culture indicator 1"],
        "negatives": ["potential concern 1"]
    }},
    "red_flags": {{
        "score": <0-100 where 100 means NO red flags>,
        "flags": [
            {{
                "flag_type": "job_hopping|employment_gap|inconsistency|overqualified|underqualified",
                "description": "Specific description",
                "severity": "high|medium|low"
            }}
        ],
        "reasoning": "Overall assessment of red flags"
    }},
    "recommendation": "strongly_recommended|recommended|maybe|not_recommended",
    "xai_summary": "A comprehensive 3-5 sentence explanation of why this candidate is or isn't recommended. Be specific with evidence from the CV. This should be clear enough for an HR manager to understand the reasoning."
}}

SCORING GUIDELINES:
- 90-100: Exceptional match, exceeds requirements
- 75-89: Strong match, meets most requirements
- 60-74: Moderate match, meets some requirements
- 40-59: Weak match, significant gaps
- 0-39: Poor match, does not meet requirements

RED FLAG TYPES:
- job_hopping: 3+ job changes in 2 years
- employment_gap: Unexplained gap > 6 months
- inconsistency: Conflicting information in CV
- overqualified: Significantly more experienced than needed
- underqualified: Significantly less experienced than needed"""

    candidate_info = f"""CANDIDATE PROFILE:
Name: {profile.name}
Summary: {profile.summary}

Skills: {', '.join(profile.skills)}

Work Experience:
{_format_experience(profile.work_experience)}

Education:
{_format_education(profile.education)}

Certifications: {', '.join(profile.certifications) if profile.certifications else 'None listed'}
Languages: {', '.join(profile.languages) if profile.languages else 'Not specified'}
Total Experience: {profile.total_experience_years or 'Not specified'} years"""

    job_info = f"""JOB REQUIREMENTS:
Title: {requirements.title}
Required Skills: {', '.join(requirements.required_skills)}
Preferred Skills: {', '.join(requirements.preferred_skills)}
Experience Required: {requirements.min_experience_years or 'Not specified'}-{requirements.max_experience_years or 'Not specified'} years
Education: {', '.join(requirements.education_requirements) if requirements.education_requirements else 'Not specified'}
Responsibilities: {'; '.join(requirements.responsibilities[:10])}
Culture Keywords: {', '.join(requirements.culture_keywords) if requirements.culture_keywords else 'Not specified'}

FULL JOB DESCRIPTION:
{job_description[:3000]}"""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Evaluate this candidate:\n\n{candidate_info}\n\n---\n\nAgainst this job:\n\n{job_info}",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )

        result = json.loads(response.choices[0].message.content)

        # Parse red flags
        red_flag_list = []
        for rf in result.get("red_flags", {}).get("flags", []):
            red_flag_list.append(RedFlag(**rf))

        # Build dimension scores
        skill_match = DimensionScore(**result.get("skill_match", {}))
        experience_relevance = DimensionScore(**result.get("experience_relevance", {}))
        culture_fit = DimensionScore(**result.get("culture_fit", {}))
        red_flags = RedFlagAssessment(
            score=result.get("red_flags", {}).get("score", 100),
            flags=red_flag_list,
            reasoning=result.get("red_flags", {}).get("reasoning", ""),
        )

        # Calculate weighted overall score
        overall_score = (
            skill_match.score * (rubric.skill_weight / 100)
            + experience_relevance.score * (rubric.experience_weight / 100)
            + culture_fit.score * (rubric.culture_fit_weight / 100)
            + red_flags.score * (rubric.red_flags_weight / 100)
        )

        return CandidateScore(
            candidate_id=candidate_id,
            job_id=job_id,
            overall_score=round(overall_score, 1),
            skill_match=skill_match,
            experience_relevance=experience_relevance,
            culture_fit=culture_fit,
            red_flags=red_flags,
            recommendation=result.get("recommendation", "not_evaluated"),
            xai_summary=result.get("xai_summary", ""),
        )

    except Exception as e:
        print(f"Error scoring candidate {candidate_id}: {e}")
        return CandidateScore(
            candidate_id=candidate_id,
            job_id=job_id,
            overall_score=0,
            recommendation="not_evaluated",
            xai_summary=f"Scoring failed: {str(e)[:200]}",
        )


def _format_experience(experiences) -> str:
    """Format work experience list for prompt."""
    if not experiences:
        return "No work experience listed"
    parts = []
    for exp in experiences:
        duration = f"{exp.duration_months} months" if exp.duration_months else "unknown duration"
        techs = f" | Tech: {', '.join(exp.technologies)}" if exp.technologies else ""
        parts.append(
            f"- {exp.title} at {exp.company} ({exp.start_date or '?'} - {exp.end_date or '?'}, ~{duration})\n  {exp.description}{techs}"
        )
    return "\n".join(parts)


def _format_education(education_list) -> str:
    """Format education list for prompt."""
    if not education_list:
        return "No education listed"
    parts = []
    for edu in education_list:
        gpa = f" | GPA: {edu.gpa}" if edu.gpa else ""
        parts.append(f"- {edu.degree} in {edu.field_of_study} from {edu.institution} ({edu.year or '?'}){gpa}")
    return "\n".join(parts)
