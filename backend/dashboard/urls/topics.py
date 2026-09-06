from django.urls import include, path
from rest_framework.routers import DefaultRouter

from dashboard.views.topics import TopicSubscriptionViewSet, TopicViewSet

router = DefaultRouter()
router.register(r"", TopicViewSet, basename="dashboard-topic")

subscription_router = DefaultRouter()
subscription_router.register(
    r"", TopicSubscriptionViewSet, basename="dashboard-topic-subscription"
)

urlpatterns = [
    path("", include(router.urls)),
    path("subscriptions/", include(subscription_router.urls)),
]
