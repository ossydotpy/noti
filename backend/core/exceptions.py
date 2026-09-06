"""
Custom DRF exception handler and exceptions.

Transforms DRF exceptions into a consistent
``{"error": {"code": "...", "message": "..."}}`` envelope used throughout the API.
"""
from rest_framework import status
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class WorkspaceNotFound(APIException):
    """Raised when an authenticated user has no workspace (client-state precondition)."""

    status_code = status.HTTP_400_BAD_REQUEST
    default_code = "no_workspace"
    default_detail = "No workspace found for this user."


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is None:
        return None

    if isinstance(exc, WorkspaceNotFound):
        return Response(
            {"error": {"code": exc.default_code, "message": str(exc.detail)}},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if isinstance(exc, PermissionDenied):
        detail = exc.detail
        if isinstance(detail, dict) and "code" in detail:
            code = detail["code"]
            message = detail.get("message", "Permission denied.")
        else:
            code = "forbidden"
            message = str(detail) if detail else "Permission denied."

        return Response(
            {"error": {"code": code, "message": message}},
            status=status.HTTP_403_FORBIDDEN,
        )

    if isinstance(exc, ValidationError):
        detail = exc.detail
        if isinstance(detail, dict):
            for field, messages in detail.items():
                first_msg = messages[0] if isinstance(messages, list) else str(messages)
                code = (
                    getattr(first_msg, "code", "validation_error")
                    or "validation_error"
                )
                message = str(first_msg)
                return Response(
                    {"error": {"code": code, "message": message, "field": field}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif isinstance(detail, list):
            first_msg = detail[0]
            code = getattr(first_msg, "code", "validation_error") or "validation_error"
            return Response(
                {"error": {"code": code, "message": str(first_msg)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

    return response
