import logging

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from dashboard.permissions import (
    IsWorkspaceAdmin,
    IsWorkspaceMember,
    WorkspaceContextPermission,
)
from dashboard.serializers.topics import (
    BulkTopicSubscriptionSerializer,
    TopicSerializer,
    TopicSubscriptionSerializer,
    TopicWithSubscriptionCountSerializer,
)
from notifications.models import Subscriber, Topic, TopicSubscription

logger = logging.getLogger(__name__)

_ADMIN_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceAdmin]
_MEMBER_PERMS = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]


class TopicViewSet(viewsets.ModelViewSet):
    """Manages topics and their subscriptions."""

    serializer_class = TopicSerializer
    permission_classes = _MEMBER_PERMS
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "slug", "description"]
    ordering_fields = ["name", "created_at", "updated_at", "subscriber_count"]
    ordering = ["name"]
    lookup_field = "id"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Topic.objects.none()
        queryset = Topic.objects.filter(workspace=self.request.workspace)
        if self.action == "list":
            queryset = queryset.filter(is_active=True)
        if self.action in ["retrieve", "stats"]:
            queryset = queryset.annotate(
                active_subscription_count=Count(
                    "subscriptions", filter=Q(subscriptions__unsubscribed_at__isnull=True)
                ),
                inactive_subscription_count=Count(
                    "subscriptions", filter=Q(subscriptions__unsubscribed_at__isnull=False)
                ),
            )
        return queryset

    def get_serializer_class(self):
        if self.action in ["retrieve", "stats"]:
            return TopicWithSubscriptionCountSerializer
        return super().get_serializer_class()

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [perm() for perm in _ADMIN_PERMS]
        return super().get_permissions()

    def perform_create(self, serializer):
        topic = serializer.save(workspace=self.request.workspace)
        logger.info(
            "topic.created workspace_id=%s name=%s slug=%s",
            self.request.workspace.id,
            topic.name,
            topic.slug,
        )

    def perform_update(self, serializer):
        topic = serializer.save()
        logger.info(
            "topic.updated workspace_id=%s name=%s slug=%s",
            self.request.workspace.id,
            topic.name,
            topic.slug,
        )

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        logger.info(
            "topic.deleted workspace_id=%s name=%s slug=%s",
            self.request.workspace.id,
            instance.name,
            instance.slug,
        )

    @action(detail=True, methods=["post"], permission_classes=_ADMIN_PERMS)
    def activate(self, request, id=None):
        topic = self.get_object()
        if topic.is_active:
            return Response(
                {"detail": "Topic is already active."}, status=status.HTTP_400_BAD_REQUEST
            )
        topic.is_active = True
        topic.save(update_fields=["is_active"])
        return Response(TopicSerializer(topic).data)

    @action(detail=True, methods=["get"])
    def subscriptions(self, request, id=None):
        """Lists subscriptions for this topic."""
        topic = self.get_object()
        queryset = TopicSubscription.objects.filter(
            workspace=request.workspace, topic=topic
        ).select_related("subscriber")

        status_filter = request.query_params.get("status")
        if status_filter == "active":
            queryset = queryset.filter(unsubscribed_at__isnull=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(unsubscribed_at__isnull=False)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = TopicSubscriptionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        return Response(TopicSubscriptionSerializer(queryset, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=_ADMIN_PERMS)
    def bulk_subscribe(self, request, id=None):
        """Bulk subscribes subscribers to this topic."""
        topic = self.get_object()
        serializer = BulkTopicSubscriptionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)

        subscriber_ids = serializer.validated_data["subscriber_ids"]
        source = serializer.validated_data["source"]

        existing_ids = set(
            TopicSubscription.objects.filter(
                workspace=request.workspace,
                topic=topic,
                subscriber__external_id__in=subscriber_ids,
                unsubscribed_at__isnull=True,
            ).values_list("subscriber__external_id", flat=True)
        )
        new_ids = [sid for sid in subscriber_ids if sid not in existing_ids]
        subscribers = Subscriber.objects.filter(
            workspace=request.workspace, external_id__in=new_ids
        )

        now = timezone.now()
        subscriptions = [
            TopicSubscription(
                workspace=request.workspace,
                topic=topic,
                subscriber=subscriber,
                source=source,
                subscribed_at=now,
            )
            for subscriber in subscribers
        ]

        with transaction.atomic():
            if subscriptions:
                TopicSubscription.objects.bulk_create(
                    subscriptions, ignore_conflicts=True
                )
            self._sync_subscriber_count(topic)

        logger.info(
            "topic.bulk_subscribed workspace_id=%s topic_slug=%s count=%s",
            request.workspace.id,
            topic.slug,
            len(subscriptions),
        )
        return Response(
            {
                "subscribed": len(subscriptions),
                "already_subscribed": len(existing_ids),
                "failed": len(subscriber_ids) - len(subscriptions) - len(existing_ids),
            }
        )

    @action(detail=True, methods=["post"], permission_classes=_ADMIN_PERMS)
    def bulk_unsubscribe(self, request, id=None):
        """Bulk unsubscribes subscribers from this topic."""
        topic = self.get_object()
        serializer = BulkTopicSubscriptionSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        subscriber_ids = serializer.validated_data["subscriber_ids"]

        now = timezone.now()
        updated = TopicSubscription.objects.filter(
            workspace=request.workspace,
            topic=topic,
            subscriber__external_id__in=subscriber_ids,
            unsubscribed_at__isnull=True,
        ).update(unsubscribed_at=now)
        self._sync_subscriber_count(topic)

        logger.info(
            "topic.bulk_unsubscribed workspace_id=%s topic_slug=%s count=%s",
            request.workspace.id,
            topic.slug,
            updated,
        )
        return Response({"unsubscribed": updated, "requested": len(subscriber_ids)})

    @staticmethod
    def _sync_subscriber_count(topic):
        topic.subscriber_count = TopicSubscription.objects.filter(
            workspace=topic.workspace,
            topic=topic,
            unsubscribed_at__isnull=True,
        ).count()
        topic.save(update_fields=["subscriber_count"])

    @action(detail=True, methods=["get"])
    def stats(self, request, id=None):
        """Returns detailed subscription statistics for this topic."""
        topic = self.get_object()
        stats = topic.subscriptions.aggregate(
            active_count=Count("id", filter=Q(unsubscribed_at__isnull=True)),
            inactive_count=Count("id", filter=Q(unsubscribed_at__isnull=False)),
        )
        source_stats = {
            item["source"]: item["count"]
            for item in topic.subscriptions.filter(
                unsubscribed_at__isnull=True
            ).values("source").annotate(count=Count("id"))
        }
        return Response(
            {
                "id": str(topic.id),
                "name": topic.name,
                "slug": topic.slug,
                "total_subscriptions": stats["active_count"] + stats["inactive_count"],
                "active_subscriptions": stats["active_count"],
                "inactive_subscriptions": stats["inactive_count"],
                "by_source": source_stats,
                "created_at": topic.created_at,
                "updated_at": topic.updated_at,
            }
        )


class TopicSubscriptionViewSet(
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """Lists and removes individual topic subscriptions."""

    serializer_class = TopicSubscriptionSerializer
    permission_classes = _MEMBER_PERMS
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["topic", "source"]
    search_fields = ["subscriber__external_id", "subscriber__first_name", "subscriber__last_name"]
    lookup_field = "id"

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return TopicSubscription.objects.none()
        queryset = TopicSubscription.objects.filter(
            workspace=self.request.workspace
        ).select_related("subscriber", "topic")

        status_filter = self.request.query_params.get("status")
        if status_filter == "active":
            queryset = queryset.filter(unsubscribed_at__isnull=True)
        elif status_filter == "inactive":
            queryset = queryset.filter(unsubscribed_at__isnull=False)

        return queryset

    def get_permissions(self):
        if self.action == "destroy":
            return [perm() for perm in _ADMIN_PERMS]
        return super().get_permissions()

    def perform_destroy(self, instance):
        """Unsubscribes (soft delete by setting unsubscribed_at)."""
        instance.unsubscribed_at = timezone.now()
        instance.save(update_fields=["unsubscribed_at"])
        TopicViewSet._sync_subscriber_count(instance.topic)
