from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from bson import ObjectId
from app.database import (
    jobs_collection,
    candidates_collection,
    scoring_results_collection,
)
from app.services.auth_service import get_current_user
from app.services.scoring_service import score_candidate
from app.models.scoring import ScoringResultResponse, ScreeningResponse
from app.models.candidate import ExtractedProfile
from app.models.job import ScoringRubric, JobRequirements

router = APIRouter(prefix="/api/jobs", tags=["Screening"])


@router.post("/{job_id}/screen", response_model=ScreeningResponse)
async def trigger_screening(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Trigger AI screening for all parsed candidates in a job."""
    # Get job
    job = await jobs_collection.find_one({
        "_id": ObjectId(job_id),
        "user_id": str(current_user["_id"]),
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get all parsed candidates
    candidates = []
    cursor = candidates_collection.find({"job_id": job_id, "status": "parsed"})
    async for c in cursor:
        candidates.append(c)

    if not candidates:
        raise HTTPException(
            status_code=400,
            detail="No parsed candidates found. Upload CVs first.",
        )

    # Update job status
    await jobs_collection.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"screening_status": "processing", "updated_at": datetime.utcnow()}},
    )

    # Build requirements and rubric
    requirements = JobRequirements(**job.get("requirements", {}))
    rubric = ScoringRubric(**job.get("rubric", {}))

    # Score each candidate
    results = []
    for candidate in candidates:
        profile = ExtractedProfile(**candidate.get("profile", {}))
        candidate_id = str(candidate["_id"])

        # Score the candidate
        score_result = await score_candidate(
            candidate_id=candidate_id,
            job_id=job_id,
            profile=profile,
            requirements=requirements,
            rubric=rubric,
            job_description=job.get("description_text", ""),
        )

        # Upsert scoring result
        score_doc = score_result.model_dump()
        await scoring_results_collection.update_one(
            {"candidate_id": candidate_id, "job_id": job_id},
            {"$set": score_doc},
            upsert=True,
        )

        # Update candidate status
        await candidates_collection.update_one(
            {"_id": candidate["_id"]},
            {"$set": {"status": "scored"}},
        )

        results.append({
            **score_doc,
            "candidate_name": profile.name,
            "candidate_filename": candidate["filename"],
        })

    # Sort by overall score descending
    results.sort(key=lambda x: x["overall_score"], reverse=True)

    # Add ranks
    response_results = []
    for i, r in enumerate(results, 1):
        # Find the scoring result id
        score_rec = await scoring_results_collection.find_one({
            "candidate_id": r["candidate_id"],
            "job_id": job_id,
        })

        response_results.append(ScoringResultResponse(
            id=str(score_rec["_id"]) if score_rec else "",
            candidate_id=r["candidate_id"],
            candidate_name=r["candidate_name"],
            candidate_filename=r["candidate_filename"],
            job_id=job_id,
            overall_score=r["overall_score"],
            skill_match=r["skill_match"],
            experience_relevance=r["experience_relevance"],
            culture_fit=r["culture_fit"],
            red_flags=r["red_flags"],
            recommendation=r["recommendation"],
            xai_summary=r["xai_summary"],
            rank=i,
            scored_at=r["scored_at"],
        ))

    # Update job status
    await jobs_collection.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"screening_status": "completed", "updated_at": datetime.utcnow()}},
    )

    return ScreeningResponse(
        job_id=job_id,
        job_title=job["title"],
        total_candidates=len(candidates),
        scored_candidates=len(response_results),
        status="completed",
        results=response_results,
    )


@router.get("/{job_id}/results", response_model=ScreeningResponse)
async def get_results(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get screening results for a job."""
    job = await jobs_collection.find_one({
        "_id": ObjectId(job_id),
        "user_id": str(current_user["_id"]),
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get all scoring results
    cursor = scoring_results_collection.find({"job_id": job_id}).sort("overall_score", -1)
    results = []
    rank = 1
    async for r in cursor:
        # Get candidate info
        candidate = await candidates_collection.find_one({"_id": ObjectId(r["candidate_id"])})
        candidate_name = "Unknown"
        candidate_filename = "Unknown"
        if candidate:
            profile = candidate.get("profile", {})
            candidate_name = profile.get("name", "Unknown") if profile else "Unknown"
            candidate_filename = candidate.get("filename", "Unknown")

        results.append(ScoringResultResponse(
            id=str(r["_id"]),
            candidate_id=r["candidate_id"],
            candidate_name=candidate_name,
            candidate_filename=candidate_filename,
            job_id=job_id,
            overall_score=r["overall_score"],
            skill_match=r["skill_match"],
            experience_relevance=r["experience_relevance"],
            culture_fit=r["culture_fit"],
            red_flags=r["red_flags"],
            recommendation=r["recommendation"],
            xai_summary=r["xai_summary"],
            rank=rank,
            scored_at=r["scored_at"],
        ))
        rank += 1

    total = await candidates_collection.count_documents({"job_id": job_id})

    return ScreeningResponse(
        job_id=job_id,
        job_title=job["title"],
        total_candidates=total,
        scored_candidates=len(results),
        status=job.get("screening_status", "pending"),
        results=results,
    )


@router.get("/{job_id}/results/{candidate_id}", response_model=ScoringResultResponse)
async def get_candidate_result(
    job_id: str,
    candidate_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get detailed scoring result for a single candidate."""
    job = await jobs_collection.find_one({
        "_id": ObjectId(job_id),
        "user_id": str(current_user["_id"]),
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    result = await scoring_results_collection.find_one({
        "candidate_id": candidate_id,
        "job_id": job_id,
    })
    if not result:
        raise HTTPException(status_code=404, detail="Scoring result not found")

    candidate = await candidates_collection.find_one({"_id": ObjectId(candidate_id)})
    candidate_name = "Unknown"
    candidate_filename = "Unknown"
    if candidate:
        profile = candidate.get("profile", {})
        candidate_name = profile.get("name", "Unknown") if profile else "Unknown"
        candidate_filename = candidate.get("filename", "Unknown")

    return ScoringResultResponse(
        id=str(result["_id"]),
        candidate_id=candidate_id,
        candidate_name=candidate_name,
        candidate_filename=candidate_filename,
        job_id=job_id,
        overall_score=result["overall_score"],
        skill_match=result["skill_match"],
        experience_relevance=result["experience_relevance"],
        culture_fit=result["culture_fit"],
        red_flags=result["red_flags"],
        recommendation=result["recommendation"],
        xai_summary=result["xai_summary"],
        rank=None,
        scored_at=result["scored_at"],
    )
