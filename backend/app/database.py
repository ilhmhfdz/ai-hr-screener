import motor.motor_asyncio
from app.config import get_settings

settings = get_settings()

client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.MONGODB_DB_NAME]

# Collections
users_collection = db["users"]
jobs_collection = db["jobs"]
candidates_collection = db["candidates"]
scoring_results_collection = db["scoring_results"]


async def init_db():
    """Create indexes for MongoDB collections."""
    await users_collection.create_index("email", unique=True)
    await jobs_collection.create_index("user_id")
    await candidates_collection.create_index("job_id")
    await candidates_collection.create_index([("job_id", 1), ("status", 1)])
    await scoring_results_collection.create_index("job_id")
    await scoring_results_collection.create_index(
        [("job_id", 1), ("candidate_id", 1)], unique=True
    )


async def close_db():
    """Close MongoDB connection."""
    client.close()
