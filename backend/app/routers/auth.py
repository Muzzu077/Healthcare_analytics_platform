import bcrypt
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Callable

from app.database import get_db
from app.config import settings
from app.models.domain import User, UserRoleEnum
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["Authentication & RBAC"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def hash_password(password: str) -> str:
    """Hashes password using bcrypt with random salt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies password with bcrypt with backwards compatibility fallback."""
    try:
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        # Fallback to salted sha256 for existing seed data
        salted = f"{plain_password}:{settings.JWT_SECRET}".encode('utf-8')
        return hashlib.sha256(salted).hexdigest() == hashed_password
    except Exception:
        return False

# ==============================================================================
# SCHEMAS
# ==============================================================================

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    full_name: str
    department: Optional[str] = None

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: str
    role: str
    department: Optional[str] = None
    is_active: bool
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ==============================================================================
# TOKEN CREATION & VALIDATION
# ==============================================================================

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def require_role(allowed_roles: List[str]) -> Callable:
    """Dependency for server-side Role-Based Access Control (RBAC)."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # Admin has superuser access to all capabilities
        if current_user.role == UserRoleEnum.ADMIN.value or current_user.role in allowed_roles:
            return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied. Required role in {allowed_roles}. Current role: {current_user.role}"
        )
    return role_checker

# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.post("/token", response_model=Token)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Record last login and log audit event
    user.last_login_at = datetime.utcnow()
    db.commit()

    log_audit_event(
        db=db,
        action="LOGIN",
        resource_type="User",
        resource_id=str(user.id),
        actor_user_id=user.id,
        actor_username=user.username,
        actor_role=user.role,
        ip_address=request.client.host if request.client else None,
        metadata={"role": user.role, "department": user.department}
    )

    access_token = create_access_token(data={"sub": user.username, "role": user.role, "uid": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user.username,
        "role": user.role,
        "full_name": user.full_name,
        "department": user.department
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.get("/users", response_model=List[UserOut])
def get_all_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRoleEnum.ADMIN.value, UserRoleEnum.ANALYTICS_DBA.value]))
):
    """Retrieve user list (Admin / DBA only)."""
    return db.query(User).order_by(User.id).all()
