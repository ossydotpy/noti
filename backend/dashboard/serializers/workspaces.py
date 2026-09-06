from django.db import transaction
from rest_framework import serializers

from core.models import Workspace, WorkspaceMember
from core.utils.slugs import generate_unique_slug


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "created_at"]
        read_only_fields = ["id", "created_at"]


class WorkspaceListSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ["id", "name", "slug", "role", "created_at"]

    def get_role(self, obj) -> str | None:
        user_id = self.context.get("user_id")
        if not user_id:
            return None
        if hasattr(obj, "user_role"):
            return obj.user_role
        member = obj.members.filter(user_id=user_id, archived_at__isnull=True).first()
        return member.role if member else None


class WorkspaceCreateSerializer(serializers.Serializer):
    """Validates workspace creation; slug is auto-generated when omitted."""

    name = serializers.CharField(max_length=100, min_length=5)
    slug = serializers.SlugField(max_length=50, required=False, allow_blank=False)

    def validate_slug(self, value):
        if Workspace.objects.filter(slug=value).exists():
            raise serializers.ValidationError(
                "A workspace with this slug already exists."
            )
        return value

    def create(self, validated_data):
        user = self.context["user"]
        slug = validated_data.get("slug") or generate_unique_slug(Workspace)
        with transaction.atomic():
            workspace = Workspace.objects.create(
                name=validated_data["name"],
                slug=slug,
                owner=user,
            )
            WorkspaceMember.objects.create(
                workspace=workspace,
                user=user,
                role="owner",
            )
        return workspace
