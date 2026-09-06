import logging
from typing import Any, Dict, Optional

from django.utils import timezone

from core.models import Workspace
from notifications.models import Device, Subscriber

logger = logging.getLogger(__name__)


class DeviceService:
    @staticmethod
    def register_device(
        workspace: Workspace,
        subscriber: Subscriber,
        push_token: str,
        platform: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Device:
        """Register a device push token, transferring ownership if it already exists."""
        device = Device.objects.filter(
            workspace=workspace, push_token=push_token
        ).first()

        if device:
            ownership_changed = device.subscriber_id != subscriber.id
            device.subscriber = subscriber
            device.is_active = True
            device.archived_at = None
            device.platform = platform
            device.last_seen = timezone.now()
            if metadata:
                device.metadata = metadata
            device.save()

            logger.info(
                "device.updated workspace_id=%s device_id=%s platform=%s ownership_changed=%s",
                workspace.id,
                device.id,
                platform,
                ownership_changed,
            )
        else:
            device = Device.objects.create(
                workspace=workspace,
                subscriber=subscriber,
                push_token=push_token,
                platform=platform,
                metadata=metadata or {},
                is_active=True,
            )

            logger.info(
                "device.registered workspace_id=%s device_id=%s platform=%s",
                workspace.id,
                device.id,
                platform,
            )

        return device

    @staticmethod
    def delete_device(device: Device) -> None:
        """Soft delete a device."""
        device.is_active = False
        device.archived_at = timezone.now()
        device.save()

        logger.info(
            "device.deleted workspace_id=%s device_id=%s", device.workspace_id, device.id
        )
