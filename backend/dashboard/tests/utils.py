from rest_framework.test import APIClient

from accounts.models import User
from core.models import Workspace, WorkspaceMember
from core.utils.slugs import generate_unique_slug


def make_user(email="user@example.com", password="testpass123", **extra_fields):
    return User.objects.create_user(email=email, password=password, **extra_fields)


def make_workspace(user, name="Test Workspace", slug=None, role="owner"):
    """Creates a workspace together with the given user's membership."""
    workspace = Workspace.objects.create(
        name=name,
        slug=slug or generate_unique_slug(Workspace),
        owner=user,
    )
    WorkspaceMember.objects.create(workspace=workspace, user=user, role=role)
    return workspace


def auth_client(user=None, workspace=None):
    """An APIClient authenticating as ``user`` with the workspace header set."""
    client = APIClient()
    if user is not None:
        client.force_authenticate(user=user)
    if workspace is not None:
        client.credentials(HTTP_X_WORKSPACE_ID=str(workspace.id))
    return client
