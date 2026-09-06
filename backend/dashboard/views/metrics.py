from django.db.models import Case, Count, IntegerField, Sum, When
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dashboard.permissions import IsWorkspaceMember, WorkspaceContextPermission
from dashboard.views.in_app import in_app_stats
from notifications.models import Notification


class DashboardMetricsView(APIView):
    """Combined workspace summary for dashboard cards.

    Returns notification totals (by status and channel) plus in-app
    aggregates so the frontend can fetch a single URL.
    """

    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]

    def get(self, request):
        workspace = request.workspace
        notif_stats = Notification.objects.filter(workspace=workspace).aggregate(
            total=Count("id"),
            pending=Count(
                Case(When(status="pending", then=1), output_field=IntegerField())
            ),
            completed=Count(
                Case(When(status="completed", then=1), output_field=IntegerField())
            ),
            failed=Count(
                Case(When(status="failed", then=1), output_field=IntegerField())
            ),
            push=Count(
                Case(
                    When(channels__contains=["push"], then=1),
                    output_field=IntegerField(),
                )
            ),
            sms=Count(
                Case(
                    When(channels__contains=["sms"], then=1),
                    output_field=IntegerField(),
                )
            ),
            in_app=Count(
                Case(
                    When(channels__contains=["in_app"], then=1),
                    output_field=IntegerField(),
                )
            ),
            success_total=Sum("success_count"),
            failure_total=Sum("failure_count"),
        )
        return Response(
            {"notifications": notif_stats, "in_app": in_app_stats(workspace)}
        )
