import logging
import traceback
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.security import generate_reset_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate
from app.services.email_service import send_password_reset_email

logger = logging.getLogger(__name__)


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, user_in: UserCreate) -> User:
    user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_password_reset_token(db: Session, email: str) -> str | None:
    user = get_user_by_email(db, email)
    if not user:
        logger.info("[AUTH] create_password_reset_token: user not found for email=%s", email)
        return None
    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expires_at = datetime.utcnow() + timedelta(minutes=30)
    db.commit()
    logger.info("[AUTH] create_password_reset_token: token generated for email=%s, user_id=%s, token=%s", email, user.id, token)
    return token


def reset_password_with_token(db: Session, token: str, new_password: str) -> bool:
    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        logger.warning("[AUTH] reset_password_with_token: no user found for token=%s", token)
        return False
    if user.reset_token_expires_at is None or user.reset_token_expires_at < datetime.utcnow():
        logger.warning("[AUTH] reset_password_with_token: token expired for user_id=%s, expires_at=%s", user.id, user.reset_token_expires_at)
        return False
    user.hashed_password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires_at = None
    db.commit()
    logger.info("[AUTH] reset_password_with_token: password reset successful for user_id=%s", user.id)
    return True


def initiate_password_reset(db: Session, email: str) -> None:
    logger.info("[AUTH] initiate_password_reset called for email=%s", email)
    token = create_password_reset_token(db, email)
    if token is None:
        logger.info("[AUTH] initiate_password_reset: no token generated for email=%s (user may not exist)", email)
        return
    logger.info("[AUTH] initiate_password_reset: calling send_password_reset_email for email=%s, token=%s", email, token)
    try:
        send_password_reset_email(email, token)
        logger.info("[AUTH] initiate_password_reset: send_password_reset_email completed for email=%s", email)
    except Exception as exc:
        logger.error("[AUTH] initiate_password_reset: email sending FAILED for email=%s: %s", email, exc)
        logger.error("[AUTH] Full traceback:\n%s", traceback.format_exc())
