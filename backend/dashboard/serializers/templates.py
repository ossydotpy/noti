from django.template import Template as DjangoTemplate, TemplateSyntaxError
from rest_framework import serializers

from notifications.models import Template


class TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = [
            "id",
            "name",
            "description",
            "channel",
            "content",
            "variables",
            "is_active",
            "version",
            "created_at",
            "updated_at",
            "archived_at",
        ]
        read_only_fields = ["id", "version", "created_at", "updated_at", "archived_at"]

    def validate_content(self, value):
        channel = self.initial_data.get("channel")
        if not channel and self.instance:
            channel = self.instance.channel

        if channel in ("sms", "push", "*") and "body" not in value:
            raise serializers.ValidationError(
                f"{'Template' if channel == '*' else channel.upper() + ' template'} must contain 'body'."
            )

        for field in ["title", "body"]:
            if field in value and isinstance(value[field], str):
                try:
                    DjangoTemplate(value[field])
                except TemplateSyntaxError as e:
                    raise serializers.ValidationError(
                        f"Invalid template syntax in {field}: {e}"
                    )

        if "data_payload" in value and isinstance(value["data_payload"], dict):
            for k, v in value["data_payload"].items():
                if isinstance(v, str):
                    try:
                        DjangoTemplate(v)
                    except TemplateSyntaxError as e:
                        raise serializers.ValidationError(
                            f"Invalid template syntax in data_payload['{k}']: {e}"
                        )

        return value
