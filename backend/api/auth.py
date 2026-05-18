

from fastapi            import APIRouter, Depends, HTTPException, status
from fastapi.security   import OAuth2PasswordRequestForm
from sqlalchemy.orm     import Session

from db.database        import get_db
from db.crud            import (get_user_by_username, create_user,
                                get_all_users, update_user_status, delete_user)
from core.security      import (verify_password, create_access_token,
                                get_current_user, require_admin)
from schemas.schemas    import LoginRequest, TokenResponse, UserCreate, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse, summary="Admin login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Login with username and password.
    Returns a JWT bearer token to include in all subsequent requests.
    """
    user = get_user_by_username(db, form.username)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive.")

    token = create_access_token(data={"sub": user.username})
    return TokenResponse(
        access_token = token,
        token_type   = "bearer",
        user_role    = user.role,
        full_name    = user.full_name,
    )


@router.post("/register", response_model=UserResponse,
             summary="Register a new admin user (superadmin only)")
def register(payload: UserCreate, db: Session = Depends(get_db),
             current_user=Depends(require_admin)):
    if get_user_by_username(db, payload.username):
        raise HTTPException(status_code=409, detail="Username already exists.")
    return create_user(db, payload.username, payload.email,
                       payload.full_name, payload.password, payload.role)


@router.get("/users", response_model=list[UserResponse],
            summary="List all admin users (superadmin only)")
def list_users(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    return get_all_users(db)


@router.patch("/users/{user_id}/status", response_model=UserResponse,
              summary="Activate or deactivate a user account")
def set_user_status(user_id: str, is_active: bool,
                    db: Session = Depends(get_db),
                    current_user=Depends(require_admin)):
    user = update_user_status(db, user_id, is_active)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


@router.delete("/users/{user_id}", summary="Delete a user account")
def remove_user(user_id: str, db: Session = Depends(get_db),
                current_user=Depends(require_admin)):
    if not delete_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found.")
    return {"message": "User deleted successfully."}


@router.get("/me", response_model=UserResponse, summary="Get current logged-in user")
def get_me(current_user=Depends(get_current_user)):
    return current_user
