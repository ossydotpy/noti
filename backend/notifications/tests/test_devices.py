from django.urls import reverse
from rest_framework import status

from notifications.models import Device, Subscriber
from notifications.tests.base import BaseNotificationTest


class DeviceTests(BaseNotificationTest):
    """Tests for device management."""

    def test_register_device_new(self):
        sub = Subscriber.objects.create(workspace=self.workspace, external_id="user_1")

        url = reverse("device-create")
        data = {
            "subscriber_id": str(sub.id),
            "platform": "ios",
            "push_token": "token_123",
            "metadata": {"os_version": "15.0"},
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Device.objects.count(), 1)

        device = Device.objects.get()
        self.assertEqual(device.push_token, "token_123")
        self.assertEqual(device.subscriber, sub)

    def test_device_ownership_transfer(self):
        sub1 = Subscriber.objects.create(workspace=self.workspace, external_id="user_1")
        sub2 = Subscriber.objects.create(workspace=self.workspace, external_id="user_2")

        Device.objects.create(
            workspace=self.workspace,
            subscriber=sub1,
            push_token="token_123",
            platform="ios",
        )

        url = reverse("device-create")
        data = {
            "subscriber_external_id": "user_2",
            "platform": "ios",
            "push_token": "token_123",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        device = Device.objects.get()
        device.refresh_from_db()
        self.assertEqual(device.subscriber, sub2)

    def test_delete_device(self):
        sub = Subscriber.objects.create(workspace=self.workspace, external_id="user_1")
        device = Device.objects.create(
            workspace=self.workspace,
            subscriber=sub,
            push_token="token_123",
            platform="ios",
            is_active=True,
        )

        url = reverse("device-detail", args=[device.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        device.refresh_from_db()
        self.assertFalse(device.is_active)
        self.assertIsNotNone(device.archived_at)

    def test_register_device_by_external_id(self):
        sub = Subscriber.objects.create(workspace=self.workspace, external_id="user_1")

        url = reverse("device-create")
        data = {
            "subscriber_external_id": "user_1",
            "platform": "android",
            "push_token": "android_token_123",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        device = Device.objects.get()
        self.assertEqual(device.subscriber, sub)
        self.assertEqual(device.platform, "android")
