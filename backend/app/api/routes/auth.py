from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.database.session import get_db
from app.models.user import User
from app.schemas.token import Token
from app.schemas.user import ForgotPasswordRequest, ResetPasswordRequest, UserCreate, UserOut
from app.services.auth_service import (
    authenticate_user,
    create_password_reset_token,
    create_user,
    get_user_by_email,
    initiate_password_reset,
    reset_password_with_token,
)

router = APIRouter()


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    return create_user(db, user_in)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    initiate_password_reset(db, payload.email)
    return {"message": "If an account exists for this email, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = reset_password_with_token(db, payload.token, payload.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    return {"detail": "Password reset successful"}


@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user
