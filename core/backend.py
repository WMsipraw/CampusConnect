# core/backends.py
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

class EmailBackend(ModelBackend):
    """
    Robust authentication backend allowing case-insensitive login using email or username.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD) or kwargs.get('email')
        
        if not username or not password:
            return None
            
        try:
            # Look up matching user case-insensitively by email or username
            user = UserModel.objects.filter(email__iexact=username).first() or \
                   UserModel.objects.filter(username__iexact=username).first()
        except Exception:
            return None

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None