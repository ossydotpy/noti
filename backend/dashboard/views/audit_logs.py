from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from core.models import AuditLog
from dashboard.permissions import IsWorkspaceAdmin, WorkspaceContextPermission
from dashboard.serializers.audit_logs import AuditLogSerializer

_ADMIN_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]


class AuditLogListView(generics.ListAPIView):
    """Lists audit logs for the workspace."""

    serializer_class = AuditLogSerializer
    permission_classes = _ADMIN_PERMS

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return AuditLog.objects.none()
        return AuditLog.objects.filter(workspace=self.request.workspace)


class AuditLogDetailView(generics.RetrieveAPIView):
    """Retrieves a specific audit log entry."""

    serializer_class = AuditLogSerializer
    permission_classes = _ADMIN_PERMS

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return AuditLog.objects.none()
        return AuditLog.objects.filter(workspace=self.request.workspace)
