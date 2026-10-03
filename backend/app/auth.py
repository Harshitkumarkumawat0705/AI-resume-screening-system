from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import bcrypt
import jwt

# Configuration settings
import os
SECRET_KEY = os.getenv("JWT_SECRET", "super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# OAuth2 Security Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    """
    Generates a secure bcrypt hash of the given plain-text password using native bcrypt.
    """
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks if a login attempt plain-text password matches the stored bcrypt hash using native bcrypt.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Encodes and signs a JWT access token containing the provided payload data and an expiration.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

class CurrentUser(dict):
    """
    A lightweight dictionary wrapper that provides dot notation access for id and role,
    preserving compatibility with dict access methods.
    """
    @property
    def id(self) -> int:
        return self.get("id")

    @property
    def role(self) -> str:
        return self.get("role")

def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """
    Decodes a JWT access token, checks its validity and expiration, and returns the payload data.
    Raises an HTTP 401 Unauthorized exception if the token is invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Validate that the minimum required fields are present
        if "id" not in payload or "role" not in payload:
            raise credentials_exception
        return CurrentUser(payload)
    except jwt.PyJWTError as e:
        print(f"JWT Validation Error: {e}, Token: {token}")
        raise credentials_exception
