from rest_framework import serializers

from core.models import APIKey


def _key_status(obj: APIKey) -> str:
    if obj.is_revoked:
        return "revoked"
    if obj.is_expired:
        return "expired"
    return "active"


class APIKeyListSerializer(serializers.ModelSerializer):
    """Serializer for listing API keys — excludes sensitive fields."""

    status = serializers.SerializerMethodField()

    class Meta:
        model = APIKey
        fields = [
            "id",
            "name",
            "key_prefix",
            "scopes",
            "last_used_at",
            "last_used_ip",
            "expires_at",
            "created_by",
            "created_at",
            "status",
        ]
        read_only_fields = fields

    def get_status(self, obj: APIKey) -> str:
        return _key_status(obj)


class APIKeyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating API keys."""

    class Meta:
        model = APIKey
        fields = ["name"]

    def validate_name(self, value: str) -> str:
        if not value or len(value.strip()) == 0:
            raise serializers.ValidationError("Name is required.")
        return value.strip()


class APIKeyCreateResponseSerializer(serializers.Serializer):
    """Serializer for API key creation response — includes the raw key once."""

    id = serializers.UUIDField()
    name = serializers.CharField()
    key_prefix = serializers.CharField()
    api_key = serializers.CharField(help_text="The raw API key. Only shown once on creation.")
    created_at = serializers.DateTimeField()
    created_by = serializers.UUIDField()


class APIKeyDetailSerializer(APIKeyListSerializer):
    """Serializer for API key details."""
