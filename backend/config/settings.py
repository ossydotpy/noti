"""
Django settings for the noti backend.

A single env-driven settings module (no dev/prod/test split): every
environment-specific value is read from environment variables (see
.env.example). Defaults target a zero-config local development setup
(sqlite, in-memory cache) with the production path via env vars.
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()

env_file = BACKEND_DIR / ".env"
if env_file.exists():
    env.read_env(env_file)

SECRET_KEY = env("SECRET_KEY", default="insecure-dev-key-do-not-use-in-production")
DEBUG = env.bool("DEBUG", default=True)
DJANGO_ENV = env("DJANGO_ENV", default="dev")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

FERNET_KEY = env("FERNET_KEY", default=None)

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "django_celery_beat",
    "django_filters",
    "corsheaders",
    # Project apps
    "accounts",
    "core",
    "notifications",
    "dashboard",
    "drf_spectacular",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "core.middleware.APIKeyMiddleware",
    "core.middleware.SubscriberMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Database: postgres via DATABASE_URL, sqlite fallback for zero-config local dev.
DATABASES = {
    "default": env.db(
        "DATABASE_URL",
        default="sqlite:///" + str(BASE_DIR / "db.sqlite3"),
    )
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 8},
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

AUTH_USER_MODEL = "accounts.User"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Redis / cache. Falls back to local memory so the stack runs without Redis in dev.
REDIS_URL = env("REDIS_URL", default=None)
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "SOCKET_CONNECT_TIMEOUT": 5,
                "SOCKET_TIMEOUT": 5,
                "RETRY_ON_TIMEOUT": True,
            },
            "KEY_PREFIX": "noti",
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "noti-default",
        }
    }

# Celery
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/0")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://localhost:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

CELERY_TASK_ROUTES = {
    "notifications.process_notification": {"queue": "processing"},
    "notifications.execute_delivery": {"queue": "delivery"},
    "notifications.archive_expired_notifications": {"queue": "maintenance"},
    "notifications.dispatch_scheduled": {"queue": "maintenance"},
    "dashboard.send_workspace_invite_email": {"queue": "maintenance"},
}

CELERY_BEAT_SCHEDULE = {
    "dispatch_scheduled_notifications": {
        "task": "notifications.dispatch_scheduled",
        "schedule": 60,
    },
    "archive_expired_notifications_daily": {
        "task": "notifications.archive_expired_notifications",
        "schedule": 60 * 60 * 24,
    },
}

# Run tasks synchronously in tests / simple local setups.
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=False)

# DRF
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_THROTTLE_CLASSES": [
        "notifications.throttling.GlobalApiThrottle",
        "notifications.throttling.WorkspaceApiThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/minute",
        "user": "100/minute",
        "workspace": "600/minute",
        "session_mint": "10/minute",
        "session_refresh": "30/minute",
        "in_app_read": "100/minute",
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# SimpleJWT
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7)
    ),
    "ROTATE_REFRESH_TOKENS": env.bool("JWT_ROTATE_REFRESH_TOKENS", default=True),
    "BLACKLIST_AFTER_ROTATION": env.bool(
        "JWT_BLACKLIST_AFTER_ROTATION", default=True
    ),
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

# CORS (the web frontend calls this API directly from the browser)
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=[]
)


CORS_ALLOW_HEADERS = [
    "authorization",
    "content-type",
    "x-workspace-id",
]

SPECTACULAR_SETTINGS = {
    "TITLE": "noti API",
    "DESCRIPTION": "Open-source notification platform API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SECURITY": [
        {"apiKey": []},
        {"subscriberAccessToken": []},
    ],
    # Middleware-based auth schemes that aren't auto-detected by spectacular;
    # JWT auth on dashboard/auth endpoints is detected automatically.
    "APPEND_COMPONENTS": {
        "securitySchemes": {
            "apiKey": {
                "type": "http",
                "scheme": "bearer",
                "description": "Workspace API Key. Format: `Bearer ns_<key>`",
            },
            "subscriberAccessToken": {
                "type": "http",
                "scheme": "bearer",
                "description": "Subscriber access token (in-app SDK sessions). Format: `Bearer ns_sat_<token>`",
            },
        },
    },
    "ENUM_NAME_OVERRIDES": {
        "DeliveryChannelEnum": "notifications.models.Delivery.CHANNEL_CHOICES",
        "DeliveryStatusEnum": "notifications.models.Delivery.STATUS_CHOICES",
        "NotificationStatusEnum": "notifications.models.Notification.STATUS_CHOICES",
        "NotificationPriorityEnum": "notifications.models.Notification.PRIORITY_CHOICES",
        "InAppCategoryEnum": "notifications.models.InAppNotification.CATEGORY_CHOICES",
    },
}

# Subscriber Access Tokens (SAT) — self-issued JWTs for in-app SDK sessions.
SAT_CONFIG = {
    "ALGORITHM": env("SAT_ALGORITHM", default="HS256"),
    "SECRET_KEY": env("SAT_SECRET_KEY", default=SECRET_KEY),
    "ISSUER": env("SAT_ISSUER", default="noti"),
    "AUDIENCE": env("SAT_AUDIENCE", default="in_app"),
    "ACCESS_TOKEN_EXPIRY": env.int("SAT_ACCESS_TOKEN_EXPIRY", default=900),
    "REFRESH_TOKEN_EXPIRY": env.int("SAT_REFRESH_TOKEN_EXPIRY", default=2592000),
    "MAX_ACCESS_TOKEN_EXPIRY": env.int("SAT_MAX_ACCESS_TOKEN_EXPIRY", default=3600),
    "MAX_REFRESH_TOKEN_EXPIRY": env.int("SAT_MAX_REFRESH_TOKEN_EXPIRY", default=7776000),
}

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

# Email (Django SMTP backend). No SMTP_HOST in dev → console backend.
SMTP_HOST = env("SMTP_HOST", default="")
if not SMTP_HOST:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
else:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = SMTP_HOST
    EMAIL_PORT = env.int("SMTP_PORT", default=587)
    EMAIL_HOST_USER = env("SMTP_USER", default="")
    EMAIL_HOST_PASSWORD = env("SMTP_PASSWORD", default="")
    EMAIL_USE_TLS = env.bool("SMTP_USE_TLS", default=True)
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noti@example.com")

# Engine API rate limits (token bucket per workspace)
API_RATE_LIMIT = env.float("API_RATE_LIMIT", default=5.0)  # tokens/second
API_BURST_CAPACITY = env.int("API_BURST_CAPACITY", default=10)

# Set by the test runner / CI to suppress fail-open throttle error logs.
TESTING = env.bool("TESTING", default=False)

# Observability
# OpenTelemetry traces + logs, exported to any OTLP endpoint. Disabled by default;
# users point OTEL_EXPORTER_OTLP_ENDPOINT at their own backend.
OTEL_ENABLED = env.bool("OTEL_ENABLED", default=False)

# Logging: stdlib console logging. When OTel is enabled, records are also
# shipped to the OTLP exporter (see config/observability.py).
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "console": {"format": "%(asctime)s %(levelname)-8s %(name)s — %(message)s"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "console"},
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django.server": {"level": "WARNING", "propagate": True},
        "django.request": {"level": "WARNING", "propagate": True},
    },
}

from config.observability import setup_otel  # noqa: E402

setup_otel(enabled=OTEL_ENABLED)
