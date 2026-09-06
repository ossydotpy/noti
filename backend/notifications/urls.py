from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CreateSessionView,
    DeviceViewSet,
    InAppFeedView,
    InAppMarkReadView,
    InAppUnreadCountView,
    NotificationDetailView,
    RefreshSessionView,
    RevokeSessionView,
    SendNotificationView,
    SendTopicNotificationView,
    SubscriberTopicSubscribeView,
    SubscriberTopicUnsubscribeView,
    SubscriberTopicsView,
    SubscriberViewSet,
)

router = DefaultRouter()
router.register(r"subscribers", SubscriberViewSet, basename="subscriber")

urlpatterns = [
    path(
        "devices/",
        DeviceViewSet.as_view({"post": "create"}),
        name="device-create",
    ),
    path(
        "devices/<uuid:pk>/",
        DeviceViewSet.as_view({"delete": "destroy"}),
        name="device-detail",
    ),
    # Session management
    path(
        "in-app/sessions/",
        CreateSessionView.as_view(),
        name="in-app-session-create",
    ),
    path(
        "in-app/sessions/refresh/",
        RefreshSessionView.as_view(),
        name="in-app-session-refresh",
    ),
    path(
        "in-app/sessions/revoke/",
        RevokeSessionView.as_view(),
        name="in-app-session-revoke",
    ),
    # In-app notification feed (subscriber-facing, SAT auth)
    path(
        "in-app/",
        InAppFeedView.as_view(),
        name="in-app-feed",
    ),
    path(
        "in-app/unread-count/",
        InAppUnreadCountView.as_view(),
        name="in-app-unread-count",
    ),
    # Subscriber topic management (subscriber-facing, SAT auth)
    path(
        "in-app/topics",
        SubscriberTopicsView.as_view(),
        name="in-app-topics",
    ),
    path(
        "in-app/topics/<str:slug>/subscribe",
        SubscriberTopicSubscribeView.as_view(),
        name="in-app-topic-subscribe",
    ),
    path(
        "in-app/topics/<str:slug>/unsubscribe",
        SubscriberTopicUnsubscribeView.as_view(),
        name="in-app-topic-unsubscribe",
    ),
    path(
        "in-app/<uuid:pk>/read/",
        InAppMarkReadView.as_view(),
        name="in-app-mark-read",
    ),
    # Notification endpoints
    path(
        "notifications/send",
        SendNotificationView.as_view(),
        name="notification-send",
    ),
    path(
        "notifications/<uuid:pk>",
        NotificationDetailView.as_view(),
        name="notification-detail",
    ),
    path(
        "topics/<str:slug>/send",
        SendTopicNotificationView.as_view(),
        name="topic-notification-send",
    ),
] + router.urls
