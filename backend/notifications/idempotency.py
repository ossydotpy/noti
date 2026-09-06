import json

from django.core.cache import cache

IDEMPOTENCY_TTL = 60 * 60 * 24


class IdempotencyService:
    """Stores and replays responses for Idempotency-Key headers (24h TTL)."""

    @staticmethod
    def _cache_key(workspace_id: str, idempotency_key: str) -> str:
        return f"idempotency:{workspace_id}:{idempotency_key}"

    @staticmethod
    def check(workspace_id: str, idempotency_key: str) -> dict | None:
        """Return the cached response for an idempotency key, or None."""
        cached = cache.get(IdempotencyService._cache_key(workspace_id, idempotency_key))
        if cached:
            return json.loads(cached)
        return None

    @staticmethod
    def store(workspace_id: str, idempotency_key: str, response_data: dict):
        """Store the response for an idempotency key."""
        cache.set(
            IdempotencyService._cache_key(workspace_id, idempotency_key),
            json.dumps(response_data, default=str),
            IDEMPOTENCY_TTL,
        )
