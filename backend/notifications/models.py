import uuid

from core.fields import EncryptedJSONField
from django.core.exceptions import ValidationError
from django.db import models


class Subscriber(models.Model):
    """The person/user. Identity-centric (not device-centric)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="subscribers"
    )
    external_id = models.CharField(max_length=255, db_index=True)
    first_name = models.CharField(max_length=150, null=True, blank=True)
    last_name = models.CharField(max_length=150, null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    phone_verified_at = models.DateTimeField(null=True, blank=True)
    phone_country_code = models.CharField(max_length=2, null=True, blank=True)
    email = models.EmailField(blank=True, null=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default="UTC")
    locale = models.CharField(max_length=10, default="en")
    data = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "external_id"],
                name="uq_subscriber_workspace_external_id",
            ),
        ]
        indexes = [
            models.Index(
                fields=["workspace", "external_id"],
                name="idx_subscribers_external",
                condition=models.Q(is_active=True),
            ),
            models.Index(
                fields=["workspace", "phone_number"],
                name="idx_subscribers_phone",
                condition=models.Q(phone_number__isnull=False),
            ),
        ]

    def __str__(self):
        return f"{self.external_id} ({self.workspace.name})"


class Device(models.Model):
    """Push token holder. Belongs to a Subscriber."""

    PLATFORM_CHOICES = [
        ("android", "Android"),
        ("ios", "iOS"),
        ("web", "Web"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="devices"
    )
    subscriber = models.ForeignKey(
        Subscriber, on_delete=models.CASCADE, related_name="devices"
    )
    platform = models.CharField(max_length=10, choices=PLATFORM_CHOICES)
    push_token = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(auto_now=True)
    failure_count = models.IntegerField(default=0)
    last_failed_at = models.DateTimeField(null=True, blank=True)
    metadata = models.JSONField(default=dict)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_seen"]
        indexes = [
            models.Index(
                fields=["workspace", "subscriber", "is_active"],
                name="idx_devices_active",
                condition=models.Q(is_active=True),
            ),
        ]

    def __str__(self):
        return f"{self.platform} device for {self.subscriber.external_id}"


class Notification(models.Model):
    """A notification is an INTENT, not a delivery. One intent fans out to many deliveries."""

    PRIORITY_CHOICES = [
        ("high", "High"),
        ("normal", "Normal"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("scheduled", "Scheduled"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="notifications"
    )
    subscriber = models.ForeignKey(
        Subscriber, on_delete=models.CASCADE, related_name="notifications"
    )
    channels = models.JSONField(help_text='e.g. ["push", "sms"]')
    priority = models.CharField(
        max_length=10, choices=PRIORITY_CHOICES, default="normal"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    fallback = models.BooleanField(
        default=False, help_text="If true, fallback SMS on push failure"
    )
    title = models.CharField(max_length=255, null=True, blank=True)
    body = models.TextField()
    data = models.JSONField(default=dict)
    image_url = models.URLField(max_length=500, null=True, blank=True)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    delivery_count = models.IntegerField(default=0)
    success_count = models.IntegerField(default=0)
    failure_count = models.IntegerField(default=0)
    campaign = models.ForeignKey(
        "Campaign",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    template = models.ForeignKey(
        "Template",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["workspace", "status", "created_at"],
                name="idx_notifications_status",
            ),
            models.Index(
                fields=["workspace", "subscriber", "-created_at"],
                name="idx_notifications_subscriber",
            ),
            models.Index(
                fields=["campaign"],
                name="idx_notifications_campaign",
                condition=models.Q(campaign__isnull=False),
            ),
            models.Index(
                fields=["status", "scheduled_at"],
                name="idx_notifications_scheduled",
                condition=models.Q(status="scheduled", scheduled_at__isnull=False),
            ),
        ]

    def __str__(self):
        return f"Notification {self.id} - {self.status}"


class Delivery(models.Model):
    """The actual delivery attempt to a specific target (device or phone number)."""

    CHANNEL_CHOICES = [
        ("push", "Push"),
        ("sms", "SMS"),
        ("in_app", "In-App"),
        ("email", "Email"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("sent", "Sent"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="deliveries"
    )
    notification = models.ForeignKey(
        Notification, on_delete=models.CASCADE, related_name="deliveries"
    )
    subscriber = models.ForeignKey(
        Subscriber, on_delete=models.CASCADE, related_name="deliveries"
    )
    device = models.ForeignKey(
        Device,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries",
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    target_address = models.CharField(
        max_length=500, help_text="Push token or phone number"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    provider = models.CharField(max_length=50, help_text="Provider key (e.g. twilio)")
    provider_msg_id = models.CharField(max_length=255, null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    error_code = models.CharField(max_length=100, null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    retry_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["workspace", "notification", "status"],
                name="idx_deliveries_notification",
            ),
            models.Index(
                fields=["workspace", "subscriber", "-created_at"],
                name="idx_deliveries_subscriber",
            ),
            models.Index(
                fields=["workspace", "status", "channel", "created_at"],
                name="idx_deliveries_status_channel",
            ),
            models.Index(
                fields=["workspace", "provider", "created_at"],
                name="idx_deliveries_provider",
                condition=models.Q(provider__isnull=False),
            ),
        ]

    def __str__(self):
        return f"Delivery {self.id} [{self.channel}] - {self.status}"


class Provider(models.Model):
    """Configuration for external gateways (FCM, APNs, Arkesel, etc.)."""

    CHANNEL_CHOICES = [
        ("push", "Push"),
        ("sms", "SMS"),
        ("in_app", "In-App"),
        ("email", "Email"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="providers"
    )
    provider_type = models.CharField(
        max_length=50, help_text="Driver key (e.g. fcm)"
    )
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default="sms")
    name = models.CharField(max_length=100)
    priority = models.IntegerField(default=0, help_text="Failover order (0 = primary)")
    config = EncryptedJSONField(default=dict, help_text="Encrypted credentials/secrets")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["priority", "provider_type"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "provider_type"],
                name="uq_provider_workspace_type",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.provider_type})"

    def save(self, *args, **kwargs):
        from notifications.providers.registry import ProviderRegistry

        if self.provider_type:
            provider_cls = ProviderRegistry.get(self.provider_type)
            if provider_cls:
                self.channel = provider_cls.channel
        super().save(*args, **kwargs)

    def clean(self):
        from notifications.providers.registry import ProviderRegistry

        if self.provider_type and not ProviderRegistry.get(self.provider_type):
            raise ValidationError(
                {"provider_type": f"Provider '{self.provider_type}' is not registered."}
            )


class InAppNotification(models.Model):
    """Persistent, queryable notification shown in a subscriber's in-app feed."""

    CATEGORY_CHOICES = [
        ("info", "Info"),
        ("success", "Success"),
        ("warning", "Warning"),
        ("error", "Error"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace",
        on_delete=models.CASCADE,
        related_name="in_app_notifications",
    )
    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name="in_app_notifications",
    )
    subscriber = models.ForeignKey(
        Subscriber,
        on_delete=models.CASCADE,
        related_name="in_app_notifications",
    )
    title = models.CharField(max_length=255, null=True, blank=True)
    body = models.TextField()
    data = models.JSONField(default=dict, help_text="Custom payload / metadata")
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="info")
    action_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="Deep link or action URL for click behavior",
    )
    image_url = models.URLField(max_length=500, null=True, blank=True)
    seen_at = models.DateTimeField(
        null=True, blank=True, help_text="When notification appeared in the feed"
    )
    read_at = models.DateTimeField(
        null=True, blank=True, help_text="When subscriber explicitly read/opened it"
    )
    archived_at = models.DateTimeField(
        null=True, blank=True, help_text="Dismissed by subscriber (soft delete)"
    )
    expires_at = models.DateTimeField(
        null=True, blank=True, help_text="Auto-expire time (cleanup job removes these)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["workspace", "subscriber", "-created_at"],
                name="idx_in_app_feed",
                condition=models.Q(archived_at__isnull=True),
            ),
            models.Index(
                fields=["workspace", "subscriber"],
                name="idx_in_app_unread",
                condition=models.Q(read_at__isnull=True, archived_at__isnull=True),
            ),
            models.Index(
                fields=["expires_at"],
                name="idx_in_app_expiry",
                condition=models.Q(expires_at__isnull=False, archived_at__isnull=True),
            ),
        ]

    def __str__(self):
        status = "unread"
        if self.archived_at:
            status = "archived"
        elif self.read_at:
            status = "read"
        elif self.seen_at:
            status = "seen"
        return f"InApp [{status}] {self.title or self.body[:40]} -> {self.subscriber.external_id}"

    @property
    def is_read(self):
        return self.read_at is not None

    @property
    def is_seen(self):
        return self.seen_at is not None

    @property
    def is_archived(self):
        return self.archived_at is not None

    @property
    def is_expired(self):
        if self.expires_at:
            from django.utils import timezone

            return timezone.now() > self.expires_at
        return False


class Campaign(models.Model):
    """Bulk sends with attribution."""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("scheduled", "Scheduled"),
        ("running", "Running"),
        ("paused", "Paused"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="campaigns"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    target_criteria = models.JSONField(default=dict, help_text="Segmentation rules")
    template = models.ForeignKey(
        "Template",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="campaigns",
    )
    scheduled_at = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    total_recipients = models.IntegerField(default=0)
    sent_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)
    stats = models.JSONField(default=dict, help_text="Cache for sent/failed counts")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} - {self.status}"


class Template(models.Model):
    """Reusable message templates with variable substitution, rendered at send-time."""

    CHANNEL_CHOICES = [
        ("push", "Push"),
        ("sms", "SMS"),
        ("*", "Any Channel"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="templates"
    )
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    content = models.JSONField(
        default=dict,
        help_text="{title, body, data_payload, image_url} for push, {body} for sms",
    )
    variables = models.JSONField(
        default=dict, help_text="Schema for {{variable}} placeholders"
    )
    is_active = models.BooleanField(default=True)
    version = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} v{self.version}"


class Topic(models.Model):
    """Pub/sub broadcasting (FCM topics, custom segments)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="topics"
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    subscriber_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "slug"],
                name="uq_topic_workspace_slug",
            ),
        ]

    def __str__(self):
        return str(self.name)


class TopicSubscription(models.Model):
    """User subscription to topics (GDPR compliance)."""

    SOURCE_CHOICES = [
        ("api", "API"),
        ("webhook", "Webhook"),
        ("manual", "Manual"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="topic_subscriptions"
    )
    topic = models.ForeignKey(
        Topic, on_delete=models.CASCADE, related_name="subscriptions"
    )
    subscriber = models.ForeignKey(
        Subscriber, on_delete=models.CASCADE, related_name="topic_subscriptions"
    )
    subscribed_at = models.DateTimeField(auto_now_add=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="api")
    metadata = models.JSONField(default=dict)

    class Meta:
        indexes = [
            models.Index(
                fields=["workspace", "topic", "subscriber"],
                name="idx_subscriptions_active",
                condition=models.Q(unsubscribed_at__isnull=True),
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "topic", "subscriber"],
                name="uq_subscription_workspace_topic_subscriber",
            ),
        ]

    def __str__(self):
        return f"{self.subscriber.external_id} -> {self.topic.name}"


class DeliveryMetrics(models.Model):
    """Time-series analytics snapshots per channel/provider."""

    GRANULARITY_CHOICES = [
        ("hour", "Hour"),
        ("day", "Day"),
        ("month", "Month"),
    ]

    CHANNEL_CHOICES = [
        ("push", "Push"),
        ("sms", "SMS"),
        ("in_app", "In-App"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="delivery_metrics"
    )
    timestamp = models.DateTimeField()
    granularity = models.CharField(max_length=10, choices=GRANULARITY_CHOICES)
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    provider = models.ForeignKey(
        Provider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="metrics",
    )
    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="metrics",
    )
    metrics = models.JSONField(
        default=dict,
        help_text="sent_count, delivered_count, failed_count, latency",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.channel} metrics at {self.timestamp} ({self.granularity})"


class ProviderWebhookLog(models.Model):
    """Incoming webhooks from providers for deduplication and audit."""

    EVENT_TYPE_CHOICES = [
        ("delivery", "Delivery"),
        ("failure", "Failure"),
        ("bounce", "Bounce"),
        ("open", "Open"),
        ("click", "Click"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.ForeignKey(
        Provider,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="webhook_logs",
    )
    workspace = models.ForeignKey(
        "core.Workspace", on_delete=models.CASCADE, related_name="provider_webhook_logs"
    )
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    external_id = models.CharField(max_length=255, null=True, blank=True)
    raw_payload = models.JSONField(default=dict)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} from {self.provider} at {self.created_at}"


class SubscriberRefreshToken(models.Model):
    """Hashed refresh token for subscriber-scoped in-app access tokens (SAT)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        "core.Workspace",
        on_delete=models.CASCADE,
        related_name="subscriber_refresh_tokens",
    )
    subscriber = models.ForeignKey(
        Subscriber,
        on_delete=models.CASCADE,
        related_name="refresh_tokens",
    )
    token_hash = models.CharField(
        max_length=64,
        db_index=True,
        help_text="SHA-256 hash of the refresh token",
    )
    expires_at = models.DateTimeField(help_text="When this refresh token expires")
    revoked_at = models.DateTimeField(
        null=True, blank=True, help_text="When this token was explicitly revoked"
    )
    last_used_at = models.DateTimeField(
        null=True, blank=True, help_text="Last time this token was used to refresh"
    )
    metadata = models.JSONField(
        default=dict, help_text="Additional metadata (ip, user_agent, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["workspace", "subscriber"],
                name="idx_refresh_tokens_subscriber",
            ),
            models.Index(
                fields=["token_hash"],
                name="idx_refresh_tokens_hash",
            ),
            models.Index(
                fields=["expires_at"],
                name="idx_refresh_tokens_expiry",
                condition=models.Q(revoked_at__isnull=True),
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["token_hash"],
                name="uq_refresh_token_hash",
            ),
        ]

    def __str__(self):
        status = "active"
        if self.revoked_at:
            status = "revoked"
        elif self.is_expired:
            status = "expired"
        return f"RefreshToken [{status}] {self.subscriber.external_id} @ {self.workspace.name}"

    @property
    def is_expired(self):
        from django.utils import timezone

        return timezone.now() > self.expires_at

    @property
    def is_revoked(self):
        return self.revoked_at is not None

    @property
    def is_valid(self):
        return not self.is_expired and not self.is_revoked
