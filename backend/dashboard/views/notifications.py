import logging

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dashboard.permissions import IsWorkspaceAdmin, IsWorkspaceMember, WorkspaceContextPermission
from dashboard.serializers.notifications import (
    DashboardNotificationSendSerializer,
    DashboardNotificationDetailSerializer,
    DashboardNotificationListSerializer,
)
from notifications.models import Notification, Subscriber, Topic
from notifications.services.provider_validation_service import ProviderValidationService
from notifications.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

_MEMBER_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]
_ADMIN_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]


class DashboardNotificationComposeContextView(GenericAPIView):
    permission_classes = _MEMBER_PERMS

    def get(self, request):
        active_subscribers = Subscriber.objects.filter(
            workspace=request.workspace, is_active=True, archived_at__isnull=True
        ).count()
        topics = list(
            Topic.objects.filter(workspace=request.workspace, is_active=True)
            .annotate(
                active_subscribers=Count(
                    "subscriptions",
                    filter=Q(subscriptions__unsubscribed_at__isnull=True),
                )
            )
            .values("id", "name", "slug", "active_subscribers")
        )
        # Only channels with a real configured provider (plus in_app which needs none).
        configured_channels = sorted(
            ProviderValidationService.get_configured_channels(request.workspace)
            | {"in_app"}
        )
        return Response(
            {
                "active_subscribers": active_subscribers,
                "topics": topics,
                "configured_channels": configured_channels,
            }
        )


class DashboardNotificationSendView(GenericAPIView):
    permission_classes = _ADMIN_PERMS
    serializer_class = DashboardNotificationSendSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        channels_valid, unconfigured = ProviderValidationService.validate_channels(
            request.workspace, data["channels"]
        )
        if not channels_valid:
            return Response(
                {"detail": f"Provider not configured for: {', '.join(unconfigured)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        common = {
            "channels": data["channels"],
            "content": data["content"],
            "priority": data.get("priority", "normal"),
            "fallback": data.get("fallback", False),
            "scheduled_at": data.get("scheduled_at"),
        }

        if data["audience"] == "topic":
            topic = Topic.objects.filter(
                workspace=request.workspace, slug=data["topic_slug"], is_active=True
            ).first()
            if not topic:
                return Response(
                    {"detail": "Topic not found or inactive."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            result = NotificationService.create_topic_notifications(
                workspace=request.workspace,
                topic=topic,
                validated_data={**common, "topic": topic},
            )
            return Response(
                {
                    "audience": "topic",
                    "notifications_created": result["created"],
                    "recipients_targeted": result["subscribers_total"],
                    "channels": data["channels"],
                },
                status=status.HTTP_202_ACCEPTED,
            )

        ids = (
            data.get("subscriber_external_ids", [])
            if data["audience"] == "bulk"
            else [data["subscriber_external_id"]]
        )
        subscribers = list(
            Subscriber.objects.filter(
                workspace=request.workspace,
                is_active=True,
                external_id__in=ids,
            )
        )
        found_ids = {subscriber.external_id for subscriber in subscribers}
        missing = len(set(ids) - found_ids)
        if not subscribers:
            return Response(
                {"detail": "No active subscribers matched the request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for subscriber in subscribers:
            NotificationService.create_notification(
                workspace=request.workspace,
                subscriber=subscriber,
                validated_data=common,
            )
        return Response(
            {
                "audience": data["audience"],
                "notifications_created": len(subscribers),
                "recipients_targeted": len(subscribers),
                "recipients_missing": missing,
                "channels": data["channels"],
            },
            status=status.HTTP_202_ACCEPTED,
        )


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
