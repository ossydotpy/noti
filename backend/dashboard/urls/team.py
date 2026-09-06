from django.urls import path

from dashboard.views.team import (
    InviteAcceptView,
    InviteDetailView,
    InviteListView,
    TeamMemberDetailView,
    TeamMemberListView,
    TeamMemberMeView,
)

urlpatterns = [
    path("members/me/", TeamMemberMeView.as_view(), name="dashboard-member-me"),
    path("members/", TeamMemberListView.as_view(), name="dashboard-member-list"),
    path(
        "members/<uuid:id>/",
        TeamMemberDetailView.as_view(),
        name="dashboard-member-detail",
    ),
    path("invites/", InviteListView.as_view(), name="dashboard-invite-list"),
    path("invites/<uuid:id>/", InviteDetailView.as_view(), name="dashboard-invite-detail"),
    path("invites/accept/", InviteAcceptView.as_view(), name="dashboard-invite-accept"),
]
