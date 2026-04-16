from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from typing import Optional
from datetime import datetime
from bson import ObjectId
from app.database import jobs_collection, candidates_collection, scoring_results_collection
from app.services.auth_service import get_current_user
from app.services.parser_service import parse_pdf_to_markdown, extract_job_requirements
from app.services.bias_service import detect_bias
from app.models.job import JobCreate, JobResponse, ScoringRubric

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    title: str = Form(...),
    description_text: Optional[str] = Form(None),
    jd_file: Optional[UploadFile] = File(None),
    skill_weight: float = Form(35.0),
    experience_weight: float = Form(30.0),
    culture_fit_weight: float = Form(20.0),
    red_flags_weight: float = Form(15.0),
    current_user: dict = Depends(get_current_user),
):
    """Create a new job with JD (text or PDF upload)."""
    # Get JD text from file or form
    jd_text = description_text or ""
    if jd_file and jd_file.filename.endswith(".pdf"):
        file_bytes = await jd_file.read()
        jd_text = await parse_pdf_to_markdown(file_bytes, jd_file.filename)
    elif not jd_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide job description text or upload a PDF file",
        )

    # Extract structured requirements
    requirements = await extract_job_requirements(jd_text)

    # Detect bias
    bias_report = await detect_bias(jd_text)

    rubric = ScoringRubric(
        skill_weight=skill_weight,
        experience_weight=experience_weight,
        culture_fit_weight=culture_fit_weight,
        red_flags_weight=red_flags_weight,
    )

    if not rubric.validate_total():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scoring weights must sum to 100%",
        )

    job_doc = {
        "user_id": str(current_user["_id"]),
        "title": title,
        "description_text": jd_text,
        "requirements": requirements.model_dump(),
        "rubric": rubric.model_dump(),
        "bias_report": bias_report.model_dump(),
        "candidate_count": 0,
        "screening_status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": None,
    }

    result = await jobs_collection.insert_one(job_doc)

    return JobResponse(
        id=str(result.inserted_id),
        **{k: v for k, v in job_doc.items() if k != "_id"},
    )


@router.get("", response_model=list[JobResponse])
async def list_jobs(current_user: dict = Depends(get_current_user)):
    """List all jobs for the current user."""
    cursor = jobs_collection.find({"user_id": str(current_user["_id"])}).sort("created_at", -1)
    jobs = []
    async for job in cursor:
        job["id"] = str(job.pop("_id"))
        jobs.append(JobResponse(**job))
    return jobs


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Get job detail with bias report."""
    job = await jobs_collection.find_one({
        "_id": ObjectId(job_id),
        "user_id": str(current_user["_id"]),
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job["id"] = str(job.pop("_id"))
    return JobResponse(**job)


@router.put("/{job_id}/rubric", response_model=JobResponse)
async def update_rubric(
    job_id: str,
    rubric: ScoringRubric,
    current_user: dict = Depends(get_current_user),
):
    """Update scoring rubric weights for a job."""
    if not rubric.validate_total():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Scoring weights must sum to 100%",
        )

    result = await jobs_collection.find_one_and_update(
        {"_id": ObjectId(job_id), "user_id": str(current_user["_id"])},
        {"$set": {"rubric": rubric.model_dump(), "updated_at": datetime.utcnow()}},
        return_document=True,
    )

    if not result:
        raise HTTPException(status_code=404, detail="Job not found")

    result["id"] = str(result.pop("_id"))
    return JobResponse(**result)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a job and all associated data."""
    result = await jobs_collection.delete_one({
        "_id": ObjectId(job_id),
        "user_id": str(current_user["_id"]),
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")

    # Cleanup associated data
    await candidates_collection.delete_many({"job_id": job_id})
    await scoring_results_collection.delete_many({"job_id": job_id})
