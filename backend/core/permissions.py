"""Role-based access rules — mirror the front-end logic exactly."""
from .models import Role


def is_overseer(user):
    return user.is_authenticated and user.is_overseer()


def can_view_paper(user, paper):
    if not user.is_authenticated:
        return False
    if user.is_overseer():
        return True
    if user.role in (Role.EMPLOYEE, Role.JOBORDER):
        return paper.assignees.filter(pk=user.pk).exists()
    div_id = user.division_id
    if not div_id:
        return False
    if paper.division_id == div_id or paper.intended_id == div_id:
        return True
    if paper.recipient_desks.filter(pk=div_id).exists():
        return True
    return paper.custody.filter(to_div_id=div_id).exists() or paper.custody.filter(from_div_id=div_id).exists()


def can_edit_paper(user, paper):
    if not user.is_authenticated:
        return False
    if user.is_overseer():
        return True
    if user.role in (Role.EMPLOYEE, Role.JOBORDER):
        return paper.assignees.filter(pk=user.pk).exists()
    # division heads (incl. a division they head / act for)
    return user.division_id == paper.division_id


def can_route_paper(user, paper):
    return can_edit_paper(user, paper)


def can_complete(user, paper):
    """Employees / job-order can't complete — completion is verified by the head."""
    if user.role in (Role.EMPLOYEE, Role.JOBORDER):
        return False
    return can_edit_paper(user, paper)


def can_manage_division(user, division):
    """admin & executives manage all; a permanent head manages only their own; an OIC manages none."""
    if not user.is_authenticated:
        return False
    if user.is_overseer():
        return True
    if user.role == Role.DIVISION:
        # a head may manage their division unless they are merely its OIC
        if division.oic_user_id == user.pk:
            return False
        return division.head_user_id == user.pk or user.division_id == division.pk
    return False


def can_manage_users(user):
    return user.is_authenticated and user.role == Role.ADMIN
