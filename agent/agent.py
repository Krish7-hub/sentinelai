"""
SentinelAI Enterprise Edition — Endpoint Agent
Windows-compatible insider threat detection agent

Features:
- USB insert/removal detection
- Bulk file copy detection
- Night-time login detection
- Unauthorized app detection
- Keylogger process detection
- Suspicious open port detection
- JWT authentication with auto-refresh
- Auto-enforcement (USB disable)
- Local action logging
- Retry on backend offline
"""

import os
import sys
import json
import time
import socket
import logging
import subprocess
import threading
import platform
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, Any

import requests
import psutil

# ─── Configuration ────────────────────────────────────────────────────────────

BACKEND_URL = os.getenv("SENTINEL_BACKEND", "http://localhost:8000")
AGENT_NAME = os.getenv("AGENT_NAME", socket.gethostname())
POLL_INTERVAL = 15          # seconds between detection cycles
HEARTBEAT_INTERVAL = 30     # seconds between heartbeats
COOLDOWN_SECONDS = 60       # suppress repeated popups
RETRY_DELAY = 30            # seconds before retry if backend offline
MAX_RETRIES = 5
BULK_COPY_THRESHOLD = 20    # files
BULK_COPY_WINDOW = 30       # seconds
NIGHT_START = 0             # 12AM
NIGHT_END = 5               # 5AM
LOG_FILE = Path("sentinel_agent.log")
TOKEN_FILE = Path("sentinel_token.json")

# Unauthorized processes (extend as needed)
UNAUTHORIZED_APPS = {
    "teamviewer.exe", "anydesk.exe", "ultraviewer.exe",
    "wireshark.exe", "nmap.exe", "netcat.exe", "nc.exe",
    "mimikatz.exe", "wce.exe", "pwdump.exe", "fgdump.exe",
    "tor.exe", "torbrowser.exe",
    "putty.exe",  # allowlist if needed
}

# Known keylogger process names
KEYLOGGER_SIGNATURES = {
    "revealer.exe", "keylogger.exe", "spyagent.exe", "refog.exe",
    "actual_keylogger.exe", "ardamax.exe", "family_keylogger.exe",
    "perfect_keylogger.exe", "blazingtools.exe", "spytector.exe",
    "all_in_one_keylogger.exe", "elite_keylogger.exe",
}

# Suspicious ports to check (outbound connections)
SUSPICIOUS_PORTS = {4444, 1337, 6666, 9999, 31337, 12345, 54321, 8080, 1080}

# ─── Logging Setup ────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger("SentinelAgent")

# ─── Global State ─────────────────────────────────────────────────────────────

_token: Optional[str] = None
_employee_id: Optional[int] = None
_cooldowns: Dict[str, datetime] = {}
_bulk_copy_tracker: Dict[str, list] = {}
_usb_drives_seen: set = set()


# ─── Token Management ─────────────────────────────────────────────────────────

def load_token() -> Optional[dict]:
    if TOKEN_FILE.exists():
        try:
            with open(TOKEN_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return None


def save_token(token: str, employee_id: int):
    with open(TOKEN_FILE, "w") as f:
        json.dump({"token": token, "employee_id": employee_id}, f)


def register_agent() -> bool:
    global _token, _employee_id
    logger.info(f"Registering agent: {AGENT_NAME}")
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/auth/agent/register",
            json={
                "name": AGENT_NAME,
                "hostname": socket.gethostname(),
                "ip": get_local_ip(),
            },
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            _token = data["token"]
            _employee_id = data["employee_id"]
            save_token(_token, _employee_id)
            logger.info(f"Agent registered. Employee ID: {_employee_id}")
            return True
    except Exception as e:
        logger.error(f"Registration failed: {e}")
    return False


def get_headers() -> dict:
    return {"Authorization": f"Bearer {_token}", "Content-Type": "application/json"}


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# ─── Event Sending ────────────────────────────────────────────────────────────

def send_event(event_type: str, metadata: Dict[str, Any] = None) -> Optional[dict]:
    global _token, _employee_id
    if not _token:
        logger.warning("No token available, cannot send event")
        return None

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(
                f"{BACKEND_URL}/api/events/submit",
                json={"event_type": event_type, "metadata": metadata or {}},
                headers=get_headers(),
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                logger.info(f"Event accepted: {event_type} | action={data.get('action')}")
                return data
            elif resp.status_code == 401:
                logger.warning("Token expired, re-registering...")
                register_agent()
                continue
            else:
                logger.error(f"Event rejected: {resp.status_code} {resp.text[:100]}")
                return None
        except requests.exceptions.ConnectionError:
            logger.warning(f"Backend offline (attempt {attempt+1}/{MAX_RETRIES}), retrying in {RETRY_DELAY}s")
            time.sleep(RETRY_DELAY)
        except Exception as e:
            logger.error(f"Send event error: {e}")
            return None
    return None


def send_heartbeat():
    global _token
    if not _token:
        return
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/events/heartbeat",
            json={"ip": get_local_ip(), "hostname": socket.gethostname()},
            headers=get_headers(),
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            action = data.get("action")
            if action == "disable_usb":
                enforce_usb_disable()
        elif resp.status_code == 401:
            register_agent()
    except Exception as e:
        logger.debug(f"Heartbeat failed: {e}")


# ─── Cooldown Helper ──────────────────────────────────────────────────────────

def is_in_cooldown(event_type: str) -> bool:
    last = _cooldowns.get(event_type)
    if last and (datetime.now() - last).total_seconds() < COOLDOWN_SECONDS:
        return True
    return False


def set_cooldown(event_type: str):
    _cooldowns[event_type] = datetime.now()


def trigger_event(event_type: str, metadata: dict = None):
    if is_in_cooldown(event_type):
        logger.debug(f"Cooldown active for {event_type}, skipping")
        return
    set_cooldown(event_type)
    result = send_event(event_type, metadata)
    if result and result.get("action") == "disable_usb":
        enforce_usb_disable()


# ─── USB Detection ────────────────────────────────────────────────────────────

def get_usb_drives():
    drives = set()
    if platform.system() == "Windows":
        for part in psutil.disk_partitions():
            if "removable" in part.opts.lower() or part.fstype in ("FAT32", "exFAT", "FAT"):
                drives.add(part.device)
    return drives


def detect_usb():
    global _usb_drives_seen
    current = get_usb_drives()

    new_drives = current - _usb_drives_seen
    removed_drives = _usb_drives_seen - current

    for drive in new_drives:
        logger.warning(f"USB INSERTED: {drive}")
        trigger_event("usb_insertion", {"drive": drive})

    for drive in removed_drives:
        logger.info(f"USB removed: {drive}")
        send_event("usb_removal", {"drive": drive})

    _usb_drives_seen = current


# ─── Bulk Copy Detection ──────────────────────────────────────────────────────

_file_creation_times = []


def detect_bulk_copy():
    global _file_creation_times
    now = time.time()
    cutoff = now - BULK_COPY_WINDOW

    # Watch temp and user profile for rapid file creation (lightweight)
    watch_paths = []
    if platform.system() == "Windows":
        watch_paths = [
            os.path.join(os.environ.get("TEMP", ""), ""),
            os.path.join(os.environ.get("USERPROFILE", ""), "Desktop"),
        ]

    new_files = 0
    for path in watch_paths:
        if not os.path.isdir(path):
            continue
        try:
            for entry in os.scandir(path):
                if entry.is_file(follow_symlinks=False):
                    if entry.stat().st_mtime > cutoff:
                        new_files += 1
        except PermissionError:
            pass

    _file_creation_times.append((now, new_files))
    _file_creation_times = [(t, c) for t, c in _file_creation_times if t > cutoff]

    total_recent = sum(c for _, c in _file_creation_times)
    if total_recent >= BULK_COPY_THRESHOLD:
        logger.warning(f"BULK COPY detected: {total_recent} files in {BULK_COPY_WINDOW}s")
        trigger_event("bulk_copy", {"file_count": total_recent, "window_seconds": BULK_COPY_WINDOW})
        _file_creation_times.clear()


# ─── Night Login Detection ────────────────────────────────────────────────────

_night_login_checked = False


def detect_night_login():
    global _night_login_checked
    hour = datetime.now().hour
    if NIGHT_START <= hour < NIGHT_END:
        if not _night_login_checked:
            logger.warning(f"NIGHT LOGIN detected at {datetime.now().strftime('%H:%M')}")
            trigger_event("late_login", {"hour": hour, "time": datetime.now().isoformat()})
            _night_login_checked = True
    else:
        _night_login_checked = False


# ─── Unauthorized App Detection ───────────────────────────────────────────────

def detect_unauthorized_apps():
    try:
        for proc in psutil.process_iter(["name", "pid", "exe"]):
            try:
                name = (proc.info.get("name") or "").lower()
                if name in UNAUTHORIZED_APPS:
                    logger.warning(f"UNAUTHORIZED APP: {name} (PID {proc.info['pid']})")
                    trigger_event("unauthorized_app", {"process": name, "pid": proc.info["pid"]})
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception as e:
        logger.error(f"App detection error: {e}")


# ─── Keylogger Detection ──────────────────────────────────────────────────────

def detect_keyloggers():
    try:
        for proc in psutil.process_iter(["name", "pid"]):
            try:
                name = (proc.info.get("name") or "").lower()
                if name in KEYLOGGER_SIGNATURES:
                    logger.warning(f"KEYLOGGER DETECTED: {name} (PID {proc.info['pid']})")
                    trigger_event("keylogger_detected", {"process": name, "pid": proc.info["pid"]})
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception as e:
        logger.error(f"Keylogger detection error: {e}")


# ─── Suspicious Port Detection ────────────────────────────────────────────────

def detect_suspicious_ports():
    try:
        connections = psutil.net_connections(kind="inet")
        for conn in connections:
            if conn.status == "ESTABLISHED":
                rport = conn.raddr.port if conn.raddr else None
                if rport in SUSPICIOUS_PORTS:
                    lport = conn.laddr.port if conn.laddr else None
                    raddr = conn.raddr.ip if conn.raddr else "unknown"
                    logger.warning(f"SUSPICIOUS PORT: {raddr}:{rport}")
                    trigger_event("suspicious_port", {
                        "remote_ip": raddr,
                        "remote_port": rport,
                        "local_port": lport,
                    })
    except Exception as e:
        logger.error(f"Port detection error: {e}")


# ─── USB Enforcement ──────────────────────────────────────────────────────────

def enforce_usb_disable():
    if platform.system() != "Windows":
        logger.info("[Enforcement] USB disable skipped (non-Windows)")
        return
    try:
        cmd = r"reg add HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR /v Start /t REG_DWORD /d 4 /f"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            logger.warning("[ENFORCEMENT] USB storage DISABLED via registry")
            _log_enforcement("usb_disabled")
        else:
            logger.error(f"[ENFORCEMENT] USB disable failed: {result.stderr}")
    except Exception as e:
        logger.error(f"[ENFORCEMENT] USB disable exception: {e}")


def enforce_usb_enable():
    if platform.system() != "Windows":
        return
    try:
        cmd = r"reg add HKLM\SYSTEM\CurrentControlSet\Services\USBSTOR /v Start /t REG_DWORD /d 3 /f"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            logger.info("[ENFORCEMENT] USB storage RE-ENABLED")
            _log_enforcement("usb_enabled")
    except Exception as e:
        logger.error(f"[ENFORCEMENT] USB enable exception: {e}")


def _log_enforcement(action: str):
    entry = {
        "action": action,
        "timestamp": datetime.now().isoformat(),
        "hostname": socket.gethostname(),
    }
    log_path = Path("enforcement_log.json")
    history = []
    if log_path.exists():
        try:
            with open(log_path) as f:
                history = json.load(f)
        except Exception:
            pass
    history.append(entry)
    with open(log_path, "w") as f:
        json.dump(history[-100:], f, indent=2)


# ─── Heartbeat Thread ─────────────────────────────────────────────────────────

def heartbeat_thread():
    while True:
        time.sleep(HEARTBEAT_INTERVAL)
        send_heartbeat()


# ─── Main Detection Loop ──────────────────────────────────────────────────────

def detection_loop():
    logger.info("SentinelAI Agent: Detection loop started")
    while True:
        try:
            detect_usb()
            detect_bulk_copy()
            detect_night_login()
            detect_unauthorized_apps()
            detect_keyloggers()
            detect_suspicious_ports()
        except Exception as e:
            logger.error(f"Detection cycle error: {e}")
        time.sleep(POLL_INTERVAL)


def main():
    global _token, _employee_id
    logger.info("=" * 60)
    logger.info("SentinelAI Enterprise Edition — Endpoint Agent v1.0")
    logger.info(f"Hostname: {socket.gethostname()} | Platform: {platform.system()}")
    logger.info(f"Backend: {BACKEND_URL}")
    logger.info("=" * 60)

    # Load saved token or register
    saved = load_token()
    if saved:
        _token = saved["token"]
        _employee_id = saved["employee_id"]
        logger.info(f"Loaded token for employee ID {_employee_id}")
        # Verify token still valid
        try:
            resp = requests.post(
                f"{BACKEND_URL}/api/events/heartbeat",
                json={"ip": get_local_ip()},
                headers=get_headers(),
                timeout=5,
            )
            if resp.status_code == 401:
                logger.warning("Saved token expired, re-registering")
                if not register_agent():
                    logger.error("Registration failed. Exiting.")
                    sys.exit(1)
        except Exception:
            logger.warning("Backend unreachable at startup, using saved token")
    else:
        if not register_agent():
            logger.error("Initial registration failed. Ensure backend is running.")
            sys.exit(1)

    # Start heartbeat in background thread
    hb_thread = threading.Thread(target=heartbeat_thread, daemon=True)
    hb_thread.start()

    # Run detection
    detection_loop()


if __name__ == "__main__":
    main()
