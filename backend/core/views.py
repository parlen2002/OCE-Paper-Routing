"""OCE Flow — REST API. Every mutation writes custody, logs a system event,
creates notifications, then pushes over WebSocket so recipients see it instantly."""
from django.contrib.auth import authenticate
from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from . import permissions as perms
from .models import (
    Attachment, Channel, Customization, CustodyAction, CustodyEntry, Division, Message,
    Notification, Paper, Role, Stage, SystemLog, User, UserStatus,
)
from .realtime import broadcast, notify_users
from .serializers import (
    AttachmentSerializer, ChannelSerializer, DivisionSerializer, MessageSerializer,
    NotificationSerializer, PaperSerializer, SystemLogSerializer, UserSerializer,
)

DEFAULT_RESET_PASSWORD = "OCE@2026"


# ---------------------------------------------------------------- helpers ----
def add_custody(paper, by_name, action_, text, stage="", from_div=None, to_div=None):
    return CustodyEntry.objects.create(
        paper=paper, by_name=by_name, action=action_, text=text,
        stage=stage, from_div=from_div, to_div=to_div,
    )


def add_log(user, type_, text, ref="", paper=None):
    return SystemLog.objects.create(user=user if user.is_authenticated else None, type=type_, text=text, ref=ref, paper=paper)


def desk_users(division_id):
    return list(User.objects.filter(division_id=division_id, is_active=True, status=UserStatus.ACTIVE).values_list("pk", flat=True))


def overseer_ids():
    return list(User.objects.filter(role__in=[Role.ADMIN, Role.SUPERVISOR, Role.MODERATOR], is_active=True).values_list("pk", flat=True))


def push_paper_event(paper, kind, user_ids=None):
    broadcast(
        {"kind": kind, "ref": paper.ref, "docId": paper.pk, "stage": paper.stage, "division": paper.division.code},
        user_ids,
    )


# ------------------------------------------------------------------- auth ----
@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    u = authenticate(username=request.data.get("username"), password=request.data.get("password"))
    if not u:
        return Response({"detail": "Invalid username or password."}, status=400)
    if u.status == UserStatus.PENDING:
        return Response({"detail": "Account pending administrator verification."}, status=403)
    if u.status == UserStatus.DISABLED or not u.is_active:
        return Response({"detail": "Account disabled."}, status=403)
    token, _ = Token.objects.get_or_create(user=u)
    add_log(u, "login", "Signed in to OCE Flow — session start")
    return Response({"token": token.key, "user": UserSerializer(u).data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    add_log(request.user, "logout", "Signed out — session closed")
    Token.objects.filter(user=request.user).delete()
    return Response(status=204)


@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    d = request.data
    username = (d.get("username") or "").strip().lower()
    if User.objects.filter(username__iexact=username).exists():
        return Response({"detail": "Username already taken."}, status=400)
    division = Division.objects.filter(code=d.get("division")).first()
    u = User.objects.create_user(
        username=username,
        password=d.get("password"),
        first_name=(d.get("name") or "").split(" ")[0],
        last_name=" ".join((d.get("name") or "").split(" ")[1:]),
        email=d.get("email", ""),
        role=Role.DIVISION,
        title=d.get("title", "Division Staff"),
        division=division,
        status=UserStatus.PENDING,
        requested_division=division,
        requested_title=d.get("title", ""),
        requested_at=timezone.now(),
        phone=d.get("phone", ""),
        home_address=d.get("address", ""),
    )
    n = Notification.objects.create(
        kind=Notification.Kind.ACCOUNT,
        text=f"Account request — {u.get_full_name() or username} is awaiting administrator verification",
        scope_type="supervisors",
    )
    notify_users([n])
    broadcast({"kind": "signup", "username": username}, overseer_ids())
    return Response({"detail": "Request submitted for verification."}, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    u = User.objects.filter(username__iexact=request.data.get("username", "")).first()
    if not u:
        return Response({"detail": "No account matches that username."}, status=404)
    if u.password_reset_at:
        return Response({"detail": "A reset request is already pending."}, status=400)
    u.password_reset_at = timezone.now()
    u.save()
    n = Notification.objects.create(
        kind=Notification.Kind.ACCOUNT,
        text=f"Forgot-password request — {u.get_full_name() or u.username} asks to reset to {DEFAULT_RESET_PASSWORD}",
        scope_type="supervisors",
    )
    notify_users([n])
    return Response({"detail": "Reset request sent to the program admin."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(UserSerializer(request.user).data)


# ------------------------------------------------------------------ papers ----
class PaperViewSet(viewsets.ModelViewSet):
    serializer_class = PaperSerializer

    def get_queryset(self):
        qs = Paper.objects.select_related("division", "intended", "by").prefetch_related(
            "custody", "attachments", "recipient_desks", "received_desks", "assignees"
        )
        user = self.request.user
        if user.is_overseer():
            return qs
        visible = [p.pk for p in qs if perms.can_view_paper(user, p)]
        return qs.filter(pk__in=visible)

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role not in (Role.ADMIN, Role.MODERATOR):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the program admin or moderator can delete paperwork.")
        ref = instance.ref
        instance.delete()
        add_log(user, "delete", f"Deleted board entry {ref}", ref=ref)
        broadcast({"kind": "deleted", "ref": ref})

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = request.user
        with transaction.atomic():
            paper = Paper.objects.create(
                ref=Paper().next_ref(),
                title=ser.validated_data["title"],
                kind=ser.validated_data.get("kind", "work-order"),
                priority=ser.validated_data.get("priority", "routine"),
                origin=ser.validated_data.get("origin", ""),
                division=ser.validated_data["division"],
                intended=ser.validated_data["intended"],
                by=user,
                due_at=ser.validated_data.get("due_at"),
                remarks=ser.validated_data.get("remarks", ""),
            )
            recipients = ser.validated_data.get("recipient_desks") or [paper.division]
            paper.recipient_desks.set(recipients)
            paper.received_desks.set([paper.division])
            assignees = ser.validated_data.get("assignees") or []
            if assignees:
                paper.assignees.set(assignees)
            add_custody(paper, user.get_full_name() or user.username, CustodyAction.CREATED,
                        "Logged into the system and transmitted", to_div=paper.division)
            add_log(user, "create", f"Logged {paper.ref} — {paper.title}", ref=paper.ref, paper=paper)

            notifications = [
                Notification.objects.create(kind=Notification.Kind.NEW, text=f"New paperwork {paper.ref} — {paper.title}",
                                            paper=paper, ref=paper.ref, scope_type="division", scope_division=paper.division)
            ]
            if not user.is_overseer():
                notifications.append(Notification.objects.create(kind=Notification.Kind.NEW,
                                                                 text=f"{paper.ref} posted by {user.get_full_name() or user.username}",
                                                                 paper=paper, ref=paper.ref, scope_type="supervisors"))
            for emp in assignees:
                notifications.append(Notification.objects.create(kind=Notification.Kind.NEW,
                                                                 text=f"{paper.ref} assigned to you — {paper.title}",
                                                                 paper=paper, ref=paper.ref, scope_type="division",
                                                                 scope_division=paper.division, target_user=emp))
        notify_users(notifications)
        push_paper_event(paper, "paper.created", desk_users(paper.division_id) + [u.pk for u in assignees] + overseer_ids())
        return Response(PaperSerializer(paper).data, status=201)

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        if not perms.can_edit_paper(user, paper):
            return Response({"detail": "Not permitted."}, status=403)
        stage = request.data.get("stage")
        if stage == Stage.COMPLETED and not perms.can_complete(user, paper):
            return Response({"detail": "Completion is verified by your division head."}, status=403)
        employee_id = request.data.get("employeeId")
        note = request.data.get("note", "")
        with transaction.atomic():
            paper.stage = stage
            if stage == Stage.COMPLETED:
                paper.progress = 100
            if employee_id:
                emp = User.objects.filter(pk=employee_id).first()
                if emp:
                    paper.assignees.set([emp])
            paper.save()
            label = dict(Stage.choices).get(stage, stage)
            add_custody(paper, user.get_full_name() or user.username, CustodyAction.STAGE,
                        f"Moved to {label}" + (f" — {note}" if note else ""), stage=stage)
            add_log(user, "stage", f"Moved {paper.ref} to {label}", ref=paper.ref, paper=paper)
            n = Notification.objects.create(kind=Notification.Kind.MOVE, text=f"{paper.ref} moved to {label}",
                                            paper=paper, ref=paper.ref, scope_type="supervisors")
            notify_users([n])
        push_paper_event(paper, "paper.moved", desk_users(paper.division_id) + overseer_ids())
        return Response(PaperSerializer(paper).data)

    @action(detail=True, methods=["post"])
    def route(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        if not perms.can_route_paper(user, paper):
            return Response({"detail": "Not permitted."}, status=403)
        codes = request.data.get("targets", [])
        targets = list(Division.objects.filter(code__in=codes))
        if not targets:
            return Response({"detail": "No valid target desks."}, status=400)
        primary = targets[0]
        with transaction.atomic():
            for t in targets:
                add_custody(paper, user.get_full_name() or user.username, CustodyAction.ROUTED,
                            f"Forwarded to {t.code}", from_div=paper.division, to_div=t)
            paper.division = primary
            paper.diverted = primary.pk != paper.intended_id
            paper.recipient_desks.set(targets)
            paper.received_desks.set([primary])
            paper.stage = Stage.RECEIVED
            paper.save()
            add_log(user, "route", f"Routed {paper.ref} -> {', '.join(t.code for t in targets)}", ref=paper.ref, paper=paper)
            notifications = [
                Notification.objects.create(kind=Notification.Kind.ROUTE, text=f"{paper.ref} forwarded to {t.code}",
                                            paper=paper, ref=paper.ref, scope_type="division", scope_division=t)
                for t in targets
            ]
            notify_users(notifications)
        recipient_users = [uid for t in targets for uid in desk_users(t.pk)]
        push_paper_event(paper, "paper.routed", recipient_users + overseer_ids())
        return Response(PaperSerializer(paper).data)

    @action(detail=True, methods=["post"])
    def ack(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        div = user.division
        if not div or not paper.recipient_desks.filter(pk=div.pk).exists():
            return Response({"detail": "Your desk is not an addressee."}, status=400)
        if paper.received_desks.filter(pk=div.pk).exists():
            return Response(PaperSerializer(paper).data)
        with transaction.atomic():
            paper.received_desks.add(div)
            add_custody(paper, user.get_full_name() or user.username, CustodyAction.RECEIVED,
                        f"Receipt acknowledged for {div.code}", to_div=div)
            add_log(user, "note", f"Acknowledged receipt of {paper.ref}", ref=paper.ref, paper=paper)
        push_paper_event(paper, "paper.acked", overseer_ids())
        return Response(PaperSerializer(paper).data)

    @action(detail=True, methods=["post"])
    def progress(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        if not perms.can_edit_paper(user, paper):
            return Response({"detail": "Not permitted."}, status=403)
        value = max(0, min(100, int(request.data.get("value", 0))))
        if user.role in (Role.EMPLOYEE, Role.JOBORDER) and value >= 100:
            return Response({"detail": "Employees can't mark 100% — submit for head verification."}, status=400)
        paper.progress = value
        paper.save()
        add_log(user, "note", f"Set {paper.ref} progress to {value}%", ref=paper.ref, paper=paper)
        push_paper_event(paper, "paper.progress", desk_users(paper.division_id) + overseer_ids())
        return Response(PaperSerializer(paper).data)

    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        if not perms.can_edit_paper(user, paper):
            return Response({"detail": "Not permitted."}, status=403)
        ids = request.data.get("ids", [])
        emps = list(User.objects.filter(pk__in=ids))
        with transaction.atomic():
            paper.assignees.set(emps)
            names = ", ".join(e.get_full_name() or e.username for e in emps) or "unassigned"
            add_custody(paper, user.get_full_name() or user.username, CustodyAction.NOTE, f"Persons-in-charge designated — {names}")
            add_log(user, "note", f"Assigned {paper.ref} to {names}", ref=paper.ref, paper=paper)
            notifications = [Notification.objects.create(kind=Notification.Kind.NEW, text=f"{paper.ref} assigned to you",
                                                         paper=paper, ref=paper.ref, scope_type="division",
                                                         scope_division=paper.division, target_user=e) for e in emps]
            notify_users(notifications)
        push_paper_event(paper, "paper.assigned", [e.pk for e in emps] + desk_users(paper.division_id) + overseer_ids())
        return Response(PaperSerializer(paper).data)

    @action(detail=True, methods=["post"])
    def submit_head(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        if not paper.assignees.filter(pk=user.pk).exists():
            return Response({"detail": "Only an assigned person-in-charge can submit."}, status=403)
        paper.pending_head_review = True
        paper.stage = Stage.VERIFICATION
        paper.save()
        add_custody(paper, user.get_full_name() or user.username, CustodyAction.NOTE, "Submitted to division head for verification")
        add_log(user, "note", f"Submitted {paper.ref} for head verification", ref=paper.ref, paper=paper)
        n = Notification.objects.create(kind=Notification.Kind.MOVE, text=f"{paper.ref} submitted for verification",
                                        paper=paper, ref=paper.ref, scope_type="division", scope_division=paper.division)
        notify_users([n])
        push_paper_event(paper, "paper.submitted", desk_users(paper.division_id) + overseer_ids())
        return Response(PaperSerializer(paper).data)

    @action(detail=True, methods=["post"])
    def return_head(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        if not perms.can_edit_paper(user, paper):
            return Response({"detail": "Not permitted."}, status=403)
        paper.pending_head_review = False
        paper.stage = Stage.PROGRESS
        paper.save()
        add_custody(paper, user.get_full_name() or user.username, CustodyAction.NOTE, "Returned by division head for rework")
        add_log(user, "note", f"Returned {paper.ref} for rework", ref=paper.ref, paper=paper)
        push_paper_event(paper, "paper.returned", [u.pk for u in paper.assignees.all()] + overseer_ids())
        return Response(PaperSerializer(paper).data)

    @action(detail=True, methods=["post"])
    def notes(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Empty remark."}, status=400)
        add_custody(paper, user.get_full_name() or user.username, CustodyAction.NOTE, text)
        add_log(user, "note", f"Remark on {paper.ref} — {text}", ref=paper.ref, paper=paper)
        push_paper_event(paper, "paper.note", desk_users(paper.division_id) + overseer_ids())
        return Response(PaperSerializer(paper).data)

    @action(detail=True, methods=["post"], url_path="attachments")
    def add_attachment(self, request, pk=None):
        paper = self.get_object()
        user = request.user
        f = request.FILES.get("file")
        if not f:
            return Response({"detail": "No file."}, status=400)
        kind = Attachment.Kind.PDF if f.content_type == "application/pdf" or f.name.lower().endswith(".pdf") else Attachment.Kind.IMAGE
        lat, lng = request.data.get("lat"), request.data.get("lng")
        location = Point(float(lng), float(lat)) if lat and lng else None
        att = Attachment.objects.create(
            paper=paper, name=f.name, kind=kind, file=f,
            geotagged=location is not None, location=location,
            by_name=user.get_full_name() or user.username,
            size=f"{f.size // 1024} KB",
        )
        add_custody(paper, user.get_full_name() or user.username, CustodyAction.ATTACHMENT, f"Attached {f.name}")
        add_log(user, "attachment", f"Attached {f.name} to {paper.ref}", ref=paper.ref, paper=paper)
        push_paper_event(paper, "paper.attachment", desk_users(paper.division_id) + overseer_ids())
        return Response(AttachmentSerializer(att).data, status=201)

    @action(detail=True, methods=["delete"], url_path=r"attachments/(?P<att_id>[^/.]+)")
    def remove_attachment(self, request, pk=None, att_id=None):
        paper = self.get_object()
        user = request.user
        att = Attachment.objects.filter(pk=att_id, paper=paper).first()
        if not att:
            return Response({"detail": "Attachment not found."}, status=404)
        name = att.name
        att.delete()
        add_custody(paper, user.get_full_name() or user.username, CustodyAction.ATTACHMENT, f"Removed attachment {name}")
        add_log(user, "attachment", f"Removed {name} from {paper.ref}", ref=paper.ref, paper=paper)
        push_paper_event(paper, "paper.attachment", desk_users(paper.division_id) + overseer_ids())
        return Response(status=204)


# --------------------------------------------------------------- divisions ----
class DivisionViewSet(viewsets.ModelViewSet):
    queryset = Division.objects.all()
    serializer_class = DivisionSerializer
    http_method_names = ["get", "patch", "head", "options"]

    @action(detail=True, methods=["patch"])
    def meta(self, request, pk=None):
        div = self.get_object()
        if not perms.can_manage_division(request.user, div):
            return Response({"detail": "Only admin, executives, or the permanent head can edit this."}, status=403)
        if "name" in request.data:
            div.name_override = request.data["name"]
        if "desc" in request.data:
            div.desc_override = request.data["desc"]
        div.save()
        add_log(request.user, "edit", f"Edited {div.code} details")
        broadcast({"kind": "division.updated", "code": div.code})
        return Response(DivisionSerializer(div).data)

    @action(detail=True, methods=["post"])
    def set_oic(self, request, pk=None):
        div = self.get_object()
        if not perms.can_manage_division(request.user, div):
            return Response({"detail": "Not permitted."}, status=403)
        target = User.objects.filter(pk=request.data.get("userId")).first()
        if not target:
            return Response({"detail": "User not found."}, status=404)
        temporary = request.data.get("temporary", True)
        if temporary:
            div.oic_user = target
            div.oic_name = target.get_full_name() or target.username
            div.oic_since = timezone.now()
            div.oic_note = request.data.get("note", "")
        else:
            div.head_user = target
            div.head_name = target.get_full_name() or target.username
            div.oic_user = None
            div.oic_name = ""
        div.save()
        add_log(request.user, "edit", f"{'OIC' if temporary else 'Permanent head'} of {div.code} set to {div.oic_name or div.head_name}")
        n = Notification.objects.create(kind=Notification.Kind.ACCOUNT,
                                        text=f"{div.oic_name or div.head_name} now heads {div.code}",
                                        scope_type="supervisors")
        notify_users([n])
        broadcast({"kind": "division.updated", "code": div.code})
        return Response(DivisionSerializer(div).data)

    @action(detail=True, methods=["post"])
    def remove_oic(self, request, pk=None):
        div = self.get_object()
        if not perms.can_manage_division(request.user, div):
            return Response({"detail": "Not permitted."}, status=403)
        div.oic_user = None
        div.oic_name = ""
        div.save()
        add_log(request.user, "edit", f"Removed OIC from {div.code} — {div.head_name} resumes")
        broadcast({"kind": "division.updated", "code": div.code})
        return Response(DivisionSerializer(div).data)


# ------------------------------------------------------------------- users ----
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return User.objects.select_related("division").order_by("username")

    def list(self, request, *args, **kwargs):
        if not perms.can_manage_users(request.user):
            return Response({"detail": "Admin only."}, status=403)
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        if not perms.can_manage_users(request.user):
            return Response({"detail": "Admin only."}, status=403)
        u = self.get_object()
        u.status = UserStatus.ACTIVE
        u.is_active = True
        u.save()
        add_log(request.user, "approve", f"Approved account {u.username}")
        broadcast({"kind": "user.approved", "username": u.username}, [u.pk])
        return Response(UserSerializer(u).data)

    @action(detail=True, methods=["post"])
    def deny(self, request, pk=None):
        if not perms.can_manage_users(request.user):
            return Response({"detail": "Admin only."}, status=403)
        u = self.get_object()
        u.status = UserStatus.DISABLED
        u.is_active = False
        u.save()
        add_log(request.user, "deny", f"Denied account {u.username}")
        return Response(UserSerializer(u).data)

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        if not perms.can_manage_users(request.user):
            return Response({"detail": "Admin only."}, status=403)
        u = self.get_object()
        u.set_password(DEFAULT_RESET_PASSWORD)
        u.password_reset_at = None
        u.save()
        add_log(request.user, "reset", f"Reset {u.username} password to {DEFAULT_RESET_PASSWORD}")
        n = Notification.objects.create(kind=Notification.Kind.ACCOUNT,
                                        text=f"Your password was reset to {DEFAULT_RESET_PASSWORD}. Change it after signing in.",
                                        scope_type="division", scope_division=u.division, target_user=u)
        notify_users([n])
        broadcast({"kind": "user.password-reset"}, [u.pk])
        return Response(UserSerializer(u).data)


# ----------------------------------------------------------- notifications ----
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Notification.objects.all()
        if user.is_overseer():
            return qs
        return qs.filter(scope_division=user.division) | qs.filter(target_user=user)

    @action(detail=False, methods=["post"])
    def mark_all(self, request):
        self.get_queryset().update(read_by=request.user) if False else None
        for n in self.get_queryset():
            n.read_by.add(request.user)
        return Response(status=204)

    @action(detail=True, methods=["post"])
    def mark(self, request, pk=None):
        self.get_object().read_by.add(request.user)
        return Response(status=204)


# ---------------------------------------------------------------- channels ----
class ChannelViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChannelSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Channel.objects.select_related("unit")
        if user.is_overseer():
            return qs
        return qs.filter(kind=Channel.Kind.FLOOR) | qs.filter(unit=user.division) | qs.filter(members=user)

    @action(detail=True, methods=["get"])
    def messages(self, request, pk=None):
        ch = self.get_object()
        return Response(MessageSerializer(ch.messages.select_related("author"), many=True).data)

    @action(detail=True, methods=["post"])
    def send(self, request, pk=None):
        ch = self.get_object()
        user = request.user
        text = (request.data.get("text") or "").strip()
        if not text:
            return Response({"detail": "Empty message."}, status=400)
        msg = Message.objects.create(channel=ch, author=user, text=text)
        doc_ids = request.data.get("docs", [])
        if doc_ids:
            msg.docs.set(Paper.objects.filter(pk__in=doc_ids))
        payload = MessageSerializer(msg).data
        broadcast({"kind": "message", "channel": ch.pk, **payload})
        return Response(payload, status=201)

    @action(detail=True, methods=["post"])
    def manage_member(self, request, pk=None):
        ch = self.get_object()
        user = request.user
        if ch.kind != Channel.Kind.EXECUTIVE or not user.is_overseer():
            return Response({"detail": "Only admin/moderator manage the council."}, status=403)
        target = User.objects.filter(pk=request.data.get("userId")).first()
        if not target:
            return Response({"detail": "User not found."}, status=404)
        if request.data.get("add"):
            ch.members.add(target)
            Message.objects.create(channel=ch, author=user, system=True, text=f"{target.get_full_name() or target.username} joined the council.")
        else:
            ch.members.remove(target)
            Message.objects.create(channel=ch, author=user, system=True, text=f"{target.get_full_name() or target.username} left the council.")
        broadcast({"kind": "channel.updated", "channel": ch.pk})
        return Response(ChannelSerializer(ch).data)


# -------------------------------------------------------------------- misc ----
class SystemLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SystemLogSerializer

    def get_queryset(self):
        if not perms.can_manage_users(self.request.user):
            return SystemLog.objects.none()
        return SystemLog.objects.select_related("user")


class CustomView(APIView):
    def get(self, request):
        return Response(Customization.load())

    def put(self, request):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Admin only."}, status=403)
        data = Customization.save_data(request.data)
        broadcast({"kind": "custom.updated"})
        return Response(data)
