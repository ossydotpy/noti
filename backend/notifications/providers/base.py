from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Dict, Optional, Type

from pydantic import BaseModel, SecretStr

from .schemas import BaseProviderConfig

if TYPE_CHECKING:
    from notifications.models import Delivery


@dataclass
class ProviderResult:
    """Standardized result from a provider execution."""

    status: str
    external_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None


def _unwrap_secrets(obj):
    """Recursively unwrap SecretStr values to their actual string values."""
    if isinstance(obj, SecretStr):
        return obj.get_secret_value()
    if isinstance(obj, dict):
        return {k: _unwrap_secrets(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_unwrap_secrets(item) for item in obj]
    return obj


class BaseProvider(ABC):
    """Abstract base class for all notification providers."""

    key: str
    name: str
    channel: str
    docs_url: str
    icon_url: str
    config_schema: Type[BaseModel] = BaseProviderConfig

    @abstractmethod
    def send(self, delivery: "Delivery", config: Dict[str, Any]) -> ProviderResult:
        """Execute the delivery via the external provider."""

    @classmethod
    def validate_config(cls, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate the config against the provider schema and unwrap secrets."""
        validated = cls.config_schema(**config)
        return _unwrap_secrets(validated.model_dump(mode="python"))
