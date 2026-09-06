from django.urls import include, path
from rest_framework.routers import DefaultRouter

from dashboard.views.in_app import DashboardInAppNotificationViewSet

router = DefaultRouter()
router.register(
    r"", DashboardInAppNotificationViewSet, basename="dashboard-in-app"
)

urlpatterns = [
    path("", include(router.urls)),
]
