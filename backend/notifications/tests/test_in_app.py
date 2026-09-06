from datetime import timedelta

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from core.models import Workspace
from notifications.models import InAppNotification, Notification, Subscriber
from notifications.services.subscriber_token_service import SubscriberTokenService
from notifications.tests.base import BaseNotificationTest

SAT_TEST_CONFIG = {
    "ALGORITHM": "HS256",
    "SECRET_KEY": "test_secret_key_for_testing_purposes_only",
    "ISSUER": "notification-service",
    "AUDIENCE": "in_app",
    "ACCESS_TOKEN_EXPIRY": 900,
    "REFRESH_TOKEN_EXPIRY": 2592000,
    "MAX_ACCESS_TOKEN_EXPIRY": 3600,
    "MAX_REFRESH_TOKEN_EXPIRY": 7776000,
}


@override_settings(SAT_CONFIG=SAT_TEST_CONFIG)
class InAppNotificationTests(BaseNotificationTest):
    def setUp(self):
        super().setUp()
        self.subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_123",
            email="test@example.com",
        )
        self.other_workspace = Workspace.objects.create(
            name="Other Workspace",
            slug="other-workspace",
            owner=self.user,
        )
        self.other_subscriber = Subscriber.objects.create(
            workspace=self.other_workspace,
            external_id="user_123",
            email="other@example.com",
        )
        self.notification = Notification.objects.create(
            workspace=self.workspace,
            subscriber=self.subscriber,
            body="Hello",
            data={"message": "Hello"},
            channels=["in_app"],
        )
        self.other_notification = Notification.objects.create(
            workspace=self.other_workspace,
            subscriber=self.other_subscriber,
            body="Hello",
            data={"message": "Hello"},
            channels=["in_app"],
        )

    def _get_sat_token(self, subscriber=None):
        """Mint a SAT for a subscriber."""
        if subscriber is None:
            subscriber = self.subscriber
        sat, _, _ = SubscriberTokenService.issue_tokens(
            subscriber=subscriber,
            workspace_id=str(subscriber.workspace.id),
        )
        return sat

    def test_in_app_feed_requires_auth(self):
        url = reverse("in-app-feed")
        self.client.credentials()
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_in_app_feed_missing_subscriber(self):
        response = self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "missing_user"},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_in_app_feed_returns_active_notifications(self):
        InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Welcome",
            body="Hello",
        )
        InAppNotification.objects.create(
            workspace=self.other_workspace,
            notification=self.other_notification,
            subscriber=self.other_subscriber,
            title="Other",
            body="Hello",
        )
        InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Expired",
            body="Old",
            expires_at=timezone.now() - timedelta(days=1),
        )
        InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Archived",
            body="Old",
            archived_at=timezone.now(),
        )

        sat = self._get_sat_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        url = reverse("in-app-feed")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Welcome")

    def test_in_app_feed_read_filter(self):
        unread = InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Unread",
            body="Hello",
        )
        InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Read",
            body="Hello",
            read_at=timezone.now(),
        )

        sat = self._get_sat_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        url = reverse("in-app-feed")
        response = self.client.get(url, {"read": "false"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(unread.id))

    def test_in_app_feed_own_feed_only(self):
        sat = self._get_sat_token(self.subscriber)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        url = reverse("in-app-feed")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_mark_in_app_read(self):
        in_app = InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Unread",
            body="Hello",
        )

        sat = self._get_sat_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        url = reverse("in-app-mark-read", args=[in_app.id])
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        in_app.refresh_from_db()
        self.assertIsNotNone(in_app.read_at)
        self.assertIsNotNone(in_app.seen_at)

    def test_mark_in_app_read_requires_auth(self):
        in_app = InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Unread",
            body="Hello",
        )

        self.client.credentials()
        url = reverse("in-app-mark-read", args=[in_app.id])
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_mark_in_app_read_wrong_subscriber(self):
        other_subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_456",
            email="other@example.com",
        )
        other_notification = Notification.objects.create(
            workspace=self.workspace,
            subscriber=other_subscriber,
            body="Hello",
            data={"message": "Hello"},
            channels=["in_app"],
        )
        in_app = InAppNotification.objects.create(
            workspace=self.workspace,
            notification=other_notification,
            subscriber=other_subscriber,
            title="Other's Notification",
            body="Hello",
        )

        sat = self._get_sat_token(self.subscriber)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        url = reverse("in-app-mark-read", args=[in_app.id])
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unread_count(self):
        InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Unread",
            body="Hello",
        )
        InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Read",
            body="Hello",
            read_at=timezone.now(),
        )

        sat = self._get_sat_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        url = reverse("in-app-unread-count")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_unread_count_requires_auth(self):
        self.client.credentials()
        url = reverse("in-app-unread-count")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unread_count_excludes_expired(self):
        InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Expired",
            body="Hello",
            expires_at=timezone.now() - timedelta(days=1),
        )

        sat = self._get_sat_token()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        url = reverse("in-app-unread-count")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)


class InAppArchiveTaskTests(BaseNotificationTest):
    def setUp(self):
        super().setUp()
        self.subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_123",
            email="test@example.com",
        )
        self.notification = Notification.objects.create(
            workspace=self.workspace,
            subscriber=self.subscriber,
            body="Hello",
            data={"message": "Hello"},
            channels=["in_app"],
        )

    def test_archive_expired_notifications(self):
        from notifications.tasks import archive_expired_notifications

        expired = InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Expired",
            body="Hello",
            expires_at=timezone.now() - timedelta(days=1),
        )
        stale = InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Stale",
            body="Hello",
        )
        InAppNotification.objects.filter(id=stale.id).update(
            created_at=timezone.now() - timedelta(days=31)
        )
        active = InAppNotification.objects.create(
            workspace=self.workspace,
            notification=self.notification,
            subscriber=self.subscriber,
            title="Active",
            body="Hello",
        )

        archived = archive_expired_notifications()
        self.assertEqual(archived, 2)

        expired.refresh_from_db()
        stale.refresh_from_db()
        active.refresh_from_db()

        self.assertIsNotNone(expired.archived_at)
        self.assertIsNotNone(stale.archived_at)
        self.assertIsNone(active.archived_at)
