# Phase 0 — Monorepo bootstrap

- [x] `backend/`, `web/`, `docs/` directories
- [x] MIT `LICENSE`
- [x] Root `README.md` (architecture + quickstart)
- [x] `docker-compose.yml` (postgres:16, redis:7 for local dev)
- [x] `pnpm-workspace.yaml` + root `package.json` (scripts proxy to `web`)
- [x] `.gitignore`
- [x] Plan docs (`docs/PLAN.md`, `docs/plans/*`)
- [x] `git init` + initial commit

Notes:
- Legacy projects (`notification-service`, `frontend`, `auth`) are never modified.
- The empty `backend/`/`web/` dirs inside the old workspace are ignored; everything lives here.
