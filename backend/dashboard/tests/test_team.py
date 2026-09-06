from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import WorkspaceInvite, WorkspaceMember
from core.token_service import hash_token
from dashboard.tests.utils import auth_client, make_user, make_workspace


class TeamMemberApiTest(APITestCase):
    def setUp(self):
        self.owner = make_user("owner@example.com")
        self.admin = make_user("admin@example.com")
        self.member = make_user("member@example.com")
        self.workspace = make_workspace(self.owner, name="Team Workspace", slug="team-ws")
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.admin, role="admin"
        )
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=self.member, role="member"
        )

    def _member(self, user):
        return WorkspaceMember.objects.get(workspace=self.workspace, user=user)

    def test_member_me(self):
        response = auth_client(self.member, self.workspace).get(
            reverse("dashboard-member-me")
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "member")
        self.assertEqual(response.data["email"], "member@example.com")

    def test_list_members(self):
        response = auth_client(self.member, self.workspace).get(
            reverse("dashboard-member-list")
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)

    def test_admin_can_remove_member(self):
        response = auth_client(self.admin, self.workspace).delete(
            reverse("dashboard-member-detail", kwargs={"id": self._member(self.member).id})
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        removed = self._member(self.member)
        self.assertIsNotNone(removed.archived_at)

    def test_admin_cannot_change_roles(self):
        response = auth_client(self.admin, self.workspace).patch(
            reverse("dashboard-member-detail", kwargs={"id": self._member(self.member).id}),
            {"role": "admin"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self._member(self.member).role, "member")

    def test_owner_can_change_roles(self):
        response = auth_client(self.owner, self.workspace).patch(
            reverse("dashboard-member-detail", kwargs={"id": self._member(self.member).id}),
            {"role": "admin"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self._member(self.member).role, "admin")


class InviteApiTest(APITestCase):
    def setUp(self):
        self.owner = make_user("owner@example.com", first_name="Ow", last_name="Ner")
        self.workspace = make_workspace(self.owner, name="Invite Workspace", slug="invite-ws")
        self.url = reverse("dashboard-invite-list")

    @patch("dashboard.views.team.send_workspace_invite_email")
    def test_create_invite_returns_raw_token_once(self, mock_task):
        response = auth_client(self.owner, self.workspace).post(
            self.url, {"email": "new@example.com", "role": "member"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        raw_token = response.data["token"]
        self.assertEqual(len(raw_token), 43)
        invite = WorkspaceInvite.objects.get(
            workspace=self.workspace, email="new@example.com"
        )
        self.assertEqual(invite.token, hash_token(raw_token))
        self.assertEqual(mock_task.delay.call_count, 1)
        link = mock_task.delay.call_args.kwargs["invite_link"]
        self.assertIn(raw_token, link)

    def test_create_invite_uses_stored_hash(self):
        with patch("dashboard.views.team.send_workspace_invite_email"):
            response = auth_client(self.owner, self.workspace).post(
                self.url, {"email": "hashed@example.com", "role": "admin"}, format="json"
            )
        invite = WorkspaceInvite.objects.get(email="hashed@example.com")
        self.assertNotEqual(invite.token, response.data["token"])
        self.assertEqual(hash_token(response.data["token"]), invite.token)

    def test_create_invite_invalid_role(self):
        response = auth_client(self.owner, self.workspace).post(
            self.url, {"email": "x@example.com", "role": "owner"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_invite_for_existing_member(self):
        existing = make_user("existing@example.com")
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=existing, role="member"
        )
        response = auth_client(self.owner, self.workspace).post(
            self.url, {"email": "existing@example.com", "role": "member"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_invite_replaces_pending_invite(self):
        with patch("dashboard.views.team.send_workspace_invite_email"):
            first = auth_client(self.owner, self.workspace).post(
                self.url, {"email": "again@example.com", "role": "member"}, format="json"
            )
            second = auth_client(self.owner, self.workspace).post(
                self.url, {"email": "again@example.com", "role": "admin"}, format="json"
            )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            WorkspaceInvite.objects.filter(email="again@example.com").count(), 1
        )
        self.assertNotEqual(first.data["token"], second.data["token"])

    def test_member_cannot_create_invite(self):
        member = make_user("member@example.com")
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=member, role="member"
        )
        response = auth_client(member, self.workspace).post(
            self.url, {"email": "nope@example.com", "role": "member"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invite_email_sent_via_task(self):
        auth_client(self.owner, self.workspace).post(
            self.url, {"email": "mailed@example.com", "role": "member"}, format="json"
        )
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertIn("mailed@example.com", message.to)
        invite = WorkspaceInvite.objects.get(email="mailed@example.com")
        # The raw token appears in the link; only its hash is stored.
        raw_token = message.body.split("/invite/", 1)[1].split()[0]
        self.assertEqual(invite.token, hash_token(raw_token))


class InviteAcceptApiTest(APITestCase):
    def setUp(self):
        self.owner = make_user("owner@example.com")
        self.workspace = make_workspace(self.owner, name="Accept Workspace", slug="accept-ws")
        self.invite = WorkspaceInvite.objects.create(
            workspace=self.workspace,
            email="invitee@example.com",
            role="member",
            token=hash_token("raw-token-value"),
            invited_by=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )
        self.url = reverse("dashboard-invite-accept")

    def test_accept_invite(self):
        invitee = make_user("invitee@example.com")
        response = auth_client(invitee).post(
            self.url, {"token": "raw-token-value"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], "accepted")
        self.assertEqual(response.data["data"]["workspace_slug"], self.workspace.slug)
        self.assertTrue(
            WorkspaceMember.objects.filter(
                workspace=self.workspace, user=invitee, role="member"
            ).exists()
        )
        self.invite.refresh_from_db()
        self.assertIsNotNone(self.invite.accepted_at)

    def test_accept_invite_invalid_token(self):
        invitee = make_user("invitee@example.com")
        response = auth_client(invitee).post(
            self.url, {"token": "wrong-token"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "invalid_invite")

    def test_accept_invite_expired(self):
        self.invite.expires_at = timezone.now() - timedelta(days=1)
        self.invite.save(update_fields=["expires_at"])
        invitee = make_user("invitee@example.com")
        response = auth_client(invitee).post(
            self.url, {"token": "raw-token-value"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "invalid_invite")

    def test_accept_invite_email_mismatch(self):
        other = make_user("other@example.com")
        response = auth_client(other).post(
            self.url, {"token": "raw-token-value"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"]["code"], "email_mismatch")

    def test_accept_invite_already_member(self):
        invitee = make_user("invitee@example.com")
        WorkspaceMember.objects.create(
            workspace=self.workspace, user=invitee, role="admin"
        )
        response = auth_client(invitee).post(
            self.url, {"token": "raw-token-value"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["status"], "already_member")
        self.assertEqual(
            WorkspaceMember.objects.filter(
                workspace=self.workspace, user=invitee
            ).count(),
            1,
        )

    def test_accept_invite_reactivates_removed_member(self):
        removed_user = make_user("removed@example.com")
        raw_token = "reactivation-token"
        self.invite = WorkspaceInvite.objects.create(
            workspace=self.workspace,
            email="removed@example.com",
            role="member",
            token=hash_token(raw_token),
            invited_by=self.owner,
            expires_at=timezone.now() + timedelta(days=7),
        )
        removed = WorkspaceMember.objects.create(
            workspace=self.workspace,
            user=removed_user,
            role="member",
            archived_at=timezone.now(),
        )
        response = auth_client(removed_user).post(
            self.url, {"token": raw_token}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        removed.refresh_from_db()
        self.assertIsNone(removed.archived_at)
        self.assertEqual(removed.role, "member")

    def test_accept_invite_unauthenticated(self):
        response = auth_client().post(
            self.url, {"token": "raw-token-value"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
