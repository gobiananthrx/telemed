import httpx
import logging
from app.core.config import settings

logger = logging.getLogger("email_client")

async def send_otp_email(email: str, otp: str, purpose: str = "REGISTRATION", name: str = "Patient") -> dict:
    url = f"{settings.EMAIL_SERVICE_URL}/send-otp"
    payload = {
        "email": email,
        "otp": otp,
        "purpose": purpose,
        "name": name
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Email service returned status {response.status_code}: {response.text}")
                return {"success": False, "otp": otp}
    except Exception as e:
        logger.warning(f"Failed to reach email service at {url}: {e}. Falling back to local logging.")
        print(f"\n[LOCAL OTP FALLBACK] To: {email} | Code: {otp} | Purpose: {purpose}\n")
        return {"success": True, "otp": otp, "fallback": True}

async def send_notification_email(email: str, title: str, message: str, name: str = "Valued User") -> dict:
    url = f"{settings.EMAIL_SERVICE_URL}/send-notification"
    payload = {
        "email": email,
        "title": title,
        "message": message,
        "name": name
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(url, json=payload)
            return response.json()
    except Exception as e:
        logger.warning(f"Notification email dispatch error: {e}")
        return {"success": True, "fallback": True}
