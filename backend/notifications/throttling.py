import logging
import time

from django.conf import settings
from django.core.cache import cache
from rest_framework.throttling import AnonRateThrottle, BaseThrottle, SimpleRateThrottle

logger = logging.getLogger(__name__)

# Lua script for atomic token bucket
# KEYS[1] = key; ARGV = {capacity(burst), rate_per_second, now, requested_tokens}
TOKEN_BUCKET_SCRIPT = """
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local state = redis.call('HMGET', key, 'tokens', 'last_updated')
local tokens = tonumber(state[1])
local last_updated = tonumber(state[2])

if not tokens then
    tokens = capacity
    last_updated = now
end

local delta = math.max(0, now - last_updated)
local refill = delta * rate
tokens = math.min(capacity, tokens + refill)

local allowed = 0
if tokens >= requested then
    tokens = tokens - requested
    allowed = 1
end

redis.call('HSET', key, 'tokens', tokens, 'last_updated', now)
redis.call('EXPIRE', key, 60)

return {allowed, tokens}
"""


def _redis_cache_configured() -> bool:
    backend = settings.CACHES.get("default", {}).get("BACKEND", "")
    return "redis" in backend.lower()


def _redis_connection():
    from django_redis import get_redis_connection

    return get_redis_connection("default")


class GlobalApiThrottle(BaseThrottle):
    """Token-bucket rate limit per workspace (burst-capable).

    Rates come from settings (``API_RATE_LIMIT`` / ``API_BURST_CAPACITY``).
    Requests without a resolved workspace (anon / JWT dashboard) pass through.
    Skipped when the cache backend is not Redis (dev); fails open when Redis
    is unavailable.
    """

    scope = "api"

    def __init__(self):
        self.rate_limit = getattr(settings, "API_RATE_LIMIT", 5)  # tokens/sec
        self.burst_capacity = getattr(settings, "API_BURST_CAPACITY", 10)

    def allow_request(self, request, view):
        workspace = getattr(request, "workspace", None)
        if not workspace:
            return True

        if not _redis_cache_configured():
            return True

        key = f"throttle:{self.scope}:{str(workspace.id)}"

        try:
            con = _redis_connection()
            result = con.eval(
                TOKEN_BUCKET_SCRIPT,
                1,
                key,
                self.burst_capacity,
                self.rate_limit,
                time.time(),
                1,
            )
            return bool(int(result[0]))
        except Exception as e:
            if not getattr(settings, "TESTING", False):
                logger.error("rate_limit_redis_failed error=%s key=%s", e, key)
            return True

    def wait(self):
        return 1.0


class WorkspaceApiThrottle(SimpleRateThrottle):
    """Flat per-workspace rate limit for engine API requests."""

    scope = "workspace"

    def get_cache_key(self, request, view):
        workspace = getattr(request, "workspace", None)
        if not workspace:
            return None  # only applies to workspace-scoped (API key) requests
        return self.cache_format % {"scope": self.scope, "ident": str(workspace.id)}


class SessionMintRateThrottle(AnonRateThrottle):
    """Rate limiting for session mint endpoint."""

    scope = "session_mint"


class SessionRefreshRateThrottle(AnonRateThrottle):
    """Rate limiting for session refresh endpoint."""

    scope = "session_refresh"


class InAppReadRateThrottle(AnonRateThrottle):
    """Rate limiting for in-app feed/read endpoints."""

    scope = "in_app_read"
