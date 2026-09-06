from django.urls import include, path
from rest_framework.routers import DefaultRouter

from dashboard.views.subscribers import DashboardSubscriberViewSet

router = DefaultRouter()
router.register(r"", DashboardSubscriberViewSet, basename="dashboard-subscriber")

urlpatterns = [
    path("", include(router.urls)),
]
