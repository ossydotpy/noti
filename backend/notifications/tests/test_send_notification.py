from django.urls import reverse
from rest_framework import status
from unittest.mock import patch

from notifications.models import Notification, Provider, Subscriber
from notifications.tests.base import BaseNotificationTest


class SendNotificationTest(BaseNotificationTest):
    def setUp(self):
        super().setUp()
        self.subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_123",
            email="test@example.com",
        )
        Provider.objects.create(
            workspace=self.workspace,
            provider_type="fcm",
            name="Test Push Provider",
            channel="push",
            config={"project_id": "test-project"},
        )
        self.url = reverse("notification-send")

    @patch("notifications.tasks.process_notification_task.delay")
    def test_send_notification_success(self, mock_task):
        data = {
            "user_id": "user_123",
            "channels": ["push"],
            "content": {
                "body": "Hello World",
                "data": {"message": "Hello World"},
            },
        }
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn("id", response.data)
        self.assertEqual(response.data["status"], "pending")

        notification = Notification.objects.get(id=response.data["id"])
        self.assertEqual(notification.subscriber, self.subscriber)
        self.assertEqual(notification.workspace, self.workspace)
        self.assertEqual(notification.body, data["content"]["body"])

        mock_task.assert_called_once_with(str(notification.id))

    def test_send_notification_invalid_subscriber(self):
        data = {
            "user_id": "non_existent_user",
            "channels": ["push"],
            "content": {
                "body": "Hello",
            },
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_send_notification_missing_fields(self):
        data = {
            "channels": ["push"],
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["field"], "user_id")

    def test_send_notification_unconfigured_channel(self):
        data = {
            "user_id": "user_123",
            "channels": ["sms"],
            "content": {"body": "Hello"},
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["field"], "channels")
