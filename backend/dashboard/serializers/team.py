from rest_framework import serializers

from core.models import WorkspaceInvite, WorkspaceMember


class WorkspaceMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = WorkspaceMember
        fields = [
            "id",
            "user_id",
            "email",
            "role",
            "invited_by",
            "invited_at",
            "accepted_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user_id",
            "email",
            "invited_by",
            "invited_at",
            "accepted_at",
            "created_at",
        ]


class WorkspaceInviteSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkspaceInvite
        fields = [
            "id",
            "email",
            "role",
            "invited_by",
            "expires_at",
            "created_at",
            "accepted_at",
        ]
        read_only_fields = ["id", "invited_by", "expires_at", "created_at", "accepted_at"]


class InviteCreateSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=["admin", "member"])

    class Meta:
        model = WorkspaceInvite
        fields = ["email", "role"]


class InviteAcceptSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=64)
