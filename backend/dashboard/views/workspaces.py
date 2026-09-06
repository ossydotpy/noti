import logging

from django.db import transaction
from django.db.models import OuterRef, Subquery
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import APIKey, Workspace, WorkspaceMember
from dashboard.permissions import (
    IsWorkspaceAdmin,
    IsWorkspaceMember,
    WorkspaceContextPermission,
)
from dashboard.serializers.workspaces import (
    WorkspaceCreateSerializer,
    WorkspaceListSerializer,
    WorkspaceSerializer,
)

logger = logging.getLogger(__name__)


class WorkspaceListView(generics.GenericAPIView):
    """Lists the authenticated user's workspaces and creates new ones.

    Skips workspace-context resolution: it operates on the user's own
    memberships, not on a single selected workspace.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = WorkspaceListSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Workspace.objects.none()
        role_subquery = WorkspaceMember.objects.filter(
            workspace=OuterRef("pk"),
            user=self.request.user,
            archived_at__isnull=True,
        ).values("role")[:1]
        return Workspace.objects.filter(
            members__user=self.request.user,
            members__archived_at__isnull=True,
            archived_at__isnull=True,
        ).annotate(user_role=Subquery(role_subquery))

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["user_id"] = self.request.user.id
        return context

    def get(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        serializer = WorkspaceCreateSerializer(
            data=request.data, context={"user": request.user}
        )
        serializer.is_valid(raise_exception=True)
        workspace = serializer.save()
        logger.info(
            "workspace.created workspace_id=%s user_id=%s", workspace.id, request.user.id
        )
        return Response(
            WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED
        )


class WorkspaceDetailView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the active workspace."""

    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]

    def get_object(self):
        if getattr(self, "swagger_fake_view", False):
            return super().get_object()
        return self.request.workspace

    def get_permissions(self):
        if self.request.method in ["PATCH", "PUT"]:
            return [IsAuthenticated(), WorkspaceContextPermission(), IsWorkspaceAdmin()]
        return super().get_permissions()

    def perform_update(self, serializer):
        workspace = serializer.save()
        logger.info(
            "workspace.updated workspace_id=%s name=%s slug=%s",
            workspace.id,
            workspace.name,
            workspace.slug,
        )


class ArchiveWorkspaceView(APIView):
    """Archives a workspace, its members, and revokes its API keys.

    Targets the workspace by URL id and requires the owner, so it does not
    use the X-Workspace-ID context header.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, workspace_id, *args, **kwargs):
        try:
            member = WorkspaceMember.objects.select_related("workspace").get(
                workspace_id=workspace_id,
                user=request.user,
                archived_at__isnull=True,
            )
        except WorkspaceMember.DoesNotExist:
            return Response(
                {"error": {"code": "not_found", "message": "Workspace not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        if member.role != "owner":
            return Response(
                {
                    "error": {
                        "code": "forbidden",
                        "message": "Only workspace owners can perform this action.",
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        workspace = member.workspace
        if workspace.archived_at is not None:
            return Response(
                {
                    "error": {
                        "code": "already_archived",
                        "message": "This workspace is already archived.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        with transaction.atomic():
            workspace.archived_at = now
            workspace.save(update_fields=["archived_at", "updated_at"])
            WorkspaceMember.objects.filter(
                workspace=workspace, archived_at__isnull=True
            ).update(archived_at=now)
            APIKey.objects.filter(
                workspace=workspace, revoked_at__isnull=True
            ).update(revoked_at=now)

        logger.info(
            "workspace.archived workspace_id=%s owner_id=%s",
            workspace.id,
            workspace.owner_id,
        )
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_200_OK)
