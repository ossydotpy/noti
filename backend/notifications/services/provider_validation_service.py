"""Service for validating workspace provider configuration."""

import asyncio

from notifications.models import Provider


class ProviderValidationService:
    """Checks whether a workspace has configured providers for channels."""

    @staticmethod
    def get_configured_channels(workspace) -> set[str]:
        """Get the set of channels that have at least one active provider with config."""
        providers = Provider.objects.filter(
            workspace=workspace,
            is_active=True,
        ).only("channel", "config")

        return {provider.channel for provider in providers if provider.config}

    @staticmethod
    def has_provider_for_channel(workspace, channel: str) -> bool:
        """Check if the workspace has an active provider configured for a channel."""
        if channel == "in_app":
            return True

        providers = Provider.objects.filter(
            workspace=workspace,
            channel=channel,
            is_active=True,
        ).only("config")

        return any(provider.config for provider in providers)

    @staticmethod
    def validate_channels(workspace, channels: list[str]) -> tuple[bool, list[str]]:
        """Validate that the workspace has providers for all requested channels.

        Returns (is_valid, unconfigured_channels).
        """
        configured = ProviderValidationService.get_configured_channels(workspace)
        unconfigured = [
            channel for channel in channels if channel != "in_app" and channel not in configured
        ]
        return (len(unconfigured) == 0, unconfigured)

    @staticmethod
    async def validate(provider: Provider) -> tuple[bool, str]:
        """Test the live connection to the external provider."""
        from notifications.providers.registry import ProviderRegistry

        driver_cls = ProviderRegistry.get(provider.provider_type)
        if not driver_cls:
            return False, f"Driver {provider.provider_type} not found."

        driver = driver_cls()
        if hasattr(driver, "test_connection"):
            try:
                return await asyncio.to_thread(driver.test_connection, provider.config)
            except Exception as e:
                return False, str(e)

        return True, "Configuration schema is valid."
