"""Django admin registration — handy for server-side inspection."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Attachment, BarangayCache, Channel, Customization, CustodyEntry, Division, Message,
    Notification, Paper, SystemLog, User,
)

admin.site.register(User, UserAdmin)
admin.site.register(Division)
admin.site.register(Paper)
admin.site.register(CustodyEntry)
admin.site.register(Attachment)
admin.site.register(Notification)
admin.site.register(Channel)
admin.site.register(Message)
admin.site.register(SystemLog)
admin.site.register(Customization)
admin.site.register(BarangayCache)
