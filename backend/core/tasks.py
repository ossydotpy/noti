from celery import shared_task
from django.utils import timezone

from .models import APIKey


@shared_task(ignore_result=True)
def update_api_key_usage(api_key_id: str):
    """Updates the last_used_at timestamp for an API key."""
    APIKey.objects.filter(id=api_key_id).update(last_used_at=timezone.now())
