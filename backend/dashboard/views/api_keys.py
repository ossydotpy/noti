import logging

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.api_key_service import APIKeyService
from core.models import APIKey
from dashboard.permissions import IsWorkspaceAdmin, WorkspaceContextPermission
from dashboard.serializers.api_keys import (
    APIKeyCreateResponseSerializer,
    APIKeyCreateSerializer,
    APIKeyDetailSerializer,
    APIKeyListSerializer,
)

logger = logging.getLogger(__name__)


class APIKeyViewSet(viewsets.ModelViewSet):
    """Manages workspace API keys; the raw key is shown only on creation."""

    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return APIKey.objects.none()
        return APIKey.objects.filter(workspace=self.request.workspace)

    def get_serializer_class(self):
        if self.action == "create":
            return APIKeyCreateSerializer
        if self.action == "retrieve":
            return APIKeyDetailSerializer
        return APIKeyListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        api_key, raw_key = APIKeyService.create_api_key(
            workspace=request.workspace,
            name=serializer.validated_data["name"],
            created_by=request.user,
        )
        logger.info(
            "api_key.created_via_dashboard workspace_id=%s api_key_id=%s",
            request.workspace.id,
            api_key.id,
        )
        response_data = {
            "id": api_key.id,
            "name": api_key.name,
            "key_prefix": api_key.key_prefix,
            "api_key": raw_key,
            "created_at": api_key.created_at,
            "created_by": api_key.created_by_id,
        }
        return Response(
            APIKeyCreateResponseSerializer(response_data).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        api_key = self.get_object()
        if api_key.is_revoked:
            return Response(
                {"detail": "API key is already revoked."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        api_key.revoked_at = timezone.now()
        api_key.save(update_fields=["revoked_at"])
        logger.info(
            "api_key.revoked workspace_id=%s api_key_id=%s revoked_by=%s",
            request.workspace.id,
            api_key.id,
            request.user.id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
