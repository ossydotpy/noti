from django.urls import path

from dashboard.views.workspaces import (
    ArchiveWorkspaceView,
    WorkspaceDetailView,
    WorkspaceListView,
)

urlpatterns = [
    path("", WorkspaceListView.as_view(), name="dashboard-workspace-list"),
    path("active/", WorkspaceDetailView.as_view(), name="dashboard-workspace-active"),
    path(
        "<uuid:workspace_id>/archive/",
        ArchiveWorkspaceView.as_view(),
        name="dashboard-workspace-archive",
    ),
]
