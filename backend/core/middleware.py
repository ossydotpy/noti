import logging

from django.http import JsonResponse

from core.api_key_service import APIKeyService

logger = logging.getLogger(__name__)


class APIKeyMiddleware:
    """API key authentication for the public engine API paths.

    Sets ``request.workspace`` and ``request.api_key`` on success.
    """

    API_PATHS_EXACT = [
        "/api/v1/notifications/send",
        "/api/v1/notifications/",
        "/api/v1/topics/",
        "/api/v1/devices/",
        "/api/v1/subscribers/",
    ]

    API_PATHS_PREFIX = [
        "/api/v1/notifications/",  # /notifications/<uuid>
        "/api/v1/topics/",  # /topics/<slug>/send
        "/api/v1/devices/",  # /devices/<uuid>/
        "/api/v1/subscribers/",  # /subscribers/<id>/
        "/api/v1/in-app/sessions/",  # /in-app/sessions/ (but not /refresh/)
    ]

    API_PATHS_EXACT_EXCLUDED = [
        "/api/v1/in-app/sessions/refresh/",  # Public - uses refresh token from body
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.path.startswith("/api/v1/"):
            return self.get_response(request)

        path = request.path

        if path in self.API_PATHS_EXACT_EXCLUDED:
            return self.get_response(request)

        is_api_path = path in self.API_PATHS_EXACT or any(
            path.startswith(p) for p in self.API_PATHS_PREFIX
        )

        if not is_api_path:
            return self.get_response(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JsonResponse(
                {
                    "error": 'Missing or invalid Authorization header. Expected "Bearer <api_key>"'
                },
                status=401,
            )
        try:
            raw_key = auth_header.split(" ")[1]
        except IndexError:
            return JsonResponse(
                {"error": "Invalid Authorization header format"}, status=401
            )

        api_key = APIKeyService.get_api_key_from_key(raw_key)
        if not api_key:
            return JsonResponse(
                {"error": "Invalid, expired, or revoked API Key"}, status=401
            )

        request.workspace = api_key.workspace
        request.api_key = api_key

        return self.get_response(request)


class SubscriberMiddleware:
    """Subscriber Access Token (SAT) authentication for in-app SDK paths.

    Runs AFTER APIKeyMiddleware. Sets ``request.subscriber``, ``request.workspace``
    and ``request.auth_payload`` on success.
    """

    SAT_PROTECTED_PATHS = [
        "/api/v1/in-app/",
        "/api/v1/in-app/topics",
    ]

    SAT_PROTECTED_PATHS_EXCLUDED = [
        "/api/v1/in-app/sessions/",
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not any(request.path.startswith(p) for p in self.SAT_PROTECTED_PATHS):
            return self.get_response(request)

        if any(
            request.path.startswith(p) for p in self.SAT_PROTECTED_PATHS_EXCLUDED
        ):
            return self.get_response(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JsonResponse(
                {"error": "unauthorized", "message": "Authentication required"},
                status=401,
            )

        try:
            token = auth_header.split(" ", 1)[1]
        except IndexError:
            return JsonResponse(
                {
                    "error": "invalid_token",
                    "message": "Invalid authorization header format",
                },
                status=401,
            )

        if not token.startswith("ns_sat_"):
            return JsonResponse(
                {"error": "invalid_token", "message": "Invalid token"}, status=401
            )

        from notifications.services.subscriber_token_service import (
            SubscriberTokenService,
            TokenExpiredError,
            InvalidTokenError,
        )

        try:
            payload = SubscriberTokenService.verify_sat(token)
        except TokenExpiredError:
            return JsonResponse(
                {"error": "token_expired", "message": "Token has expired"}, status=401
            )
        except InvalidTokenError as e:
            return JsonResponse(
                {"error": "invalid_token", "message": str(e)}, status=401
            )

        from notifications.models import Subscriber

        try:
            subscriber = Subscriber.objects.select_related("workspace").get(
                id=payload["sub"],
                workspace_id=payload["wid"],
                is_active=True,
            )
        except Subscriber.DoesNotExist:
            return JsonResponse(
                {"error": "invalid_token", "message": "Subscriber not found"},
                status=401,
            )

        request.subscriber = subscriber
        request.workspace = subscriber.workspace
        request.auth_payload = payload

        return self.get_response(request)
