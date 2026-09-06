from django.urls import include, path

from core.views import health_check, liveness_check, readiness_check
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("ready/", readiness_check, name="readiness_check"),
    path("live/", liveness_check, name="liveness_check"),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/", include("notifications.urls")),
    path("api/v1/dashboard/workspaces/", include("dashboard.urls.workspaces")),
    path("api/v1/dashboard/team/", include("dashboard.urls.team")),
    path("api/v1/dashboard/providers/", include("dashboard.urls.providers")),
    path("api/v1/dashboard/templates/", include("dashboard.urls.templates")),
    path("api/v1/dashboard/topics/", include("dashboard.urls.topics")),
    path("api/v1/dashboard/subscribers/", include("dashboard.urls.subscribers")),
    path("api/v1/dashboard/notifications/", include("dashboard.urls.notifications")),
    path("api/v1/dashboard/in-app/", include("dashboard.urls.in_app")),
    path("api/v1/dashboard/audit-logs/", include("dashboard.urls.audit_logs")),
    path("api/v1/dashboard/metrics/", include("dashboard.urls.metrics")),
    path("api/v1/dashboard/api-keys/", include("dashboard.urls.api_keys")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
