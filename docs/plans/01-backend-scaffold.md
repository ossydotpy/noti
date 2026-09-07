# Phase 1 — Backend scaffold

Goal: a runnable Django 5.2 + DRF project skeleton, single settings module, no legacy auth/billing.

- [x] `backend/manage.py`, `config/` project package (`settings.py`, `urls.py`, `celery.py`, `wsgi.py`, `asgi.py`)
- [x] Dependency management via **uv**: `pyproject.toml` + `uv.lock` (`uv sync`; no requirements.txt)
- [x] Single `config/settings.py` driven by env (DEBUG, DATABASE_URL, REDIS_URL, CORS_ALLOWED_ORIGINS, JWT lifetimes, OTEL_*, EMAIL_*, FRONTEND_URL, API rate limits)
- [x] Dedicated **`config/test_settings.py`** (sqlite in-memory, eager Celery, locmem cache, MD5 hasher) — used by pytest and `manage.py test --settings=config.test_settings`
- [x] No Django admin / sessions / messages apps — pure API backend
- [x] Health endpoints: `/api/v1/health/`, `/ready/`, `/live/`
- [x] OTel setup module: env-gated no-op by default; Django + Celery instrumentation; LoggingHandler bridge; PII-masking LogRecordProcessor; Resource from OTEL_RESOURCE_ATTRIBUTES
- [x] Celery app wiring (queues: processing, delivery, maintenance; django_celery_beat scheduler)
- [x] pytest via pyproject `[tool.pytest.ini_options]` (DJANGO_SETTINGS_MODULE=config.test_settings)
- [x] `.env.example`

Dropped vs legacy: `django-prometheus`, `svix`, `standardwebhooks`, ZeptoMail, better-auth/clerk provider machinery, billing app, dev/prod/test settings split (env-driven single module instead).
