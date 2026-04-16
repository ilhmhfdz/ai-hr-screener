from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db, close_db
from app.routers import auth, jobs, candidates, screening, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="AI HR Recruitment Screener",
    description="Deep Dive AI-powered CV screening with multi-dimensional scoring, XAI explanations, and bias detection.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(screening.router)
app.include_router(reports.router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "AI HR Recruitment Screener"}


@app.get("/")
async def root():
    return {
        "message": "AI HR Recruitment Screener — Deep Dive",
        "docs": "/docs",
        "version": "1.0.0",
    }
