"""Workspace context + role permissions for the dashboard API.

``WorkspaceContextPermission`` must come first in every dashboard view's
``permission_classes``: it resolves ``request.workspace`` and
``request.workspace_member`` from the authenticated user (via
``core.context.resolve_workspace``) so views and role permissions can use them.
"""

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied

from core.context import resolve_workspace
from core.exceptions import WorkspaceNotFound


class WorkspaceContextPermission(permissions.BasePermission):
    """Resolves the active workspace for the request, then allows access."""

    def has_permission(self, request, view):
        workspace, member = resolve_workspace(request)
        request.workspace = workspace
        request.workspace_member = member
        return True


class IsWorkspaceOwner(permissions.BasePermission):
    """Allows access only to workspace owners."""

    def has_permission(self, request, view):
        if getattr(request, "workspace", None) is None:
            raise WorkspaceNotFound()
        member = getattr(request, "workspace_member", None)
        if not member or member.role != "owner":
            raise PermissionDenied(
                {
                    "code": "forbidden",
                    "message": "Only workspace owners can perform this action.",
                }
            )
        return True


class IsWorkspaceAdmin(permissions.BasePermission):
    """Allows access to workspace admins and owners."""

    def has_permission(self, request, view):
        if getattr(request, "workspace", None) is None:
            raise WorkspaceNotFound()
        member = getattr(request, "workspace_member", None)
        if not member or member.role not in ["owner", "admin"]:
            raise PermissionDenied(
                {
                    "code": "forbidden",
                    "message": "Only workspace admins can perform this action.",
                }
            )
        return True


class IsWorkspaceMember(permissions.BasePermission):
    """Allows access to any active workspace member."""

    def has_permission(self, request, view):
        if getattr(request, "workspace", None) is None:
            raise WorkspaceNotFound()
        if getattr(request, "workspace_member", None) is None:
            raise PermissionDenied(
                {
                    "code": "forbidden",
                    "message": "You are not a member of this workspace.",
                }
            )
        return True
