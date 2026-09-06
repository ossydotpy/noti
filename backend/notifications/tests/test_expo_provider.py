import json
from unittest.mock import MagicMock, Mock, patch

import httpx
from django.test import TestCase
from pydantic import ValidationError

from notifications.providers.base import ProviderResult
from notifications.providers.push.expo import (
    EXPO_PUSH_API_URL,
    EXPO_RECEIPTS_API_URL,
    ExpoConfig,
    ExpoProvider,
)


class ExpoConfigTest(TestCase):
    """Test Expo configuration schema validation."""

    def test_valid_config(self):
        config = ExpoConfig(access_token="test-token-12345", max_retries=5)

        self.assertEqual(config.access_token, "test-token-12345")
        self.assertEqual(config.max_retries, 5)
        self.assertTrue(config.use_fcm_v1)

    def test_default_values(self):
        config = ExpoConfig(access_token="test-token-12345")

        self.assertEqual(config.max_retries, 3)
        self.assertTrue(config.use_fcm_v1)

    def test_empty_token_raises_error(self):
        with self.assertRaises(ValidationError) as ctx:
            ExpoConfig(access_token="")

        self.assertTrue(
            any("too_short" in str(e).lower() or "empty" in str(e).lower()
                for e in ctx.exception.errors())
        )

    def test_short_token_raises_error(self):
        with self.assertRaises(ValidationError) as ctx:
            ExpoConfig(access_token="short")

        self.assertTrue(
            any("short" in str(e).lower() for e in ctx.exception.errors())
        )

    def test_whitespace_token_raises_error(self):
        with self.assertRaises(ValidationError) as ctx:
            ExpoConfig(access_token="          ")

        self.assertTrue(any("empty" in str(e).lower() for e in ctx.exception.errors()))

    def test_extra_fields_forbidden(self):
        with self.assertRaises(ValidationError):
            ExpoConfig(access_token="valid-token-123", invalid_field="should fail")


class ExpoProviderTokenValidationTest(TestCase):
    """Test Expo push token format validation."""

    def setUp(self):
        self.provider = ExpoProvider()

    def test_valid_token_format(self):
        valid_tokens = [
            "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
            "ExponentPushToken[abc123DEF456]",
            "ExponentPushToken[test_token_123]",
        ]

        for token in valid_tokens:
            with self.subTest(token=token):
                self.assertTrue(
                    self.provider._validate_token_format(token),
                    f"Token should be valid: {token}",
                )

    def test_invalid_token_formats(self):
        invalid_tokens = [
            "",
            "invalid-token",
            "ExponentPushToken[",
            "ExponentPushToken]",
            "PushToken[xxx]",
            "ExponentPushToken[xxx]extra",
        ]

        for token in invalid_tokens:
            with self.subTest(token=token):
                self.assertFalse(
                    self.provider._validate_token_format(token),
                    f"Token should be invalid: {token}",
                )


class ExpoProviderSendTest(TestCase):
    """Test Expo provider send functionality."""

    def setUp(self):
        self.provider = ExpoProvider()
        self.config = {
            "access_token": "test-token-12345",
            "use_fcm_v1": False,
        }

        self.delivery = Mock()
        self.delivery.target_address = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
        self.delivery.notification = Mock()
        self.delivery.notification.title = "Test Title"
        self.delivery.notification.body = "Test Body"
        self.delivery.notification.data = {"key": "value"}
        self.delivery.notification.image_url = "https://example.com/image.png"

    @patch("notifications.providers.push.expo._get_client")
    def test_send_success(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {"id": "ticket-12345", "status": "ok"}
        }
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertIsInstance(result, ProviderResult)
        self.assertEqual(result.status, "sent")
        self.assertEqual(result.external_id, "ticket-12345")
        self.assertIn("expo_response", result.details)

        mock_client.post.assert_called_once()
        self.assertEqual(mock_client.post.call_args[0][0], EXPO_PUSH_API_URL)

    @patch("notifications.providers.push.expo._get_client")
    def test_send_uses_fcm_v1_param(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": {"id": "ticket", "status": "ok"}}
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        self.provider.send(self.delivery, {"access_token": "test-token-12345"})

        url = mock_client.post.call_args[0][0]
        self.assertTrue(url.startswith(EXPO_PUSH_API_URL))
        self.assertIn("useFcmV1=true", url)

    @patch("notifications.providers.push.expo._get_client")
    def test_send_with_invalid_token_format(self, mock_get_client):
        self.delivery.target_address = "invalid-token"

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "invalid-token-format")
        mock_get_client.assert_not_called()

    @patch("notifications.providers.push.expo._get_client")
    def test_send_rate_limit(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_response.headers = {"Retry-After": "60"}
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "rate-limit-exceeded")
        self.assertEqual(result.details["retry_after"], "60")

    @patch("notifications.providers.push.expo._get_client")
    def test_send_server_error(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "provider-server-error")

    @patch("notifications.providers.push.expo._get_client")
    def test_send_http_error(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "http-error-400")

    @patch("notifications.providers.push.expo._get_client")
    def test_send_device_not_registered(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {"status": "error", "details": {"error": "DeviceNotRegistered"}}
        }
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "registration-token-not-registered")
        self.assertEqual(result.details["expo_error_code"], "DeviceNotRegistered")

    @patch("notifications.providers.push.expo._get_client")
    def test_send_invalid_credentials(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "errors": [
                {"code": "InvalidCredentials", "message": "Invalid access token"}
            ]
        }
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "invalid-credentials")

    @patch("notifications.providers.push.expo._get_client")
    def test_send_message_too_big(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {"status": "error", "details": {"error": "MessageTooBig"}}
        }
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "payload-too-large")

    @patch("notifications.providers.push.expo._get_client")
    def test_send_timeout(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.post.side_effect = httpx.TimeoutException("Timeout")
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "request-timeout")

    @patch("notifications.providers.push.expo._get_client")
    def test_send_connection_error(self, mock_get_client):
        mock_client = MagicMock()
        mock_client.post.side_effect = httpx.RequestError("Connection refused")
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "connection-error")

    @patch("notifications.providers.push.expo._get_client")
    def test_send_invalid_json_response(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("test", "invalid", 0)
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = self.provider.send(self.delivery, self.config)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.error_message, "invalid-json-response")


class ExpoProviderPayloadTest(TestCase):
    """Test Expo payload building."""

    def setUp(self):
        self.provider = ExpoProvider()
        self.delivery = Mock()
        self.delivery.target_address = "ExponentPushToken[test123]"
        self.delivery.notification = Mock()
        self.delivery.notification.title = "Test Title"
        self.delivery.notification.body = "Test Body"
        self.delivery.notification.data = {"key": "value", "badge": 5}
        self.delivery.notification.image_url = "https://example.com/image.png"

    def test_build_payload_full(self):
        payload = self.provider._build_payload(self.delivery)

        self.assertEqual(payload["to"], "ExponentPushToken[test123]")
        self.assertEqual(payload["title"], "Test Title")
        self.assertEqual(payload["body"], "Test Body")
        self.assertEqual(payload["data"], {"key": "value", "badge": 5})
        self.assertEqual(payload["image"], "https://example.com/image.png")
        self.assertEqual(payload["priority"], "high")
        self.assertEqual(payload["sound"], "default")
        self.assertEqual(payload["badge"], 5)

    def test_build_payload_minimal(self):
        self.delivery.notification.data = {}
        self.delivery.notification.image_url = None
        self.delivery.notification.title = None
        self.delivery.notification.body = None

        payload = self.provider._build_payload(self.delivery)

        self.assertEqual(payload["to"], "ExponentPushToken[test123]")
        self.assertEqual(payload["title"], "")
        self.assertEqual(payload["body"], "")
        self.assertNotIn("image", payload)

    def test_build_payload_with_channel_id(self):
        self.delivery.notification.data = {"channelId": "default"}

        payload = self.provider._build_payload(self.delivery)

        self.assertEqual(payload["channelId"], "default")

    def test_build_payload_bad_badge_ignored(self):
        self.delivery.notification.data = {"badge": "not-a-number"}

        payload = self.provider._build_payload(self.delivery)

        self.assertNotIn("badge", payload)


class ExpoProviderReceiptsTest(TestCase):
    """Test Expo receipt fetching."""

    @patch("notifications.providers.push.expo._get_client")
    def test_get_receipts_success(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "ticket-1": {"status": "ok", "details": {"sentAt": 1234567890}},
                "ticket-2": {
                    "status": "error",
                    "details": {"error": "DeviceNotRegistered"},
                },
            }
        }
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = ExpoProvider.get_receipts(["ticket-1", "ticket-2"], "test-token")

        self.assertEqual(len(result), 2)
        self.assertEqual(result["ticket-1"]["status"], "ok")
        self.assertEqual(result["ticket-2"]["status"], "error")

        mock_client.post.assert_called_once()
        self.assertEqual(mock_client.post.call_args[0][0], EXPO_RECEIPTS_API_URL)

    @patch("notifications.providers.push.expo._get_client")
    def test_get_receipts_empty_list(self, mock_get_client):
        result = ExpoProvider.get_receipts([], "test-token")

        self.assertEqual(result, {})
        mock_get_client.assert_not_called()

    @patch("notifications.providers.push.expo._get_client")
    def test_get_receipts_http_error(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Server Error"
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        result = ExpoProvider.get_receipts(["ticket-1"], "test-token")

        self.assertIn("error_0", result)
        self.assertEqual(result["error_0"]["error"], "HTTP 500")

    @patch("notifications.providers.push.expo._get_client")
    def test_get_receipts_chunks_of_1000(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"data": {}}
        mock_client.post.return_value = mock_response
        mock_get_client.return_value = mock_client

        ticket_ids = [f"ticket-{i}" for i in range(1500)]

        ExpoProvider.get_receipts(ticket_ids, "test-token")

        self.assertEqual(mock_client.post.call_count, 2)


class ExpoProviderIntegrationTest(TestCase):
    """Integration tests for the Expo provider."""

    def test_provider_metadata(self):
        self.assertEqual(ExpoProvider.key, "expo")
        self.assertEqual(ExpoProvider.name, "Expo Push Notifications")
        self.assertEqual(ExpoProvider.channel, "push")
        self.assertEqual(ExpoProvider.config_schema, ExpoConfig)

    def test_provider_in_registry(self):
        from notifications.providers.registry import ProviderRegistry

        provider_cls = ProviderRegistry.get("expo")
        self.assertIsNotNone(provider_cls)
        self.assertEqual(provider_cls, ExpoProvider)

    def test_config_validation(self):
        config = {"access_token": "valid-token-12345"}

        validated = ExpoProvider.validate_config(config)

        self.assertEqual(validated["access_token"], "valid-token-12345")
        self.assertEqual(validated["max_retries"], 3)
        self.assertTrue(validated["use_fcm_v1"])
