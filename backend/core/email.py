"""SMTP email sending for verification codes."""
import logging
import random
import smtplib
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from backend.core.config import settings

_log = logging.getLogger(__name__)


def generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


def send_verification_email(to_email: str, code: str, purpose: str = "signup") -> None:
    if purpose == "signup":
        subject = "Verify your 1nexio account"
        action = "verify your account"
    else:
        subject = "Your 1nexio login code"
        action = "sign in"

    html = f"""
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#080810;font-family:system-ui,sans-serif;">
      <div style="max-width:480px;margin:40px auto;padding:40px;background:#0f0f1a;border-radius:16px;border:1px solid rgba(255,255,255,0.08);">
        <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px;">1nexio</div>
        <div style="font-size:13px;color:#666;margin-bottom:32px;">Your AI Workforce</div>
        <p style="color:#aaa;font-size:14px;margin-bottom:24px;">
          Use the code below to {action}. It expires in <strong style="color:#fff">10 minutes</strong>.
        </p>
        <div style="background:#080810;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#0d9488;font-family:monospace;">{code}</span>
        </div>
        <p style="color:#555;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    if not settings.SMTP_HOST:
        _log.warning(f"SMTP not configured — verification code for {to_email}: {code}")
        return

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
    except Exception as e:
        _log.error(f"Failed to send email to {to_email}: {e}")
        raise RuntimeError(f"Email delivery failed: {e}")
