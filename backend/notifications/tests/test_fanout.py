from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from core.models import Workspace
from notifications.models import Notification, Provider, Subscriber
from notifications.services import FanoutService
from notifications.services.device_service import DeviceService
from notifications.tests.base import TEST_FERNET_KEY


@override_settings(FERNET_KEY=TEST_FERNET_KEY)
class FanoutServiceTest(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            email="owner@example.com", password="test-pass-123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", slug="test-workspace", owner=self.user
        )
        self.subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_123",
            email="test@example.com",
            phone_number="+15551234567",
        )
        self.notification = Notification.objects.create(
            workspace=self.workspace,
            subscriber=self.subscriber,
            body="Hello",
            data={"message": "Hello"},
            channels=["email", "sms", "push", "in_app"],
        )
        Provider.objects.create(
            workspace=self.workspace,
            provider_type="arkesel",
            name="Test SMS Provider",
            config={"api_key": "test_key", "sender_id": "TEST"},
        )
        Provider.objects.create(
            workspace=self.workspace,
            provider_type="ses",
            name="Test Email Provider",
            channel="email",
            config={"access_key_id": "test_key", "secret_access_key": "test_secret"},
        )
        Provider.objects.create(
            workspace=self.workspace,
            provider_type="fcm",
            name="Test Push Provider",
            channel="push",
            config={
                "project_id": "test_project",
                "client_email": "test@example.com",
                "private_key": "test_key",
            },
        )

    def test_fanout_creates_deliveries(self):
        DeviceService.register_device(
            workspace=self.workspace,
            subscriber=self.subscriber,
            push_token="token_123",
            platform="ios",
        )

        deliveries = FanoutService.process(self.notification)

        self.assertEqual(len(deliveries), 4)

        channels = [d.channel for d in deliveries]
        self.assertIn("email", channels)
        self.assertIn("sms", channels)
        self.assertIn("push", channels)
        self.assertIn("in_app", channels)

        self.notification.refresh_from_db()
        self.assertEqual(self.notification.status, "processing")
        self.assertEqual(self.notification.delivery_count, 4)

    def test_fanout_no_device_no_push(self):
        self.notification.channels = ["push"]
        self.notification.save()

        deliveries = FanoutService.process(self.notification)

        self.assertEqual(len(deliveries), 0)
        self.notification.refresh_from_db()
        self.assertEqual(self.notification.status, "failed")
        self.assertIsNotNone(self.notification.completed_at)

    def test_fanout_specific_channels(self):
        self.notification.channels = ["email"]
        self.notification.save()

        deliveries = FanoutService.process(self.notification)
        self.assertEqual(len(deliveries), 1)
        self.assertEqual(deliveries[0].channel, "email")

    def test_fanout_sms_without_phone(self):
        self.subscriber.phone_number = None
        self.subscriber.save()

        self.notification.channels = ["sms"]
        self.notification.save()

        deliveries = FanoutService.process(self.notification)
        self.assertEqual(len(deliveries), 0)

    def test_fanout_in_app_delivered_immediately(self):
        self.notification.channels = ["in_app"]
        self.notification.save()

        deliveries = FanoutService.process(self.notification)
        self.assertEqual(len(deliveries), 1)
        self.assertEqual(deliveries[0].status, "delivered")
        self.assertIsNotNone(deliveries[0].delivered_at)

    def test_sms_provider_from_workspace_settings(self):
        self.workspace.settings = {"default_sms_provider": "hubtel"}
        self.workspace.save()

        self.notification.channels = ["sms"]
        self.notification.save()

        deliveries = FanoutService.process(self.notification)
        self.assertEqual(len(deliveries), 1)
        self.assertEqual(deliveries[0].provider, "hubtel")
