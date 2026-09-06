import logging

from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from dashboard.permissions import IsWorkspaceAdmin, IsWorkspaceMember, WorkspaceContextPermission
from dashboard.serializers.templates import TemplateSerializer
from notifications.models import Template

logger = logging.getLogger(__name__)


class TemplateViewSet(viewsets.ModelViewSet):
    """Manages message templates; updates create a new version."""

    serializer_class = TemplateSerializer
    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["name", "channel", "is_active"]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at", "version"]
    ordering = ["-version"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Template.objects.none()
        queryset = Template.objects.filter(workspace=self.request.workspace)
        if self.action == "list":
            queryset = queryset.filter(is_active=True)
        return queryset

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), WorkspaceContextPermission(), IsWorkspaceAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        template = serializer.save(workspace=self.request.workspace)
        logger.info(
            "template.created workspace_id=%s name=%s channel=%s",
            self.request.workspace.id,
            template.name,
            template.channel,
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        data = serializer.validated_data
        new_instance = Template.objects.create(
            workspace=instance.workspace,
            name=data.get("name", instance.name),
            description=data.get("description", instance.description),
            channel=data.get("channel", instance.channel),
            content=data.get("content", instance.content),
            variables=data.get("variables", instance.variables),
            version=instance.version + 1,
            is_active=True,
        )
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        serializer.instance = new_instance
        logger.info(
            "template.updated workspace_id=%s name=%s version=%s",
            self.request.workspace.id,
            new_instance.name,
            new_instance.version,
        )

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.is_active = False
        instance.save(update_fields=["archived_at", "is_active"])
        logger.info(
            "template.archived workspace_id=%s name=%s",
            self.request.workspace.id,
            instance.name,
        )
