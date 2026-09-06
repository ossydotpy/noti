from unittest.mock import patch

from django.urls import reverse
from rest_framework import status

from notifications.models import Notification, Provider, Subscriber, Template
from notifications.tests.base import BaseNotificationTest


class TemplateSendingTest(BaseNotificationTest):
    def setUp(self):
        super().setUp()
        self.subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_123",
            first_name="John",
            email="john@example.com",
        )
        Provider.objects.create(
            workspace=self.workspace,
            provider_type="fcm",
            name="Test Push Provider",
            channel="push",
            config={"project_id": "test-project"},
        )
        self.template = Template.objects.create(
            workspace=self.workspace,
            name="Welcome Template",
            channel="*",
            content={
                "title": "Welcome {{subscriber.first_name}}!",
                "body": "Hello {{subscriber.first_name}}, welcome to {{app_name}}!",
            },
        )
        self.url = reverse("notification-send")

    @patch("notifications.tasks.process_notification_task.delay")
    def test_send_with_template(self, mock_task):
        data = {
            "user_id": "user_123",
            "channels": ["push"],
            "template_id": str(self.template.id),
            "template_variables": {"app_name": "MyCoolApp"},
        }
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        notification = Notification.objects.get(id=response.data["id"])
        self.assertEqual(notification.title, "Welcome John!")
        self.assertEqual(notification.body, "Hello John, welcome to MyCoolApp!")
        self.assertEqual(notification.template, self.template)

    def test_send_with_invalid_template(self):
        data = {
            "user_id": "user_123",
            "channels": ["push"],
            "template_id": "00000000-0000-0000-0000-000000000000",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["field"], "template_id")

    @patch("notifications.tasks.process_notification_task.delay")
    def test_send_with_template_name(self, mock_task):
        data = {
            "user_id": "user_123",
            "channels": ["push"],
            "template_name": "Welcome Template",
            "template_variables": {"app_name": "MyCoolApp"},
        }
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        notification = Notification.objects.get(id=response.data["id"])
        self.assertEqual(notification.title, "Welcome John!")
        self.assertEqual(notification.template, self.template)

    def test_send_with_invalid_template_name(self):
        data = {
            "user_id": "user_123",
            "channels": ["push"],
            "template_name": "Non Existent",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["field"], "template_name")

    def test_send_with_channel_mismatch(self):
        Provider.objects.create(
            workspace=self.workspace,
            provider_type="arkesel",
            name="Test SMS Provider",
            channel="sms",
            config={"api_key": "test"},
        )

        push_template = Template.objects.create(
            workspace=self.workspace,
            name="Push Only",
            channel="push",
            content={"title": "Title", "body": "Body"},
        )
        data = {
            "user_id": "user_123",
            "channels": ["sms"],
            "template_id": str(push_template.id),
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["field"], "channels")
        self.assertIn("push-only", response.data["error"]["message"])

    def test_send_with_inactive_template(self):
        Template.objects.create(
            workspace=self.workspace,
            name="Inactive Template",
            channel="*",
            content={"body": "Hello"},
            is_active=False,
        )
        data = {
            "user_id": "user_123",
            "channels": ["push"],
            "template_name": "Inactive Template",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["field"], "template_name")
