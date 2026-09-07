import time
from unittest.mock import MagicMock, patch

import redis
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.test import SimpleTestCase

from notifications.throttling import (
    GlobalApiThrottle,
    InAppReadRateThrottle,
    SessionMintRateThrottle,
    SessionRefreshRateThrottle,
    WorkspaceApiThrottle,
)


class GlobalApiThrottleTest(SimpleTestCase):
    """Tests for the per-workspace token bucket throttle."""

    def setUp(self):
        self.throttle = GlobalApiThrottle()
        self.assertEqual(self.throttle.rate_limit, 5.0)
        self.assertEqual(self.throttle.burst_capacity, 10)

    def test_no_workspace_allows_request(self):
        request = MagicMock(spec=[])
        self.assertTrue(self.throttle.allow_request(request, None))

    @patch("notifications.throttling._redis_cache_configured", return_value=True)
    @patch("notifications.throttling._redis_connection")
    def test_allow_request_calls_token_bucket_script(self, mock_conn, _cfg):
        mock_conn.return_value.eval.return_value = [1, 4.0]
        request = MagicMock()
        request.workspace = MagicMock(id="ws-1")

        self.assertTrue(self.throttle.allow_request(request, None))

        args = mock_conn.return_value.eval.call_args[0]
        self.assertEqual(args[2], "throttle:api:ws-1")
        self.assertEqual(args[3], 10)
        self.assertEqual(args[4], 5.0)
        self.assertAlmostEqual(args[5], time.time(), delta=5)
        self.assertEqual(args[6], 1)

    @patch("notifications.throttling._redis_cache_configured", return_value=True)
    @patch("notifications.throttling._redis_connection")
    def test_rate_limit_exceeded(self, mock_conn, _cfg):
        mock_conn.return_value.eval.return_value = [0, 0.0]
        request = MagicMock()
        request.workspace = MagicMock(id="ws-1")

        self.assertFalse(self.throttle.allow_request(request, None))

    @patch("notifications.throttling._redis_cache_configured", return_value=True)
    @patch("notifications.throttling._redis_connection")
    def test_fail_open_on_redis_error(self, mock_conn, _cfg):
        mock_conn.side_effect = redis.RedisError("Connection failed")
        request = MagicMock()
        request.workspace = MagicMock(id="ws-1")

        self.assertTrue(self.throttle.allow_request(request, None))

    @patch("notifications.throttling._redis_connection")
    def test_no_workspace_skips_redis(self, mock_conn):
        request = MagicMock(spec=[])
        self.assertTrue(self.throttle.allow_request(request, None))
        mock_conn.assert_not_called()


class WorkspaceApiThrottleTest(SimpleTestCase):
    """Tests for the flat per-workspace rate limit."""

    def test_cache_key_uses_workspace_id(self):
        throttle = WorkspaceApiThrottle()
        request = MagicMock()
        request.workspace = MagicMock(id="ws-1")

        key = throttle.get_cache_key(request, None)
        self.assertEqual(key, "throttle_workspace_ws-1")

    def test_no_workspace_returns_none(self):
        throttle = WorkspaceApiThrottle()
        request = MagicMock(spec=[])

        self.assertIsNone(throttle.get_cache_key(request, None))


class ScopedAnonThrottleTest(SimpleTestCase):
    """Tests for the anon-scoped endpoint throttles."""

    def setUp(self):
        cache.clear()

    @staticmethod
    def _request(ip="1.2.3.4", authenticated=False):
        request = MagicMock()
        if authenticated:
            request.user = MagicMock()
            request.user.is_authenticated = True
        else:
            request.user = AnonymousUser()
        request.META = {"REMOTE_ADDR": ip}
        return request

    def test_scopes(self):
        self.assertEqual(SessionMintRateThrottle.scope, "session_mint")
        self.assertEqual(SessionRefreshRateThrottle.scope, "session_refresh")
        self.assertEqual(InAppReadRateThrottle.scope, "in_app_read")

    def test_anon_requests_throttled_by_ip(self):
        throttle = SessionMintRateThrottle()
        throttle.num_requests, throttle.duration = 2, 60

        self.assertTrue(throttle.allow_request(self._request(), None))
        self.assertTrue(throttle.allow_request(self._request(), None))
        self.assertFalse(throttle.allow_request(self._request(), None))

    def test_separate_ips_are_independent(self):
        throttle = InAppReadRateThrottle()
        throttle.num_requests, throttle.duration = 1, 60

        self.assertTrue(throttle.allow_request(self._request("1.1.1.1"), None))
        self.assertTrue(throttle.allow_request(self._request("2.2.2.2"), None))

    def test_authenticated_requests_not_throttled(self):
        throttle = SessionRefreshRateThrottle()
        throttle.num_requests, throttle.duration = 1, 60

        self.assertTrue(throttle.allow_request(self._request(authenticated=True), None))
        self.assertTrue(throttle.allow_request(self._request(authenticated=True), None))
