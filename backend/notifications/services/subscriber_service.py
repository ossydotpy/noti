import logging
from typing import Any, Dict, Optional

from core.models import Workspace
from notifications.models import Subscriber

logger = logging.getLogger(__name__)


class SubscriberService:
    @staticmethod
    def upsert_subscriber(
        workspace: Workspace,
        external_id: str,
        email: Optional[str] = None,
        phone_number: Optional[str] = None,
        data: Optional[Dict[str, Any]] = None,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        timezone: str = "UTC",
        locale: str = "en",
    ) -> Subscriber:
        """Create or update a subscriber profile keyed by (workspace, external_id)."""
        defaults = {
            "timezone": timezone,
            "locale": locale,
            "is_active": True,
        }

        if email is not None:
            defaults["email"] = email
        if phone_number is not None:
            defaults["phone_number"] = phone_number
        if data is not None:
            defaults["data"] = data
        if first_name is not None:
            defaults["first_name"] = first_name
        if last_name is not None:
            defaults["last_name"] = last_name

        subscriber, created = Subscriber.objects.update_or_create(
            workspace=workspace, external_id=external_id, defaults=defaults
        )

        logger.info(
            "subscriber.upserted workspace_id=%s external_id=%s created=%s",
            workspace.id,
            external_id,
            created,
        )

        return subscriber
