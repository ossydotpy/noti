import base64

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase

from core.api_key_service import APIKeyService
from core.models import Workspace
from notifications.throttling import (
    InAppReadRateThrottle,
    SessionMintRateThrottle,
    SessionRefreshRateThrottle,
    WorkspaceApiThrottle,
)

RATE_THROTTLES = [
    WorkspaceApiThrottle,
    SessionMintRateThrottle,
    SessionRefreshRateThrottle,
    InAppReadRateThrottle,
]

TEST_FERNET_KEY = base64.urlsafe_b64encode(b"0" * 32).decode()


class BaseNotificationTest(APITestCase):
    """Common setup: user, workspace, API key auth, and throttles disabled."""

    def setUp(self):
        overrider = override_settings(TESTING=True, FERNET_KEY=TEST_FERNET_KEY)
        overrider.enable()
        self.addCleanup(overrider.disable)

        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            email="owner@example.com", password="test-pass-123"
        )
        self.workspace = Workspace.objects.create(
            name="Test Workspace", slug="test-workspace", owner=self.user
        )

        self.api_key_obj, self.raw_key = APIKeyService.create_api_key(
            workspace=self.workspace, name="Test Key"
        )
        self.api_key_obj.scopes = ["notifications:send"]
        self.api_key_obj.save(update_fields=["scopes"])

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.raw_key}")
        self._disable_rate_throttles()

    def _disable_rate_throttles(self):
        """Rate limits are covered by dedicated unit tests in test_throttling."""
        for throttle_cls in RATE_THROTTLES:
            throttle_cls.rate = "100000/minute"
            self.addCleanup(_restore_rate, throttle_cls)


def _restore_rate(throttle_cls):
    if "rate" in throttle_cls.__dict__:
        del throttle_cls.rate
