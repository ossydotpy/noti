import logging

from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dashboard.permissions import IsWorkspaceAdmin, IsWorkspaceMember, WorkspaceContextPermission
from dashboard.serializers.subscribers import (
    DashboardSubscriberCreateSerializer,
    DashboardSubscriberDetailSerializer,
    DashboardSubscriberSerializer,
    SubscriberBulkDeleteResponseSerializer,
    SubscriberBulkDeleteSerializer,
)
from notifications.models import Subscriber

logger = logging.getLogger(__name__)

_MEMBER_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]
_ADMIN_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]


class DashboardSubscriberViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Control-plane view for subscribers (members; bulk-delete is admin-only)."""

    serializer_class = DashboardSubscriberSerializer
    permission_classes = _MEMBER_PERMS
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["external_id", "first_name", "last_name", "email", "phone_number"]
    ordering_fields = ["created_at", "updated_at", "first_name", "last_name", "external_id"]
    ordering = ["-created_at"]
    lookup_field = "id"

    def get_serializer_class(self):
        if self.action == "create":
            return DashboardSubscriberCreateSerializer
        if self.action == "retrieve":
            return DashboardSubscriberDetailSerializer
        return DashboardSubscriberSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["workspace"] = self.request.workspace
        return context

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Subscriber.objects.none()
        return Subscriber.objects.filter(workspace=self.request.workspace).annotate(
            device_count=Count("devices", distinct=True)
        )

    def get_permissions(self):
        if self.action == "bulk_delete":
            return [perm() for perm in _ADMIN_PERMS]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save()

    @action(
        detail=False,
        methods=["post"],
        url_path="bulk-delete",
        permission_classes=_ADMIN_PERMS,
    )
    def bulk_delete(self, request):
        """Soft-deletes (deactivates) subscribers by their UUIDs."""
        serializer = SubscriberBulkDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["ids"]

        deactivated = Subscriber.objects.filter(
            workspace=request.workspace, id__in=ids, is_active=True
        ).update(is_active=False)
        not_found = len(ids) - deactivated

        logger.info(
            "dashboard.subscribers.bulk_deleted workspace_id=%s requested=%s deactivated=%s",
            request.workspace.id,
            len(ids),
            deactivated,
        )
        return Response(
            SubscriberBulkDeleteResponseSerializer(
                {"deactivated": deactivated, "not_found": not_found}
            ).data,
            status=status.HTTP_200_OK,
        )
