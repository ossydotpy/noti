import logging

from django.utils import timezone

from notifications.models import Delivery, Device, InAppNotification, Notification, Provider

logger = logging.getLogger(__name__)


class FanoutService:
    @staticmethod
    def process(notification: Notification) -> list[Delivery]:
        """Fan out a Notification intent into Delivery records per channel."""
        deliveries = []
        workspace = notification.workspace
        subscriber = notification.subscriber

        notification.status = "processing"
        notification.save(update_fields=["status", "updated_at"])

        for channel in notification.channels:
            if channel == "push":
                deliveries += FanoutService._fanout_push(
                    notification, workspace, subscriber
                )
            elif channel == "sms":
                delivery = FanoutService._fanout_sms(
                    notification, workspace, subscriber
                )
                if delivery:
                    deliveries.append(delivery)
            elif channel == "in_app":
                delivery = FanoutService._fanout_in_app(
                    notification, workspace, subscriber
                )
                if delivery:
                    deliveries.append(delivery)
            elif channel == "email":
                delivery = FanoutService._fanout_email(
                    notification, workspace, subscriber
                )
                if delivery:
                    deliveries.append(delivery)

        notification.delivery_count = len(deliveries)
        if not deliveries:
            notification.status = "failed"
            notification.completed_at = timezone.now()
            logger.error(
                "fanout.empty workspace_id=%s notification_id=%s channels=%s",
                workspace.id,
                notification.id,
                notification.channels,
            )
        notification.save(
            update_fields=[
                "delivery_count",
                "status",
                "completed_at",
                "updated_at",
            ]
        )

        return deliveries

    @staticmethod
    def _fanout_push(notification, workspace, subscriber) -> list[Delivery]:
        """Create a Delivery for each active device."""
        provider = FanoutService._resolve_provider(workspace, "push")
        if not provider:
            logger.error(
                "push.provider_not_configured workspace_id=%s notification_id=%s",
                workspace.id,
                notification.id,
            )
            return []

        devices = Device.objects.filter(
            workspace=workspace,
            subscriber=subscriber,
            is_active=True,
            archived_at__isnull=True,
        )

        return [
            Delivery.objects.create(
                workspace=workspace,
                notification=notification,
                subscriber=subscriber,
                device=device,
                channel="push",
                target_address=device.push_token,
                provider=provider,
            )
            for device in devices
        ]

    @staticmethod
    def _fanout_sms(notification, workspace, subscriber) -> Delivery | None:
        """Create one Delivery for the SMS channel."""
        if not subscriber.phone_number:
            logger.error(
                "subscriber.no_phone_for_sms notification_id=%s subscriber_id=%s",
                notification.id,
                subscriber.id,
            )
            return None

        provider = FanoutService._resolve_provider(workspace, "sms")
        if not provider:
            logger.error(
                "sms.provider_not_configured workspace_id=%s notification_id=%s",
                workspace.id,
                notification.id,
            )
            return None

        return Delivery.objects.create(
            workspace=workspace,
            notification=notification,
            subscriber=subscriber,
            channel="sms",
            target_address=subscriber.phone_number,
            provider=provider,
        )

    @staticmethod
    def _fanout_in_app(notification, workspace, subscriber) -> Delivery:
        """Create InAppNotification + Delivery (in-app has no external provider)."""
        in_app_data = notification.data.get("in_app_overrides", {})

        InAppNotification.objects.create(
            workspace=workspace,
            notification=notification,
            subscriber=subscriber,
            title=notification.title,
            body=notification.body,
            data=notification.data,
            category=in_app_data.get("category", "info"),
            action_url=in_app_data.get("action_url"),
            image_url=notification.image_url,
            expires_at=in_app_data.get("expires_at"),
        )

        return Delivery.objects.create(
            workspace=workspace,
            notification=notification,
            subscriber=subscriber,
            channel="in_app",
            target_address="in_app",
            status="delivered",
            provider="",
            delivered_at=timezone.now(),
        )

    @staticmethod
    def _fanout_email(notification, workspace, subscriber) -> Delivery | None:
        """Create one Delivery for the Email channel."""
        if not subscriber.email:
            logger.error(
                "subscriber.no_email notification_id=%s subscriber_id=%s",
                notification.id,
                subscriber.id,
            )
            return None

        provider = FanoutService._resolve_provider(workspace, "email")
        if not provider:
            logger.error(
                "email.provider_not_configured workspace_id=%s notification_id=%s",
                workspace.id,
                notification.id,
            )
            return None

        return Delivery.objects.create(
            workspace=workspace,
            notification=notification,
            subscriber=subscriber,
            channel="email",
            target_address=subscriber.email,
            provider=provider,
        )

    @staticmethod
    def _resolve_provider(workspace, channel: str) -> str | None:
        """Resolve the active provider type for a channel, honoring a workspace default."""
        if channel == "sms":
            default = (workspace.settings or {}).get("default_sms_provider")
            if default:
                return default

        provider = Provider.objects.filter(
            workspace=workspace,
            channel=channel,
            is_active=True,
        ).order_by("priority").first()

        return provider.provider_type if provider else None
