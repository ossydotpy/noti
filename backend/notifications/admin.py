from django.contrib import admin

from .models import (
    Delivery,
    Device,
    InAppNotification,
    Notification,
    Provider,
    Subscriber,
    SubscriberRefreshToken,
    Template,
    Topic,
    TopicSubscription,
)


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ("external_id", "email", "workspace", "is_active", "created_at")
    search_fields = ("external_id", "email")
    list_filter = ("is_active",)


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("platform", "subscriber", "workspace", "is_active", "last_seen")
    list_filter = ("platform", "is_active")


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "workspace", "subscriber", "status", "channels", "created_at")
    list_filter = ("status", "priority")


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ("id", "channel", "status", "provider", "workspace", "created_at")
    list_filter = ("channel", "status")


@admin.register(InAppNotification)
class InAppNotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "subscriber", "workspace", "read_at", "archived_at")
    list_filter = ("category",)


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "provider_type", "channel", "workspace", "priority", "is_active")


@admin.register(Template)
class TemplateAdmin(admin.ModelAdmin):
    list_display = ("name", "channel", "workspace", "version", "is_active")


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "workspace", "subscriber_count", "is_active")


admin.site.register(TopicSubscription)
admin.site.register(SubscriberRefreshToken)
