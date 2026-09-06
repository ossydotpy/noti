from rest_framework import serializers

from notifications.models import Provider
from notifications.providers.registry import ProviderRegistry


class ProviderSerializer(serializers.ModelSerializer):
    config = serializers.JSONField()

    class Meta:
        model = Provider
        fields = [
            "id",
            "provider_type",
            "channel",
            "name",
            "priority",
            "config",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "channel", "created_at"]

    def validate(self, attrs):
        provider_type = attrs.get("provider_type") or (
            self.instance.provider_type if self.instance else None
        )
        config = attrs.get("config")

        if not provider_type:
            raise serializers.ValidationError(
                {"provider_type": "This field is required."}
            )

        provider_cls = ProviderRegistry.get(provider_type)
        if not provider_cls:
            raise serializers.ValidationError(
                {"provider_type": f"Provider '{provider_type}' is not registered."}
            )

        if config is not None:
            if self.instance and self.instance.config:
                for key, value in config.items():
                    if value == "********" and key in self.instance.config:
                        config[key] = self.instance.config[key]

            try:
                attrs["config"] = provider_cls.validate_config(config)
            except Exception as e:
                raise serializers.ValidationError({"config": str(e)})

        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if "config" in data and data["config"]:
            data["config"] = {
                key: ("********" if any(s in key.lower() for s in ["key", "secret", "token", "password"]) else value)
                for key, value in data["config"].items()
            }
        return data


class ProviderListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provider
        fields = ["id", "provider_type", "channel", "name", "priority", "is_active"]


class ProviderValidateSerializer(serializers.Serializer):
    provider_type = serializers.CharField()
    config = serializers.JSONField()


class ProviderAvailableTypeSerializer(serializers.Serializer):
    key = serializers.CharField()
    name = serializers.CharField()
    channel = serializers.CharField()
    schema = serializers.JSONField()
    docs_url = serializers.CharField()
    icon_url = serializers.CharField()


class ProviderStatusResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    message = serializers.CharField()
