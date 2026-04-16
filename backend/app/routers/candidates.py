from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from datetime import datetime
from bson import ObjectId
from app.database import candidates_collection, jobs_collection
from app.services.auth_service import get_current_user
from app.services.parser_service import parse_pdf_to_markdown, extract_candidate_profile
from app.models.candidate import CandidateResponse
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api", tags=["Candidates"])


@router.post("/jobs/{job_id}/candidates", response_model=list[CandidateResponse])
async def upload_candidates(
    job_id: str,
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Batch upload CVs for a job (max 25 per batch)."""
    # Verify job ownership
    job = await jobs_collection.find_one({
        "_id": ObjectId(job_id),
        "user_id": str(current_user["_id"]),
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Enforce batch limit
    if len(files) > settings.MAX_CVS_PER_BATCH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.MAX_CVS_PER_BATCH} CVs per batch. You uploaded {len(files)}.",
        )

    # Validate all files are PDFs
    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only PDF files are accepted. '{f.filename}' is not a PDF.",
            )

    results = []
    for file in files:
        try:
            # Read and parse PDF
            file_bytes = await file.read()
            raw_text = await parse_pdf_to_markdown(file_bytes, file.filename)

            # Extract structured profile using AI
            profile = await extract_candidate_profile(raw_text)

            candidate_doc = {
                "job_id": job_id,
                "filename": file.filename,
                "raw_text": raw_text[:10000],  # Store first 10k chars
                "profile": profile.model_dump(),
                "status": "parsed",
                "created_at": datetime.utcnow(),
            }

            insert_result = await candidates_collection.insert_one(candidate_doc)

            results.append(CandidateResponse(
                id=str(insert_result.inserted_id),
                job_id=job_id,
                filename=file.filename,
                profile=profile,
                status="parsed",
                created_at=candidate_doc["created_at"],
            ))

        except Exception as e:
            # Still save candidate but mark as error
            error_doc = {
                "job_id": job_id,
                "filename": file.filename,
                "raw_text": "",
                "profile": None,
                "status": "error",
                "error_message": str(e)[:500],
                "created_at": datetime.utcnow(),
            }
            insert_result = await candidates_collection.insert_one(error_doc)
            results.append(CandidateResponse(
                id=str(insert_result.inserted_id),
                job_id=job_id,
                filename=file.filename,
                profile=None,
                status="error",
                created_at=error_doc["created_at"],
            ))

    # Update candidate count on job
    total_count = await candidates_collection.count_documents({"job_id": job_id})
    await jobs_collection.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"candidate_count": total_count, "updated_at": datetime.utcnow()}},
    )

    return results


@router.get("/jobs/{job_id}/candidates", response_model=list[CandidateResponse])
async def list_candidates(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """List all candidates for a job."""
    # Verify job ownership
    job = await jobs_collection.find_one({
        "_id": ObjectId(job_id),
        "user_id": str(current_user["_id"]),
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    cursor = candidates_collection.find({"job_id": job_id}).sort("created_at", -1)
    candidates = []
    async for c in cursor:
        c["id"] = str(c.pop("_id"))
        candidates.append(CandidateResponse(**c))
    return candidates


@router.get("/candidates/{candidate_id}", response_model=CandidateResponse)
async def get_candidate(
    candidate_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get candidate detail with extracted profile."""
    candidate = await candidates_collection.find_one({"_id": ObjectId(candidate_id)})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Verify job ownership
    job = await jobs_collection.find_one({
        "_id": ObjectId(candidate["job_id"]),
        "user_id": str(current_user["_id"]),
    })
    if not job:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate["id"] = str(candidate.pop("_id"))
    return CandidateResponse(**candidate)


@router.delete("/candidates/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    candidate_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a candidate."""
    candidate = await candidates_collection.find_one({"_id": ObjectId(candidate_id)})
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Verify job ownership
    job = await jobs_collection.find_one({
        "_id": ObjectId(candidate["job_id"]),
        "user_id": str(current_user["_id"]),
    })
    if not job:
        raise HTTPException(status_code=404, detail="Candidate not found")

    await candidates_collection.delete_one({"_id": ObjectId(candidate_id)})

    # Update count
    total_count = await candidates_collection.count_documents({"job_id": candidate["job_id"]})
    await jobs_collection.update_one(
        {"_id": ObjectId(candidate["job_id"])},
        {"$set": {"candidate_count": total_count}},
    )
