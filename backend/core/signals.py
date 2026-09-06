from django.dispatch import Signal, receiver

from .tasks import update_api_key_usage

api_key_used = Signal()


@receiver(api_key_used)
def handle_api_key_used(sender, api_key_id, **kwargs):
    """Async side effect to update usage stats."""
    update_api_key_usage.delay(api_key_id)
