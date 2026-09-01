"""WebSocket consumer — each client joins its personal group + the global group."""
import json

from channels.generic.websocket import WebsocketConsumer


class LiveConsumer(WebsocketConsumer):
    def connect(self):
        user = self.scope.get("user")
        self.groups = ["oce-live"]
        if user and user.is_authenticated:
            self.groups.append(f"user-{user.pk}")
        for g in self.groups:
            self.channel_layer.group_add(g, self.channel_name)
        self.accept()
        self.send(text_data=json.dumps({"kind": "hello", "message": "OCE Flow live channel connected"}))

    def disconnect(self, code):
        for g in self.groups:
            self.channel_layer.group_discard(g, self.channel_name)

    def receive(self, text_data=None, bytes_data=None):
        # Client -> server traffic isn't required; mutations go through the REST API.
        pass

    def live_event(self, event):
        self.send(text_data=json.dumps(event.get("payload", {})))
