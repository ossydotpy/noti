from datetime import timedelta
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from notifications.models import Notification, Provider, Subscriber
from notifications.tasks import dispatch_scheduled_notifications
from notifications.tests.base import BaseNotificationTest


class ScheduledNotificationTest(BaseNotificationTest):
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
    def test_create_scheduled_notification(self, mock_task):
        future_time = timezone.now() + timedelta(hours=1)
        data = {
            "user_id": "user_123",
            "channels": ["push"],
            "content": {"body": "Scheduled message"},
            "scheduled_at": future_time.isoformat(),
        }
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data["status"], "scheduled")
        self.assertIn("scheduled_at", response.data)
        self.assertTrue(
            response.data["scheduled_at"].startswith(
                future_time.strftime("%Y-%m-%dT%H:%M:%S")
            )
        )

        notification = Notification.objects.get(id=response.data["id"])
        self.assertEqual(notification.status, "scheduled")
        self.assertEqual(notification.scheduled_at, future_time)

        mock_task.assert_not_called()

    @patch("notifications.tasks.process_notification_task.delay")
    def test_past_scheduled_at_sends_immediately(self, mock_task):
        past_time = timezone.now() - timedelta(hours=1)
        data = {
            "user_id": "user_123",
            "channels": ["push"],
            "content": {"body": "Past scheduled"},
            "scheduled_at": past_time.isoformat(),
        }
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data["status"], "pending")

        notification = Notification.objects.get(id=response.data["id"])
        self.assertEqual(notification.status, "pending")

        mock_task.assert_called_once_with(str(notification.id))

    @patch("notifications.tasks.process_notification_task.delay")
    def test_no_scheduled_at_sends_immediately(self, mock_task):
        data = {
            "user_id": "user_123",
            "channels": ["push"],
            "content": {"body": "Immediate message"},
        }
        response = self.client.post(self.url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data["status"], "pending")

        notification = Notification.objects.get(id=response.data["id"])
        self.assertEqual(notification.status, "pending")
        self.assertIsNone(notification.scheduled_at)

        mock_task.assert_called_once_with(str(notification.id))

    @patch("notifications.tasks.process_notification_task.delay")
    def test_dispatch_scheduled_notifications_task(self, mock_task):
        past_time = timezone.now() - timedelta(minutes=5)
        future_time = timezone.now() + timedelta(hours=1)

        due_notification = Notification.objects.create(
            workspace=self.workspace,
            subscriber=self.subscriber,
            channels=["push"],
            body="Due notification",
            status="scheduled",
            scheduled_at=past_time,
        )

        not_due_notification = Notification.objects.create(
            workspace=self.workspace,
            subscriber=self.subscriber,
            channels=["push"],
            body="Not due notification",
            status="scheduled",
            scheduled_at=future_time,
        )

        pending_notification = Notification.objects.create(
            workspace=self.workspace,
            subscriber=self.subscriber,
            channels=["push"],
            body="Already pending",
            status="pending",
            scheduled_at=past_time,
        )

        dispatched_count = dispatch_scheduled_notifications()

        self.assertEqual(dispatched_count, 1)

        due_notification.refresh_from_db()
        not_due_notification.refresh_from_db()
        pending_notification.refresh_from_db()

        self.assertEqual(due_notification.status, "pending")
        self.assertEqual(not_due_notification.status, "scheduled")
        self.assertEqual(pending_notification.status, "pending")

        mock_task.assert_called_once_with(str(due_notification.id))
