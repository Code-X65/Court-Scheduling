from datetime  import datetime, timedelta
from typing    import Optional
import warnings
import base64
warnings.filterwarnings("ignore", ".*error reading bcrypt version.*")

from fastapi   import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

from core.config import settings
from db.database import SessionLocal, get_db

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    # Truncate to 72 bytes (bcrypt hard limit)
    return pwd_context.hash(password.encode("utf-8")[:72])


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain.encode("utf-8")[:72], hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire    = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(
    bearer_token: str = Depends(oauth2_scheme),
):
    from db.crud import get_user_by_username
    from db.database import SessionLocal

    if not bearer_token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    try:
        payload  = decode_token(bearer_token)
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token.")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

    db = SessionLocal()
    try:
        user = get_user_by_username(db, username)
    finally:
        db.close()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive.")
    return user


def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin" and current_user.role != "superadmin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user