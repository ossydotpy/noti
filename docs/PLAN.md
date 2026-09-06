# noti — Port Plan & Status

The original SaaS (`notification-service` Django backend + `frontend` Next.js with embedded
Better Auth + a separate `auth` service) is being rebuilt as an open-source monorepo.
**No legacy code is migrated wholesale; both projects are freshly scaffolded and code is
ported and adapted piece by piece.** The legacy workspace is read-only reference material.

## Decisions locked

| Decision | Choice |
| --- | --- |
| Repo | New monorepo `noti/`, fresh git, MIT license |
| Backend auth | SimpleJWT (email+password: register / token / refresh / verify / me / logout), refresh rotation + blacklist |
| Third-party auth | Removed entirely (Better Auth providers, Clerk, JWKS middleware, auth webhooks, svix) |
| Billing | Removed entirely (Paystack, credits, quotas, plan limits) |
| Workspaces | Simplified: owner/admin/member roles, token invites, no plans/states; real `User` FKs |
| Ops stack | OTel traces+logs over OTLP (env-gated, off by default); prometheus/grafana/loki/structlog wide-events dropped |
| Python tooling | `uv` (pyproject.toml + uv.lock) instead of pip/requirements.txt |
| Django admin | Removed — pure API backend, no admin site |
| Email | Django SMTP backend (ZeptoMail dropped) |
| Migrations | Fresh 0001 for all apps |
| Web framework | TanStack Start, **SPA mode** (`ssr: false`), pnpm (not Bun) |
| Web auth | Direct browser → Django (CORS), tokens in localStorage, single-flight 401 refresh |
| Web data | Conventional TanStack: QueryClient in router context, `useSuspenseQuery`/`useQuery`, loaders prefetch via `ensureQueryData`, `/_authenticated` layout guard with `beforeLoad` + redirect |

## Phases

- [x] **Phase 0 — Monorepo bootstrap** ([details](plans/00-bootstrap.md))
- [ ] **Phase 1 — Backend scaffold** ([details](plans/01-backend-scaffold.md))
- [ ] **Phase 2 — Auth + simplified workspaces** ([details](plans/02-auth-workspaces.md))
- [ ] **Phase 3 — Notifications + dashboard port (billing-free)** ([details](plans/03-domain-port.md))
- [ ] **Phase 4 — Web (TanStack Start)** ([details](plans/04-web.md))
- [ ] **Phase 5 — Polish & verification** ([details](plans/05-polish.md))

## Verification gates

- Backend: `python manage.py test` green; `python manage.py migrate` clean; schema renders.
- Web: `pnpm build` + typecheck clean.
- E2E smoke: register → login → create workspace → mint API key → send notification.
