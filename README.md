# ⬡ SentinelAI Enterprise Edition
### Production-Grade Insider Threat Detection Platform

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    SentinelAI Architecture                    │
├──────────────┬───────────────────────┬───────────────────────┤
│  Endpoint    │   Central Backend     │   SOC Dashboard       │
│  Agents      │   (FastAPI + PG)      │   (React + Vite)      │
│  (Windows)   │                       │                       │
│  ┌────────┐  │  ┌─────────────────┐  │  ┌─────────────────┐  │
│  │ Detect │─JWT─▶  Auth + RBAC    │  │  │ Overview        │  │
│  │ USB    │  │  │  Risk Engine    │◀─WS─│ Employees       │  │
│  │ Files  │  │  │  Violation DB   │  │  │ Threat Trends   │  │
│  │ Apps   │  │  │  Alert System   │──▶│  │ Alerts          │  │
│  │ Ports  │  │  │  Email Service  │  │  │ Reports (PDF)   │  │
│  │ Login  │  │  │  Report Gen     │  │  │ Admin Panel     │  │
│  └────────┘  │  └─────────────────┘  │  └─────────────────┘  │
└──────────────┴───────────────────────┴───────────────────────┘
```

### Key Design Decisions

| Principle | Implementation |
|-----------|---------------|
| Event-driven | Agents only report when violations occur, no polling spam |
| Risk decay | Scores reduce 20%/day automatically via background scheduler |
| Dedup protection | Same event within 5 minutes = no counter increment |
| JWT separation | Agent tokens vs User tokens — different validation paths |
| RBAC | Admin > Analyst > Viewer — enforced at route level |
| No aggressive scanning | Only watch specific paths, no recursive filesystem crawl |

---

## Folder Structure

```
sentinelai/
├── agent/
│   ├── agent.py                 # Main Windows agent
│   ├── requirements.txt         # Agent pip deps
│   └── sentinel_agent.spec      # PyInstaller build spec
│
├── backend/
│   ├── main.py                  # FastAPI app entry
│   ├── database.py              # Async SQLAlchemy engine
│   ├── requirements.txt
│   ├── auth/
│   │   └── jwt_handler.py       # JWT creation, decode, RBAC deps
│   ├── models/
│   │   └── models.py            # All ORM models
│   ├── routes/
│   │   ├── auth.py              # Login, register, agent register
│   │   ├── employees.py         # CRUD + enforcement
│   │   ├── events.py            # Agent event submission
│   │   ├── violations.py        # Summary/analytics
│   │   ├── alerts.py            # Alert management
│   │   ├── reports.py           # PDF + CSV export
│   │   ├── admin.py             # Dashboard stats
│   │   └── websocket.py         # Real-time WS
│   └── services/
│       ├── risk_engine.py       # Scoring, decay, dedup
│       ├── websocket_manager.py # WS connection pool
│       ├── email_service.py     # SMTP HIGH risk alerts
│       ├── report_service.py    # PDF (ReportLab) + CSV
│       └── scheduler.py        # Background decay task
│
├── dashboard/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       └── App.jsx              # Full SOC dashboard (single file)
│
├── docker/
│   ├── docker-compose.yml
│   └── Dockerfile.backend
│
├── .env.example
└── README.md
```

---

## Quick Start Deployment

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (or Docker)
- Windows endpoint (for agent)

---

### Step 1 — PostgreSQL Setup

**Option A: Docker (recommended)**
```bash
docker run -d \
  --name sentinelai-pg \
  -e POSTGRES_USER=sentinel \
  -e POSTGRES_PASSWORD=sentinel_pass \
  -e POSTGRES_DB=sentinelai \
  -p 5432:5432 \
  postgres:16-alpine
```

**Option B: Native PostgreSQL**
```sql
CREATE USER sentinel WITH PASSWORD 'sentinel_pass';
CREATE DATABASE sentinelai OWNER sentinel;
GRANT ALL PRIVILEGES ON DATABASE sentinelai TO sentinel;
```

---

### Step 2 — Backend Setup

```bash
# Navigate to backend
cd sentinelai/

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
.\venv\Scripts\activate         # Windows

# Install dependencies
pip install -r backend/requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings:
#   - DATABASE_URL (if different from default)
#   - JWT_SECRET_KEY (generate: python -c "import secrets; print(secrets.token_hex(32))")
#   - SMTP_* settings for email alerts (optional)
```

**Generate a secure JWT key:**
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```
Paste output into `.env` as `JWT_SECRET_KEY`.

**Run the backend:**
```bash
# Development
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Production
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Backend will auto-create all database tables on first startup.

**Seed the admin account (first time only):**
```bash
curl -X POST http://localhost:8000/api/auth/seed-admin
```
Default credentials: `admin` / `SentinelAdmin2024!`

---

### Step 3 — Dashboard Setup

```bash
cd sentinelai/dashboard/

# Install dependencies
npm install

# Start development server
npm run dev
# Dashboard available at: http://localhost:5173

# Production build
npm run build
# Serve dist/ with nginx or any static server
```

---

### Step 4 — Endpoint Agent Setup (Windows)

```bash
# On the Windows endpoint machine:

# Install agent dependencies
pip install -r agent/requirements.txt

# Set environment variables
set SENTINEL_BACKEND=http://192.168.1.100:8000
set AGENT_NAME=WORKSTATION-ALICE

# Run agent
python agent/agent.py
```

**Building Executable (.exe):**
```bash
# Install PyInstaller
pip install pyinstaller

# Build single executable
cd agent/
pyinstaller sentinel_agent.spec --clean

# Output: dist/SentinelAgent.exe
```

**Auto-start on Windows boot:**
```
1. Win+R → shell:startup
2. Create shortcut to SentinelAgent.exe
3. Set SENTINEL_BACKEND env var in system environment variables
```

---

## JWT Configuration

### How JWT Works in SentinelAI

**Two token types:**

| Token Type | Subject | Expiry | Used For |
|------------|---------|--------|----------|
| User Token | username | 60 min | Dashboard login |
| Agent Token | employee_id | 30 days | Agent→Backend API |

**Token claims (Agent):**
```json
{
  "sub": "42",
  "name": "WORKSTATION-01",
  "type": "agent",
  "exp": 1735689600,
  "iat": 1733097600
}
```

**Token refresh:** Agents automatically re-register if their token returns 401.

**Rotating the JWT secret:**
1. Update `JWT_SECRET_KEY` in `.env`
2. Restart backend
3. All agents will receive 401 on next request and auto re-register
4. All dashboard users will need to log in again

---

## RBAC Permission Matrix

| Action | Admin | Analyst | Viewer |
|--------|-------|---------|--------|
| View employees & events | ✅ | ✅ | ✅ |
| View alerts | ✅ | ✅ | ✅ |
| Resolve alerts | ✅ | ✅ | ❌ |
| Send employee warning | ✅ | ✅ | ❌ |
| Disable/Enable USB | ✅ | ❌ | ❌ |
| Export PDF report | ✅ | ❌ | ❌ |
| Export CSV | ✅ | ❌ | ❌ |
| Reset violations | ✅ | ❌ | ❌ |
| Create users | ✅ | ❌ | ❌ |
| View admin stats | ✅ | ❌ | ❌ |

---

## Risk Scoring System

### Violation Weights
| Event | Score | Counter Field |
|-------|-------|---------------|
| USB Insertion | +40 | usb_count |
| Bulk File Copy (20+ files/30s) | +50 | bulk_count |
| Night Login (12AM–5AM) | +20 | late_count |
| Unauthorized App | +50 | app_count |
| Keylogger Detected | +80 | keylogger_count |
| Suspicious Port | +60 | network_count |

### Risk Levels
| Score Range | Level | Color |
|-------------|-------|-------|
| 0 – 49 | LOW | 🟢 Green |
| 50 – 119 | MEDIUM | 🟡 Yellow |
| 120+ | HIGH | 🔴 Red |

### Deduplication
- Same event within **5 minutes** → counter increments only once
- Prevents risk inflation from agent retry storms

### Risk Decay
- Every **24 hours without new violation** → score × 0.80
- Applied by background scheduler (runs every hour, checks elapsed days)
- Score floor: 0.0

---

## Testing Procedures

### Test USB Violation
```bash
# Method 1: Plug in a USB flash drive on the agent machine
# Agent will detect via psutil.disk_partitions() within 15s

# Method 2: Simulate via API (for testing without hardware)
curl -X POST http://localhost:8000/api/events/submit \
  -H "Authorization: Bearer <AGENT_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "usb_insertion", "metadata": {"drive": "E:\\"}}'
```

### Test Bulk Copy Violation
```bash
# Method 1: On the agent machine, create 20+ files in the TEMP folder rapidly:
# (PowerShell)
1..25 | ForEach-Object { New-Item "$env:TEMP\testfile_$_.txt" -ItemType File }

# Method 2: Direct API
curl -X POST http://localhost:8000/api/events/submit \
  -H "Authorization: Bearer <AGENT_JWT_TOKEN>" \
  -d '{"event_type": "bulk_copy", "metadata": {"file_count": 25}}'
```

### Test Unauthorized App Detection
```bash
# Method 1: Rename any executable to "wireshark.exe" and run it
# Agent checks process list every 15s

# Method 2: Direct API
curl -X POST http://localhost:8000/api/events/submit \
  -H "Authorization: Bearer <AGENT_JWT_TOKEN>" \
  -d '{"event_type": "unauthorized_app", "metadata": {"process": "wireshark.exe", "pid": 1234}}'
```

### Test Night Login
```bash
# Method 1: Change system time to 2:00 AM on the agent machine

# Method 2: Direct API
curl -X POST http://localhost:8000/api/events/submit \
  -H "Authorization: Bearer <AGENT_JWT_TOKEN>" \
  -d '{"event_type": "late_login", "metadata": {"hour": 2}}'
```

### Test USB Enforcement (Admin)
```bash
# Via dashboard: Employee Detail → Disable USB button (Admin only)
# Or via API:
curl -X POST http://localhost:8000/api/employees/1/disable-usb \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"

# Agent will receive action: "disable_usb" on next heartbeat
# Windows registry command executed:
# reg add HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR /v Start /t REG_DWORD /d 4 /f
```

---

## Demo Walkthrough Script

### Scene 1 — System Overview

1. Open dashboard at `http://localhost:5173`
2. Login: `admin` / `SentinelAdmin2024!`
3. **Overview page** shows:
   - Agent count, online status, HIGH risk count
   - 7-day threat trend chart (bar chart)
   - Risk distribution (LOW/MEDIUM/HIGH)
   - Live activity feed (WebSocket)

### Scene 2 — Simulate Insider Threat

Run this demo script to generate a realistic threat scenario:

```bash
# Get agent token first
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/agent/register \
  -H "Content-Type: application/json" \
  -d '{"name": "ALICE-WORKSTATION", "hostname": "ALICE-WS", "ip": "192.168.1.55"}' | python -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Agent token: $TOKEN"

# 1. USB insertion
curl -s -X POST http://localhost:8000/api/events/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_type": "usb_insertion", "metadata": {"drive": "E:\\", "label": "KINGSTON 64GB"}}'

sleep 2

# 2. Bulk copy
curl -s -X POST http://localhost:8000/api/events/submit \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"event_type": "bulk_copy", "metadata": {"file_count": 847, "destination": "E:\\"}}'

sleep 2

# 3. Unauthorized app
curl -s -X POST http://localhost:8000/api/events/submit \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"event_type": "unauthorized_app", "metadata": {"process": "wireshark.exe", "pid": 4421}}'

sleep 2

# 4. Keylogger detected (HIGH risk triggered)
curl -s -X POST http://localhost:8000/api/events/submit \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"event_type": "keylogger_detected", "metadata": {"process": "ardamax.exe", "pid": 7823}}'
```

**Expected results:**
- Alice's risk score: 40 + 50 + 50 + 80 = 220 → HIGH
- HIGH risk alert created
- Email notification sent (if SMTP configured)
- WebSocket pushes real-time update to dashboard
- Dashboard Overview shows HIGH risk count incremented

### Scene 3 — SOC Response

1. **Employees page** → See Alice at top (sorted by risk)
2. **Click Alice** → Employee Detail view
   - Risk gauge shows HIGH (220+)
   - Violation counters: USB=1, Bulk=1, App=1, Keylogger=1
   - Threat timeline shows all 4 events
3. **Send Warning** → Creates warning alert
4. **Disable USB** (Admin) → Next agent heartbeat runs registry enforcement
5. **Export PDF** → Downloads full threat report

### Scene 4 — Alerts Page

1. Navigate to **Alerts**
2. Show unresolved HIGH alert for Alice
3. Click **Resolve** → Mark as resolved with analyst username
4. Show resolved state

### Scene 5 — Reports

1. Navigate to Employee Detail → Export PDF
2. PDF contains:
   - Employee summary
   - Violation breakdown table
   - Threat timeline (last 20 events)
   - Generation timestamp
3. CSV export from Logs page → Event log spreadsheet

---

## API Reference

### Authentication
```
POST /api/auth/login              → {access_token, user}
POST /api/auth/register           → Create user (Admin only)
POST /api/auth/agent/register     → Register agent, get JWT
POST /api/auth/seed-admin         → One-time admin seed
GET  /api/auth/me                 → Current user info
```

### Agent Endpoints
```
POST /api/events/submit           → Submit violation event (Agent JWT)
POST /api/events/heartbeat        → Send heartbeat (Agent JWT)
```

### Dashboard Endpoints
```
GET  /api/employees/              → List all employees
GET  /api/employees/{id}          → Employee detail
POST /api/employees/{id}/disable-usb    → Admin only
POST /api/employees/{id}/enable-usb     → Admin only
POST /api/employees/{id}/send-warning   → Admin/Analyst
POST /api/employees/{id}/reset-violations → Admin only
GET  /api/events/                 → Event log (filterable)
GET  /api/violations/summary      → Aggregated violation stats
GET  /api/alerts/                 → Alert list
POST /api/alerts/{id}/resolve     → Resolve alert
GET  /api/reports/pdf/{id}        → Export PDF (Admin)
GET  /api/reports/csv             → Export CSV (Admin)
GET  /api/admin/dashboard-stats   → Overview stats (Admin)
```

### WebSocket
```
WS   /ws/events?token={jwt}       → Real-time event stream
     Messages: risk_update, warning_sent, pong
     Client sends: "ping" → receives "pong"
```

---

## Security Notes

1. **Change JWT_SECRET_KEY before production** — the default is insecure
2. **PostgreSQL password** — change from `sentinel_pass` in production
3. **HTTPS** — deploy behind nginx with SSL in production
4. **Rate limiting** — login endpoint limited to 10 req/min by default
5. **Agent communication** — all agents use JWT Bearer tokens
6. **USB enforcement** requires admin rights on Windows endpoints
7. **Email credentials** — use App Passwords (Gmail) not account passwords

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend 500 on startup | Check PostgreSQL is running, DATABASE_URL is correct |
| Agent 401 errors | Run `POST /api/auth/agent/register` again, delete `sentinel_token.json` |
| WebSocket disconnect loops | Check CORS in `backend/main.py` includes dashboard URL |
| USB disable no effect | Agent must run as Administrator on Windows |
| No email alerts | Verify SMTP_USER, SMTP_PASS, ALERT_EMAIL in .env |
| Risk not decaying | Check background scheduler started (look for "Scheduler started" in logs) |
