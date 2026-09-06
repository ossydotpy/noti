import logging
import time

from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def _check_database() -> dict:
    """Return {ok: bool, latency_ms: float, error: str|None}."""
    start = time.monotonic()
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return {"ok": True, "latency_ms": round((time.monotonic() - start) * 1000, 2)}
    except Exception as e:
        logger.error("health.database_failed error=%s", e)
        return {
            "ok": False,
            "latency_ms": round((time.monotonic() - start) * 1000, 2),
            "error": str(e),
        }


def _check_redis() -> dict:
    """Return {ok: bool, latency_ms: float, error: str|None}."""
    start = time.monotonic()
    try:
        cache.set("_health", "1", 10)
        val = cache.get("_health")
        if val != "1":
            raise ValueError("unexpected value returned from cache")
        return {"ok": True, "latency_ms": round((time.monotonic() - start) * 1000, 2)}
    except Exception as e:
        logger.error("health.redis_failed error=%s", e)
        return {
            "ok": False,
            "latency_ms": round((time.monotonic() - start) * 1000, 2),
            "error": str(e),
        }


def health_check(request):
    """Full health check — reports DB and cache status with latency."""
    db = _check_database()
    redis = _check_redis()

    healthy = db["ok"] and redis["ok"]
    status_code = 200 if healthy else 503

    body = {
        "status": "healthy" if healthy else "unhealthy",
        "checks": {
            "database": {
                "status": "ok" if db["ok"] else "error",
                "latency_ms": db["latency_ms"],
            },
            "redis": {
                "status": "ok" if redis["ok"] else "error",
                "latency_ms": redis["latency_ms"],
            },
        },
    }

    if not db["ok"]:
        body["checks"]["database"]["error"] = db.get("error")
    if not redis["ok"]:
        body["checks"]["redis"]["error"] = redis.get("error")

    return JsonResponse(body, status=status_code)


def readiness_check(request):
    """Returns 200 only when DB and cache are reachable."""
    db = _check_database()
    redis = _check_redis()

    ready = db["ok"] and redis["ok"]
    status_code = 200 if ready else 503

    return JsonResponse(
        {
            "status": "ready" if ready else "not_ready",
            "checks": {
                "database": "ok" if db["ok"] else "error",
                "redis": "ok" if redis["ok"] else "error",
            },
        },
        status=status_code,
    )


def liveness_check(request):
    """Always returns 200 while the process is running."""
    return JsonResponse({"status": "alive"})
