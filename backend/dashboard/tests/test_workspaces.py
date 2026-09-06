from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import APIKey, Workspace, WorkspaceMember
from dashboard.tests.utils import auth_client, make_user, make_workspace


class WorkspaceApiTest(APITestCase):
    def setUp(self):
        self.user = make_user("owner@example.com")
        self.workspace = make_workspace(self.user, name="My Workspace", slug="my-workspace")

    def test_list_workspaces(self):
        response = auth_client(self.user).get(reverse("dashboard-workspace-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "My Workspace")
        self.assertEqual(response.data[0]["role"], "owner")

    def test_list_workspaces_empty(self):
        other = make_user("new@example.com")
        response = auth_client(other).get(reverse("dashboard-workspace-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
        self.assertFalse(WorkspaceMember.objects.filter(user=other).exists())

    def test_create_workspace(self):
        user = make_user("creator@example.com")
        response = auth_client(user).post(
            reverse("dashboard-workspace-list"),
            {"name": "Acme Notifications", "slug": "acme-notifs"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Acme Notifications")
        self.assertEqual(response.data["slug"], "acme-notifs")
        workspace = Workspace.objects.get(slug="acme-notifs")
        self.assertEqual(workspace.owner, user)
        member = WorkspaceMember.objects.get(workspace=workspace, user=user)
        self.assertEqual(member.role, "owner")

    def test_create_workspace_generates_slug(self):
        user = make_user("creator2@example.com")
        response = auth_client(user).post(
            reverse("dashboard-workspace-list"),
            {"name": "Slugless Workspace"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["slug"])

    def test_create_workspace_duplicate_slug(self):
        user = make_user("dup@example.com")
        response = auth_client(user).post(
            reverse("dashboard-workspace-list"),
            {"name": "Dupe Name", "slug": "my-workspace"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_workspace_short_name(self):
        user = make_user("short@example.com")
        response = auth_client(user).post(
            reverse("dashboard-workspace-list"),
            {"name": "abcd", "slug": "short-slug"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["field"], "name")

    def test_get_active_workspace(self):
        response = auth_client(self.user, self.workspace).get(
            reverse("dashboard-workspace-active")
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "My Workspace")

    def test_update_workspace(self):
        response = auth_client(self.user, self.workspace).patch(
            reverse("dashboard-workspace-active"), {"name": "New Name"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.workspace.refresh_from_db()
        self.assertEqual(self.workspace.name, "New Name")

    def test_member_cannot_update_workspace(self):
        member_user = make_user("member@example.com")
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=member_user, role="member"
        )
        response = auth_client(member_user, self.workspace).patch(
            reverse("dashboard-workspace-active"), {"name": "Hijacked Name"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ArchiveWorkspaceTest(APITestCase):
    def setUp(self):
        self.owner = make_user("owner@example.com")
        self.admin = make_user("admin@example.com")
        self.member = make_user("member@example.com")
        self.workspace = make_workspace(
            self.owner, name="Archiveable Workspace", slug="archiveable-ws"
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.admin, role="admin"
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.member, role="member"
        )
        self.api_key = APIKey.objects.create(
            workspace=self.workspace,
            name="Test Key",
            key_prefix="ns_test_",
            key_hash="fake_hash",
            scopes=["notifications:send"],
            created_by=self.owner,
        )
        self.url = reverse(
            "dashboard-workspace-archive", kwargs={"workspace_id": self.workspace.id}
        )

    def _archive(self, user):
        return auth_client(user).post(self.url)

    def test_owner_can_archive_workspace(self):
        response = self._archive(self.owner)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.workspace.refresh_from_db()
        self.assertIsNotNone(self.workspace.archived_at)

    def test_admin_cannot_archive_workspace(self):
        response = self._archive(self.admin)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.workspace.refresh_from_db()
        self.assertIsNone(self.workspace.archived_at)

    def test_member_cannot_archive_workspace(self):
        response = self._archive(self.member)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.workspace.refresh_from_db()
        self.assertIsNone(self.workspace.archived_at)

    def test_archive_cascades_to_members(self):
        self._archive(self.owner)
        for member in WorkspaceMember.objects.filter(workspace=self.workspace):
            self.assertIsNotNone(member.archived_at)

    def test_archive_revokes_api_keys(self):
        self._archive(self.owner)
        self.api_key.refresh_from_db()
        self.assertIsNotNone(self.api_key.revoked_at)

    def test_archive_already_archived_returns_400(self):
        self.workspace.archived_at = timezone.now()
        self.workspace.save(update_fields=["archived_at"])
        response = self._archive(self.owner)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "already_archived")

    def test_archived_workspace_excluded_from_list(self):
        self._archive(self.owner)
        make_workspace(self.owner, name="Second Workspace", slug="second-ws")
        response = auth_client(self.owner).get(reverse("dashboard-workspace-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["slug"], "second-ws")

    def test_non_member_cannot_archive_workspace(self):
        stranger = make_user("stranger@example.com")
        response = self._archive(stranger)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.workspace.refresh_from_db()
        self.assertIsNone(self.workspace.archived_at)
