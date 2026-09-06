from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "notifications"

    def ready(self):
        from notifications.providers.push.apns import ApnsProvider
        from notifications.providers.push.expo import ExpoProvider
        from notifications.providers.push.fcm import FcmProvider
        from notifications.providers.registry import ProviderRegistry
        from notifications.providers.sms.arkesel import ArkeselProvider
        from notifications.providers.sms.hubtel import HubtelProvider

        ProviderRegistry.register(ArkeselProvider)
        ProviderRegistry.register(HubtelProvider)
        ProviderRegistry.register(FcmProvider)
        ProviderRegistry.register(ExpoProvider)
        ProviderRegistry.register(ApnsProvider)
