import logging

from asgiref.sync import async_to_sync
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dashboard.permissions import IsWorkspaceAdmin, WorkspaceContextPermission
from dashboard.serializers.providers import (
    ProviderAvailableTypeSerializer,
    ProviderListSerializer,
    ProviderSerializer,
    ProviderStatusResponseSerializer,
    ProviderValidateSerializer,
)
from notifications.models import Provider
from notifications.providers.registry import ProviderRegistry
from notifications.services.provider_validation_service import ProviderValidationService

logger = logging.getLogger(__name__)


class ProviderViewSet(viewsets.ModelViewSet):
    """Manages notification providers for the workspace (admins only)."""

    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Provider.objects.none()
        return Provider.objects.filter(workspace=self.request.workspace)

    def get_serializer_class(self):
        if self.action == "list":
            return ProviderListSerializer
        return ProviderSerializer

    def create(self, request, *args, **kwargs):
        provider_type = request.data.get("provider_type")
        workspace = request.workspace

        existing_provider = Provider.objects.filter(
            workspace=workspace, provider_type=provider_type
        ).first()
        if existing_provider:
            serializer = self.get_serializer(
                existing_provider, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            provider = serializer.save()
            logger.info(
                "provider.updated_via_upsert workspace_id=%s provider_type=%s",
                workspace.id,
                provider.provider_type,
            )
            return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(workspace=self.request.workspace)

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin],
    )
    def test_connection(self, request, pk=None):
        provider = self.get_object()
        success, message = async_to_sync(ProviderValidationService.validate)(provider)

        if success:
            logger.info(
                "provider.connection_test_passed workspace_id=%s provider_type=%s",
                request.workspace.id,
                provider.provider_type,
            )
            return Response({"status": "success", "message": message})
        logger.warning(
            "provider.connection_test_failed workspace_id=%s provider_type=%s error=%s",
            request.workspace.id,
            provider.provider_type,
            message,
        )
        return Response(
            {"status": "error", "message": message}, status=status.HTTP_400_BAD_REQUEST
        )

    @action(
        detail=False,
        methods=["post"],
        permission_classes=[IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin],
    )
    def validate(self, request):
        """Validates provider credentials without saving."""
        serializer = ProviderValidateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider_type = serializer.validated_data["provider_type"]
        config = serializer.validated_data["config"]

        provider_cls = ProviderRegistry.get(provider_type)
        if not provider_cls:
            return Response(
                {"status": "error", "message": f"Unknown provider type: {provider_type}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validated_config = provider_cls.validate_config(config)
        except Exception as e:
            return Response(
                {"status": "error", "message": f"Invalid configuration: {e}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        driver = provider_cls()
        if hasattr(driver, "test_connection"):
            try:
                success, message = async_to_sync(ProviderValidationService.validate)(
                    Provider(provider_type=provider_type, config=validated_config)
                )
                if not success:
                    return Response(
                        {"status": "error", "message": message},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                return Response({"status": "success", "message": message})
            except Exception as e:
                return Response(
                    {"status": "error", "message": f"Connection test failed: {e}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {
                "status": "success",
                "message": f"Configuration is valid for {provider_type}. Connection testing not available for this provider.",
            }
        )

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin],
    )
    def available_types(self, request):
        """Lists all registered provider types and their schemas."""
        data = [
            {
                "key": key,
                "name": cls.name,
                "channel": cls.channel,
                "schema": cls.config_schema.model_json_schema(),
                "docs_url": getattr(cls, "docs_url", ""),
                "icon_url": getattr(cls, "icon_url", ""),
            }
            for key, cls in ProviderRegistry.get_all().items()
        ]
        return Response(ProviderAvailableTypeSerializer(data, many=True).data)
