# Phase 5 — Polish & verification

- [ ] `backend/.env.example` final + `web/.env.example` (`VITE_API_URL` etc.)
- [ ] `backend/README.md`, `web/README.md` (setup, env vars, API docs pointer)
- [ ] Regenerated OpenAPI schema with Bearer security scheme (`/api/schema/`, `/api/docs/`)
- [ ] CI: backend workflow (pytest) + web workflow (pnpm lint/build)
- [ ] Root `justfile` or Makefile for common dev tasks
- [ ] Verification:
  - [ ] `python manage.py test` green
  - [ ] `pnpm build` clean
  - [ ] E2E smoke: register → login → create workspace → mint API key → send notification (manual script / postman-lite)
