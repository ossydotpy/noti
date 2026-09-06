import logging

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.exceptions import NotFound
from rest_framework.filters import OrderingFilter
from rest_framework.generics import GenericAPIView, ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .filters import InAppNotificationFilter, SubscriberFilter
from .idempotency import IdempotencyService
from .mixins import WorkspaceScopedMixin
from .models import InAppNotification, Notification, Subscriber, Topic
from .pagination import InAppFeedPagination
from .serializers import (
    DeviceSerializer,
    InAppNotificationSerializer,
    InAppUnreadCountResponseSerializer,
    NotificationDetailSerializer,
    NotificationResponseSerializer,
    PublicTopicSerializer,
    RefreshSessionRequestSerializer,
    RevokeSessionRequestSerializer,
    RevokeSessionResponseSerializer,
    SendNotificationSerializer,
    SendTopicNotificationResponseSerializer,
    SendTopicNotificationSerializer,
    SessionRequestSerializer,
    SessionResponseSerializer,
    SubscriberDetailSerializer,
    SubscriberSerializer,
    SubscriberTopicSubscriptionSerializer,
    TopicAlreadySubscribedResponseSerializer,
    TopicSubscribeResponseSerializer,
    TopicUnsubscribeResponseSerializer,
)
from .services import (
    DeviceService,
    InvalidRefreshToken,
    NotificationService,
    SubscriberService,
    SubscriberTokenService,
    TopicService,
)
from .throttling import (
    InAppReadRateThrottle,
    SessionMintRateThrottle,
    SessionRefreshRateThrottle,
    WorkspaceApiThrottle,
)

logger = logging.getLogger(__name__)

APIKEY_AUTH = {"apiKey": []}
SAT_AUTH = {"subscriberAccessToken": []}


def _get_client_ip(request) -> str | None:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


@extend_schema_view(
    create=extend_schema(auth=[APIKEY_AUTH]),
    list=extend_schema(auth=[APIKEY_AUTH]),
    retrieve=extend_schema(auth=[APIKEY_AUTH]),
)
class SubscriberViewSet(
    WorkspaceScopedMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Public API for subscribers — upsert, list, and retrieve."""

    authentication_classes = []
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend]
    filterset_class = SubscriberFilter

    def get_queryset(self):
        return super().get_queryset().prefetch_related("devices")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SubscriberDetailSerializer
        return SubscriberSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        external_id = request.data.get("external_id")
        if not external_id:
            return Response(
                {"error": "external_id is required"}, status=status.HTTP_400_BAD_REQUEST
            )

        subscriber = SubscriberService.upsert_subscriber(
            workspace=request.workspace,
            external_id=external_id,
            email=serializer.validated_data.get("email"),
            phone_number=serializer.validated_data.get("phone_number"),
            data=serializer.validated_data.get("data"),
            first_name=serializer.validated_data.get("first_name"),
            last_name=serializer.validated_data.get("last_name"),
            timezone=serializer.validated_data.get("timezone", "UTC"),
            locale=serializer.validated_data.get("locale", "en"),
        )

        return Response(
            SubscriberSerializer(subscriber).data, status=status.HTTP_200_OK
        )


@extend_schema_view(
    create=extend_schema(auth=[APIKEY_AUTH]),
    destroy=extend_schema(auth=[APIKEY_AUTH]),
)
class DeviceViewSet(WorkspaceScopedMixin, viewsets.GenericViewSet):
    """API for registering and deleting devices."""

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = DeviceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subscriber_id = serializer.validated_data.get("subscriber_id")
        external_id = serializer.validated_data.get("subscriber_external_id")

        if subscriber_id:
            subscriber = get_object_or_404(
                Subscriber, id=subscriber_id, workspace=request.workspace
            )
        elif external_id:
            subscriber = get_object_or_404(
                Subscriber, external_id=external_id, workspace=request.workspace
            )
        else:
            return Response(
                {"error": "subscriber_id or subscriber_external_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        device = DeviceService.register_device(
            workspace=request.workspace,
            subscriber=subscriber,
            push_token=serializer.validated_data["push_token"],
            platform=serializer.validated_data["platform"],
            metadata=serializer.validated_data.get("metadata"),
        )

        return Response(
            DeviceSerializer(device).data,
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        device = self.get_object()
        DeviceService.delete_device(device)
        return Response(status=status.HTTP_204_NO_CONTENT)


class SendNotificationView(GenericAPIView):
    """POST /notifications/send — create a notification intent."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [WorkspaceApiThrottle]
    serializer_class = SendNotificationSerializer

    @extend_schema(
        tags=["Notifications"],
        summary="Send a notification to a subscriber",
        request=SendNotificationSerializer,
        responses={202: NotificationResponseSerializer},
        auth=[APIKEY_AUTH],
    )
    def post(self, request):
        idempotency_key = request.headers.get("Idempotency-Key")

        if idempotency_key:
            cached_response = IdempotencyService.check(
                request.workspace.id, idempotency_key
            )
            if cached_response:
                return Response(cached_response, status=status.HTTP_202_ACCEPTED)

        serializer = self.get_serializer(
            data=request.data, context={"workspace": request.workspace}
        )
        serializer.is_valid(raise_exception=True)

        subscriber = get_object_or_404(
            Subscriber,
            external_id=serializer.validated_data["user_id"],
            workspace=request.workspace,
            is_active=True,
        )

        notification = NotificationService.create_notification(
            workspace=request.workspace,
            subscriber=subscriber,
            validated_data=serializer.validated_data,
        )

        response_data = NotificationResponseSerializer(notification).data

        if idempotency_key:
            IdempotencyService.store(request.workspace.id, idempotency_key, response_data)

        return Response(response_data, status=status.HTTP_202_ACCEPTED)


class NotificationDetailView(GenericAPIView):
    """GET /notifications/{id} — notification intent with delivery summary."""

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = NotificationDetailSerializer

    @extend_schema(
        tags=["Notifications"],
        responses={200: NotificationDetailSerializer},
        auth=[APIKEY_AUTH],
    )
    def get(self, request, pk):
        notification = (
            Notification.objects.filter(id=pk, workspace=request.workspace)
            .annotate(
                summary_total=Count("deliveries"),
                summary_pending=Count(
                    "deliveries", filter=Q(deliveries__status="pending")
                ),
                summary_sent=Count("deliveries", filter=Q(deliveries__status="sent")),
                summary_delivered=Count(
                    "deliveries", filter=Q(deliveries__status="delivered")
                ),
                summary_failed=Count(
                    "deliveries", filter=Q(deliveries__status="failed")
                ),
            )
            .first()
        )

        if not notification:
            raise NotFound("Notification not found")

        return Response(NotificationDetailSerializer(notification).data)


class InAppFeedView(ListAPIView):
    """GET /in-app/ — in-app notification feed (SAT authenticated)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = InAppNotificationSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = InAppNotificationFilter
    ordering = ["-created_at"]
    pagination_class = InAppFeedPagination
    throttle_classes = [InAppReadRateThrottle]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return InAppNotification.objects.none()

        return (
            InAppNotification.objects.filter(
                workspace=self.request.workspace,
                subscriber=self.request.subscriber,
                archived_at__isnull=True,
            )
            .exclude(expires_at__isnull=False, expires_at__lt=timezone.now())
            .order_by("-created_at")
        )


class InAppMarkReadView(GenericAPIView):
    """PATCH /in-app/{id}/read — mark a notification as read (SAT authenticated)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = InAppNotificationSerializer

    @extend_schema(
        tags=["In-App"],
        request=None,
        responses={200: InAppNotificationSerializer},
        auth=[SAT_AUTH],
    )
    def patch(self, request, pk):
        in_app = get_object_or_404(
            InAppNotification,
            id=pk,
            workspace=request.workspace,
            subscriber=request.subscriber,
            subscriber__is_active=True,
        )

        if in_app.archived_at is not None:
            return Response(
                {"error": "not_found", "message": "Notification is archived."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if in_app.read_at is None:
            now = timezone.now()
            update_fields = ["read_at", "updated_at"]
            in_app.read_at = now
            if in_app.seen_at is None:
                in_app.seen_at = now
                update_fields.append("seen_at")
            in_app.save(update_fields=update_fields)

        return Response(InAppNotificationSerializer(in_app).data)


class InAppUnreadCountView(GenericAPIView):
    """GET /in-app/unread-count/ — unread count (SAT authenticated)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = InAppUnreadCountResponseSerializer

    @extend_schema(
        tags=["In-App"],
        responses={200: InAppUnreadCountResponseSerializer},
        auth=[SAT_AUTH],
    )
    def get(self, request):
        count = (
            InAppNotification.objects.filter(
                workspace=request.workspace,
                subscriber=request.subscriber,
                read_at__isnull=True,
                archived_at__isnull=True,
            )
            .exclude(expires_at__isnull=False, expires_at__lt=timezone.now())
            .count()
        )

        return Response({"count": count})


class CreateSessionView(GenericAPIView):
    """POST /in-app/sessions — issue a SAT and refresh token for a subscriber."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [SessionMintRateThrottle]
    serializer_class = SessionRequestSerializer

    @extend_schema(
        tags=["Sessions"],
        request=SessionRequestSerializer,
        responses={201: SessionResponseSerializer},
        auth=[APIKEY_AUTH],
    )
    def post(self, request):
        subscriber_external_id = request.data.get("subscriber_external_id")
        if not subscriber_external_id:
            return Response(
                {"error": "subscriber_external_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subscriber = get_object_or_404(
            Subscriber,
            external_id=subscriber_external_id,
            workspace=request.workspace,
            is_active=True,
        )

        try:
            requested_sat_expiry = _parse_expiry(request.data.get("expires_in"))
            requested_srt_expiry = _parse_expiry(request.data.get("refresh_expires_in"))
        except ValueError as exc:
            return Response(
                {"error": f"expires_in {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        metadata = {
            "ip": _get_client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
        }

        sat, srt, refresh_token = SubscriberTokenService.issue_tokens(
            subscriber=subscriber,
            workspace_id=str(request.workspace.id),
            requested_sat_expiry=requested_sat_expiry,
            requested_srt_expiry=requested_srt_expiry,
            metadata=metadata,
        )

        logger.info(
            "subscriber_session.created workspace_id=%s subscriber_id=%s external_id=%s refresh_token_id=%s ip=%s",
            request.workspace.id,
            subscriber.id,
            subscriber.external_id,
            refresh_token.id,
            metadata.get("ip"),
        )

        return Response(
            {
                "access_token": sat,
                "refresh_token": srt,
                "token_type": "Bearer",
                "expires_in": SubscriberTokenService.effective_sat_expiry(
                    requested_sat_expiry
                ),
                "subscriber_id": str(subscriber.id),
                "external_id": subscriber.external_id,
            },
            status=status.HTTP_201_CREATED,
        )


class RefreshSessionView(GenericAPIView):
    """POST /in-app/sessions/refresh — rotate the refresh token and issue a new SAT."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [SessionRefreshRateThrottle]
    serializer_class = RefreshSessionRequestSerializer

    @extend_schema(
        tags=["Sessions"],
        request=RefreshSessionRequestSerializer,
        responses={200: SessionResponseSerializer},
        auth=[],
    )
    def post(self, request):
        refresh_token_str = request.data.get("refresh_token")
        if not refresh_token_str:
            return Response(
                {"error": "refresh_token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            refresh_token = SubscriberTokenService.validate_refresh_token(
                refresh_token_str
            )
        except InvalidRefreshToken as e:
            return Response(
                {"error": "invalid_token", "message": str(e)},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            requested_sat_expiry = _parse_expiry(request.data.get("expires_in"))
        except ValueError as exc:
            return Response(
                {"error": f"expires_in {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        metadata = {
            "ip": _get_client_ip(request),
            "user_agent": request.META.get("HTTP_USER_AGENT", ""),
        }

        sat, srt, new_refresh_token = SubscriberTokenService.rotate_tokens(
            refresh_token=refresh_token,
            requested_sat_expiry=requested_sat_expiry,
            metadata=metadata,
        )

        logger.info(
            "subscriber_session.refreshed workspace_id=%s subscriber_id=%s external_id=%s old_refresh_token_id=%s new_refresh_token_id=%s ip=%s",
            new_refresh_token.workspace_id,
            new_refresh_token.subscriber.id,
            new_refresh_token.subscriber.external_id,
            refresh_token.id,
            new_refresh_token.id,
            metadata.get("ip"),
        )

        return Response(
            {
                "access_token": sat,
                "refresh_token": srt,
                "token_type": "Bearer",
                "expires_in": SubscriberTokenService.effective_sat_expiry(
                    requested_sat_expiry
                ),
                "subscriber_id": str(new_refresh_token.subscriber.id),
                "external_id": new_refresh_token.subscriber.external_id,
            },
            status=status.HTTP_200_OK,
        )


class RevokeSessionView(GenericAPIView):
    """POST /in-app/sessions/revoke — revoke all sessions for a subscriber."""

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = RevokeSessionRequestSerializer

    @extend_schema(
        tags=["Sessions"],
        request=RevokeSessionRequestSerializer,
        responses={200: RevokeSessionResponseSerializer},
        auth=[APIKEY_AUTH],
    )
    def post(self, request):
        subscriber_external_id = request.data.get("subscriber_external_id")
        if not subscriber_external_id:
            return Response(
                {"error": "subscriber_external_id is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subscriber = get_object_or_404(
            Subscriber,
            external_id=subscriber_external_id,
            workspace=request.workspace,
            is_active=True,
        )

        revoked_count = SubscriberTokenService.revoke_all_subscriber_tokens(
            subscriber=subscriber,
            workspace_id=str(request.workspace.id),
        )

        logger.info(
            "subscriber_session.revoked workspace_id=%s subscriber_id=%s external_id=%s revoked_count=%s",
            request.workspace.id,
            subscriber.id,
            subscriber.external_id,
            revoked_count,
        )

        return Response(
            {
                "revoked_count": revoked_count,
                "subscriber_id": str(subscriber.id),
                "external_id": subscriber.external_id,
            },
            status=status.HTTP_200_OK,
        )


class SendTopicNotificationView(GenericAPIView):
    """POST /topics/{slug}/send — send a notification to all topic subscribers."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [WorkspaceApiThrottle]
    serializer_class = SendTopicNotificationSerializer

    @extend_schema(
        tags=["Topics"],
        request=SendTopicNotificationSerializer,
        responses={202: SendTopicNotificationResponseSerializer},
        auth=[APIKEY_AUTH],
    )
    def post(self, request, slug):
        idempotency_key = request.headers.get("Idempotency-Key")

        if idempotency_key:
            cached_response = IdempotencyService.check(
                request.workspace.id, idempotency_key
            )
            if cached_response:
                return Response(cached_response, status=status.HTTP_202_ACCEPTED)

        data = request.data.copy()
        data["topic_slug"] = slug

        serializer = SendTopicNotificationSerializer(
            data=data, context={"workspace": request.workspace}
        )
        serializer.is_valid(raise_exception=True)

        topic = serializer.validated_data["topic"]

        result = NotificationService.create_topic_notifications(
            workspace=request.workspace,
            topic=topic,
            validated_data=serializer.validated_data,
        )

        response_data = {
            "topic": topic.slug,
            "notifications_created": result["created"],
            "subscribers_targeted": result["subscribers_total"],
            "channels": serializer.validated_data.get("channels", []),
        }

        if idempotency_key:
            IdempotencyService.store(request.workspace.id, idempotency_key, response_data)

        return Response(response_data, status=status.HTTP_202_ACCEPTED)


class SubscriberTopicsView(ListAPIView):
    """GET /in-app/topics — list the subscriber's active topic subscriptions."""

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = PublicTopicSerializer
    pagination_class = InAppFeedPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Topic.objects.none()

        return TopicService.get_subscriber_topics(
            workspace=self.request.workspace,
            subscriber=self.request.subscriber,
            active_only=True,
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["subscriber"] = self.request.subscriber
        return ctx


class SubscriberTopicSubscribeView(GenericAPIView):
    """POST /in-app/topics/{slug}/subscribe — subscribe to a topic."""

    authentication_classes = []
    permission_classes = [AllowAny]
    serializer_class = SubscriberTopicSubscriptionSerializer

    @extend_schema(
        tags=["Topics"],
        request=SubscriberTopicSubscriptionSerializer,
        responses={
            201: TopicSubscribeResponseSerializer,
            200: TopicAlreadySubscribedResponseSerializer,
        },
        auth=[SAT_AUTH],
    )
    def post(self, request, slug):
        serializer = SubscriberTopicSubscriptionSerializer(
            data=request.data,
            context={"workspace": request.workspace, "subscriber": request.subscriber},
        )
        serializer.is_valid(raise_exception=True)

        topic = serializer.context["topic"]

        _, status_result = TopicService.subscribe_subscriber(
            workspace=request.workspace,
            topic=topic,
            subscriber=request.subscriber,
            source=serializer.validated_data.get("source", "api"),
            metadata=serializer.validated_data.get("metadata", {}),
        )

        if status_result == "already_subscribed":
            return Response(
                {"detail": "Already subscribed to this topic."},
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "detail": "Subscribed successfully.",
                "topic": topic.slug,
                "subscriber": request.subscriber.external_id,
            },
            status=status.HTTP_201_CREATED,
        )


class SubscriberTopicUnsubscribeView(GenericAPIView):
    """POST /in-app/topics/{slug}/unsubscribe — unsubscribe from a topic."""

    authentication_classes = []
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Topics"],
        request=None,
        responses={200: TopicUnsubscribeResponseSerializer},
        auth=[SAT_AUTH],
    )
    def post(self, request, slug):
        topic = get_object_or_404(
            Topic,
            slug=slug,
            workspace=request.workspace,
            is_active=True,
        )

        result = TopicService.unsubscribe_subscriber(
            workspace=request.workspace,
            topic=topic,
            subscriber=request.subscriber,
        )

        if not result:
            return Response(
                {"detail": "Not subscribed to this topic."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "detail": "Unsubscribed successfully.",
                "topic": topic.slug,
                "subscriber": request.subscriber.external_id,
            },
            status=status.HTTP_200_OK,
        )


def _parse_expiry(value) -> int | None:
    """Parse an optional integer expiry in seconds. Raises ValueError if invalid."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        raise ValueError("must be an integer (seconds)")
