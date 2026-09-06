from rest_framework import serializers

from notifications.models import Subscriber, Topic, TopicSubscription


class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "is_active",
            "subscriber_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "subscriber_count", "created_at", "updated_at"]

    def validate_slug(self, value):
        """Ensure slug is unique within workspace."""
        workspace = self.context["request"].workspace
        if self.instance and self.instance.slug == value:
            return value
        if Topic.objects.filter(workspace=workspace, slug=value).exists():
            raise serializers.ValidationError(
                "A topic with this slug already exists in this workspace."
            )
        return value


class TopicSubscriptionSerializer(serializers.ModelSerializer):
    subscriber_external_id = serializers.CharField(
        source="subscriber.external_id", read_only=True
    )
    subscriber_name = serializers.SerializerMethodField()
    topic_name = serializers.CharField(source="topic.name", read_only=True)

    class Meta:
        model = TopicSubscription
        fields = [
            "id",
            "topic",
            "topic_name",
            "subscriber",
            "subscriber_external_id",
            "subscriber_name",
            "subscribed_at",
            "unsubscribed_at",
            "source",
            "metadata",
        ]
        read_only_fields = ["id", "subscribed_at", "unsubscribed_at"]

    def get_subscriber_name(self, obj) -> str:
        parts = []
        if obj.subscriber.first_name:
            parts.append(obj.subscriber.first_name)
        if obj.subscriber.last_name:
            parts.append(obj.subscriber.last_name)
        return " ".join(parts) if parts else obj.subscriber.external_id

    def validate(self, attrs):
        workspace = self.context["request"].workspace
        topic = attrs.get("topic")
        subscriber = attrs.get("subscriber")

        if subscriber and subscriber.workspace != workspace:
            raise serializers.ValidationError(
                {"subscriber": "Subscriber does not belong to this workspace."}
            )
        if topic and topic.workspace != workspace:
            raise serializers.ValidationError(
                {"topic": "Topic does not belong to this workspace."}
            )

        if not self.instance:
            existing = TopicSubscription.objects.filter(
                workspace=workspace,
                topic=topic,
                subscriber=subscriber,
                unsubscribed_at__isnull=True,
            ).exists()
            if existing:
                raise serializers.ValidationError(
                    "Subscriber is already subscribed to this topic."
                )

        return attrs


class BulkTopicSubscriptionSerializer(serializers.Serializer):
    """Serializer for bulk (un)subscribing subscribers to/from a topic."""

    subscriber_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        min_length=1,
        max_length=1000,
    )
    source = serializers.ChoiceField(
        choices=TopicSubscription.SOURCE_CHOICES,
        default="manual",
    )

    def validate_subscriber_ids(self, value):
        workspace = self.context["request"].workspace
        existing_ids = set(
            Subscriber.objects.filter(
                workspace=workspace,
                external_id__in=value,
                is_active=True,
            ).values_list("external_id", flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f"Invalid subscriber IDs: {', '.join(sorted(invalid_ids))}"
            )
        return value


class TopicWithSubscriptionCountSerializer(TopicSerializer):
    """Extended serializer that includes subscription statistics."""

    active_subscriptions = serializers.SerializerMethodField()
    inactive_subscriptions = serializers.SerializerMethodField()

    class Meta(TopicSerializer.Meta):
        fields = TopicSerializer.Meta.fields + [
            "active_subscriptions",
            "inactive_subscriptions",
        ]

    def get_active_subscriptions(self, obj) -> int:
        return obj.active_subscription_count

    def get_inactive_subscriptions(self, obj) -> int:
        return obj.inactive_subscription_count
