import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from django.conf import settings  # noqa: E402

app = Celery("noti")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
