import logging

from django.db import transaction
from django.utils import timezone

from notifications.models import Subscriber, Topic, TopicSubscription

logger = logging.getLogger(__name__)


class TopicService:
    """Manages topic subscriptions and topic subscriber queries."""

    @staticmethod
    def get_active_subscribers(topic: Topic) -> list[Subscriber]:
        """Get all active subscribers for a topic."""
        return list(TopicService._active_subscribers_qs(topic))

    @staticmethod
    def iter_active_subscribers(topic: Topic, chunk_size: int = 2000):
        """Stream active subscribers for a topic to avoid loading all into memory."""
        return TopicService._active_subscribers_qs(topic).iterator(
            chunk_size=chunk_size
        )

    @staticmethod
    def _active_subscribers_qs(topic: Topic):
        return (
            Subscriber.objects.filter(
                topic_subscriptions__topic=topic,
                topic_subscriptions__unsubscribed_at__isnull=True,
                is_active=True,
                archived_at__isnull=True,
            )
            .distinct()
        )

    @staticmethod
    def subscribe_subscriber(
        workspace,
        topic: Topic,
        subscriber: Subscriber,
        source: str = "api",
        metadata: dict | None = None,
    ) -> tuple[TopicSubscription | None, str]:
        """Subscribe a subscriber to a topic. Returns (subscription, status)."""
        with transaction.atomic():
            existing = TopicSubscription.objects.filter(
                workspace=workspace,
                topic=topic,
                subscriber=subscriber,
                unsubscribed_at__isnull=True,
            ).first()

            if existing:
                return existing, "already_subscribed"

            inactive = TopicSubscription.objects.filter(
                workspace=workspace,
                topic=topic,
                subscriber=subscriber,
                unsubscribed_at__isnull=False,
            ).first()

            if inactive:
                inactive.unsubscribed_at = None
                inactive.source = source
                inactive.metadata = metadata or {}
                inactive.save()
                TopicService._update_subscriber_count(topic)

                logger.info(
                    "topic_subscription.reactivated workspace_id=%s topic_slug=%s subscriber_id=%s",
                    workspace.id,
                    topic.slug,
                    subscriber.id,
                )
                return inactive, "reactivated"

            subscription = TopicSubscription.objects.create(
                workspace=workspace,
                topic=topic,
                subscriber=subscriber,
                source=source,
                metadata=metadata or {},
            )
            TopicService._update_subscriber_count(topic)

            logger.info(
                "topic_subscription.created workspace_id=%s topic_slug=%s subscriber_id=%s source=%s",
                workspace.id,
                topic.slug,
                subscriber.id,
                source,
            )
            return subscription, "new"

    @staticmethod
    def unsubscribe_subscriber(workspace, topic: Topic, subscriber: Subscriber) -> bool:
        """Unsubscribe a subscriber from a topic. Returns False if not subscribed."""
        with transaction.atomic():
            subscription = TopicSubscription.objects.filter(
                workspace=workspace,
                topic=topic,
                subscriber=subscriber,
                unsubscribed_at__isnull=True,
            ).first()

            if not subscription:
                return False

            subscription.unsubscribed_at = timezone.now()
            subscription.save()

            TopicService._update_subscriber_count(topic)

            logger.info(
                "topic_subscription.unsubscribed workspace_id=%s topic_slug=%s subscriber_id=%s",
                workspace.id,
                topic.slug,
                subscriber.id,
            )
            return True

    @staticmethod
    def _update_subscriber_count(topic: Topic):
        """Update the cached subscriber count for a topic."""
        count = TopicSubscription.objects.filter(
            topic=topic, unsubscribed_at__isnull=True
        ).count()
        topic.subscriber_count = count
        topic.save(update_fields=["subscriber_count"])

    @staticmethod
    def get_subscriber_topics(workspace, subscriber: Subscriber, active_only: bool = True):
        """Get all topics a subscriber is subscribed to."""
        queryset = Topic.objects.filter(
            workspace=workspace, subscriptions__subscriber=subscriber
        )

        if active_only:
            queryset = queryset.filter(
                subscriptions__unsubscribed_at__isnull=True, is_active=True
            )

        return queryset.distinct()

    @staticmethod
    def bulk_subscribe(
        workspace, topic: Topic, subscribers: list[Subscriber], source: str = "api"
    ) -> dict:
        """Bulk subscribe subscribers to a topic, returning per-status counts."""
        new_count = 0
        reactivated_count = 0
        already_subscribed_count = 0

        with transaction.atomic():
            for subscriber in subscribers:
                _, status = TopicService.subscribe_subscriber(
                    workspace, topic, subscriber, source
                )
                if status == "new":
                    new_count += 1
                elif status == "reactivated":
                    reactivated_count += 1
                else:
                    already_subscribed_count += 1

        return {
            "new": new_count,
            "reactivated": reactivated_count,
            "already_subscribed": already_subscribed_count,
            "total": len(subscribers),
        }

    @staticmethod
    def bulk_unsubscribe(workspace, topic: Topic, subscribers: list[Subscriber]) -> dict:
        """Bulk unsubscribe subscribers from a topic, returning per-status counts."""
        unsubscribed = 0
        not_subscribed = 0

        with transaction.atomic():
            for subscriber in subscribers:
                if TopicService.unsubscribe_subscriber(workspace, topic, subscriber):
                    unsubscribed += 1
                else:
                    not_subscribed += 1

        return {
            "unsubscribed": unsubscribed,
            "not_subscribed": not_subscribed,
            "total": len(subscribers),
        }
