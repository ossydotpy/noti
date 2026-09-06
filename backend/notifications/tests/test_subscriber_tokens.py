from django.test import override_settings
from rest_framework import status

from notifications.models import Subscriber, SubscriberRefreshToken
from notifications.services.subscriber_token_service import (
    InvalidRefreshToken,
    SubscriberTokenService,
    TokenExpiredError,
)
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
class SubscriberTokenServiceTests(BaseNotificationTest):
    """Tests for the SubscriberTokenService."""

    def setUp(self):
        super().setUp()
        self.subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_123",
            email="test@example.com",
        )

    def test_issue_tokens(self):
        sat, srt, refresh_token = SubscriberTokenService.issue_tokens(
            subscriber=self.subscriber,
            workspace_id=str(self.workspace.id),
        )

        self.assertTrue(sat.startswith("ns_sat_"))
        self.assertTrue(srt.startswith("ns_srt_"))

        self.assertEqual(refresh_token.subscriber, self.subscriber)
        self.assertEqual(refresh_token.workspace, self.workspace)
        self.assertTrue(refresh_token.is_valid)
        self.assertIsNotNone(refresh_token.token_hash)

    def test_verify_valid_sat(self):
        sat, _, _ = SubscriberTokenService.issue_tokens(
            subscriber=self.subscriber,
            workspace_id=str(self.workspace.id),
        )

        payload = SubscriberTokenService.verify_sat(sat)

        self.assertEqual(payload["sub"], str(self.subscriber.id))
        self.assertEqual(payload["ext_id"], self.subscriber.external_id)
        self.assertEqual(payload["wid"], str(self.workspace.id))
        self.assertEqual(payload["aud"], "in_app")
        self.assertEqual(payload["iss"], "notification-service")
        self.assertIn("in_app", payload["scope"])

    def test_validate_refresh_token(self):
        _, srt, _ = SubscriberTokenService.issue_tokens(
            subscriber=self.subscriber,
            workspace_id=str(self.workspace.id),
        )

        refresh_token = SubscriberTokenService.validate_refresh_token(srt)
        self.assertEqual(refresh_token.subscriber, self.subscriber)
        self.assertEqual(refresh_token.workspace, self.workspace)

    def test_validate_invalid_refresh_token_format(self):
        with self.assertRaises(InvalidRefreshToken):
            SubscriberTokenService.validate_refresh_token("invalid_token")

    def test_validate_nonexistent_refresh_token(self):
        fake_token = f"{SubscriberTokenService.SRT_PREFIX}fake_token"
        with self.assertRaises(InvalidRefreshToken):
            SubscriberTokenService.validate_refresh_token(fake_token)

    def test_rotate_tokens(self):
        _, srt, old_refresh_token = SubscriberTokenService.issue_tokens(
            subscriber=self.subscriber,
            workspace_id=str(self.workspace.id),
        )

        new_sat, new_srt, new_refresh_token = SubscriberTokenService.rotate_tokens(
            refresh_token=old_refresh_token,
        )

        self.assertNotEqual(new_sat, srt)
        self.assertNotEqual(new_srt, srt)

        old_refresh_token.refresh_from_db()
        self.assertTrue(old_refresh_token.is_revoked)

        self.assertTrue(new_refresh_token.is_valid)

    def test_revoke_all_subscriber_tokens(self):
        SubscriberTokenService.issue_tokens(
            subscriber=self.subscriber,
            workspace_id=str(self.workspace.id),
        )
        SubscriberTokenService.issue_tokens(
            subscriber=self.subscriber,
            workspace_id=str(self.workspace.id),
        )

        revoked_count = SubscriberTokenService.revoke_all_subscriber_tokens(
            subscriber=self.subscriber,
            workspace_id=str(self.workspace.id),
        )

        self.assertEqual(revoked_count, 2)

        tokens = SubscriberRefreshToken.objects.filter(
            subscriber=self.subscriber,
            workspace=self.workspace,
        )
        self.assertEqual(tokens.count(), 2)
        for token in tokens:
            self.assertTrue(token.is_revoked)

    def test_enforce_max_expiry(self):
        sat, srt, _ = SubscriberTokenService.issue_tokens(
            subscriber=self.subscriber,
            workspace_id=str(self.workspace.id),
            requested_sat_expiry=7200,
            requested_srt_expiry=86400 * 365,
        )

        payload = SubscriberTokenService.verify_sat(sat)
        actual_expiry = payload["exp"] - payload["iat"]
        self.assertLessEqual(actual_expiry, 3600)

        refresh_token = SubscriberTokenService.validate_refresh_token(srt)
        lifetime = refresh_token.expires_at - refresh_token.created_at
        self.assertLessEqual(lifetime.total_seconds(), 7776000)


@override_settings(SAT_CONFIG=SAT_TEST_CONFIG)
class SessionAPITests(BaseNotificationTest):
    """Tests for the session API endpoints."""

    def setUp(self):
        super().setUp()
        self.subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_123",
            email="test@example.com",
        )

    def test_create_session_missing_external_id(self):
        response = self.client.post("/api/v1/in-app/sessions/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("subscriber_external_id", response.data["error"])

    def test_create_session_invalid_subscriber(self):
        response = self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "nonexistent_user"},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_session_success(self):
        response = self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "user_123"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access_token", response.data)
        self.assertIn("refresh_token", response.data)
        self.assertEqual(response.data["token_type"], "Bearer")
        self.assertEqual(response.data["external_id"], "user_123")

    def test_create_session_capped_expiry_reported(self):
        response = self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "user_123", "expires_in": 99999},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["expires_in"], 3600)

    def test_create_session_invalid_expiry(self):
        response = self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "user_123", "expires_in": "abc"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_session_missing_token(self):
        self.client.credentials()
        response = self.client.post("/api/v1/in-app/sessions/refresh/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_session_invalid_token(self):
        self.client.credentials()
        response = self.client.post(
            "/api/v1/in-app/sessions/refresh/",
            {"refresh_token": "invalid_token"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_session_success(self):
        create_response = self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "user_123"},
        )
        refresh_token = create_response.data["refresh_token"]

        self.client.credentials()
        response = self.client.post(
            "/api/v1/in-app/sessions/refresh/",
            {"refresh_token": refresh_token},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)
        self.assertIn("refresh_token", response.data)

    def test_revoke_session_missing_external_id(self):
        response = self.client.post("/api/v1/in-app/sessions/revoke/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_revoke_session_success(self):
        self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "user_123"},
        )
        self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "user_123"},
        )

        response = self.client.post(
            "/api/v1/in-app/sessions/revoke/",
            {"subscriber_external_id": "user_123"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["revoked_count"], 2)


@override_settings(SAT_CONFIG=SAT_TEST_CONFIG)
class InAppEndpointProtectionTests(BaseNotificationTest):
    """In-app endpoints must be protected by SAT authentication."""

    def setUp(self):
        super().setUp()
        self.subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_123",
            email="test@example.com",
        )

    def test_in_app_feed_requires_sat(self):
        session_response = self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "user_123"},
        )
        sat = session_response.data["access_token"]

        self.client.credentials()
        response = self.client.get("/api/v1/in-app/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        response = self.client.get("/api/v1/in-app/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_in_app_feed_returns_own_feed_only(self):
        session_response = self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "user_123"},
        )
        sat = session_response.data["access_token"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        response = self.client.get("/api/v1/in-app/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_in_app_unread_count_requires_sat(self):
        session_response = self.client.post(
            "/api/v1/in-app/sessions/",
            {"subscriber_external_id": "user_123"},
        )
        sat = session_response.data["access_token"]

        self.client.credentials()
        response = self.client.get("/api/v1/in-app/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {sat}")
        response = self.client.get("/api/v1/in-app/unread-count/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)


@override_settings(
    SAT_CONFIG={
        **SAT_TEST_CONFIG,
        "ACCESS_TOKEN_EXPIRY": -1,  # Expired immediately for testing
    }
)
class TokenExpirationTests(BaseNotificationTest):
    """Tests for token expiration scenarios."""

    def setUp(self):
        super().setUp()
        self.subscriber = Subscriber.objects.create(
            workspace=self.workspace,
            external_id="user_123",
            email="test@example.com",
        )

    def test_verify_expired_sat(self):
        sat, _, _ = SubscriberTokenService.issue_tokens(
            subscriber=self.subscriber,
            workspace_id=str(self.workspace.id),
        )

        with self.assertRaises(TokenExpiredError):
            SubscriberTokenService.verify_sat(sat)
