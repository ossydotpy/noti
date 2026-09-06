from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import AuditLog, WorkspaceMember
from dashboard.tests.utils import auth_client, make_user, make_workspace


class AuditLogApiTest(APITestCase):
    def setUp(self):
        self.owner = make_user("owner@example.com")
        self.member = make_user("member@example.com")
        self.workspace = make_workspace(self.owner, name="My Workspace", slug="my-workspace")
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.member, role="member"
        )
        self.audit_log = AuditLog.objects.create(
            workspace=self.workspace,
            user=self.owner,
            action="workspace.update",
            resource_type="workspace",
            resource_id=str(self.workspace.id),
            metadata={"old_name": "Old", "new_name": "My Workspace"},
        )

    def test_list_audit_logs(self):
        response = auth_client(self.owner, self.workspace).get(
            reverse("dashboard-audit-log-list")
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        entry = response.data["results"][0]
        self.assertEqual(entry["action"], "workspace.update")
        self.assertEqual(entry["user"], self.owner.id)

    def test_retrieve_audit_log(self):
        response = auth_client(self.owner, self.workspace).get(
            reverse("dashboard-audit-log-detail", kwargs={"pk": self.audit_log.id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["action"], "workspace.update")

    def test_member_cannot_list_audit_logs(self):
        response = auth_client(self.member, self.workspace).get(
            reverse("dashboard-audit-log-list")
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
