"""Seed the office structure and key accounts.

    python manage.py seed_oce
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models import Channel, Division, Role, User, UserStatus

DIVISIONS = [
    ("CONSTR", "Construction Division", "ops", "Engr. Ramil Domingo", "rdomingo"),
    ("MAINT", "Maintenance Division", "ops", "Engr. Nardo Salvador", "nsalvador"),
    ("PSD", "Public Services Division", "ops", "Engr. Liza Bartolome", "lbartolome"),
    ("SURVEY", "Survey and Mapping Division", "tech", "Engr. Dante Villamor", "dvillamor"),
    ("ELEC", "Electrical Division", "ops", "Engr. Petra Yumul", "pyumul"),
    ("MTQC", "Materials Testing and Quality Control Division", "tech", "Engr. Sonny Cabral", "scabral"),
    ("MOTOR", "Motorpool Division", "ops", "Mr. Eddie Gatchalian", "egatchalian"),
    ("PDPD", "Planning Design and Programming Division", "tech", "Engr. Grace Panganiban", "gpanganiban"),
    ("ADMIN", "Administrative Division", "tech", "Ms. Carol Estrella", "cestrella"),
]

CROSS_UNITS = [
    ("INSP-TEAM", "Inspectorate Team", "tech", "Engr. Julio B. Sergio"),
    ("IT", "I.T. Section", "tech", "Alphard S. Grande"),
    ("DOC-MON", "Documentation and Monitoring Team", "tech", "Ms. Rica Domingo"),
    ("SUBAY", "Subaybayan Team", "ops", "Mr. Aldrin Fajardo"),
]

DESKS = [
    ("CE-DESK", "Office of the City Engineer", "ops", "Engr. Aries S. Grande", "agrande"),
    ("ACE-DESK", "Office of the Assistant City Engineer", "tech", "Engr. Julio B. Sergio", "jsergio"),
]


def make_user(username, password, role, name, title, division=None, short=""):
    first, *rest = name.split(" ")
    u, created = User.objects.get_or_create(
        username=username,
        defaults=dict(
            first_name=first, last_name=" ".join(rest), role=role, title=title,
            short_title=short, division=division, status=UserStatus.ACTIVE, is_active=True,
        ),
    )
    if created:
        u.set_password(password)
        u.save()
    return u


class Command(BaseCommand):
    help = "Seed divisions, teams, desks and key accounts."

    @transaction.atomic
    def handle(self, *args, **options):
        # divisions
        for code, name, cluster, head, uname in DIVISIONS:
            d, _ = Division.objects.get_or_create(code=code, defaults=dict(name=name, cluster=cluster, head_name=head, description=f"{name} of the Office of the City Engineer."))
            make_user(uname, "cityeng2026", Role.DIVISION, head, "Division Head", division=d, short="Div. Head")

        # cross-division teams
        for code, name, cluster, head in CROSS_UNITS:
            Division.objects.get_or_create(code=code, defaults=dict(name=name, cluster=cluster, head_name=head, description=name))

        # executive desks + department heads
        for code, name, cluster, head, uname in DESKS:
            d, _ = Division.objects.get_or_create(code=code, defaults=dict(name=name, cluster=cluster, head_name=head, description=name))
            role = Role.SUPERVISOR
            make_user(uname, "cityeng2026", role, head,
                      "CGPP Department Head II (City Engineer)" if "City Engineer)" in name or code == "CE-DESK" else "CGPP Assistant Department Head II (Assistant City Engineer)",
                      division=None, short="City Engineer" if code == "CE-DESK" else "Asst. City Engineer")

        # program admin + moderator
        it = Division.objects.get(code="IT")
        make_user("admin", "cityeng2026", Role.ADMIN, "Alphard S. Grande", "System Administrator — I.T. Section", division=it, short="Administrator")
        make_user("bsalonga", "cityeng2026", Role.MODERATOR, "Ms. Bianca Salonga", "Board Moderator — Office of the City Engineer", short="Moderator")

        # default channels
        Channel.objects.get_or_create(kind=Channel.Kind.FLOOR, defaults=dict(name="Office Floor"))
        execs = User.objects.filter(role__in=[Role.ADMIN, Role.SUPERVISOR, Role.MODERATOR])
        council, _ = Channel.objects.get_or_create(kind=Channel.Kind.EXECUTIVE, defaults=dict(name="Executive Council"))
        council.members.set(execs)
        for d in Division.objects.all():
            ch, _ = Channel.objects.get_or_create(kind=Channel.Kind.UNIT, unit=d, defaults=dict(name=d.name))
            ch.members.set(User.objects.filter(division=d))

        self.stdout.write(self.style.SUCCESS("Seeded divisions, teams, desks, accounts and channels."))
        self.stdout.write(self.style.WARNING("Default password for seeded accounts: cityeng2026"))
