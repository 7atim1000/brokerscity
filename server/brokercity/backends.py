from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend

User = get_user_model()


class EmailBackend(ModelBackend):
    """
    Authenticate a user using email + password instead of username + password.
    Falls back to a case-insensitive email lookup.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        # Accept either "username" or "email" as the identifier
        email = kwargs.get("email") or username
        if not email or not password:
            return None

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            # Run the default password hasher once to reduce timing attacks
            User().set_password(password)
            return None
        except User.MultipleObjectsReturned:
            user = User.objects.filter(email__iexact=email).first()

        if user and user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None