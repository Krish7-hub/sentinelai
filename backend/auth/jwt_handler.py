import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.models import User, Employee, UserRole

SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
AGENT_TOKEN_EXPIRE_DAYS = int(os.getenv("AGENT_TOKEN_EXPIRE_DAYS", "30"))

bearer_scheme = HTTPBearer()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def create_access_token(data: dict, expires_delta=None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_agent_token(employee_id: int, employee_name: str) -> str:
    data = {
        "sub": str(employee_id),
        "name": employee_name,
        "type": "agent",
        "exp": datetime.utcnow() + timedelta(days=AGENT_TOKEN_EXPIRE_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid or expired token: {str(e)}", headers={"WWW-Authenticate": "Bearer"})

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_token(credentials.credentials)
    if payload.get("type") == "agent":
        raise HTTPException(status_code=403, detail="Agent tokens cannot access user endpoints")
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user

async def get_agent_employee(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme), db: AsyncSession = Depends(get_db)) -> Employee:
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "agent":
        raise HTTPException(status_code=403, detail="User tokens cannot access agent endpoints")
    employee_id = payload.get("sub")
    result = await db.execute(select(Employee).where(Employee.id == int(employee_id)))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=401, detail="Agent not registered")
    return employee

def require_role(*roles: UserRole):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Insufficient permissions.")
        return current_user
    return role_checker

require_admin = require_role(UserRole.ADMIN)
require_analyst_or_above = require_role(UserRole.ADMIN, UserRole.ANALYST)
require_any_role = require_role(UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER)
