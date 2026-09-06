import base64
from typing import Any, Dict

import httpx
from pydantic import Field

from notifications.providers.base import BaseProvider, ProviderResult
from notifications.providers.schemas import BaseProviderConfig

REQUEST_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


class HubtelConfig(BaseProviderConfig):
    """Configuration schema for Hubtel SMS."""

    client_id: str = Field(..., description="Hubtel client ID")
    client_secret: str = Field(..., description="Hubtel client secret")
    sender_id: str = Field(..., description="Sender ID")
    test_phone: str | None = Field(None, description="Test phone number")


class HubtelProvider(BaseProvider):
    key = "hubtel"
    name = "Hubtel SMS"
    channel = "sms"
    docs_url = "https://developers.hubtel.com/"
    icon_url = "https://hubtel.com/favicon.ico"
    config_schema = HubtelConfig

    API_URL = "https://sms.hubtel.com/v1/messages/send"

    def send(self, delivery, config: Dict[str, Any]) -> ProviderResult:
        """Send an SMS via the Hubtel API using a GET request with query parameters."""
        payload = {
            "clientid": config["client_id"],
            "clientsecret": config["client_secret"],
            "from": config["sender_id"],
            "to": self._format_for_sms(delivery.target_address),
            "content": delivery.notification.body,
        }

        try:
            response = httpx.get(self.API_URL, params=payload, timeout=REQUEST_TIMEOUT)
        except httpx.RequestError as exc:
            return ProviderResult(
                status="failed",
                error_message=f"Network error: {str(exc)}",
            )

        if response.status_code == 201:
            return ProviderResult(status="sent", external_id=None)

        return ProviderResult(
            status="failed",
            error_message=f"Hubtel error: {response.status_code} {response.text[:200]}",
        )

    def test_connection(self, config: Dict[str, Any]) -> tuple[bool, str]:
        """Test the connection by validating credentials via HTTP Basic Auth."""
        client_id = config.get("client_id", "").strip()
        client_secret = config.get("client_secret", "").strip()

        if not client_id or not client_secret:
            return False, "Client ID and Client Secret are required"

        credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()

        try:
            response = httpx.get(
                "https://sms.hubtel.com/v1/messages",
                headers={"Authorization": f"Basic {credentials}"},
                params={"limit": 1},
                timeout=REQUEST_TIMEOUT,
            )
        except httpx.TimeoutException:
            return False, "Connection timeout"
        except httpx.RequestError:
            return False, "Connection error"
        except Exception as e:
            return False, f"Validation failed: {str(e)}"

        if response.status_code == 200:
            return True, "Connection successful. Credentials are valid."
        if response.status_code == 401:
            return False, "Invalid credentials"
        return False, f"API error: HTTP {response.status_code}"

    @staticmethod
    def _format_for_sms(mobile_number: str) -> str:
        if mobile_number.startswith("+"):
            return mobile_number
        if mobile_number.startswith("0"):
            return f"+233{mobile_number[1:]}"
        if mobile_number.startswith("233"):
            return f"+{mobile_number}"
        return f"+233{mobile_number}"
