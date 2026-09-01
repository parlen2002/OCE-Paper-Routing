"""OCE Flow — data model. Mirrors the front-end prototype 1:1."""
from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------- roles ----
class Role(models.TextChoices):
    ADMIN = "admin", "Program Admin"
    SUPERVISOR = "supervisor", "Department Head"
    MODERATOR = "moderator", "Moderator"
    DIVISION = "division", "Division Head"
    EMPLOYEE = "employee", "Employee"
    JOBORDER = "joborder", "Job Order"


class UserStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    PENDING = "pending", "Pending"
    DISABLED = "disabled", "Disabled"


class User(AbstractUser):
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.EMPLOYEE)
    title = models.CharField(max_length=120, blank=True, default="")
    short_title = models.CharField(max_length=60, blank=True, default="")
    division = models.ForeignKey("Division", null=True, blank=True, on_delete=models.SET_NULL, related_name="members")
    status = models.CharField(max_length=16, choices=UserStatus.choices, default=UserStatus.ACTIVE)

    # sign-up / verification metadata
    requested_division = models.ForeignKey("Division", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    requested_title = models.CharField(max_length=120, blank=True, default="")
    requested_at = models.DateTimeField(null=True, blank=True)

    # contact details (from the request-account form)
    phone = models.CharField(max_length=40, blank=True, default="")
    home_address = models.TextField(blank=True, default="")

    # admin-approved reset flow (default password OCE@2026)
    password_reset_at = models.DateTimeField(null=True, blank=True)

    def is_overseer(self):
        """admin / executives / moderator — full visibility."""
        return self.role in (Role.ADMIN, Role.SUPERVISOR, Role.MODERATOR)


class Cluster(models.TextChoices):
    OPS = "ops", "Field Operations"
    TECH = "tech", "Technical Services"


class Division(models.Model):
    """A division, a cross-division team, or an executive desk — all routable."""
    code = models.CharField(max_length=16, unique=True)
    name = models.CharField(max_length=120)
    cluster = models.CharField(max_length=8, choices=Cluster.choices, default=Cluster.TECH)
    head_name = models.CharField(max_length=120, blank=True, default="")
    head_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    description = models.TextField(blank=True, default="")

    # admin overrides (title / description re-branding)
    name_override = models.CharField(max_length=120, blank=True, default="")
    desc_override = models.TextField(blank=True, default="")

    # temporary head (OIC) — the permanent head is retained for reinstatement
    oic_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    oic_name = models.CharField(max_length=120, blank=True, default="")
    oic_since = models.DateTimeField(null=True, blank=True)
    oic_note = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} · {self.effective_name}"

    @property
    def effective_name(self):
        return self.name_override or self.name

    @property
    def effective_desc(self):
        return self.desc_override or self.description

    @property
    def effective_head_name(self):
        if self.oic_name:
            return f"{self.oic_name} (OIC)"
        return self.head_name


class Stage(models.TextChoices):
    RECEIVED = "received", "Received"
    REVIEW = "review", "Under review"
    PROGRESS = "progress", "In progress"
    VERIFICATION = "verification", "Verification"
    COMPLETED = "completed", "Completed"


class Priority(models.TextChoices):
    URGENT = "urgent", "Urgent"
    PRIORITY = "priority", "Priority"
    ROUTINE = "routine", "Routine"


class Kind(models.TextChoices):
    WORK_ORDER = "work-order", "Work Order"
    PERMIT = "permit", "Permit"
    MEMO = "memo", "Memorandum"
    COMPLAINT = "complaint", "Complaint"
    INSPECTION = "inspection", "Inspection"


class Paper(models.Model):
    ref = models.CharField(max_length=24, unique=True)
    title = models.CharField(max_length=255)
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.WORK_ORDER)
    priority = models.CharField(max_length=16, choices=Priority.choices, default=Priority.ROUTINE)
    origin = models.CharField(max_length=255, blank=True, default="")

    division = models.ForeignKey(Division, on_delete=models.PROTECT, related_name="papers")       # current holder
    intended = models.ForeignKey(Division, on_delete=models.PROTECT, related_name="+")            # intended desk
    stage = models.CharField(max_length=16, choices=Stage.choices, default=Stage.RECEIVED)

    by = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    due_at = models.DateTimeField(null=True, blank=True)
    remarks = models.TextField(blank=True, default="")
    diverted = models.BooleanField(default=False)

    # circulation — one document, many desks
    recipient_desks = models.ManyToManyField(Division, blank=True, related_name="circulated")
    received_desks = models.ManyToManyField(Division, blank=True, related_name="acknowledged")

    # persons-in-charge
    assignees = models.ManyToManyField(User, blank=True, related_name="assigned_papers")
    pending_head_review = models.BooleanField(default=False)

    # completion rate 0–100
    progress = models.IntegerField(default=0)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.ref} · {self.title}"

    def next_ref(self):
        year = timezone.now().year
        last = Paper.objects.filter(ref__startswith=f"OCE-{year}-").count() + 1
        return f"OCE-{year}-{last:04d}"


class CustodyAction(models.TextChoices):
    CREATED = "created", "Created"
    RECEIVED = "received", "Received"
    STAGE = "stage", "Stage"
    ROUTED = "routed", "Routed"
    NOTE = "note", "Note"
    ATTACHMENT = "attachment", "Attachment"


class CustodyEntry(models.Model):
    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name="custody")
    at = models.DateTimeField(default=timezone.now)
    by_name = models.CharField(max_length=120)
    action = models.CharField(max_length=16, choices=CustodyAction.choices)
    stage = models.CharField(max_length=16, blank=True, default="")
    from_div = models.ForeignKey(Division, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    to_div = models.ForeignKey(Division, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    text = models.TextField()

    class Meta:
        ordering = ["at"]


class Attachment(models.Model):
    class Kind(models.TextChoices):
        IMAGE = "image", "Image"
        PDF = "pdf", "PDF"

    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name="attachments")
    name = models.CharField(max_length=255)
    kind = models.CharField(max_length=8, choices=Kind.choices)
    file = models.FileField(upload_to="attachments/%Y/%m/")
    geotagged = models.BooleanField(default=False)
    # PostGIS point — lng, lat
    location = gis_models.PointField(null=True, blank=True, geography=True)
    by_name = models.CharField(max_length=120, blank=True, default="")
    size = models.CharField(max_length=20, blank=True, default="")
    created_at = models.DateTimeField(default=timezone.now)


class Notification(models.Model):
    class Kind(models.TextChoices):
        NEW = "new", "New"
        MOVE = "move", "Move"
        ROUTE = "route", "Route"
        COMPLETE = "complete", "Complete"
        ACCOUNT = "account", "Account"

    kind = models.CharField(max_length=12, choices=Kind.choices, default=Kind.NEW)
    text = models.TextField()
    paper = models.ForeignKey(Paper, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    ref = models.CharField(max_length=24, blank=True, default="")
    scope_type = models.CharField(max_length=16, default="supervisors")        # division | supervisors
    scope_division = models.ForeignKey(Division, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    target_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)
    read_by = models.ManyToManyField(User, blank=True, related_name="read_notifications")

    class Meta:
        ordering = ["-created_at"]


class Channel(models.Model):
    class Kind(models.TextChoices):
        FLOOR = "floor", "Office Floor"
        EXECUTIVE = "executive", "Executive Council"
        UNIT = "unit", "Unit"

    name = models.CharField(max_length=120)
    kind = models.CharField(max_length=12, choices=Kind.choices)
    unit = models.ForeignKey(Division, null=True, blank=True, on_delete=models.CASCADE, related_name="channels")
    members = models.ManyToManyField(User, blank=True, related_name="channels")


class Message(models.Model):
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="messages")
    author = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="+")
    text = models.TextField()
    system = models.BooleanField(default=False)
    docs = models.ManyToManyField(Paper, blank=True, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["created_at"]


class SystemLog(models.Model):
    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name="+")
    type = models.CharField(max_length=24)
    text = models.TextField()
    ref = models.CharField(max_length=24, blank=True, default="")
    paper = models.ForeignKey(Paper, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]


class Customization(models.Model):
    """Singleton row holding the admin's branding / theming JSON."""
    data = models.JSONField(default=dict, blank=True)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj.data

    @classmethod
    def save_data(cls, data):
        obj, _ = cls.objects.get_or_create(pk=1)
        obj.data = data
        obj.save()
        return obj.data


class BarangayCache(models.Model):
    """Reverse-geocoded barangay names, keyed by rounded coordinates."""
    key = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=120)
