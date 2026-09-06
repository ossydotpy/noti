from typing import Dict, List, Optional, Type

from .base import BaseProvider


class ProviderRegistry:
    """Registry of notification provider drivers."""

    _registry: Dict[str, Type[BaseProvider]] = {}

    @classmethod
    def register(cls, provider_cls: Type[BaseProvider]):
        """Register a provider class by its key."""
        if not getattr(provider_cls, "key", None):
            raise ValueError(f"Provider {provider_cls} must have a 'key' attribute")
        cls._registry[provider_cls.key] = provider_cls

    @classmethod
    def get(cls, key: str) -> Optional[Type[BaseProvider]]:
        """Retrieve a provider class by key."""
        return cls._registry.get(key)

    @classmethod
    def get_all(cls) -> Dict[str, Type[BaseProvider]]:
        """Return all registered providers."""
        return cls._registry.copy()

    @classmethod
    def list_keys(cls) -> List[str]:
        """Return the list of registered provider keys."""
        return list(cls._registry.keys())

    @classmethod
    def get_schema(cls, key: str) -> Optional[dict]:
        """Return the JSON schema for a provider's config."""
        provider = cls.get(key)
        if provider:
            return provider.config_schema.model_json_schema()
        return None
