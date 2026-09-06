from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import WorkspaceMember
from dashboard.tests.utils import auth_client, make_user, make_workspace
from notifications.models import Template


class TemplateApiTest(APITestCase):
    def setUp(self):
        # Legacy convention: the workspace "owner" user holds the admin seat.
        self.admin = make_user("admin@example.com")
        self.member = make_user("member@example.com")
        self.workspace = make_workspace(self.admin, name="Template Workspace", slug="template-ws", role="admin")
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.member, role="member"
        )
        self.url = reverse("dashboard-template-list")
        self.admin_client = auth_client(self.admin, self.workspace)
        self.member_client = auth_client(self.member, self.workspace)

    def test_list_templates(self):
        Template.objects.create(
            workspace=self.workspace,
            name="Test Template",
            channel="sms",
            content={"body": "Hello"},
        )
        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Test Template")

    def test_list_hides_inactive_templates(self):
        Template.objects.create(
            workspace=self.workspace,
            name="Old Template",
            channel="sms",
            content={"body": "v1"},
            is_active=False,
        )
        response = self.admin_client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)

    def test_create_template(self):
        data = {
            "name": "New Template",
            "channel": "push",
            "content": {"title": "Welcome", "body": "Hi {{subscriber.first_name}}"},
        }
        response = self.admin_client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Template.objects.filter(name="New Template").exists())

    def test_create_template_requires_body(self):
        response = self.admin_client.post(
            self.url,
            {"name": "No Body", "channel": "sms", "content": {"title": "Hi"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_template_invalid_syntax(self):
        response = self.admin_client.post(
            self.url,
            {"name": "Bad Syntax", "channel": "sms", "content": {"body": "{% invalid %}"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_template_versioning(self):
        template = Template.objects.create(
            workspace=self.workspace,
            name="Version Test",
            channel="sms",
            content={"body": "v1"},
            version=1,
            is_active=True,
        )
        response = self.admin_client.patch(
            reverse("dashboard-template-detail", kwargs={"pk": template.id}),
            {"content": {"body": "v2"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["version"], 2)
        self.assertEqual(response.data["content"]["body"], "v2")

        template.refresh_from_db()
        self.assertFalse(template.is_active)

        latest = Template.objects.filter(name="Version Test", is_active=True).first()
        self.assertIsNotNone(latest)
        self.assertEqual(latest.version, 2)
        self.assertEqual(latest.content["body"], "v2")


class TemplatePermissionsTest(APITestCase):
    def setUp(self):
        self.admin = make_user("admin3@example.com")
        self.member = make_user("member3@example.com")
        self.workspace = make_workspace(self.admin, name="Perm Workspace", slug="perm-ws", role="admin")
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.member, role="member"
        )

    def test_member_cannot_create_template(self):
        response = auth_client(self.member, self.workspace).post(
            reverse("dashboard-template-list"),
            {"name": "Fail", "channel": "sms", "content": {"body": "Fail"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
