from django.urls import path

from dashboard.views.metrics import DashboardMetricsView

urlpatterns = [
    path("", DashboardMetricsView.as_view(), name="dashboard-metrics"),
]
