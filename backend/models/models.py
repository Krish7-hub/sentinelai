import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Enum, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"

class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class EmployeeStatus(str, enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    SUSPENDED = "suspended"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    email = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    department = Column(String(64), nullable=True)
    ip = Column(String(45), nullable=True)
    hostname = Column(String(128), nullable=True)
    jwt_token = Column(Text, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    status = Column(Enum(EmployeeStatus), default=EmployeeStatus.OFFLINE)
    usb_disabled = Column(Boolean, default=False)
    registered_at = Column(DateTime, default=datetime.utcnow)
    violations = relationship("Violation", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    events = relationship("Event", back_populates="employee", cascade="all, delete-orphan")
    risk_score = relationship("RiskScore", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="employee", cascade="all, delete-orphan")

class Violation(Base):
    __tablename__ = "violations"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), unique=True)
    usb_count = Column(Integer, default=0)
    bulk_count = Column(Integer, default=0)
    late_count = Column(Integer, default=0)
    app_count = Column(Integer, default=0)
    keylogger_count = Column(Integer, default=0)
    network_count = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    employee = relationship("Employee", back_populates="violations")

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    event_type = Column(String(64), nullable=False, index=True)
    event_metadata = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    source_ip = Column(String(45), nullable=True)
    employee = relationship("Employee", back_populates="events")

class RiskScore(Base):
    __tablename__ = "risk_scores"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), unique=True)
    score = Column(Float, default=0.0)
    level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    last_updated = Column(DateTime, default=datetime.utcnow)
    history = Column(JSON, default=list)
    employee = relationship("Employee", back_populates="risk_score")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    message = Column(Text, nullable=False)
    severity = Column(String(16), default="MEDIUM")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    resolved = Column(Boolean, default=False)
    resolved_by = Column(String(64), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    employee = relationship("Employee", back_populates="alerts")
