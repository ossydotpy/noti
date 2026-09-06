import logging

from django.db.models import Case, Count, IntegerField, When
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dashboard.permissions import IsWorkspaceAdmin, IsWorkspaceMember, WorkspaceContextPermission
from notifications.models import InAppNotification

logger = logging.getLogger(__name__)

_MEMBER_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]
_ADMIN_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]


class DashboardInAppNotificationSerializer(serializers.ModelSerializer):
    subscriber_external_id = serializers.CharField(
        source="subscriber.external_id", read_only=True
    )

    class Meta:
        model = InAppNotification
        fields = [
            "id",
            "subscriber_external_id",
            "title",
            "body",
            "category",
            "action_url",
            "image_url",
            "seen_at",
            "read_at",
            "archived_at",
            "expires_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


def in_app_stats(workspace) -> dict:
    """Aggregates workspace-wide unread/read/archived counts by category."""
    stats = InAppNotification.objects.filter(workspace=workspace).aggregate(
        total=Count("id"),
        unread=Count(
            Case(
                When(read_at__isnull=True, archived_at__isnull=True, then=1),
                output_field=IntegerField(),
            )
        ),
        read=Count(
            Case(
                When(read_at__isnull=False, archived_at__isnull=True, then=1),
                output_field=IntegerField(),
            )
        ),
        archived=Count(
            Case(
                When(archived_at__isnull=False, then=1),
                output_field=IntegerField(),
            )
        ),
        by_category_info=Count(
            Case(
                When(category="info", archived_at__isnull=True, then=1),
                output_field=IntegerField(),
            )
        ),
        by_category_success=Count(
            Case(
                When(category="success", archived_at__isnull=True, then=1),
                output_field=IntegerField(),
            )
        ),
        by_category_warning=Count(
            Case(
                When(category="warning", archived_at__isnull=True, then=1),
                output_field=IntegerField(),
            )
        ),
        by_category_error=Count(
            Case(
                When(category="error", archived_at__isnull=True, then=1),
                output_field=IntegerField(),
            )
        ),
    )
    by_category = {
        "info": stats.pop("by_category_info", 0),
        "success": stats.pop("by_category_success", 0),
        "warning": stats.pop("by_category_warning", 0),
        "error": stats.pop("by_category_error", 0),
    }
    return {**stats, "by_category": by_category}


class DashboardInAppNotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only moderation view over workspace in-app notifications."""

    serializer_class = DashboardInAppNotificationSerializer
    permission_classes = _MEMBER_PERMS
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category"]
    search_fields = ["subscriber__external_id", "title", "body"]
    ordering_fields = ["created_at", "updated_at", "seen_at", "read_at"]
    ordering = ["-created_at"]
    lookup_field = "id"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return InAppNotification.objects.none()
        qs = InAppNotification.objects.filter(
            workspace=self.request.workspace
        ).select_related("subscriber")

        status_filter = self.request.query_params.get("status")
        if status_filter == "unread":
            qs = qs.filter(read_at__isnull=True, archived_at__isnull=True)
        elif status_filter == "read":
            qs = qs.filter(read_at__isnull=False, archived_at__isnull=True)
        elif status_filter == "archived":
            qs = qs.filter(archived_at__isnull=False)

        return qs

    def get_permissions(self):
        if self.action == "archive":
            return [perm() for perm in _ADMIN_PERMS]
        return super().get_permissions()

    @action(
        detail=True,
        methods=["post"],
        url_path="archive",
        permission_classes=_ADMIN_PERMS,
    )
    def archive(self, request, id=None):
        """Admin-side archive of a single in-app notification."""
        notification = self.get_object()
        if notification.archived_at:
            return Response(
                {"detail": "Notification is already archived."}, status=400
            )

        notification.archived_at = timezone.now()
        notification.save(update_fields=["archived_at", "updated_at"])
        logger.info(
            "dashboard.in_app.archived workspace_id=%s notification_id=%s",
            request.workspace.id,
            notification.id,
        )
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Returns workspace-wide aggregate counts."""
        return Response(in_app_stats(request.workspace))
