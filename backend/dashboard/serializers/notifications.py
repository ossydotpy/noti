from rest_framework import serializers

from notifications.models import Delivery, Notification


class DashboardDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = [
            "id",
            "channel",
            "status",
            "provider",
            "sent_at",
            "delivered_at",
            "failed_at",
            "error_code",
            "error_message",
            "retry_count",
            "created_at",
        ]


class DashboardNotificationListSerializer(serializers.ModelSerializer):
    """Compact serializer for the workspace-wide notification log list."""

    subscriber_external_id = serializers.CharField(
        source="subscriber.external_id", read_only=True
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "status",
            "channels",
            "priority",
            "title",
            "body",
            "subscriber_external_id",
            "delivery_count",
            "success_count",
            "failure_count",
            "scheduled_at",
            "completed_at",
            "created_at",
        ]


class DashboardNotificationDetailSerializer(serializers.ModelSerializer):
    """Full serializer for a single notification, including delivery attempts."""

    subscriber_external_id = serializers.CharField(
        source="subscriber.external_id", read_only=True
    )
    deliveries = DashboardDeliverySerializer(many=True, read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "status",
            "channels",
            "priority",
            "fallback",
            "title",
            "body",
            "data",
            "image_url",
            "subscriber_external_id",
            "delivery_count",
            "success_count",
            "failure_count",
            "deliveries",
            "scheduled_at",
            "completed_at",
            "created_at",
            "updated_at",
        ]
