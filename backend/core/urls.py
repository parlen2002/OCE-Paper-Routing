"""OCE Flow — API routes."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"papers", views.PaperViewSet, basename="paper")
router.register(r"divisions", views.DivisionViewSet, basename="division")
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"notifications", views.NotificationViewSet, basename="notification")
router.register(r"channels", views.ChannelViewSet, basename="channel")
router.register(r"logs", views.SystemLogViewSet, basename="log")

urlpatterns = [
    path("auth/login", views.login),
    path("auth/logout", views.logout),
    path("auth/signup", views.signup),
    path("auth/forgot-password", views.forgot_password),
    path("me", views.me),
    path("custom", views.CustomView.as_view()),
    path("", include(router.urls)),
]
