from fastapi import APIRouter, HTTPException, status
from app.models.auth import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import (
    register_user,
    authenticate_user,
    create_access_token,
    get_current_user,
)
from fastapi import Depends

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate):
    """Register a new user account."""
    user = await register_user(
        name=data.name,
        email=data.email,
        password=data.password,
        company=data.company,
    )

    token = create_access_token({"sub": str(user["_id"])})

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            company=user.get("company"),
            created_at=user["created_at"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Login with email and password."""
    user = await authenticate_user(email=data.email, password=data.password)

    token = create_access_token({"sub": str(user["_id"])})

    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=str(user["_id"]),
            name=user["name"],
            email=user["email"],
            company=user.get("company"),
            created_at=user["created_at"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        company=current_user.get("company"),
        created_at=current_user["created_at"],
    )
