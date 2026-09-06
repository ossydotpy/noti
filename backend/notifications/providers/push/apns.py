import hashlib
import time
from functools import lru_cache
from typing import Any, Dict

import httpx
import jwt
from pydantic import Field, field_validator

from notifications.providers.base import BaseProvider, ProviderResult
from notifications.providers.schemas import BaseProviderConfig

APNS_PRODUCTION_URL = "https://api.push.apple.com"
APNS_SANDBOX_URL = "https://api.sandbox.push.apple.com"

TOKEN_EXPIRY = 3000  # Apple allows up to 60 minutes; use 50.


class ApnsConfig(BaseProviderConfig):
    """Configuration schema for APNs (Apple Push Notification service)."""

    team_id: str = Field(
        ..., min_length=10, max_length=10, description="10-character Apple Team ID"
    )
    key_id: str = Field(
        ..., min_length=10, max_length=10, description="10-character Key ID"
    )
    bundle_id: str = Field(..., description="App Bundle ID (e.g. com.example.app)")
    auth_key: str = Field(..., description="Contents of the .p8 auth key file")
    use_sandbox: bool = Field(default=False, description="Use APNs sandbox environment")

    @field_validator("team_id", "key_id")
    @classmethod
    def validate_ids(cls, v: str) -> str:
        """Ensure IDs are alphanumeric and uppercase."""
        if not v.isalnum():
            raise ValueError("Must be alphanumeric")
        return v.upper()

    @property
    def base_url(self) -> str:
        """Return the appropriate APNs base URL."""
        return APNS_SANDBOX_URL if self.use_sandbox else APNS_PRODUCTION_URL


class ApnsProvider(BaseProvider):
    """APNs push provider using HTTP/2 and JWT token authentication."""

    key = "apns"
    name = "Apple Push Notification service"
    channel = "push"
    docs_url = "https://developer.apple.com/documentation/usernotifications"
    icon_url = "/icons/providers/apns.svg"
    config_schema = ApnsConfig

    ERROR_MAPPINGS = {
        "BadDeviceToken": "registration-token-not-registered",
        "Unregistered": "registration-token-not-registered",
        "ExpiredProviderToken": "invalid-credentials",
        "Forbidden": "invalid-credentials",
        "InvalidProviderToken": "invalid-credentials",
        "PayloadTooLarge": "payload-too-large",
        "TooManyRequests": "rate-limit-exceeded",
        "InternalServerError": "provider-server-error",
        "ServiceUnavailable": "provider-server-error",
        "Shutdown": "provider-server-error",
    }

    def send(self, delivery, config: Dict[str, Any]) -> ProviderResult:
        token = str(delivery.target_address)
        if not self._validate_token_format(token):
            return ProviderResult(
                status="failed",
                error_message="invalid-token-format",
                details={"token": token},
            )

        try:
            return self._send_push(delivery, config)
        except httpx.TimeoutException as exc:
            return ProviderResult(
                status="failed",
                error_message="request-timeout",
                details={"error": str(exc)},
            )
        except httpx.RequestError as exc:
            return ProviderResult(
                status="failed",
                error_message="connection-error",
                details={"error": str(exc)},
            )
        except Exception as exc:
            return ProviderResult(
                status="failed",
                error_message=str(exc),
                details={"exception_type": type(exc).__name__},
            )

    def _validate_token_format(self, token: str) -> bool:
        """Validate an APNs device token (64 hex characters)."""
        if len(token) != 64:
            return False
        try:
            int(token, 16)
            return True
        except ValueError:
            return False

    def _send_push(self, delivery, config_dict: Dict[str, Any]) -> ProviderResult:
        config = ApnsConfig(**config_dict)

        auth_token = _get_cached_token(config.team_id, config.key_id, config.auth_key)
        client = _get_client(config.base_url)

        headers = {
            "authorization": f"bearer {auth_token}",
            "apns-topic": config.bundle_id,
            "apns-push-type": "alert",
            "apns-priority": "10",
        }

        payload = self._build_payload(delivery)
        metadata = delivery.notification.data or {}

        if payload.get("aps", {}).get("content-available") == 1:
            if "apns-push-type" not in metadata:
                headers["apns-push-type"] = "background"
                headers["apns-priority"] = "5"

        if "apns-push-type" in metadata:
            headers["apns-push-type"] = metadata["apns-push-type"]

        if "apns-priority" in metadata:
            headers["apns-priority"] = str(metadata["apns-priority"])

        if "apns-collapse-id" in metadata:
            headers["apns-collapse-id"] = metadata["apns-collapse-id"]

        response = client.post(
            f"/3/device/{delivery.target_address}",
            json=payload,
            headers=headers,
            timeout=httpx.Timeout(timeout=27.0, connect=3.05),
        )

        if response.status_code == 200:
            apns_id = response.headers.get("apns-id")
            return ProviderResult(
                status="sent", external_id=apns_id, details={"apns_id": apns_id}
            )

        try:
            reason = response.json().get("reason", "Unknown")
        except Exception:
            reason = f"HTTP_{response.status_code}"

        return ProviderResult(
            status="failed",
            error_message=self.ERROR_MAPPINGS.get(reason, reason.lower()),
            details={
                "apns_reason": reason,
                "status_code": response.status_code,
                "response": response.text[:500],
            },
        )

    def _build_payload(self, delivery) -> Dict[str, Any]:
        """Build the APNs JSON payload."""
        notification = delivery.notification

        aps: Dict[str, Any] = {
            "alert": {
                "title": notification.title or "",
                "body": notification.body or "",
            },
            "sound": "default",
        }
        payload = {"aps": aps}

        if notification.data:
            APS_KEYS = {
                "badge",
                "content-available",
                "mutable-content",
                "category",
                "thread-id",
                "target-content-id",
                "interruption-level",
                "relevance-score",
            }

            for key, value in notification.data.items():
                if key in APS_KEYS:
                    aps[key] = value
                elif not key.startswith("apns-"):
                    payload[key] = value

        if aps.get("content-available") == 1 and not (
            notification.title or notification.body
        ):
            aps.pop("alert", None)
            aps.pop("sound", None)

        return payload


@lru_cache(maxsize=10)
def _get_client(base_url: str) -> httpx.Client:
    """Get a cached HTTP/2 client for connection pooling."""
    return httpx.Client(http2=True, base_url=base_url)


_TOKEN_CACHE: Dict[str, Dict[str, Any]] = {}


def _get_cached_token(team_id: str, key_id: str, auth_key: str) -> str:
    """Get a valid APNs authentication token, using the cache when possible."""
    cache_key = hashlib.sha256(f"{team_id}:{key_id}:{auth_key}".encode()).hexdigest()

    now = int(time.time())
    cached = _TOKEN_CACHE.get(cache_key)

    if cached and cached["expiry"] > now:
        return cached["token"]

    token = jwt.encode(
        {"iss": team_id, "iat": now},
        auth_key,
        algorithm="ES256",
        headers={"alg": "ES256", "kid": key_id},
    )

    _TOKEN_CACHE[cache_key] = {"token": token, "expiry": now + TOKEN_EXPIRY}

    return token
