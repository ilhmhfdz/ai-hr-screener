import pymupdf4llm
import pymupdf
import tempfile
import os
import json
from openai import AsyncOpenAI
from app.config import get_settings
from app.models.candidate import ExtractedProfile
from app.models.job import JobRequirements

settings = get_settings()
openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def parse_pdf_to_markdown(file_bytes: bytes, filename: str) -> str:
    """Convert PDF bytes to Markdown text using PyMuPDF."""
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        md_text = pymupdf4llm.to_markdown(tmp_path)
        return md_text
    except Exception as e:
        # Fallback: try basic text extraction
        try:
            doc = pymupdf.open(tmp_path)
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            return text
        except Exception:
            raise ValueError(f"Failed to parse PDF '{filename}': {str(e)}")
    finally:
        os.unlink(tmp_path)


async def extract_candidate_profile(text: str) -> ExtractedProfile:
    """Use GPT-4o to extract structured profile from CV text."""
    system_prompt = """You are an expert HR document parser. Extract structured information from the given CV/resume text.
    
Return a JSON object with these exact fields:
{
    "name": "Full name of the candidate",
    "email": "Email address if found, null otherwise",
    "phone": "Phone number if found, null otherwise",
    "location": "Location/city if found, null otherwise",
    "linkedin": "LinkedIn URL if found, null otherwise",
    "summary": "Brief professional summary (2-3 sentences)",
    "skills": ["skill1", "skill2", ...],
    "work_experience": [
        {
            "company": "Company name",
            "title": "Job title",
            "start_date": "Start date as string",
            "end_date": "End date or 'Present'",
            "duration_months": estimated_months_as_number,
            "description": "Brief description of role and achievements",
            "technologies": ["tech1", "tech2"]
        }
    ],
    "education": [
        {
            "institution": "University/school name",
            "degree": "Degree type (S1/S2/Bachelor/Master etc)",
            "field_of_study": "Major/field",
            "year": "Graduation year",
            "gpa": "GPA if mentioned, null otherwise"
        }
    ],
    "certifications": ["cert1", "cert2"],
    "languages": ["language1", "language2"],
    "total_experience_years": estimated_total_years_as_number
}

IMPORTANT: 
- Extract ALL skills mentioned, including soft skills and tools
- For work experience, estimate duration if exact dates aren't given
- Be thorough but accurate - don't invent information not in the text
- If a field is not found in the CV, use null or empty array as appropriate"""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract profile from this CV:\n\n{text[:8000]}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        result = json.loads(response.choices[0].message.content)
        return ExtractedProfile(**result)
    except Exception as e:
        print(f"Error extracting profile: {e}")
        return ExtractedProfile(name="Unknown", summary=f"Failed to parse: {str(e)[:100]}")


async def extract_job_requirements(text: str) -> JobRequirements:
    """Use GPT-4o to extract structured requirements from job description."""
    system_prompt = """You are an expert HR document parser. Extract structured job requirements from the given job description.

Return a JSON object with these exact fields:
{
    "title": "Job title",
    "department": "Department if mentioned, null otherwise",
    "required_skills": ["skill1", "skill2", ...],
    "preferred_skills": ["skill1", "skill2", ...],
    "min_experience_years": minimum_years_as_number_or_null,
    "max_experience_years": maximum_years_as_number_or_null,
    "education_requirements": ["requirement1", ...],
    "responsibilities": ["responsibility1", ...],
    "culture_keywords": ["keyword1", ...],
    "location": "Location if mentioned, null otherwise",
    "employment_type": "Full-time/Part-time/Contract etc, null if not mentioned"
}

IMPORTANT:
- Distinguish between REQUIRED and PREFERRED skills
- Extract culture-related keywords (teamwork, fast-paced, innovative, etc.)
- Be thorough in listing all responsibilities
- Parse years of experience requirements carefully"""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Extract requirements from this job description:\n\n{text[:6000]}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        result = json.loads(response.choices[0].message.content)
        return JobRequirements(**result)
    except Exception as e:
        print(f"Error extracting job requirements: {e}")
        return JobRequirements(title="Unknown")
