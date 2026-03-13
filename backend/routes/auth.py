from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.database import get_db
from backend.models.models import User, Employee, UserRole, Violation, RiskScore
from backend.auth.jwt_handler import verify_password, hash_password, create_access_token, create_agent_token, get_current_user

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.VIEWER
    email: str = None

    @field_validator("password")
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

class AgentRegisterRequest(BaseModel):
    name: str
    hostname: str = None
    ip: str = None
    department: str = None

@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == body.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_access_token({"sub": user.username, "role": user.role.value})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "username": user.username, "role": user.role.value}}

@router.post("/register")
async def register_user(body: RegisterRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already exists")
    user = User(username=body.username, password_hash=hash_password(body.password), role=body.role, email=body.email)
    db.add(user)
    await db.commit()
    return {"message": "User created", "username": user.username, "role": user.role.value}

@router.post("/agent/register")
async def register_agent(body: AgentRegisterRequest, db: AsyncSession = Depends(get_db)):
    if body.hostname:
        result = await db.execute(select(Employee).where(Employee.hostname == body.hostname))
        existing = result.scalar_one_or_none()
        if existing:
            token = create_agent_token(existing.id, existing.name)
            existing.jwt_token = token
            existing.ip = body.ip
            existing.last_seen = datetime.utcnow()
            await db.commit()
            return {"token": token, "employee_id": existing.id, "message": "Re-registered"}
    employee = Employee(name=body.name, hostname=body.hostname, ip=body.ip, department=body.department, last_seen=datetime.utcnow())
    db.add(employee)
    await db.flush()
    violation = Violation(employee_id=employee.id)
    risk = RiskScore(employee_id=employee.id, score=0.0, history=[])
    db.add(violation)
    db.add(risk)
    token = create_agent_token(employee.id, body.name)
    employee.jwt_token = token
    await db.commit()
    return {"token": token, "employee_id": employee.id, "message": "Agent registered successfully"}

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "role": current_user.role.value, "email": current_user.email}

@router.post("/seed-admin")
async def seed_admin(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Admin already exists")
    admin = User(username="admin", password_hash=hash_password("SentinelAdmin2024!"), role=UserRole.ADMIN, email="admin@sentinelai.local")
    db.add(admin)
    await db.commit()
    return {"message": "Admin created", "username": "admin", "password": "SentinelAdmin2024!"}
