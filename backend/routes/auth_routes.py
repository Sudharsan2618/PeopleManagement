from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.user_service import UserService


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    id: int
    name: str
    email: str
    mobile: str
    role: str
    is_active: bool
    created_at: str


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    """Authenticate user with email and password."""
    # Fetch user by email (includes password field)
    user = UserService.get_user_by_email(request.email)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password (plain text comparison for now)
    if user.get("password") != request.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Check if account is active
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is inactive")
    
    # Remove password from response
    user.pop("password", None)
    
    # Convert datetime to string for response
    if user.get("created_at"):
        user["created_at"] = str(user["created_at"])
    
    return user
