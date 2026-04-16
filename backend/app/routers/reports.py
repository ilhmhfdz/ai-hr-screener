from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from bson import ObjectId
from app.database import jobs_collection, scoring_results_collection, candidates_collection
from app.services.auth_service import get_current_user
from app.services.report_service import generate_screening_report

router = APIRouter(prefix="/api/jobs", tags=["Reports"])


@router.get("/{job_id}/report")
async def download_report(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Download screening results as a PDF report."""
    job = await jobs_collection.find_one({
        "_id": ObjectId(job_id),
        "user_id": str(current_user["_id"]),
    })
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Get all scoring results sorted by score
    cursor = scoring_results_collection.find({"job_id": job_id}).sort("overall_score", -1)
    results = []
    async for r in cursor:
        # Get candidate info
        candidate = await candidates_collection.find_one({"_id": ObjectId(r["candidate_id"])})
        candidate_name = "Unknown"
        if candidate:
            profile = candidate.get("profile", {})
            candidate_name = profile.get("name", "Unknown") if profile else "Unknown"

        results.append({
            **r,
            "candidate_name": candidate_name,
        })

    if not results:
        raise HTTPException(
            status_code=400,
            detail="No screening results found. Run screening first.",
        )

    # Generate PDF
    pdf_bytes = generate_screening_report(
        job_title=job["title"],
        job_description=job.get("description_text", ""),
        results=results,
        bias_report=job.get("bias_report"),
        rubric=job.get("rubric"),
    )

    filename = f"screening_report_{job['title'].replace(' ', '_')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
