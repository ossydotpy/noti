from rest_framework import serializers

from notifications.models import Delivery, Notification


class DashboardNotificationSendSerializer(serializers.Serializer):
    audience = serializers.ChoiceField(choices=["quick", "topic", "subscriber", "bulk"])
    subscriber_external_id = serializers.CharField(required=False, allow_blank=False)
    subscriber_external_ids = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=False
    )
    topic_slug = serializers.CharField(required=False, allow_blank=False)
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=["push", "sms", "in_app", "email"]),
        min_length=1,
    )
    content = serializers.DictField()
    priority = serializers.ChoiceField(choices=Notification.PRIORITY_CHOICES, default="normal")
    fallback = serializers.BooleanField(default=False)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate_content(self, value):
        if not value.get("body"):
            raise serializers.ValidationError("Message body is required.")
        if len(value.get("title", "")) > 255:
            raise serializers.ValidationError("Title must be 255 characters or fewer.")
        return value

    def validate(self, attrs):
        audience = attrs["audience"]
        if audience in {"quick", "subscriber"} and not attrs.get("subscriber_external_id"):
            raise serializers.ValidationError({"subscriber_external_id": "A subscriber is required."})
        if audience == "topic" and not attrs.get("topic_slug"):
            raise serializers.ValidationError({"topic_slug": "A topic is required."})
        if audience == "bulk" and not attrs.get("subscriber_external_ids"):
            raise serializers.ValidationError({"subscriber_external_ids": "At least one subscriber is required."})
        return attrs


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
