from django.urls import reverse
from rest_framework import status

from core.models import Workspace
from notifications.models import Device, Subscriber
from notifications.tests.base import BaseNotificationTest


class SubscriberTests(BaseNotificationTest):
    """Tests for subscriber management."""

    def test_create_subscriber(self):
        url = reverse("subscriber-list")
        data = {
            "external_id": "user_1",
            "email": "test@example.com",
            "phone_number": "+15555555555",
            "data": {"foo": "bar"},
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Subscriber.objects.count(), 1)

        sub = Subscriber.objects.get()
        self.assertEqual(sub.external_id, "user_1")
        self.assertEqual(sub.email, "test@example.com")
        self.assertEqual(sub.workspace, self.workspace)

    def test_update_subscriber(self):
        Subscriber.objects.create(
            workspace=self.workspace, external_id="user_1", email="old@example.com"
        )

        url = reverse("subscriber-list")
        data = {"external_id": "user_1", "email": "new@example.com"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Subscriber.objects.count(), 1)

        sub = Subscriber.objects.get()
        self.assertEqual(sub.email, "new@example.com")

    def test_external_id_required(self):
        url = reverse("subscriber-list")
        data = {"email": "test@example.com"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_external_id_immutable(self):
        sub = Subscriber.objects.create(
            workspace=self.workspace, external_id="user_1", email="test@example.com"
        )

        url = reverse("subscriber-list")
        data = {"external_id": "user_2", "email": "new@example.com"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Subscriber.objects.count(), 2)
        sub.refresh_from_db()
        self.assertEqual(sub.external_id, "user_1")

    def test_get_subscriber_details(self):
        sub = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_1",
            email="test@example.com",
            data={"plan": "premium"},
        )
        Device.objects.create(
            workspace=self.workspace,
            subscriber=sub,
            platform="ios",
            push_token="token_123",
            metadata={"os_version": "15.0"},
        )
        Device.objects.create(
            workspace=self.workspace,
            subscriber=sub,
            platform="android",
            push_token="token_456",
            metadata={"os_version": "12.0"},
        )

        url = reverse("subscriber-detail", args=[sub.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(response.data["id"], str(sub.id))
        self.assertEqual(response.data["external_id"], "user_1")
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertEqual(response.data["data"]["plan"], "premium")

        self.assertEqual(len(response.data["devices"]), 2)
        platforms = [d["platform"] for d in response.data["devices"]]
        self.assertIn("ios", platforms)
        self.assertIn("android", platforms)

    def test_get_subscriber_not_found(self):
        import uuid

        url = reverse("subscriber-detail", args=[uuid.uuid4()])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class SubscriberFilterTests(BaseNotificationTest):
    """Tests for subscriber filtering."""

    def setUp(self):
        super().setUp()
        self.sub1 = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_1",
            email="user1@example.com",
            phone_number="+1234567890",
        )
        self.sub2 = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_2",
            email="user2@example.com",
            phone_number="+9876543210",
        )
        self.sub3 = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_3",
            email="user3@example.com",
            phone_number=None,
        )

    def test_filter_by_external_id(self):
        url = reverse("subscriber-list")
        response = self.client.get(url, {"external_id": "user_1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["external_id"], "user_1")
        self.assertEqual(response.data["results"][0]["email"], "user1@example.com")

    def test_filter_by_external_id_not_found(self):
        url = reverse("subscriber-list")
        response = self.client.get(url, {"external_id": "nonexistent_user"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)

    def test_filter_by_email(self):
        url = reverse("subscriber-list")
        response = self.client.get(url, {"email": "user2@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["email"], "user2@example.com")
        self.assertEqual(response.data["results"][0]["external_id"], "user_2")

    def test_filter_by_phone_number(self):
        url = reverse("subscriber-list")
        response = self.client.get(url, {"phone_number": "+9876543210"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["phone_number"], "+9876543210")
        self.assertEqual(response.data["results"][0]["external_id"], "user_2")

    def test_filter_by_multiple_criteria(self):
        url = reverse("subscriber-list")
        response = self.client.get(
            url, {"external_id": "user_1", "email": "user1@example.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["external_id"], "user_1")

    def test_filter_combination_no_match(self):
        url = reverse("subscriber-list")
        response = self.client.get(
            url, {"external_id": "user_1", "email": "user2@example.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)

    def test_list_all_subscribers(self):
        url = reverse("subscriber-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)

    def test_filter_isolation_by_workspace(self):
        other_workspace = Workspace.objects.create(
            name="Other Workspace", slug="other-workspace", owner=self.user
        )
        Subscriber.objects.create(
            workspace=other_workspace,
            external_id="user_1",
            email="other@example.com",
        )

        url = reverse("subscriber-list")
        response = self.client.get(url, {"external_id": "user_1"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["email"], "user1@example.com")

    def test_filter_case_insensitive_external_id(self):
        Subscriber.objects.create(
            workspace=self.workspace,
            external_id="MixedCase_USER",
            email="mixed@example.com",
        )

        url = reverse("subscriber-list")

        response = self.client.get(url, {"external_id": "mixedcase_user"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

        response = self.client.get(url, {"external_id": "MIXEDCASE_USER"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

        response = self.client.get(url, {"external_id": "MixedCase_USER"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
