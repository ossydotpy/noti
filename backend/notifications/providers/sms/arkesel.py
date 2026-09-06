from typing import Any, Dict

import httpx
from pydantic import Field, SecretStr

from notifications.models import Delivery
from notifications.providers.base import BaseProvider, ProviderResult
from notifications.providers.schemas import BaseProviderConfig

ARKESEL_BALANCE_URL = "https://sms.arkesel.com/api/v2/clients/balance-details"
REQUEST_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


class ArkeselConfig(BaseProviderConfig):
    """Configuration schema for Arkesel SMS."""

    api_key: SecretStr = Field(..., description="Arkesel API Key (v2)")
    sender_id: str = Field(..., description="Sender ID (max 11 chars)", max_length=11)
    test_phone: str | None = Field(None, description="Test phone number (e.g. 233...)")
    sandbox: bool = Field(
        False, description="Use sandbox mode (messages not billed or delivered)"
    )


class ArkeselProvider(BaseProvider):
    key = "arkesel"
    name = "Arkesel SMS"
    channel = "sms"
    docs_url = "https://developers.arkesel.com/"
    icon_url = "https://arkesel.com/wp-content/uploads/2023/12/arkesel_favicon.png"
    config_schema = ArkeselConfig

    API_URL = "https://sms.arkesel.com/api/v2/sms/send"

    def send(self, delivery: Delivery, config: Dict[str, Any]) -> ProviderResult:
        """Send an SMS via the Arkesel v2 API."""
        api_key = _secret_value(config.get("api_key"))
        recipient = self._normalize_phone_number(delivery.target_address)

        payload = {
            "sender": str(config.get("sender_id", "")).strip(),
            "message": delivery.notification.body,
            "recipients": [recipient],
            "sandbox": config.get("sandbox", False),
        }

        try:
            response = httpx.post(
                self.API_URL,
                json=payload,
                headers={"api-key": api_key, "Accept": "application/json"},
                timeout=REQUEST_TIMEOUT,
            )
        except httpx.RequestError as exc:
            return ProviderResult(
                status="failed", error_message=f"Network error: {str(exc)}"
            )

        try:
            data = response.json()
        except ValueError:
            return ProviderResult(
                status="failed",
                error_message=f"Invalid JSON response: {response.text[:100]}",
            )

        if response.status_code == 200:
            msg_id = None
            if data.get("data") and len(data["data"]) > 0:
                msg_id = data["data"][0].get("id")
            return ProviderResult(status="sent", external_id=msg_id, details=data)

        return ProviderResult(
            status="failed",
            error_message=data.get("message", "Unknown Arkesel error"),
            details=data,
        )

    def test_connection(self, config: Dict[str, Any]) -> tuple[bool, str]:
        """Test the connection by checking the account balance endpoint."""
        api_key = _secret_value(config.get("api_key"))
        if not api_key:
            return False, "API key is required"

        try:
            response = httpx.get(
                ARKESEL_BALANCE_URL,
                headers={"api-key": api_key, "Accept": "application/json"},
                timeout=REQUEST_TIMEOUT,
            )
        except httpx.TimeoutException:
            return False, "Connection timeout"
        except httpx.RequestError:
            return False, "Connection error"
        except Exception as e:
            return False, f"Validation failed: {str(e)}"

        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                balance = data.get("data", {}).get("sms_balance", "unknown")
                return True, f"Connection successful. Account balance: {balance}"
            return False, data.get("message", "Invalid API response")
        if response.status_code == 401:
            return False, "Invalid API key"
        return False, "An error occurred"

    def _normalize_phone_number(self, phone: str) -> str:
        phone = phone.strip().replace(" ", "").replace("-", "").replace("+", "")
        if not phone.startswith("233") and phone.startswith("0"):
            phone = "233" + phone[1:]
        return phone


def _secret_value(value: Any) -> str:
    if value is not None and hasattr(value, "get_secret_value"):
        value = value.get_secret_value()
    return str(value).strip() if value is not None else ""
