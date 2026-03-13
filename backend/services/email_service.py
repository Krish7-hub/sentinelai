import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
ALERT_RECIPIENT = os.getenv("ALERT_EMAIL", "security@company.com")

async def send_high_risk_alert(employee, risk, violation):
    if not SMTP_USER or not SMTP_PASS:
        logger.warning("SMTP not configured. Skipping email.")
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[CRITICAL] HIGH RISK: {employee.name} - SentinelAI"
    msg["From"] = SMTP_USER
    msg["To"] = ALERT_RECIPIENT
    body = f"Employee {employee.name} has reached HIGH risk (score: {risk.score:.1f}). Investigate immediately."
    msg.attach(MIMEText(body, "plain"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, ALERT_RECIPIENT, msg.as_string())
        logger.info(f"Alert email sent for {employee.name}")
    except Exception as e:
        logger.error(f"Email failed: {e}")
