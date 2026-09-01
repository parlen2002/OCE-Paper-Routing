"""Serializers — keep payloads lean; the front-end already knows the shape."""
from rest_framework import serializers

from .models import (
    Attachment, Channel, CustodyEntry, Division, Message, Notification, Paper, SystemLog, User,
)


class DivisionSerializer(serializers.ModelSerializer):
    effective_name = serializers.CharField(read_only=True)
    effective_desc = serializers.CharField(read_only=True)
    effective_head_name = serializers.CharField(read_only=True)

    class Meta:
        model = Division
        fields = [
            "id", "code", "name", "cluster", "head_name", "head_user", "description",
            "effective_name", "effective_desc", "effective_head_name",
            "name_override", "desc_override", "oic_user", "oic_name", "oic_since", "oic_note",
        ]


class UserSerializer(serializers.ModelSerializer):
    division_code = serializers.CharField(source="division.code", read_only=True, default=None)

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "role", "title", "short_title",
            "division", "division_code", "status", "email", "phone", "home_address",
            "requested_division", "requested_title", "requested_at", "password_reset_at", "is_active",
        ]
        read_only_fields = ["password_reset_at"]


class CustodySerializer(serializers.ModelSerializer):
    from_div = serializers.SlugRelatedField(slug_field="code", read_only=True)
    to_div = serializers.SlugRelatedField(slug_field="code", read_only=True)

    class Meta:
        model = CustodyEntry
        fields = ["id", "at", "by_name", "action", "stage", "from_div", "to_div", "text"]


class AttachmentSerializer(serializers.ModelSerializer):
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = ["id", "name", "kind", "file", "geotagged", "lat", "lng", "by_name", "size", "created_at"]

    def get_lat(self, obj):
        return obj.location.y if obj.location else None

    def get_lng(self, obj):
        return obj.location.x if obj.location else None


class PaperSerializer(serializers.ModelSerializer):
    division = serializers.SlugRelatedField(slug_field="code", queryset=Division.objects.all())
    intended = serializers.SlugRelatedField(slug_field="code", queryset=Division.objects.all())
    recipient_desks = serializers.SlugRelatedField(slug_field="code", many=True, queryset=Division.objects.all(), required=False)
    received_desks = serializers.SlugRelatedField(slug_field="code", many=True, read_only=True)
    assignees = serializers.PrimaryKeyRelatedField(many=True, queryset=User.objects.all(), required=False)
    custody = CustodySerializer(many=True, read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    by_name = serializers.CharField(source="by.get_full_name", read_only=True, default=None)

    class Meta:
        model = Paper
        fields = [
            "id", "ref", "title", "kind", "priority", "origin",
            "division", "intended", "stage", "by", "by_name",
            "created_at", "updated_at", "due_at", "remarks", "diverted",
            "recipient_desks", "received_desks", "assignees", "pending_head_review", "progress",
            "custody", "attachments",
        ]


class NotificationSerializer(serializers.ModelSerializer):
    scope_division = serializers.SlugRelatedField(slug_field="code", read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "kind", "text", "paper", "ref", "scope_type", "scope_division", "target_user", "created_at"]


class ChannelSerializer(serializers.ModelSerializer):
    unit = serializers.SlugRelatedField(slug_field="code", read_only=True)

    class Meta:
        model = Channel
        fields = ["id", "name", "kind", "unit"]


class MessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True, default="")
    docs = serializers.PrimaryKeyRelatedField(many=True, queryset=Paper.objects.all(), required=False)

    class Meta:
        model = Message
        fields = ["id", "channel", "author", "author_name", "text", "system", "docs", "created_at"]


class SystemLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.get_full_name", read_only=True, default="")

    class Meta:
        model = SystemLog
        fields = ["id", "user", "user_name", "type", "text", "ref", "paper", "created_at"]
