from django.core.validators import RegexValidator
from rest_framework import serializers

from notifications.models import (
    Delivery,
    Device,
    InAppNotification,
    Notification,
    Subscriber,
    Template,
    Topic,
)
from notifications.services.provider_validation_service import ProviderValidationService


class SubscriberSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(
        required=False,
        allow_null=True,
        validators=[
            RegexValidator(
                regex=r"^\+?[1-9]\d{1,14}$",
                message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed.",
            )
        ],
    )

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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "external_id", "created_at", "updated_at"]


class DeviceSerializer(serializers.ModelSerializer):
    subscriber_id = serializers.UUIDField(required=False, write_only=True)
    subscriber_external_id = serializers.CharField(required=False, write_only=True)

    class Meta:
        model = Device
        fields = [
            "id",
            "platform",
            "push_token",
            "metadata",
            "last_seen",
            "is_active",
            "subscriber",
            "subscriber_id",
            "subscriber_external_id",
        ]
        read_only_fields = ["id", "last_seen", "is_active", "subscriber"]

    def validate(self, attrs):
        if not attrs.get("subscriber_id") and not attrs.get("subscriber_external_id"):
            raise serializers.ValidationError(
                "Either subscriber_id or subscriber_external_id is required."
            )
        return attrs


class SubscriberDetailSerializer(SubscriberSerializer):
    """Subscriber serializer including the subscriber's devices."""

    devices = DeviceSerializer(many=True, read_only=True)

    class Meta(SubscriberSerializer.Meta):
        fields = SubscriberSerializer.Meta.fields + ["devices"]


class ContentSerializer(serializers.Serializer):
    """Serializer for notification content."""

    title = serializers.CharField(max_length=255, required=False, allow_null=True)
    body = serializers.CharField(required=True)
    data_payload = serializers.JSONField(required=False, default=dict)
    image_url = serializers.URLField(max_length=500, required=False, allow_null=True)


class InAppOverrideSerializer(serializers.Serializer):
    """Serializer for in-app notification overrides."""

    category = serializers.ChoiceField(
        choices=["info", "success", "warning", "error"],
        default="info",
    )
    action_url = serializers.URLField(max_length=500, required=False, allow_null=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)


class SendPayloadValidationMixin:
    """Shared validation for single-subscriber and topic send payloads."""

    def validate_payload_shape(self, attrs):
        if (
            not attrs.get("content")
            and not attrs.get("template_id")
            and not attrs.get("template_name")
        ):
            raise serializers.ValidationError(
                "Either 'content', 'template_id', or 'template_name' is required."
            )

        channels = attrs.get("channels", [])
        if attrs.get("in_app") and "in_app" not in channels:
            raise serializers.ValidationError(
                {"in_app": "in_app overrides require 'in_app' in channels list."}
            )
        if attrs.get("fallback") and "push" not in channels:
            raise serializers.ValidationError(
                {"fallback": "Fallback requires 'push' in channels."}
            )

        workspace = self.context.get("workspace")
        if not workspace:
            return attrs

        is_valid, unconfigured = ProviderValidationService.validate_channels(
            workspace, channels
        )
        if not is_valid:
            raise serializers.ValidationError(
                {"channels": f"Provider not configured for: {', '.join(unconfigured)}"}
            )

        template = self._resolve_template(attrs, workspace)
        if template:
            self._check_template_channels(template, channels)
            attrs["template"] = template

        return attrs

    def _resolve_template(self, attrs, workspace):
        template_id = attrs.get("template_id")
        template_name = attrs.get("template_name")
        if not template_id and not template_name:
            return None

        queryset = Template.objects.filter(
            workspace=workspace, archived_at__isnull=True, is_active=True
        )
        if template_id:
            template = queryset.filter(id=template_id).first()
        else:
            template = (
                queryset.filter(name=template_name).order_by("-created_at").first()
            )

        if not template:
            error_field = "template_id" if template_id else "template_name"
            raise serializers.ValidationError({error_field: "Template not found."})
        return template

    def _check_template_channels(self, template, channels):
        if template.channel != "*" and template.channel not in channels:
            raise serializers.ValidationError(
                {
                    "channels": (
                        f"Template is {template.channel}-only but "
                        f"'{template.channel}' not in requested channels."
                    )
                }
            )


class SendNotificationSerializer(SendPayloadValidationMixin, serializers.Serializer):
    """Serializer for the send notification request."""

    user_id = serializers.CharField(required=True, help_text="Subscriber external_id")
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=["push", "sms", "in_app", "email"]),
        min_length=1,
    )
    content = ContentSerializer(required=False)
    template_id = serializers.UUIDField(required=False)
    template_name = serializers.CharField(required=False)
    template_variables = serializers.JSONField(required=False, default=dict)
    priority = serializers.ChoiceField(
        choices=Notification.PRIORITY_CHOICES,
        default="normal",
        help_text="Delivery priority",
    )
    fallback = serializers.BooleanField(default=False)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)
    in_app = InAppOverrideSerializer(required=False)

    def validate(self, attrs):
        return self.validate_payload_shape(attrs)


class SendTopicNotificationSerializer(SendPayloadValidationMixin, serializers.Serializer):
    """Serializer for sending notifications to all subscribers of a topic."""

    topic_slug = serializers.CharField(required=True, help_text="Topic slug to send to")
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=["push", "sms", "in_app", "email"]),
        min_length=1,
    )
    content = ContentSerializer(required=False)
    template_id = serializers.UUIDField(required=False)
    template_name = serializers.CharField(required=False)
    template_variables = serializers.JSONField(required=False, default=dict)
    priority = serializers.ChoiceField(
        choices=Notification.PRIORITY_CHOICES,
        default="normal",
        help_text="Delivery priority",
    )
    fallback = serializers.BooleanField(default=False)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)
    in_app = InAppOverrideSerializer(required=False)

    def validate(self, attrs):
        attrs = self.validate_payload_shape(attrs)

        workspace = self.context.get("workspace")
        if workspace:
            try:
                attrs["topic"] = Topic.objects.get(
                    workspace=workspace,
                    slug=attrs["topic_slug"],
                    is_active=True,
                )
            except Topic.DoesNotExist:
                raise serializers.ValidationError(
                    {"topic_slug": "Topic not found or inactive."}
                )

        return attrs


class DeliverySerializer(serializers.ModelSerializer):
    """Serializer for Delivery records."""

    class Meta:
        model = Delivery
        fields = [
            "id",
            "channel",
            "target_address",
            "status",
            "provider",
            "provider_msg_id",
            "sent_at",
            "delivered_at",
            "failed_at",
            "error_code",
            "error_message",
            "retry_count",
            "created_at",
        ]


class NotificationResponseSerializer(serializers.ModelSerializer):
    """Serializer for the notification creation response."""

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
            "scheduled_at",
            "delivery_count",
            "success_count",
            "failure_count",
            "created_at",
        ]


class NotificationDetailSerializer(serializers.ModelSerializer):
    """Serializer for notification detail with delivery info."""

    deliveries = DeliverySerializer(many=True, read_only=True)
    delivery_summary = serializers.SerializerMethodField()

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
            "delivery_count",
            "success_count",
            "failure_count",
            "delivery_summary",
            "deliveries",
            "created_at",
            "completed_at",
        ]

    def get_delivery_summary(self, obj) -> dict:
        return {
            "total": getattr(obj, "summary_total", 0),
            "pending": getattr(obj, "summary_pending", 0),
            "sent": getattr(obj, "summary_sent", 0),
            "delivered": getattr(obj, "summary_delivered", 0),
            "failed": getattr(obj, "summary_failed", 0),
        }


class ProviderConfigSerializer(serializers.Serializer):
    provider_type = serializers.CharField(max_length=50)
    name = serializers.CharField(max_length=100)
    is_active = serializers.BooleanField(default=True)
    priority = serializers.IntegerField(default=0, min_value=0)
    config = serializers.JSONField(default=dict)


class InAppNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InAppNotification
        fields = [
            "id",
            "notification",
            "title",
            "body",
            "data",
            "category",
            "action_url",
            "image_url",
            "seen_at",
            "read_at",
            "archived_at",
            "expires_at",
            "created_at",
            "updated_at",
        ]


class InAppUnreadCountResponseSerializer(serializers.Serializer):
    count = serializers.IntegerField()


class SessionRequestSerializer(serializers.Serializer):
    subscriber_external_id = serializers.CharField()
    expires_in = serializers.IntegerField(required=False)
    refresh_expires_in = serializers.IntegerField(required=False)


class SessionResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    token_type = serializers.CharField()
    expires_in = serializers.IntegerField()
    subscriber_id = serializers.CharField()
    external_id = serializers.CharField()


class RefreshSessionRequestSerializer(serializers.Serializer):
    refresh_token = serializers.CharField()
    expires_in = serializers.IntegerField(required=False)


class RevokeSessionRequestSerializer(serializers.Serializer):
    subscriber_external_id = serializers.CharField()


class RevokeSessionResponseSerializer(serializers.Serializer):
    revoked_count = serializers.IntegerField()
    subscriber_id = serializers.CharField()
    external_id = serializers.CharField()


class SendTopicNotificationResponseSerializer(serializers.Serializer):
    topic = serializers.CharField()
    notifications_created = serializers.IntegerField()
    subscribers_targeted = serializers.IntegerField()
    channels = serializers.ListField(child=serializers.CharField())


class TopicAlreadySubscribedResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()


class TopicSubscribeResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    topic = serializers.CharField(required=False)
    subscriber = serializers.CharField(required=False)


class TopicUnsubscribeResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    topic = serializers.CharField(required=False)
    subscriber = serializers.CharField(required=False)


class PublicTopicSerializer(serializers.ModelSerializer):
    """Simple topic serializer for the public API."""

    is_subscribed = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "subscriber_count",
            "is_subscribed",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_is_subscribed(self, obj) -> bool | None:
        """Check if the subscriber in context is subscribed to this topic."""
        subscriber = self.context.get("subscriber")
        if subscriber:
            return obj.subscriptions.filter(
                subscriber=subscriber, unsubscribed_at__isnull=True
            ).exists()
        return None


class SubscriberTopicSubscriptionSerializer(serializers.Serializer):
    """Serializer for subscriber topic subscription operations."""

    topic_slug = serializers.CharField(required=True)
    source = serializers.ChoiceField(choices=["api", "webhook", "manual"], default="api")
    metadata = serializers.JSONField(required=False, default=dict)

    def validate_topic_slug(self, value):
        workspace = self.context.get("workspace")
        try:
            topic = Topic.objects.get(
                workspace=workspace, slug=value, is_active=True
            )
        except Topic.DoesNotExist:
            raise serializers.ValidationError("Topic not found or inactive.")
        self.context["topic"] = topic
        return value
