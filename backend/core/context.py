"""Workspace resolution for JWT-authenticated (dashboard) requests.

Replaces the legacy ``DashboardWorkspaceMiddleware``: workspace context is
resolved lazily by DRF permission classes via ``resolve_workspace(request)``.
"""

from rest_framework.exceptions import PermissionDenied

from core.models import WorkspaceMember


def resolve_workspace(request) -> tuple:
    """Resolve the active workspace for an authenticated request.

    1. ``X-Workspace-ID`` header → explicit selection (403 if the user is not
       an active member of that workspace).
    2. Otherwise the user's first active membership.
    3. ``(None, None)`` if the user has no workspaces yet.
    """
    workspace_id = request.headers.get("X-Workspace-ID")

    if workspace_id:
        try:
            member = WorkspaceMember.objects.select_related("workspace").get(
                workspace__id=workspace_id,
                user=request.user,
                archived_at__isnull=True,
            )
            return member.workspace, member
        except WorkspaceMember.DoesNotExist:
            raise PermissionDenied(
                {
                    "code": "forbidden",
                    "message": "You do not have access to this workspace",
                }
            )

    member = (
        WorkspaceMember.objects.select_related("workspace")
        .filter(user=request.user, archived_at__isnull=True)
        .first()
    )

    if member:
        return member.workspace, member

    return None, None
