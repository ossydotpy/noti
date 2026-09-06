from django.urls import path

from dashboard.views.audit_logs import AuditLogDetailView, AuditLogListView

urlpatterns = [
    path("", AuditLogListView.as_view(), name="dashboard-audit-log-list"),
    path("<uuid:pk>/", AuditLogDetailView.as_view(), name="dashboard-audit-log-detail"),
]
