# Phase 1 — Backend scaffold

Goal: a runnable Django 5.2 + DRF project skeleton, single settings module, no legacy auth/billing.

- [ ] `backend/manage.py`, `config/` project package (`settings.py`, `urls.py`, `celery.py`, `wsgi.py`, `asgi.py`)
- [ ] Dependency management via **uv**: `pyproject.toml` + `uv.lock` (`uv sync`; no requirements.txt). **User runs `uv sync` (network).**
- [ ] Single `config/settings.py` driven by env (DEBUG, DATABASE_URL, REDIS_URL, CORS_ALLOWED_ORIGINS, JWT lifetimes, OTEL_*, EMAIL_*, FRONTEND_URL, API rate limits)
- [ ] No Django admin / sessions / messages apps — pure API backend
- [ ] Health endpoints: `/api/v1/health/`, `/ready/`, `/live/`
- [ ] OTel setup module: env-gated no-op by default; Django + Celery instrumentation; LoggingHandler bridge; PII-masking LogRecordProcessor; Resource from OTEL_RESOURCE_ATTRIBUTES
- [ ] Celery app wiring (queues: processing, delivery, maintenance; django_celery_beat scheduler)
- [ ] `pytest`/`pytest-django` (test settings via env)
- [ ] `.env.example`

Dropped vs legacy: `django-prometheus`, `svix`, `standardwebhooks`, ZeptoMail, better-auth/clerk provider machinery, billing app, dev/prod/test settings split (env-driven single module instead).
