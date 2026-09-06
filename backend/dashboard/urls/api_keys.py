from django.urls import include, path
from rest_framework.routers import DefaultRouter

from dashboard.views.api_keys import APIKeyViewSet

router = DefaultRouter()
router.register(r"", APIKeyViewSet, basename="apikey")

urlpatterns = [
    path("", include(router.urls)),
]
