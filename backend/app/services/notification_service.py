import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.notification import Notification, NotificationType
from app.models.user import User
from app.services.email_client import send_notification_email

logger = logging.getLogger("notification_service")

async def create_notification(
    db: AsyncSession,
    user_id: int,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.APPOINTMENT,
    link: str = None,
    send_email: bool = True
) -> Notification:
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        link=link
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    # Deliver real email notification per requirements (Section 5 & 14)
    if send_email:
        try:
            user_stmt = (
                select(User)
                .options(selectinload(User.patient_profile), selectinload(User.doctor_profile))
                .where(User.id == user_id)
            )
            res = await db.execute(user_stmt)
            user = res.scalar_one_or_none()
            if user and user.email:
                recipient_name = "User"
                if user.patient_profile and user.patient_profile.full_name:
                    recipient_name = user.patient_profile.full_name
                elif user.doctor_profile and user.doctor_profile.full_name:
                    recipient_name = f"Dr. {user.doctor_profile.full_name}"

                # Fire and log email dispatch
                asyncio.create_task(
                    send_notification_email(
                        email=user.email,
                        title=title,
                        message=message,
                        name=recipient_name
                    )
                )
        except Exception as e:
            logger.warning(f"Failed to dispatch email for notification {notif.id}: {e}")

    return notif
