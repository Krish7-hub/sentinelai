SentinelAI Enterprise Edition

Production-Grade Insider Threat Detection Platform

SentinelAI is an enterprise-grade security monitoring system designed to detect insider threats, suspicious workstation behavior, and policy violations in real time.

The platform combines:

Windows endpoint agents

A FastAPI backend

PostgreSQL analytics storage

A SOC (Security Operations Center) dashboard

Real-time WebSocket alerts

Automated risk scoring and threat detection

SentinelAI is designed to help organizations identify malicious insider behavior before data exfiltration occurs.

System Architecture
┌──────────────────────────────────────────────────────────────┐
│                    SentinelAI Architecture                    │
├──────────────┬───────────────────────┬────────────────────────┤
│ Endpoint     │ Central Backend       │ SOC Dashboard          │
│ Agents       │ (FastAPI + PostgreSQL)│ (React + Vite)         │
│ (Windows)    │                       │                        │
│              │ Auth + RBAC           │ Overview               │
│ Detect:      │ Risk Engine           │ Employees              │
│ • USB usage  │ Violation Database    │ Threat Trends          │
│ • File copy  │ Alert System          │ Alerts                 │
│ • Apps       │ Email Service         │ Reports                │
│ • Ports      │ Report Generator      │ Admin Panel            │
│ • Logins     │ WebSocket Broadcast   │                        │
└──────────────┴───────────────────────┴────────────────────────┘
Key Design Principles
Principle	Implementation
Event-Driven	Agents send events only when violations occur
Risk Decay	Risk scores automatically decay by 20% per day
Dedup Protection	Same event within 5 minutes counted once
Token Separation	Agent tokens and user tokens use different validation paths
RBAC Security	Admin → Analyst → Viewer permission hierarchy
Lightweight Agents	Only monitors configured behaviors, no full disk scans
Project Structure
sentinelai/
│
├── agent/
│   ├── agent.py
│   ├── requirements.txt
│   └── sentinel_agent.spec
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── requirements.txt
│   │
│   ├── auth/
│   │   └── jwt_handler.py
│   │
│   ├── models/
│   │   └── models.py
│   │
│   ├── routes/
│   │   ├── auth.py
│   │   ├── employees.py
│   │   ├── events.py
│   │   ├── violations.py
│   │   ├── alerts.py
│   │   ├── reports.py
│   │   ├── admin.py
│   │   └── websocket.py
│   │
│   └── services/
│       ├── risk_engine.py
│       ├── websocket_manager.py
│       ├── email_service.py
│       ├── report_service.py
│       └── scheduler.py
│
├── dashboard/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       └── App.jsx
│
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile.backend
│
├── .env.example
└── README.md
Quick Start Deployment
Prerequisites

Python 3.11+

Node.js 18+

PostgreSQL 14+

Docker (optional)

Windows system (for agent)

Step 1 — PostgreSQL Setup
Docker (Recommended)
docker run -d \
--name sentinelai-pg \
-e POSTGRES_USER=sentinel \
-e POSTGRES_PASSWORD=sentinel_pass \
-e POSTGRES_DB=sentinelai \
-p 5432:5432 \
postgres:16-alpine
Native PostgreSQL
CREATE USER sentinel WITH PASSWORD 'sentinel_pass';

CREATE DATABASE sentinelai OWNER sentinel;

GRANT ALL PRIVILEGES ON DATABASE sentinelai TO sentinel;
Step 2 — Backend Setup

Navigate to the project root:

cd sentinelai

Create virtual environment:

python -m venv venv

Activate environment:

Linux / Mac

source venv/bin/activate

Windows

venv\Scripts\activate

Install dependencies

pip install -r backend/requirements.txt

Copy environment configuration

cp .env.example .env

Generate a secure JWT key:

python -c "import secrets; print(secrets.token_hex(32))"

Add it to .env

JWT_SECRET_KEY=<generated_key>

Start backend server:

Development:

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

Production:

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
Step 3 — Seed Admin Account

Run once after backend startup:

curl -X POST http://localhost:8000/api/auth/seed-admin

Default credentials:

Username: admin
Password: SentinelAdmin2024!
Step 4 — Dashboard Setup

Navigate to dashboard directory

cd sentinelai/dashboard

Install dependencies

npm install

Run development server

npm run dev

Dashboard will be available at

http://localhost:5173

Production build:

npm run build

Serve the dist folder using nginx or any static server.

Step 5 — Windows Endpoint Agent

Install dependencies:

pip install -r agent/requirements.txt

Configure environment variables:

SENTINEL_BACKEND=http://192.168.1.100:8000
AGENT_NAME=WORKSTATION-ALICE

Run agent:

python agent/agent.py
Build Agent Executable

Install PyInstaller:

pip install pyinstaller

Build executable:

cd agent
pyinstaller sentinel_agent.spec --clean

Output file:

dist/SentinelAgent.exe
Windows Auto-Start

Press Win + R

Type

shell:startup

Add shortcut to

SentinelAgent.exe
JWT Token System

SentinelAI uses two token types.

Token Type	Subject	Expiry	Purpose
User Token	username	60 minutes	Dashboard login
Agent Token	employee_id	30 days	Agent API access

Example agent token payload:

{
  "sub": "42",
  "name": "WORKSTATION-01",
  "type": "agent",
  "exp": 1735689600,
  "iat": 1733097600
}

Agents automatically re-register if their token expires.

RBAC Permissions
Action	Admin	Analyst	Viewer
View employees	Yes	Yes	Yes
View alerts	Yes	Yes	Yes
Resolve alerts	Yes	Yes	No
Send warnings	Yes	Yes	No
Disable USB	Yes	No	No
Export reports	Yes	No	No
Create users	Yes	No	No
Risk Scoring System
Violation Weights
Event	Score
USB Insertion	+40
Bulk File Copy	+50
Night Login	+20
Unauthorized App	+50
Keylogger Detection	+80
Suspicious Port	+60
Risk Levels
Score	Level
0–49	Low
50–119	Medium
120+	High
Risk Decay

If no violations occur:

Risk Score = Risk Score × 0.80 per day

Applied automatically by background scheduler.

Testing the System

Example test event:

curl -X POST http://localhost:8000/api/events/submit \
-H "Authorization: Bearer <AGENT_TOKEN>" \
-H "Content-Type: application/json" \
-d '{"event_type":"usb_insertion","metadata":{"drive":"E:\\"}}'
Real-Time WebSocket
WS /ws/events?token=<jwt>

Events streamed:

risk_update

warning_sent

pong

Security Recommendations

Before production deployment:

Change JWT_SECRET_KEY

Change PostgreSQL credentials

Deploy behind Nginx with HTTPS

Use App Passwords for email alerts

Restrict firewall access to backend APIs

Ensure agents run with administrator privileges

Troubleshooting
Problem	Solution
Backend fails to start	Check PostgreSQL connection
Agent receives 401	Re-register agent token
WebSocket disconnects	Verify CORS configuration
USB disable not working	Run agent as administrator
Email alerts missing	Verify SMTP settings
Risk score not decaying	Ensure scheduler is running
SentinelAI

Enterprise-grade insider threat detection platform designed for SOC teams and security engineers.

Features:

Real-time insider threat monitoring

Automated risk scoring

Endpoint behavior analysis

Real-time SOC dashboard

Incident alerts and reporting
