from django.urls import include, path
from rest_framework.routers import DefaultRouter

from dashboard.views.providers import ProviderViewSet

router = DefaultRouter()
router.register(r"", ProviderViewSet, basename="dashboard-provider")

urlpatterns = [
    path("", include(router.urls)),
]
