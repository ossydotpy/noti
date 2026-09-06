from django.urls import include, path
from rest_framework.routers import DefaultRouter

from dashboard.views.notifications import DashboardNotificationViewSet

router = DefaultRouter()
router.register(r"", DashboardNotificationViewSet, basename="dashboard-notification")

urlpatterns = [
    path("", include(router.urls)),
]
