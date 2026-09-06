import uuid

from django.conf import settings
from django.core.validators import MinLengthValidator
from django.db import models

from .fields import EncryptedJSONField


class Workspace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, validators=[MinLengthValidator(5)])
    slug = models.SlugField(max_length=50, unique=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_workspaces",
    )

    webhook_url = models.URLField(max_length=500, null=True, blank=True)
    webhook_secret = models.CharField(max_length=64, null=True, blank=True)
    settings = models.JSONField(default=dict)
    provider_credentials = EncryptedJSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner"], name="idx_workspaces_owner"),
        ]

    def __str__(self):
        return str(self.name)


class WorkspaceMember(models.Model):
    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("member", "Member"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspace_memberships",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="workspace_invitees",
    )
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    archived_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ["workspace", "user"]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user"], name="idx_members_user"),
            models.Index(fields=["workspace", "role"], name="idx_members_ws_role"),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.workspace.name}"


class APIKey(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="api_keys"
    )
    name = models.CharField(max_length=100)
    key_prefix = models.CharField(max_length=16)
    key_hash = models.CharField(max_length=255)
    scopes = models.JSONField(default=list)
    last_used_at = models.DateTimeField(null=True, blank=True)
    last_used_ip = models.GenericIPAddressField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_api_keys",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["key_prefix"], name="idx_api_keys_prefix"),
            models.Index(fields=["workspace", "revoked_at"], name="idx_api_keys_ws"),
        ]

    def __str__(self):
        return f"{self.name} ({self.key_prefix}...)"

    @property
    def is_revoked(self):
        return self.revoked_at is not None

    @property
    def is_expired(self):
        if self.expires_at:
            from django.utils import timezone

            return timezone.now() > self.expires_at
        return False


class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=50)
    resource_id = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["workspace", "created_at"], name="idx_audit_ws_time"),
            models.Index(fields=["workspace", "action"], name="idx_audit_action"),
            models.Index(fields=["user", "created_at"], name="idx_audit_user"),
        ]

    def __str__(self):
        actor = self.user.email if self.user_id else "system"
        return f"{self.action} on {self.resource_type} by {actor}"


class WorkspaceInvite(models.Model):
    ROLE_CHOICES = WorkspaceMember.ROLE_CHOICES

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace, on_delete=models.CASCADE, related_name="invites"
    )
    email = models.EmailField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    token = models.CharField(max_length=64, unique=True)
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_invites"
    )
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["token"], name="idx_invites_token"),
            models.Index(fields=["expires_at"], name="idx_invites_expires"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["workspace", "email"],
                name="uq_invite_workspace_email",
            ),
        ]

    def __str__(self):
        return f"Invite {self.email} to {self.workspace.name}"

    @property
    def is_expired(self):
        from django.utils import timezone

        return timezone.now() > self.expires_at

    @property
    def is_accepted(self):
        return self.accepted_at is not None
