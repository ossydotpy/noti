from django.urls import include, path
from rest_framework.routers import DefaultRouter

from dashboard.views.notifications import (
    DashboardNotificationComposeContextView,
    DashboardNotificationSendView,
    DashboardNotificationViewSet,
)

router = DefaultRouter()
router.register(r"", DashboardNotificationViewSet, basename="dashboard-notification")

urlpatterns = [
    path("compose-context/", DashboardNotificationComposeContextView.as_view()),
    path("send/", DashboardNotificationSendView.as_view()),
    path("", include(router.urls)),
]
