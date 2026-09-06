"""Pytest configuration: force test-friendly settings before Django loads."""

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DEBUG", "false")
os.environ.setdefault("CELERY_TASK_ALWAYS_EAGER", "true")
os.environ.setdefault("FERNET_KEY", "bm90aS10ZXN0LWtleS0wMDAwMDAwMDAwMDAwMDAweHk=")
os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("REDIS_URL", "")
os.environ.pop("REDIS_URL", None)
