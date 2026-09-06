import json
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase

from notifications.idempotency import IdempotencyService


class IdempotencyServiceTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_check_and_store(self):
        workspace_id = "ws_123"
        key = "idem_key_123"
        response_data = {"id": "notif_123", "status": "pending"}

        result = IdempotencyService.check(workspace_id, key)
        self.assertIsNone(result)

        IdempotencyService.store(workspace_id, key, response_data)

        result = IdempotencyService.check(workspace_id, key)
        self.assertEqual(result, response_data)

    @patch("django.core.cache.cache.get")
    def test_check_cache_miss(self, mock_get):
        mock_get.return_value = None
        result = IdempotencyService.check("ws", "key")
        self.assertIsNone(result)

    @patch("django.core.cache.cache.get")
    def test_check_cache_hit(self, mock_get):
        data = {"foo": "bar"}
        mock_get.return_value = json.dumps(data)
        result = IdempotencyService.check("ws", "key")
        self.assertEqual(result, data)
