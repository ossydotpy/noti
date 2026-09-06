# Phase 3 — Notifications + dashboard port (billing-free)

## Notifications app (public engine API, API-key / SAT authed)
- [ ] Models: Subscriber, Device, Notification, Delivery, Provider, InAppNotification, Campaign, Template, Topic, TopicSubscription, DeliveryMetrics, ProviderWebhookLog, SubscriberRefreshToken
- [ ] Services: subscriber, device, fanout, notification, topic, provider_validation, subscriber_token (SAT issue/verify/refresh)
- [ ] Providers: registry/base/schemas + fcm, apns, expo (push); arkesel, hubtel (sms)
- [ ] Views/urls/serializers/filters/pagination/idempotency/throttling/sat_auth/mixins
- [ ] Celery tasks: dispatch_scheduled, process_notification, execute_delivery, archive_expired_notifications
- [ ] **Billing removal**: QuotaService calls removed from views/tasks/fanout; `PlanAwareThrottle` → settings-driven per-workspace throttle
- [ ] Port + adapt tests

## Dashboard app (management API, JWT authed)
- [ ] views/serializers/urls per domain: workspaces, team (members+invites), api-keys, providers, templates, topics, subscribers, notifications, in-app, metrics, audit-logs
- [ ] Workspace scoping via `IsWorkspaceMember` + `X-Workspace-ID` header (replaces legacy middleware)
- [ ] Permissions: IsWorkspaceOwner / IsWorkspaceAdmin / IsWorkspaceMember
- [ ] Celery task: send_workspace_invite_email (SMTP)
- [ ] **Billing removal**: dashboard billing views/urls/serializers/tests dropped; metrics response billing fields dropped
- [ ] Port + adapt tests (JWT-authenticated test client)

## Migrations
- [ ] Fresh 0001 per app (accounts, core, notifications, dashboard has none)
