import datetime
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
import models, schemas

# Secret configuration (in production this should come from environment variables)
SECRET_KEY = "SUPER_SECRET_STUDIO_KEY_FOR_JWT_SIGNING"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 hours

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        studio_id: str = payload.get("studio_id")
        if user_id is None or studio_id is None:
            raise credentials_exception
        token_data = schemas.TokenData(user_id=user_id, studio_id=studio_id)
    except jwt.PyJWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_studio_id(current_user: models.User = Depends(get_current_user)) -> str:
    return current_user.studio_id

# ----------------- Secure Client Portal Expiring Tokens -----------------

def create_portal_share_token(client_id: str, expires_days: int = 30) -> str:
    """
    Generates a secure, signed, and expiring JWT token for a specific client portal.
    """
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=expires_days)
    payload = {
        "sub": client_id,
        "type": "portal_access",
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_portal_client_id(token: str) -> str:
    """
    Decodes the client portal token. Returns client_id if valid, raises 401 otherwise.
    """
    unauthorized_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Client portal link is invalid or has expired."
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "portal_access":
            raise unauthorized_exception
        client_id: str = payload.get("sub")
        if client_id is None:
            raise unauthorized_exception
        return client_id
    except jwt.PyJWTError:
        raise unauthorized_exception
