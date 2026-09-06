import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db.models import Q
from django.utils import timezone

from notifications.models import Delivery, Device, InAppNotification, Notification
from notifications.providers.registry import ProviderRegistry
from notifications.services import FanoutService

logger = logging.getLogger(__name__)


@shared_task(bind=True, name="notifications.dispatch_scheduled", max_retries=1)
def dispatch_scheduled_notifications(self):
    """Dispatch scheduled notifications that are due (runs every minute via beat)."""
    due_notifications = Notification.objects.filter(
        status="scheduled",
        scheduled_at__lte=timezone.now(),
    ).select_related("workspace")[:100]

    dispatched_count = 0
    for notification in due_notifications:
        notification.status = "pending"
        notification.save(update_fields=["status", "updated_at"])
        process_notification_task.delay(str(notification.id))
        dispatched_count += 1

    return dispatched_count


@shared_task(
    bind=True,
    name="notifications.process_notification",
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
)
def process_notification_task(self, notification_id: str):
    """Fan out a notification intent into deliveries and enqueue execution."""
    try:
        notification = Notification.objects.select_related(
            "subscriber", "workspace"
        ).get(id=notification_id)
    except Notification.DoesNotExist:
        logger.error("notification.not_found notification_id=%s", notification_id)
        return

    if notification.status != "pending":
        logger.info(
            "notification.skipped notification_id=%s status=%s",
            notification_id,
            notification.status,
        )
        return

    try:
        deliveries = FanoutService.process(notification)
    except Exception as exc:
        raise self.retry(exc=exc)

    for delivery in deliveries:
        if delivery.channel != "in_app":
            execute_delivery_task.delay(str(delivery.id))


@shared_task(
    bind=True,
    name="notifications.execute_delivery",
    max_retries=5,
    default_retry_delay=30,
    acks_late=True,
)
def execute_delivery_task(self, delivery_id: str):
    """Execute a single delivery via its provider."""
    try:
        delivery = Delivery.objects.select_related(
            "notification", "workspace", "device"
        ).get(id=delivery_id)
    except Delivery.DoesNotExist:
        logger.error("delivery.not_found delivery_id=%s", delivery_id)
        return

    if delivery.status != "pending":
        logger.info(
            "delivery.skipped delivery_id=%s status=%s",
            delivery_id,
            delivery.status,
        )
        return

    provider = Provider.objects.filter(
        workspace=delivery.workspace,
        provider_type=delivery.provider,
        is_active=True,
    ).first()

    if not provider:
        record_failed_delivery(
            delivery,
            error_code="provider_not_configured",
            error_message="Provider not configured for workspace",
        )
        return

    provider_cls = ProviderRegistry.get(provider.provider_type)
    if not provider_cls:
        record_failed_delivery(
            delivery,
            error_code="provider_not_registered",
            error_message="Provider is not registered",
        )
        return

    try:
        config = provider_cls.validate_config(provider.config or {})
    except Exception as exc:
        record_failed_delivery(
            delivery,
            error_code="invalid_provider_config",
            error_message=str(exc),
        )
        return

    try:
        result = provider_cls().send(delivery, config)
    except Exception as exc:
        delivery.retry_count += 1
        delivery.error_code = "provider_exception"
        delivery.error_message = str(exc)
        delivery.save(
            update_fields=["retry_count", "error_code", "error_message", "updated_at"]
        )
        raise self.retry(exc=exc)

    if result.status in ("sent", "delivered"):
        delivery.status = result.status
        delivery.provider_msg_id = result.external_id
        if result.status == "sent":
            delivery.sent_at = timezone.now()
        else:
            delivery.delivered_at = timezone.now()
        delivery.save(
            update_fields=[
                "status",
                "provider_msg_id",
                "sent_at",
                "delivered_at",
                "updated_at",
            ]
        )
        return

    record_failed_delivery(
        delivery,
        error_code="provider_failed",
        error_message=result.error_message,
    )

    if delivery.channel == "push" and delivery.device and result.error_message:
        invalid_token_errors = [
            "registration-token-not-registered",
            "invalid-argument",
            "invalid-token-format",
            "invalid-credentials",
        ]
        if any(err in result.error_message for err in invalid_token_errors):
            Device.objects.filter(id=delivery.device.id).update(is_active=False)
            logger.info(
                "device.deactivated_invalid_token device_id=%s workspace_id=%s error=%s",
                delivery.device.id,
                delivery.workspace_id,
                result.error_message,
            )


@shared_task(bind=True, name="notifications.archive_expired_notifications")
def archive_expired_notifications(self):
    """Archive expired and stale in-app notifications."""
    now = timezone.now()
    archive_days = getattr(settings, "IN_APP_ARCHIVE_DAYS", 30)
    cutoff = now - timedelta(days=archive_days)

    expired_filter = Q(expires_at__isnull=False, expires_at__lt=now)
    stale_filter = Q(expires_at__isnull=True, created_at__lt=cutoff)

    updated = (
        InAppNotification.objects.filter(archived_at__isnull=True)
        .filter(expired_filter | stale_filter)
        .update(
            archived_at=now,
            updated_at=now,
        )
    )

    return updated


def record_failed_delivery(
    delivery: Delivery, *, error_code: str, error_message: str
) -> None:
    """Mark a delivery as failed with the given error details."""
    delivery.status = "failed"
    delivery.failed_at = timezone.now()
    delivery.error_code = error_code
    delivery.error_message = error_message
    delivery.save(
        update_fields=[
            "status",
            "failed_at",
            "error_code",
            "error_message",
            "updated_at",
        ]
    )
    logger.error(
        "delivery.failed delivery_id=%s channel=%s provider=%s error_code=%s",
        delivery.id,
        delivery.channel,
        delivery.provider,
        error_code,
    )
