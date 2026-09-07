# noti

Open-source notification platform: multi-channel push, in-app, and SMS notifications with workspaces, API keys, and team management.

| Project | Path | Stack |
| --- | --- | --- |
| API backend | [`backend/`](./backend) | Python, Django 5, DRF, SimpleJWT, Celery, Redis, Postgres |
| Web frontend | [`web/`](./web) | TypeScript, TanStack Start (SPA mode), TanStack Query/Router, Tailwind, shadcn/ui |

## Architecture

```
Browser (web) ──HTTPS──▶ Django API (backend) ──▶ Postgres / Redis
                              │
                              ├─▶ Celery workers (fanout, delivery, scheduled sends)
                              └─▶ Push/SMS providers (FCM, APNs, Expo, Arkesel, Hubtel)
```

- **Auth**: email + password, JWT access/refresh tokens (SimpleJWT) issued by the backend. No third-party auth.
- **Tenancy**: workspaces with owner/admin/member roles. All domain data is workspace-scoped.
- **Observability**: OpenTelemetry traces/logs, exportable to any OTLP endpoint. Off by default.

## Quickstart

Requires: [uv](https://docs.astral.sh/uv/), pnpm, Docker.

```bash
# 1. Infra (postgres + redis)
docker compose up -d

# 2. Backend
cd backend
uv sync
cp .env.example .env
uv run python manage.py migrate
uv run python manage.py runserver        # http://localhost:8000
uv run python manage.py test --settings=config.test_settings   # run tests

# 3. Web (separate terminal)
cd web
pnpm install
pnpm dev                                 # http://localhost:3000
pnpm build                               # typegen + production build
```

See [`docs/PLAN.md`](./docs/PLAN.md) for the port plan and status.

## License

[MIT](./LICENSE)
