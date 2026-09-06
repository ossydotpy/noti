# Phase 2 — Auth + simplified workspaces

## Accounts app
- [ ] `accounts.User`: email-based (`USERNAME_FIELD = "email"`), `AbstractBaseUser` + `PermissionsMixin`, UUID pk, name fields, `is_active`, dates; custom manager
- [ ] Endpoints under `/api/v1/auth/`:
  - `POST register/` (email, password, name) → creates user, returns token pair
  - `POST token/` (simplejwt TokenObtainPairView, custom claims: email)
  - `POST token/refresh/` (rotation on, blacklist on)
  - `POST token/verify/`
  - `GET/PATCH me/` (authed profile)
  - `POST logout/` (blacklist submitted refresh token)
- [ ] DRF defaults: `JWTAuthentication` + `IsAuthenticated`; SIMPLE_JWT settings (15m access / 7d refresh, rotation, blacklist)

## Core app
- [ ] `Workspace`: name, unique slug, `owner FK(User)`, webhook_url/secret, `settings` JSON, `provider_credentials` encrypted JSON, timestamps. **No plan/workspace_state/billing fields.**
- [ ] `WorkspaceMember`: workspace FK, `user FK(User)`, role ∈ {owner, admin, member}; unique (workspace, user)
- [ ] `WorkspaceInvite`: email, role (admin/member only), token (unique, hashed compare not required for v1), invited_by FK, expires_at, accepted_at
- [ ] `APIKey`: workspace FK, name, prefix, hashed key, env (live/test), last_used_at, revoked_at, created_by FK
- [ ] `AuditLog`: workspace FK, `user FK(User) nullable`, action, resource_type, resource_id, metadata JSON, ip
- [ ] `EncryptedJSONField` (Fernet via `FERNET_KEY` env) + `api_key_service` (prefix `ns_live_`/`ns_test_`, sha256 hash, lookup)
- [ ] Workspace resolution: `IsWorkspaceMember` permission / helper reading `X-Workspace-ID` header (falls back to first membership); 403 on non-member; sets `request.workspace`, `request.workspace_member`
- [ ] Workspace CRUD + archive lives in dashboard app (Phase 3b)

Legacy conversions: all `owner_id`/`user_id` CharFields → real FKs to `accounts.User`.
