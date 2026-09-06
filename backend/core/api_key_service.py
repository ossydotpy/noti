import hashlib
import secrets
import logging
from typing import Tuple

from .models import APIKey, Workspace
from .signals import api_key_used

logger = logging.getLogger(__name__)


class APIKeyService:
    PREFIX_LIVE = "ns_live_"
    PREFIX_TEST = "ns_test_"

    @staticmethod
    def generate_key(is_test: bool = False) -> str:
        """Generates a secure random API key. Format: ns_live_<urlsafe_token>"""
        prefix = APIKeyService.PREFIX_TEST if is_test else APIKeyService.PREFIX_LIVE
        token = secrets.token_urlsafe(24)
        return f"{prefix}{token}"

    @staticmethod
    def hash_key(key: str) -> str:
        """SHA256 — keys are high-entropy so a fast hash is fine."""
        return hashlib.sha256(key.encode()).hexdigest()

    @classmethod
    def create_api_key(
        cls, workspace: Workspace, name: str, created_by=None
    ) -> Tuple[APIKey, str]:
        raw_key = cls.generate_key()
        key_hash = cls.hash_key(raw_key)
        key_prefix = raw_key[:16]

        api_key = APIKey.objects.create(
            workspace=workspace,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            created_by=created_by,
            scopes=["*"],
        )

        logger.info(
            "api_key.created workspace_id=%s key_prefix=%s",
            workspace.id,
            key_prefix,
        )

        return api_key, raw_key

    @classmethod
    def get_api_key_from_key(cls, raw_key: str) -> APIKey | None:
        if not raw_key:
            return None

        if not (
            raw_key.startswith(cls.PREFIX_LIVE) or raw_key.startswith(cls.PREFIX_TEST)
        ):
            return None

        hashed = cls.hash_key(raw_key)

        try:
            prefix_lookup = raw_key[:16]

            api_key = APIKey.objects.select_related("workspace").get(
                key_prefix=prefix_lookup, key_hash=hashed
            )

            if api_key.is_revoked:
                logger.error("api_key.revoked key_prefix=%s", prefix_lookup)
                return None

            if api_key.is_expired:
                logger.error("api_key.expired key_prefix=%s", prefix_lookup)
                return None

            api_key_used.send(sender=cls, api_key_id=api_key.id)

            return api_key

        except APIKey.DoesNotExist:
            prefix = raw_key[:16] if len(raw_key) >= 16 else raw_key[:8]
            logger.error("api_key.not_found key_prefix=%s", prefix)
            return None

    @classmethod
    def get_workspace_from_key(cls, raw_key: str) -> Workspace | None:
        api_key = cls.get_api_key_from_key(raw_key)
        if not api_key:
            return None
        return api_key.workspace
