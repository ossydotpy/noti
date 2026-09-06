import logging
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import WorkspaceInvite, WorkspaceMember
from core.token_service import generate_token, hash_token
from dashboard.permissions import (
    IsWorkspaceAdmin,
    IsWorkspaceMember,
    IsWorkspaceOwner,
    WorkspaceContextPermission,
)
from dashboard.serializers.team import (
    InviteAcceptSerializer,
    InviteCreateSerializer,
    WorkspaceInviteSerializer,
    WorkspaceMemberSerializer,
)
from dashboard.tasks import send_workspace_invite_email

logger = logging.getLogger(__name__)


class TeamMemberMeView(generics.RetrieveAPIView):
    """Returns the current user's membership (with role) in the workspace."""

    serializer_class = WorkspaceMemberSerializer
    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]

    def get_object(self):
        return self.request.workspace_member


class TeamMemberListView(generics.ListAPIView):
    """Lists all active members of the workspace."""

    serializer_class = WorkspaceMemberSerializer
    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return WorkspaceMember.objects.none()
        return WorkspaceMember.objects.filter(
            workspace=self.request.workspace, archived_at__isnull=True
        ).order_by("role", "created_at")


class TeamMemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PATCH updates a member's role (owner only); DELETE removes a member."""

    serializer_class = WorkspaceMemberSerializer
    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]
    lookup_field = "id"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return WorkspaceMember.objects.none()
        return WorkspaceMember.objects.filter(
            workspace=self.request.workspace, archived_at__isnull=True
        )

    def get_permissions(self):
        if self.request.method in ["PATCH", "PUT"]:
            return [IsAuthenticated(), WorkspaceContextPermission(), IsWorkspaceOwner()]
        return super().get_permissions()

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])
        logger.info(
            "team.member_removed workspace_id=%s removed_user_id=%s",
            instance.workspace_id,
            instance.user_id,
        )


class InviteListView(generics.ListCreateAPIView):
    """Lists pending invites and creates new ones (admins only)."""

    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return InviteCreateSerializer
        return WorkspaceInviteSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return WorkspaceInvite.objects.none()
        return WorkspaceInvite.objects.filter(
            workspace=self.request.workspace,
            accepted_at__isnull=True,
            expires_at__gt=timezone.now(),
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invite, raw_token = self._create_invite(serializer)
        data = WorkspaceInviteSerializer(invite).data
        data["token"] = raw_token
        return Response(data, status=status.HTTP_201_CREATED)

    def _create_invite(self, serializer):
        email = serializer.validated_data["email"]
        if WorkspaceMember.objects.filter(
            workspace=self.request.workspace,
            user__email=email,
            archived_at__isnull=True,
        ).exists():
            raise ValidationError(
                {"email": "This user is already a member of the workspace."}
            )

        WorkspaceInvite.objects.filter(
            workspace=self.request.workspace, email=email, accepted_at__isnull=True
        ).delete()

        raw_token = generate_token()
        invite = serializer.save(
            workspace=self.request.workspace,
            invited_by=self.request.user,
            token=hash_token(raw_token),
            expires_at=timezone.now() + timedelta(days=7),
        )
        logger.info(
            "team.invite_created workspace_id=%s invite_email=%s role=%s",
            self.request.workspace.id,
            email,
            invite.role,
        )
        self._queue_invite_email(invite, raw_token)
        return invite, raw_token

    def _queue_invite_email(self, invite, raw_token):
        invite_link = f"{settings.FRONTEND_URL.rstrip('/')}/invite/{raw_token}"
        inviter_name = self.request.user.get_full_name() or self.request.user.email
        try:
            send_workspace_invite_email.delay(
                invite_id=str(invite.id),
                invite_email=invite.email,
                workspace_name=self.request.workspace.name,
                inviter_name=inviter_name,
                role=invite.role,
                invite_link=invite_link,
            )
        except Exception:
            logger.warning(
                "team.invite_email_queue_failed invite_id=%s email=%s",
                invite.id,
                invite.email,
            )


class InviteDetailView(generics.DestroyAPIView):
    """Revokes (deletes) a pending invite."""

    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]
    serializer_class = WorkspaceInviteSerializer
    lookup_field = "id"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return WorkspaceInvite.objects.none()
        return WorkspaceInvite.objects.filter(
            workspace=self.request.workspace, accepted_at__isnull=True
        )


class InviteAcceptView(generics.GenericAPIView):
    """Accepts an invitation by raw token, joining the current user.

    Skips workspace-context resolution: the user may not belong to the
    workspace yet. The stored token is a hash; lookups use the same hash.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = InviteAcceptSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            invite = WorkspaceInvite.objects.select_related("workspace").get(
                token=hash_token(serializer.validated_data["token"]),
                accepted_at__isnull=True,
                expires_at__gt=timezone.now(),
            )
        except WorkspaceInvite.DoesNotExist:
            return Response(
                {
                    "error": {
                        "code": "invalid_invite",
                        "message": "Invalid or expired invitation token.",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if invite.email and invite.email != request.user.email:
            return Response(
                {
                    "error": {
                        "code": "email_mismatch",
                        "message": (
                            f"This invitation was sent to {invite.email}, "
                            f"but you are logged in as {request.user.email}."
                        ),
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        member = WorkspaceMember.objects.filter(
            workspace=invite.workspace, user=request.user
        ).first()
        now = timezone.now()

        if member and member.archived_at is None:
            invite.accepted_at = now
            invite.save(update_fields=["accepted_at"])
            return Response(
                {
                    "data": {
                        "status": "already_member",
                        "workspace_slug": invite.workspace.slug,
                    }
                }
            )

        with transaction.atomic():
            invite.accepted_at = now
            invite.save(update_fields=["accepted_at"])
            if member:
                member.role = invite.role
                member.invited_by = invite.invited_by
                member.archived_at = None
                member.save(update_fields=["role", "invited_by", "archived_at"])
            else:
                WorkspaceMember.objects.create(
                    workspace=invite.workspace,
                    user=request.user,
                    role=invite.role,
                    invited_by=invite.invited_by,
                )

        logger.info(
            "team.invite_accepted workspace_id=%s user_id=%s role=%s",
            invite.workspace.id,
            request.user.id,
            invite.role,
        )
        return Response(
            {
                "data": {
                    "status": "accepted",
                    "workspace_name": invite.workspace.name,
                    "workspace_slug": invite.workspace.slug,
                }
            }
        )
