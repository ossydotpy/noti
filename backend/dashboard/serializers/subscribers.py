from rest_framework import serializers

from notifications.models import Device, Subscriber


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = [
            "id",
            "platform",
            "push_token",
            "metadata",
            "last_seen",
            "is_active",
            "archived_at",
        ]
        read_only_fields = ["id"]


class DashboardSubscriberSerializer(serializers.ModelSerializer):
    device_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Subscriber
        fields = [
            "id",
            "external_id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "timezone",
            "locale",
            "data",
            "device_count",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "external_id", "device_count", "created_at", "updated_at"]


class DashboardSubscriberDetailSerializer(DashboardSubscriberSerializer):
    devices = DeviceSerializer(many=True, read_only=True)

    class Meta(DashboardSubscriberSerializer.Meta):
        fields = DashboardSubscriberSerializer.Meta.fields + ["devices"]


class DashboardSubscriberCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscriber
        fields = [
            "external_id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "timezone",
            "locale",
            "data",
        ]

    def create(self, validated_data):
        workspace = self.context["workspace"]
        subscriber, _ = Subscriber.objects.update_or_create(
            workspace=workspace,
            external_id=validated_data["external_id"],
            defaults=validated_data,
        )
        return subscriber


class SubscriberBulkDeleteSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
    )


class SubscriberBulkDeleteResponseSerializer(serializers.Serializer):
    deactivated = serializers.IntegerField()
    not_found = serializers.IntegerField()
