from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import LoginView, LogoutView, MeView, RegisterView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth_register"),
    path("token/", LoginView.as_view(), name="auth_token"),
    path("token/refresh/", TokenRefreshView.as_view(), name="auth_token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="auth_token_verify"),
    path("logout/", LogoutView.as_view(), name="auth_logout"),
    path("me/", MeView.as_view(), name="auth_me"),
]
