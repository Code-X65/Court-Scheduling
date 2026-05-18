

from datetime  import datetime, timedelta
from typing    import Optional

from jose      import JWTError, jwt
from passlib.context import CryptContext
from fastapi   import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from core.config import settings

import warnings
warnings.filterwarnings("ignore", ".*error reading bcrypt version.*")

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


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

def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    FastAPI dependency. Inject into any protected endpoint:
        current_user = Depends(get_current_user)
    """
    from db.crud import get_user_by_username
    from db.database import SessionLocal

    payload  = decode_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    db   = SessionLocal()
    user = get_user_by_username(db, username)
    db.close()

    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive.")
    return user


def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user
