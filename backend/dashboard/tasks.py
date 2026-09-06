import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(name="dashboard.send_workspace_invite_email", acks_late=True)
def send_workspace_invite_email(
    invite_id: str,
    invite_email: str,
    workspace_name: str,
    inviter_name: str,
    role: str,
    invite_link: str,
) -> dict:
    """Sends the workspace invitation email with the single-use invite link."""
    subject = f"You've been invited to join {workspace_name} on noti"
    body = (
        f"Hi,\n\n"
        f"{inviter_name} has invited you to join {workspace_name} on noti"
        f" as {role}.\n\n"
        f"Accept your invitation: {invite_link}\n\n"
        "This link expires in 7 days.\n"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [invite_email])
    logger.info("invite_email_sent invite_id=%s email=%s", invite_id, invite_email)
    return {"status": "sent", "invite_id": invite_id, "to": invite_email}
