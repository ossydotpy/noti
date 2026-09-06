import logging

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dashboard.permissions import IsWorkspaceAdmin, IsWorkspaceMember, WorkspaceContextPermission
from dashboard.serializers.notifications import (
    DashboardNotificationDetailSerializer,
    DashboardNotificationListSerializer,
)
from notifications.models import Notification

logger = logging.getLogger(__name__)

_MEMBER_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]
_ADMIN_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]


class DashboardNotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only control-plane view over the workspace notification log.

    Notifications are immutable (the public /send endpoint owns creation) and
    deletion follows the retention policy, so only list/retrieve/export exist.
    """

    permission_classes = _MEMBER_PERMS
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["status", "priority"]
    search_fields = ["subscriber__external_id", "title", "body"]
    ordering_fields = ["created_at", "updated_at", "status", "priority"]
    ordering = ["-created_at"]
    lookup_field = "id"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        queryset = Notification.objects.filter(workspace=self.request.workspace)
        if self.action == "retrieve":
            queryset = queryset.select_related("subscriber").annotate(
                summary_total=Count("deliveries"),
                summary_pending=Count(
                    "deliveries", filter=Q(deliveries__status="pending")
                ),
                summary_sent=Count("deliveries", filter=Q(deliveries__status="sent")),
                summary_delivered=Count(
                    "deliveries", filter=Q(deliveries__status="delivered")
                ),
                summary_failed=Count(
                    "deliveries", filter=Q(deliveries__status="failed")
                ),
            )
        else:
            queryset = queryset.select_related("subscriber")
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DashboardNotificationDetailSerializer
        return DashboardNotificationListSerializer

    def get_permissions(self):
        if self.action == "export":
            return [perm() for perm in _ADMIN_PERMS]
        return super().get_permissions()

    @action(
        detail=False,
        methods=["post"],
        url_path="export",
        permission_classes=_ADMIN_PERMS,
    )
    def export(self, request):
        """Placeholder for the async CSV export coming in a later phase."""
        logger.info(
            "dashboard.notifications.export_requested workspace_id=%s",
            request.workspace.id,
        )
        return Response(
            {"detail": "Export is not yet available. Coming in Phase 2."},
            status=501,
        )
