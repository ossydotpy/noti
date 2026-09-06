import logging

from django.template import Context, Template as DjangoTemplate
from django.utils import timezone

from notifications.models import Notification, Topic
from notifications.services.topic_service import TopicService

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def create_notification(workspace, subscriber, validated_data) -> Notification:
        """Create a Notification intent and enqueue processing (unless scheduled)."""
        title, body, data_payload, image_url = NotificationService._resolve_content(
            validated_data, subscriber
        )

        notification_data = dict(data_payload or {})
        in_app_overrides = validated_data.get("in_app")
        if in_app_overrides:
            notification_data["in_app_overrides"] = in_app_overrides

        scheduled_at = validated_data.get("scheduled_at")
        is_scheduled = bool(scheduled_at and scheduled_at > timezone.now())

        notification = Notification.objects.create(
            workspace=workspace,
            subscriber=subscriber,
            channels=validated_data["channels"],
            priority=validated_data.get("priority", "normal"),
            fallback=validated_data.get("fallback", False),
            title=title,
            body=body,
            data=notification_data,
            image_url=image_url,
            template=validated_data.get("template"),
            scheduled_at=scheduled_at,
            status="scheduled" if is_scheduled else "pending",
        )

        logger.info(
            "notification.created workspace_id=%s notification_id=%s channels=%s scheduled=%s",
            workspace.id,
            notification.id,
            validated_data["channels"],
            is_scheduled,
        )

        if not is_scheduled:
            from notifications.tasks import process_notification_task

            process_notification_task.delay(str(notification.id))

        return notification

    @staticmethod
    def render_template(template, variables, subscriber):
        """Render template content using the Django template engine."""
        context = Context(
            {
                "subscriber": {
                    "external_id": subscriber.external_id,
                    "first_name": subscriber.first_name,
                    "last_name": subscriber.last_name,
                    "email": subscriber.email,
                },
                **variables,
            }
        )

        content = template.content

        title = content.get("title", "")
        if title:
            title = DjangoTemplate(title).render(context)

        body = content.get("body", "")
        if body:
            body = DjangoTemplate(body).render(context)

        rendered_data = {}
        for key, value in content.get("data_payload", {}).items():
            if isinstance(value, str):
                rendered_data[key] = DjangoTemplate(value).render(context)
            else:
                rendered_data[key] = value

        image_url = content.get("image_url")
        if image_url:
            image_url = DjangoTemplate(image_url).render(context)

        return title, body, rendered_data, image_url

    @staticmethod
    def create_topic_notifications(workspace, topic: Topic, validated_data) -> dict:
        """Create one notification per active subscriber of a topic."""
        scheduled_at = validated_data.get("scheduled_at")
        is_scheduled = bool(scheduled_at and scheduled_at > timezone.now())

        created_count = 0
        subscriber_count = 0
        notification_ids = []

        for subscriber in TopicService.iter_active_subscribers(topic):
            subscriber_count += 1
            title, body, data_payload, image_url = (
                NotificationService._resolve_content(validated_data, subscriber)
            )

            notification_data = dict(data_payload or {})
            in_app_overrides = validated_data.get("in_app")
            if in_app_overrides:
                notification_data["in_app_overrides"] = in_app_overrides

            notification = Notification.objects.create(
                workspace=workspace,
                subscriber=subscriber,
                channels=validated_data["channels"],
                priority=validated_data.get("priority", "normal"),
                fallback=validated_data.get("fallback", False),
                title=title,
                body=body,
                data=notification_data,
                image_url=image_url,
                template=validated_data.get("template"),
                scheduled_at=scheduled_at,
                status="scheduled" if is_scheduled else "pending",
            )

            if not is_scheduled:
                from notifications.tasks import process_notification_task

                process_notification_task.delay(str(notification.id))

            notification_ids.append(str(notification.id))
            created_count += 1

        logger.info(
            "topic_notification.created workspace_id=%s topic_slug=%s created=%s subscribers=%s",
            workspace.id,
            topic.slug,
            created_count,
            subscriber_count,
        )

        return {
            "created": created_count,
            "subscribers_total": subscriber_count,
            "notifications": notification_ids,
        }

    @staticmethod
    def _resolve_content(validated_data, subscriber):
        """Return (title, body, data_payload, image_url) for a validated send payload."""
        template = validated_data.get("template")
        if template:
            return NotificationService.render_template(
                template, validated_data.get("template_variables", {}), subscriber
            )

        content = validated_data["content"]
        return (
            content.get("title"),
            content["body"],
            content.get("data_payload", {}),
            content.get("image_url"),
        )
