"""Real-time push. Views call ``broadcast`` after any mutation; every connected
client whose user id is in ``user_ids`` (or everyone, when ``None``) receives the
event instantly over WebSocket — this is what makes a paper 'reach the intended
recipient immediately' across the LAN."""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def _send(group, event):
    layer = get_channel_layer()
    if layer is None:
        return
    async_to_sync(layer.group_send)(group, {"type": "live.event", "payload": event})


def broadcast(event: dict, user_ids=None):
    """Push ``event`` to specific users, or to everyone when user_ids is None."""
    if user_ids is None:
        _send("oce-live", event)
        return
    for uid in set(user_ids):
        _send(f"user-{uid}", event)


def notify_users(notifications):
    """Given created Notification rows, push to each relevant user."""
    from .models import Role, User

    for n in notifications:
        if n.target_user_id:
            broadcast({"kind": "notification", "id": n.pk, "text": n.text, "ref": n.ref, "docId": n.paper_id}, [n.target_user_id])
            continue
        if n.scope_type == "supervisors":
            ids = User.objects.filter(role__in=[Role.ADMIN, Role.SUPERVISOR, Role.MODERATOR], is_active=True).values_list("pk", flat=True)
        elif n.scope_division_id:
            ids = User.objects.filter(division_id=n.scope_division_id, is_active=True).values_list("pk", flat=True)
        else:
            ids = []
        if ids:
            broadcast({"kind": "notification", "id": n.pk, "text": n.text, "ref": n.ref, "docId": n.paper_id}, list(ids))
