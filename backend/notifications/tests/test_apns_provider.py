from unittest.mock import MagicMock, Mock, patch

import httpx
from django.test import TestCase
from pydantic import ValidationError

from notifications.providers.push.apns import (
    APNS_PRODUCTION_URL,
    APNS_SANDBOX_URL,
    ApnsConfig,
    ApnsProvider,
)

DUMMY_PRIVATE_KEY = (
    "-----BEGIN PRIVATE KEY-----\n"
    "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgLy7i5f5n8O8r6W6B\n"
    "8z6V7/nS6Z/yvK5+k6+4/8J8vK6hRANCAAT7p/7z9z9vY8v7+7p/7z9z9vY8v7+7\n"
    "p/7z9z9vY8v7+7p/7z9z9vY8v7+7p/7z9z9vY8v7+7p/7z9z9vY8\n"
    "-----END PRIVATE KEY-----"
)


class ApnsConfigTest(TestCase):
    """Test APNs configuration schema validation."""

    def test_valid_config(self):
        config = ApnsConfig(
            team_id="ABC123DEFG",
            key_id="KEY1234567",
            bundle_id="com.example.app",
            auth_key=DUMMY_PRIVATE_KEY,
            use_sandbox=True,
        )

        self.assertEqual(config.team_id, "ABC123DEFG")
        self.assertEqual(config.key_id, "KEY1234567")
        self.assertEqual(config.bundle_id, "com.example.app")
        self.assertTrue(config.use_sandbox)
        self.assertEqual(config.base_url, APNS_SANDBOX_URL)

    def test_id_validation(self):
        config = ApnsConfig(
            team_id="abc123defg",
            key_id="key1234567",
            bundle_id="com.example.app",
            auth_key=DUMMY_PRIVATE_KEY,
        )
        self.assertEqual(config.team_id, "ABC123DEFG")
        self.assertEqual(config.key_id, "KEY1234567")

        with self.assertRaises(ValidationError):
            ApnsConfig(
                team_id="TOO_SHORT",
                key_id="KEY1234567",
                bundle_id="com.app",
                auth_key="key",
            )

        with self.assertRaises(ValidationError):
            ApnsConfig(
                team_id="ABC-123-DE",
                key_id="KEY1234567",
                bundle_id="com.app",
                auth_key="key",
            )

    def test_default_values(self):
        config = ApnsConfig(
            team_id="ABC123DEFG",
            key_id="KEY1234567",
            bundle_id="com.example.app",
            auth_key=DUMMY_PRIVATE_KEY,
        )

        self.assertFalse(config.use_sandbox)
        self.assertEqual(config.base_url, APNS_PRODUCTION_URL)


class ApnsProviderTokenValidationTest(TestCase):
    """Test APNs device token format validation."""

    def setUp(self):
        self.provider = ApnsProvider()

    def test_valid_token_format(self):
        valid_token = "a" * 64
        self.assertTrue(self.provider._validate_token_format(valid_token))

        valid_hex = "0123456789abcdef" * 4
        self.assertTrue(self.provider._validate_token_format(valid_hex))

    def test_invalid_token_formats(self):
        invalid_tokens = [
            "",
            "a" * 63,
            "a" * 65,
            "g" * 64,
            " " * 64,
        ]

        for token in invalid_tokens:
            with self.subTest(token=token):
                self.assertFalse(
                    self.provider._validate_token_format(token),
                    f"Token should be invalid: {token}",
                )


class ApnsProviderSendTest(TestCase):
    """Test APNs provider send functionality."""

    def setUp(self):
        self.provider = ApnsProvider()
        self.config = {
            "team_id": "ABC123DEFG",
            "key_id": "KEY1234567",
            "bundle_id": "com.example.app",
            "auth_key": DUMMY_PRIVATE_KEY,
        }

        self.delivery = Mock()
        self.delivery.target_address = "a" * 64
        self.delivery.notification = Mock()
        self.delivery.notification.title = "Test Title"
        self.delivery.notification.body = "Test Body"
        self.delivery.notification.data = {"custom": "data"}

    @patch("notifications.providers.push.apns._get_client")
    @patch("notifications.providers.push.apns._get_cached_token")
    def test_send_success(self, mock_get_token, mock_get_client):
        mock_get_token.return_value = "mocked-jwt-token"

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"apns-id": "123e4567-e89b-12d3-a456-426614174000"}
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "sent")
        self.assertEqual(result.external_id, "123e4567-e89b-12d3-a456-426614174000")

        mock_client.post.assert_called_once()
        args, kwargs = mock_client.post.call_args
        self.assertEqual(args[0], f"/3/device/{self.delivery.target_address}")
        self.assertEqual(kwargs["headers"]["authorization"], "bearer mocked-jwt-token")
        self.assertEqual(kwargs["headers"]["apns-topic"], "com.example.app")
        self.assertEqual(kwargs["headers"]["apns-push-type"], "alert")

    @patch("notifications.providers.push.apns._get_client")
    @patch("notifications.providers.push.apns._get_cached_token")
    def test_send_unregistered(self, mock_get_token, mock_get_client):
        mock_get_token.return_value = "token"
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 410
        mock_response.json.return_value = {"reason": "Unregistered"}
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "registration-token-not-registered")

    @patch("notifications.providers.push.apns._get_client")
    @patch("notifications.providers.push.apns._get_cached_token")
    def test_send_background_notification(self, mock_get_token, mock_get_client):
        mock_get_token.return_value = "token"
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        self.delivery.notification.title = None
        self.delivery.notification.body = None
        self.delivery.notification.data = {"content-available": 1}

        self.provider.send(self.delivery, self.config)

        _, kwargs = mock_client.post.call_args
        self.assertEqual(kwargs["headers"]["apns-push-type"], "background")
        self.assertEqual(kwargs["headers"]["apns-priority"], "5")

        payload = kwargs["json"]
        self.assertEqual(payload["aps"]["content-available"], 1)
        self.assertNotIn("alert", payload["aps"])

    @patch("notifications.providers.push.apns._get_client")
    @patch("notifications.providers.push.apns._get_cached_token")
    def test_send_timeout(self, mock_get_token, mock_get_client):
        mock_get_token.return_value = "token"
        mock_client = MagicMock()
        mock_client.post.side_effect = httpx.TimeoutException("Timeout")
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "request-timeout")

    @patch("notifications.providers.push.apns._get_client")
    @patch("notifications.providers.push.apns._get_cached_token")
    def test_send_connection_error(self, mock_get_token, mock_get_client):
        mock_get_token.return_value = "token"
        mock_client = MagicMock()
        mock_client.post.side_effect = httpx.RequestError("Connection refused")
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "connection-error")


class ApnsProviderIntegrationTest(TestCase):
    """Integration tests for the APNs provider."""

    def test_provider_metadata(self):
        self.assertEqual(ApnsProvider.key, "apns")
        self.assertEqual(ApnsProvider.name, "Apple Push Notification service")
        self.assertEqual(ApnsProvider.channel, "push")
        self.assertEqual(ApnsProvider.config_schema, ApnsConfig)

    def test_provider_in_registry(self):
        from notifications.providers.registry import ProviderRegistry

        provider_cls = ProviderRegistry.get("apns")
        self.assertIsNotNone(provider_cls)
        self.assertEqual(provider_cls, ApnsProvider)
