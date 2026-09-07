# Phase 4 — Web (TanStack Start, SPA mode, pnpm)

- [x] Scaffold via `pnpm dlx @tanstack/cli@latest create` (Tailwind add-on) into `web/`; set SPA mode (`ssr: false`); pnpm
- [x] Port shadcn `components/ui/*` + design tokens from legacy `frontend/`; `@fontsource` fonts (Inter, Geist, JetBrains Mono)
- [x] Conventional wiring:
  - `createRootRouteWithContext<{ queryClient, auth }>()`; `createRouter({ defaultPreload: 'intent', defaultPreloadStaleTime: 0 })`
  - QueryClient = single cache; components use `useSuspenseQuery`/`useQuery`; loaders prefetch via `ensureQueryData` only
  - `/_authenticated` pathless layout: `beforeLoad` guard → `redirect({ to: '/login', search: { redirect } })`
  - `AuthProvider`/`useAuth()` passed via `<RouterProvider context>`
- [x] `src/lib/auth/`: localStorage token store (SSR-safe), `authFetch` with single-flight 401 auto-refresh, register/login/logout against Django
- [x] `src/lib/api/`: `authFetch` + DRF error helpers + query key factories (port from legacy, de-proxied)
- [x] Port pages: landing, login, signup, onboarding; workspace layout (switcher/guard), dashboard, topics (+detail), templates (+new/detail), subscribers (+detail), providers (+new/detail), api-keys, team (members/invites)
- [x] Dropped on port: billing page/hooks/validations, proxy routes, server actions, drizzle/better-auth/svix/nodemailer, GitHub social login
- [x] `pnpm build` + typecheck green
