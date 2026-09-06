"""Test settings — imports the base settings and overrides for speed/isolation.

Selected via ``DJANGO_SETTINGS_MODULE=config.test_settings`` (pytest config and
``manage.py test --settings=config.test_settings``). Guarantees: sqlite in-memory,
eager Celery (no broker), local-memory cache, fast password hashing.
"""

from config.settings import *  # noqa: F401,F403
from config.settings import BASE_DIR

DEBUG = False
SECRET_KEY = "test-secret-key-not-for-production"
FERNET_KEY = "bm90aS10ZXN0LWtleS0wMDAwMDAwMDAwMDAwMDAweHk="

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "noti-test",
    }
}

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

TESTING = True

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]

# Static dir not needed for tests
STATIC_ROOT = BASE_DIR / "staticfiles-test"
