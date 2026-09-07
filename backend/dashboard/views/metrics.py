from django.db.models import Count, Q, Sum
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from dashboard.permissions import IsWorkspaceMember, WorkspaceContextPermission
from dashboard.views.in_app import in_app_stats
from notifications.models import Delivery, Notification


class DashboardMetricsView(APIView):
    """Combined workspace summary for dashboard cards.

    Returns notification totals (by status) plus per-channel delivery counts
    and in-app aggregates so the frontend fetches a single URL. Channel counts
    come from the normalized Delivery rows — real SQL group-bys, portable
    across Postgres and SQLite.
    """

    permission_classes = [IsAuthenticated, WorkspaceContextPermission, IsWorkspaceMember]

    def get(self, request):
        workspace = request.workspace
        notif_stats = Notification.objects.filter(workspace=workspace).aggregate(
            total=Count("id"),
            pending=Count("id", filter=Q(status="pending")),
            completed=Count("id", filter=Q(status="completed")),
            failed=Count("id", filter=Q(status="failed")),
            success_total=Sum("success_count"),
            failure_total=Sum("failure_count"),
        )
        notif_stats["success_total"] = notif_stats["success_total"] or 0
        notif_stats["failure_total"] = notif_stats["failure_total"] or 0

        channel_counts = dict(
            Delivery.objects.filter(workspace=workspace)
            .values("channel")
            .annotate(total=Count("id"))
            .values_list("channel", "total")
        )
        notif_stats["push"] = channel_counts.get("push", 0)
        notif_stats["sms"] = channel_counts.get("sms", 0)
        notif_stats["in_app"] = channel_counts.get("in_app", 0)

        return Response(
            {"notifications": notif_stats, "in_app": in_app_stats(workspace)}
        )
