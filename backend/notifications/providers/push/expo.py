import hashlib
import re
from functools import lru_cache
from typing import Any, Dict

import httpx
from pydantic import Field, field_validator

from notifications.providers.base import BaseProvider, ProviderResult
from notifications.providers.schemas import BaseProviderConfig

EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send"
EXPO_RECEIPTS_API_URL = "https://exp.host/--/api/v2/push/getReceipts"

REQUEST_TIMEOUT = httpx.Timeout(27.0, connect=3.05)

EXPO_TOKEN_PATTERN = re.compile(r"^ExponentPushToken\[[a-zA-Z0-9_-]+\]$")


class ExpoConfig(BaseProviderConfig):
    """Configuration schema for Expo Push Notifications."""

    access_token: str = Field(
        ..., min_length=10, description="Expo access token from Expo dashboard settings"
    )
    max_retries: int = Field(
        default=3, ge=1, le=10, description="Maximum connection retry attempts"
    )
    use_fcm_v1: bool = Field(
        default=True, description="Use FCM v1 for Android (recommended)"
    )

    @field_validator("access_token")
    @classmethod
    def validate_token_format(cls, v: str) -> str:
        """Validate the access token is non-empty after stripping."""
        if not v or not v.strip():
            raise ValueError("Access token cannot be empty")
        return v.strip()


class ExpoProvider(BaseProvider):
    """Expo push notification provider using the Expo Push HTTP API."""

    key = "expo"
    name = "Expo Push Notifications"
    channel = "push"
    docs_url = "https://docs.expo.dev/push-notifications/overview/"
    icon_url = "/icons/providers/expo.svg"
    config_schema = ExpoConfig

    ERROR_MAPPINGS = {
        "DeviceNotRegistered": "registration-token-not-registered",
        "InvalidCredentials": "invalid-credentials",
        "InvalidExpoPushToken": "invalid-token-format",
        "MessageTooBig": "payload-too-large",
        "MessageRateExceeded": "rate-limit-exceeded",
        "InvalidProvider": "invalid-provider",
        "InternalServerError": "provider-server-error",
    }

    def send(self, delivery, config: Dict[str, Any]) -> ProviderResult:
        token = str(delivery.target_address)
        if not self._validate_token_format(token):
            return ProviderResult(
                status="failed",
                error_message="invalid-token-format",
                details={"token": token[:20] + "..." if len(token) > 20 else token},
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
        """Validate the Expo push token format ExponentPushToken[...]."""
        if not token:
            return False
        return bool(EXPO_TOKEN_PATTERN.match(token))

    def _send_push(self, delivery, config: Dict[str, Any]) -> ProviderResult:
        payload = self._build_payload(delivery)

        access_token = config.get("access_token", "")
        client = _get_client(
            hashlib.sha256(access_token.encode()).hexdigest(),
            int(config.get("max_retries", 3)),
        )

        headers = {"Content-Type": "application/json"}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        url = EXPO_PUSH_API_URL
        if config.get("use_fcm_v1"):
            url += "?useFcmV1=true"

        response = client.post(url, json=payload, headers=headers, timeout=REQUEST_TIMEOUT)

        if response.status_code == 429:
            return ProviderResult(
                status="failed",
                error_message="rate-limit-exceeded",
                details={"retry_after": response.headers.get("Retry-After")},
            )

        if response.status_code >= 500:
            return ProviderResult(
                status="failed",
                error_message="provider-server-error",
                details={"status_code": response.status_code},
            )

        if response.status_code != 200:
            return ProviderResult(
                status="failed",
                error_message=f"http-error-{response.status_code}",
                details={"response": response.text[:500]},
            )

        try:
            data = response.json()
        except ValueError as exc:
            return ProviderResult(
                status="failed",
                error_message="invalid-json-response",
                details={"error": str(exc)},
            )

        if data.get("errors"):
            error = data["errors"][0]
            error_code = error.get("code", "Unknown")
            return ProviderResult(
                status="failed",
                error_message=self.ERROR_MAPPINGS.get(error_code, error_code.lower()),
                details={
                    "expo_error_code": error_code,
                    "expo_error_message": error.get("message", "Unknown error"),
                },
            )

        data_field = data.get("data", {})
        if isinstance(data_field, dict) and data_field.get("status") == "error":
            error_details = data_field.get("details", {})
            error_code = error_details.get("error", "Unknown")
            return ProviderResult(
                status="failed",
                error_message=self.ERROR_MAPPINGS.get(error_code, error_code.lower()),
                details={
                    "expo_error_code": error_code,
                    "expo_error_details": error_details,
                },
            )

        ticket_id = None
        if isinstance(data_field, dict):
            ticket_id = data_field.get("id")
        elif isinstance(data_field, list) and data_field:
            ticket_id = data_field[0].get("id")

        return ProviderResult(
            status="sent",
            external_id=ticket_id,
            details={"expo_response": data, "ticket_id": ticket_id},
        )

    def _build_payload(self, delivery) -> Dict[str, Any]:
        """Build the Expo push notification payload."""
        notification = delivery.notification

        payload = {
            "to": delivery.target_address,
            "title": notification.title or "",
            "body": notification.body or "",
        }

        if notification.data:
            payload["data"] = notification.data

        if notification.image_url:
            payload["image"] = notification.image_url

        payload["priority"] = "high"
        payload["sound"] = "default"

        if notification.data and "badge" in notification.data:
            try:
                payload["badge"] = int(notification.data["badge"])
            except (ValueError, TypeError):
                pass

        if notification.data and "channelId" in notification.data:
            payload["channelId"] = notification.data["channelId"]

        return payload

    @classmethod
    def get_receipts(
        cls,
        ticket_ids: list,
        access_token: str,
        timeout: httpx.Timeout = REQUEST_TIMEOUT,
    ) -> Dict[str, Any]:
        """Fetch delivery receipts for ticket IDs, chunked in groups of 1000."""
        if not ticket_ids:
            return {}

        client = _get_client(hashlib.sha256(access_token.encode()).hexdigest(), 3)

        headers = {"Content-Type": "application/json"}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"

        all_receipts = {}
        for i in range(0, len(ticket_ids), 1000):
            chunk = ticket_ids[i : i + 1000]
            try:
                response = client.post(
                    EXPO_RECEIPTS_API_URL,
                    json={"ids": chunk},
                    headers=headers,
                    timeout=timeout,
                )
                if response.status_code == 200:
                    all_receipts.update(response.json().get("data", {}))
                else:
                    all_receipts[f"error_{i}"] = {
                        "error": f"HTTP {response.status_code}",
                        "response": response.text[:500],
                    }
            except Exception as exc:
                all_receipts[f"error_{i}"] = {
                    "error": str(exc),
                    "exception_type": type(exc).__name__,
                }

        return all_receipts


@lru_cache(maxsize=32)
def _get_client(token_hash: str, max_retries: int) -> httpx.Client:
    """Get a cached httpx client (connection pool per access token)."""
    return httpx.Client(
        transport=httpx.HTTPTransport(retries=max_retries),
        timeout=REQUEST_TIMEOUT,
        headers={"Accept": "application/json", "Accept-Encoding": "gzip, deflate"},
    )
