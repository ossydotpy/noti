from unittest.mock import patch

from django.urls import reverse
from rest_framework import status

from notifications.models import Provider, Subscriber, Topic, TopicSubscription
from notifications.tests.base import BaseNotificationTest


class TopicSendNotificationTest(BaseNotificationTest):
    def setUp(self):
        super().setUp()
        self.topic = Topic.objects.create(
            workspace=self.workspace,
            name="Product Updates",
            slug="product-updates",
        )

        self.subscribers = [
            Subscriber.objects.create(
                workspace=self.workspace,
                external_id="user_001",
                email="user1@example.com",
            ),
            Subscriber.objects.create(
                workspace=self.workspace,
                external_id="user_002",
                email="user2@example.com",
            ),
        ]

        TopicSubscription.objects.create(
            workspace=self.workspace,
            topic=self.topic,
            subscriber=self.subscribers[0],
        )
        TopicSubscription.objects.create(
            workspace=self.workspace,
            topic=self.topic,
            subscriber=self.subscribers[1],
        )

        Provider.objects.create(
            workspace=self.workspace,
            provider_type="fcm",
            name="Test Push Provider",
            channel="push",
            config={"project_id": "test-project"},
        )

        self.url = reverse("topic-notification-send", kwargs={"slug": self.topic.slug})

    @patch("notifications.tasks.process_notification_task.delay")
    @patch("notifications.services.topic_service.TopicService.iter_active_subscribers")
    def test_topic_send_streaming(self, mock_iter, mock_task):
        mock_iter.return_value = iter(self.subscribers)

        data = {
            "channels": ["push"],
            "content": {
                "body": "Hello topic subscribers",
                "data_payload": {"source": "topic"},
            },
        }

        response = self.client.post(self.url, data, format="json")

        self.assertEqual(
            response.status_code,
            status.HTTP_202_ACCEPTED,
            getattr(response, "data", None),
        )
        self.assertEqual(response.data["topic"], self.topic.slug)
        self.assertEqual(response.data["notifications_created"], 2)
        self.assertEqual(response.data["subscribers_targeted"], 2)

        mock_iter.assert_called_once_with(self.topic)
        self.assertEqual(mock_task.call_count, 2)
        notifications = Notification.objects.filter(
            workspace=self.workspace
        ).order_by("created_at")
        self.assertEqual(notifications.count(), 2)
        self.assertEqual(notifications[0].subscriber, self.subscribers[0])
        self.assertEqual(notifications[1].subscriber, self.subscribers[1])

    @patch("notifications.tasks.process_notification_task.delay")
    def test_topic_send_unknown_topic(self, mock_task):
        url = reverse("topic-notification-send", kwargs={"slug": "nope"})
        data = {
            "channels": ["push"],
            "content": {"body": "Hello"},
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["field"], "topic_slug")
        mock_task.assert_not_called()
