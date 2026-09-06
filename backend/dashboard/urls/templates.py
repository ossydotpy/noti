from django.urls import include, path
from rest_framework.routers import DefaultRouter

from dashboard.views.templates import TemplateViewSet

router = DefaultRouter()
router.register(r"", TemplateViewSet, basename="dashboard-template")

urlpatterns = [
    path("", include(router.urls)),
]
