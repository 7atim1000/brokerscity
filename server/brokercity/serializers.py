from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    # Accounts
    Profile, Account, AccountCategory,
    # Finance
    Bank, CashBox, Transaction,
    # People
    Customer, Owner, Developer,
    # Property
    Building, Unit, Rental, Rent, MonthlyPayment, 
    # Misc
    WhatsAppMessage, Slider, Offersale, PaymentPlan,
    # Monitoring
    Monitor, Property, WorkLogComment, DailyWorkLog, Permission, PropertyColdCalls,
    
    PropertyWantedArea

)


from decimal import Decimal, InvalidOperation
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, Count
from datetime import timedelta
from django.utils import timezone
from django.db import transaction as db_transaction

from django.contrib.auth import authenticate


#################################################
# Start Authentication + Permission 
#################################################

class PermissionSerializer(serializers.ModelSerializer):
    """Full serializer — used for create, update, and list."""

    # Read-only user info for display
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    user_full_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Permission
        fields = [
            "id",
            "user",              # writable: user id
            "user_id",           # read-only
            "username",          # read-only
            "user_full_name",    # read-only
            "user_email",        # read-only
            "ListWorkLog",
            "monitoring",
            "property_management",   # ✅ ADD THIS
            "financials",            # ✅ ADD THIS
            "add_monitor",
            "can_view_users",           # ✅ ADDED
            "can_manage_users",         # ✅ ADDED
            "can_manage_permissions",   # ✅ ADDED
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_user_full_name(self, obj):
        if not obj.user:
            return None
        full = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full or obj.user.username

    def validate_user(self, value):
        """
        Prevent duplicate permission rows for the same user.
        OneToOneField enforces this at DB level, but we check
        explicitly for a cleaner error message.
        """
        if self.instance is None:  # create
            if Permission.objects.filter(user=value).exists():
                raise serializers.ValidationError(
                    "هذا المستخدم لديه صلاحيات بالفعل."
                )
        return value




# This serializer is only to manage user data.
class UserListSerializer(serializers.ModelSerializer):
    """
    Lightweight user serializer for list views.
    Includes status + role + key profile info.

    NOTE: Permission flags (can_view_users / can_manage_users /
    can_manage_permissions) are intentionally NOT included here.
    They live in the Permission model and are exposed via the
    dedicated endpoint GET /api/permissions/me/ — the frontend
    reads them from PermissionsContext.
    """
    image = serializers.ImageField(source="profile.image", read_only=True)
    role = serializers.CharField(source="profile.role", read_only=True)
    role_display = serializers.CharField(
        source="profile.get_role_display", read_only=True
    )

    # Activity
    status = serializers.CharField(source="profile.status", read_only=True)
    status_display = serializers.CharField(
        source="profile.get_status_display", read_only=True
    )

    # Timestamps
    last_login_at = serializers.DateTimeField(
        source="profile.last_login_at", read_only=True
    )
    last_logout_at = serializers.DateTimeField(
        source="profile.last_logout_at", read_only=True
    )
    last_seen_at = serializers.DateTimeField(
        source="profile.last_seen_at", read_only=True
    )

    # Durations
    total_online_days = serializers.FloatField(
        source="profile.total_online_days", read_only=True
    )
    total_pause_days = serializers.FloatField(
        source="profile.total_pause_days", read_only=True
    )
    total_offline_days = serializers.FloatField(
        source="profile.total_offline_days", read_only=True
    )
    total_logged_out_days = serializers.FloatField(
        source="profile.total_logged_out_days", read_only=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_active",           # Django's is_active
            "date_joined",
            "last_login",          # Django's built-in field
            "image",
            "role",
            "role_display",
            # activity
            "status",
            "status_display",
            # timestamps from profile
            "last_login_at",
            "last_logout_at",
            "last_seen_at",
            # durations
            "total_online_days",
            "total_pause_days",
            "total_offline_days",
            "total_logged_out_days",
        ]
#=========================================
# Users Serializers
#========================================
# This serializer is only used to return user data.

class UserSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(source="profile.image", read_only=True)
    role = serializers.CharField(source="profile.role", read_only=True)

    # Activity status (read-only)
    status = serializers.CharField(source="profile.status", read_only=True)
    status_display = serializers.CharField(
        source="profile.get_status_display", read_only=True
    )

    # Timestamps
    last_login_at = serializers.DateTimeField(
        source="profile.last_login_at", read_only=True
    )
    last_logout_at = serializers.DateTimeField(
        source="profile.last_logout_at", read_only=True
    )
    last_seen_at = serializers.DateTimeField(
        source="profile.last_seen_at", read_only=True
    )
    last_pause_at = serializers.DateTimeField(
        source="profile.last_pause_at", read_only=True
    )

    # Duration (in days, rounded) — convenient for frontend
    total_online_days = serializers.FloatField(
        source="profile.total_online_days", read_only=True
    )
    total_pause_days = serializers.FloatField(
        source="profile.total_pause_days", read_only=True
    )
    total_offline_days = serializers.FloatField(
        source="profile.total_offline_days", read_only=True
    )
    total_logged_out_days = serializers.FloatField(
        source="profile.total_logged_out_days", read_only=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "image",
            "role",
            # activity
            "status",
            "status_display",
            # timestamps
            "last_login_at",
            "last_logout_at",
            "last_seen_at",
            "last_pause_at",
            # durations (days)
            "total_online_days",
            "total_pause_days",
            "total_offline_days",
            "total_logged_out_days",
        ]


#============================================
# Register/ Signup 
#===========================================

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=5)
    password2 = serializers.CharField(write_only=True)

    image = serializers.ImageField(write_only=True, required=False)

    role = serializers.ChoiceField(
        choices=Profile.ROLE_CHOICES,
        default=Profile.USER,
    )

    email = serializers.EmailField(required=True)

    # 🔑 THE FIX — override username to remove Django's default validator
    username = serializers.CharField(
        max_length=150,
        validators=[],   # removes UnicodeUsernameValidator
    )

    class Meta:
        model = User
        fields = ["username", "email", "password", "password2", "image", "role"]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("هذا البريد الإلكتروني مستخدم بالفعل.")
        return value.lower()

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("اسم المستخدم مستخدم بالفعل.")
        return value

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError("كلمتا المرور غير متطابقتين.")
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        image = validated_data.pop("image", None)
        user_role = validated_data.pop("role", Profile.USER)

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )

        Profile.objects.create(
            user=user,
            image=image,
            role=user_role,
        )

        return user

#========================================
# Update 
#========================================
# =======================================
# MANAGER UPDATE — Manager can change role + permissions
# =======================================
class ManagerUserUpdateSerializer(serializers.ModelSerializer):
    """
    Used by managers to update OTHER users.
    Fields:
      - role (in Profile)
      - is_active (Django's User.is_active)
      - can_view_users, can_manage_users, can_manage_permissions
    """

    role = serializers.ChoiceField(
        choices=Profile.ROLE_CHOICES,
        required=False,
    )
    can_view_users = serializers.BooleanField(required=False)
    can_manage_users = serializers.BooleanField(required=False)
    can_manage_permissions = serializers.BooleanField(required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_active",
            "role",
            "can_view_users",
            "can_manage_users",
            "can_manage_permissions",
        ]
        read_only_fields = ["id", "username", "email"]

    def validate_role(self, value):
        # Ensure the role exists in choices
        valid_roles = [c[0] for c in Profile.ROLE_CHOICES]
        if value not in valid_roles:
            raise serializers.ValidationError("دور غير صالح.")
        return value

    def update(self, instance, validated_data):
        # Extract profile-level fields
        role = validated_data.pop("role", None)
        can_view_users = validated_data.pop("can_view_users", None)
        can_manage_users = validated_data.pop("can_manage_users", None)
        can_manage_permissions = validated_data.pop(
            "can_manage_permissions", None
        )

        # Update User fields (is_active)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update Profile fields
        profile, _ = Profile.objects.get_or_create(user=instance)
        if role is not None:
            profile.role = role
        if can_view_users is not None:
            profile.can_view_users = can_view_users
        if can_manage_users is not None:
            profile.can_manage_users = can_manage_users
        if can_manage_permissions is not None:
            profile.can_manage_permissions = can_manage_permissions
        profile.save()

        return instance


# =========================================================
# USER SELF UPDATE — user edits own profile
# =========================================================

class SelfUserUpdateSerializer(serializers.ModelSerializer):
    """
    User edits their OWN profile.
    Username, email, image, password.
    """

    image = serializers.ImageField(required=False, allow_null=True)
    current_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    new_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True, min_length=5
    )
    confirm_new_password = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "image",
            "current_password",
            "new_password",
            "confirm_new_password",
        ]
        read_only_fields = ["id"]

    # 🔥🔥🔥 THE REAL FIX — replace the field AFTER DRF builds it
    def get_fields(self):
        fields = super().get_fields()

        # Throw away DRF's auto-built username field entirely
        # and put a fresh plain CharField with NO validators in its place
        fields["username"] = serializers.CharField(
            required=False,
            allow_blank=False,
            max_length=150,
            validators=[],          # absolutely empty
        )

        return fields

    def validate_username(self, value):
        user = self.instance
        if (
            User.objects.filter(username__iexact=value)
            .exclude(pk=user.pk)
            .exists()
        ):
            raise serializers.ValidationError("اسم المستخدم مستخدم بالفعل.")
        return value

    def validate_email(self, value):
        user = self.instance
        if (
            User.objects.filter(email__iexact=value)
            .exclude(pk=user.pk)
            .exists()
        ):
            raise serializers.ValidationError(
                "هذا البريد الإلكتروني مستخدم بالفعل."
            )
        return value.lower()

    def validate(self, attrs):
        new_password = attrs.get("new_password")
        current_password = attrs.get("current_password")
        confirm_new_password = attrs.get("confirm_new_password")

        if new_password:
            if not current_password:
                raise serializers.ValidationError({
                    "current_password": "يجب إدخال كلمة المرور الحالية."
                })
            if not self.instance.check_password(current_password):
                raise serializers.ValidationError({
                    "current_password": "كلمة المرور الحالية غير صحيحة."
                })
            if new_password != confirm_new_password:
                raise serializers.ValidationError({
                    "confirm_new_password": "كلمتا المرور الجديدتان غير متطابقتين."
                })
        return attrs

    def update(self, instance, validated_data):
        new_password = validated_data.pop("new_password", None)
        validated_data.pop("current_password", None)
        validated_data.pop("confirm_new_password", None)
        image = validated_data.pop("image", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if new_password:
            instance.set_password(new_password)

        instance.save()

        if image is not None:
            profile, _ = Profile.objects.get_or_create(user=instance)
            profile.image = image
            profile.save(update_fields=["image"])

        return instance


# Add new one 
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            request=self.context.get("request"),
            email=data["email"],
            password=data["password"],
        )
        if not user:
            raise serializers.ValidationError("البريد الإلكتروني أو كلمة المرور غير صحيحة.")
        if not user.is_active:
            raise serializers.ValidationError("هذا الحساب معطّل.")
        data["user"] = user
        return data




###################################
# End Authentication
###################################

###################################
# Start Work log
###################################
class WorkLogCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(
        source="author.username", read_only=True
    )
    author_image = serializers.ImageField(
        source="author.profile.image", read_only=True
    )

    class Meta:
        model = WorkLogComment
        fields = ["id", "text", "created_at", "author_username", "author_image"]
        read_only_fields = ["id", "created_at", "author_username", "author_image"]


class DailyWorkLogSerializer(serializers.ModelSerializer):
    """
    Full day details — used when a cell is clicked.
    """
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    role_display = serializers.CharField(
        source="user.profile.get_role_display", read_only=True
    )
    user_image = serializers.ImageField(
        source="user.profile.image", read_only=True
    )

    total_work_hours = serializers.CharField(read_only=True)   # "0h 34m"
    break_hours = serializers.SerializerMethodField()
    reason_display = serializers.CharField(
        source="get_reason_for_change_display", read_only=True
    )
    comments = WorkLogCommentSerializer(many=True, read_only=True)

    class Meta:
        model = DailyWorkLog
        fields = [
            "id",
            "user_id",
            "username",
            "user_image",
            "role_display",
            "date",
            "clock_in",
            "clock_out",
            "break_seconds",
            "break_hours",
            "total_work_seconds",
            "total_work_hours",
            "reason_for_change",
            "reason_display",
            "comments",
        ]

    def get_break_hours(self, obj):
        h = obj.break_seconds // 3600
        m = (obj.break_seconds % 3600) // 60
        return f"{h:02d}:{m:02d}"


class AttendanceGridRowSerializer(serializers.Serializer):
    """
    One row in the grid — used for the whole month.
    Uses Serializer (not ModelSerializer) since it's assembled manually.
    """
    user_id = serializers.IntegerField()
    username = serializers.CharField()
    role_display = serializers.CharField()
    user_image = serializers.ImageField(allow_null=True)
    days = serializers.DictField()   # {"2026-10-01": {...}, ...}
    
###################################
# End Work log
###################################



# =========================================================
# Bank List Serializer (Minimal for list view)
# =========================================================

# =========================================================
# Bank Serializer (Single class for all operations)
# =========================================================
class BankSerializer(serializers.ModelSerializer):
    """Bank serializer for all operations"""
    
    class Meta:
        model = Bank
        fields = [
            'id',
            'name',
            'balance_opening',
            'balance',
            'balance_opening',
            'account_number',
            'iban',
            'swift_code',
            'currency',
            'is_active',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        """Validate bank name"""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Bank name is required")
        if len(value) < 2:
            raise serializers.ValidationError("Bank name must be at least 2 characters")
        return value
    
    def validate_balance(self, value):
        """Validate balance"""
        if value < 0:
            raise serializers.ValidationError("Balance cannot be negative")
        return value
    
    def validate_balance_opening(self, value):
        """Validate opening balance"""
        if value < 0:
            raise serializers.ValidationError("Opening balance cannot be negative")
        return value


class BankListSerializer(serializers.ModelSerializer):
    """Minimal serializer for list views"""
    
    class Meta:
        model = Bank
        fields = ['id', 'name', 'balance', 'balance_opening', 'currency', 'is_active']


# =========================================================
# Bank Create/Update Serializer
# =========================================================
class BankCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for create and update operations"""
    
    class Meta:
        model = Bank
        fields = [
            'name',
            'balance_opening',
            'balance',
            'account_number',
            'iban',
            'swift_code',
            'currency',
            'is_active',
            'notes',
        ]
    
    def create(self, validated_data):
        """Create a new bank"""
        # If balance not provided, set it to opening balance
        if 'balance' not in validated_data:
            validated_data['balance'] = validated_data.get('balance_opening', 0)
        return Bank.objects.create(**validated_data)


# =========================================================
# Bank Pagination
# =========================================================
class BankPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'



# =========================================================
# CashBox Serializer (Full)
# =========================================================
class CashBoxSerializer(serializers.ModelSerializer):
    """Full CashBox serializer"""
    
    class Meta:
        model = CashBox
        fields = [
            'id',
            'name',
            'balance_opening',
            'balance',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        """Validate cash box name"""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Cash box name is required")
        if len(value) < 2:
            raise serializers.ValidationError("Cash box name must be at least 2 characters")
        return value
    
    def validate_balance(self, value):
        """Validate balance"""
        if value < 0:
            raise serializers.ValidationError("Balance cannot be negative")
        return value
    
    def validate_balance_opening(self, value):
        """Validate opening balance"""
        if value < 0:
            raise serializers.ValidationError("Opening balance cannot be negative")
        return value


# =========================================================
# CashBox List Serializer (Minimal)
# =========================================================
class CashBoxListSerializer(serializers.ModelSerializer):
    """Minimal serializer for list views"""
    
    class Meta:
        model = CashBox
        fields = ['id', 'name', 'balance', 'balance_opening']


# =========================================================
# CashBox Create/Update Serializer
# =========================================================
class CashBoxCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for create and update operations"""
    
    class Meta:
        model = CashBox
        fields = [
            'name',
            'balance_opening',
            'balance',
        ]
    
    def create(self, validated_data):
        """Create a new cash box"""
        # If balance not provided, set it to opening balance
        if 'balance' not in validated_data:
            validated_data['balance'] = validated_data.get('balance_opening', 0)
        return CashBox.objects.create(**validated_data)


#=============================================================
# Accounts and AccountCategories Serializer
#=============================================================
# serializers.py
from rest_framework import serializers
from .models import AccountCategory, Account

class AccountCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountCategory
        fields = ['id', 'name', 'created_at', 'updated_at']

class AccountListSerializer(serializers.ModelSerializer):
    type_display = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Account
        fields = ['id', 'name', 'type', 'type_display', 'category', 'category_name', 'created_at']
    
    def get_type_display(self, obj):
        return obj.get_type_display()


class AccountSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=AccountCategory.objects.all(),
        source='category',  # This maps category_id to category field
        write_only=True
    )
    
    class Meta:
        model = Account
        fields = ['id', 'name', 'type', 'category', 'category_id', 'created_at', 'updated_at']
        read_only_fields = ['id', 'category', 'created_at', 'updated_at']
        




class TransactionCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for create and update operations"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    
       # ✅ NEW
    confirmation_user_name = serializers.CharField(
        source='confirmation_user.username',
        read_only=True,
        default=None,
    )


    
    class Meta:
        model = Transaction
        fields = '__all__'   # ✅ subtotal + vat automatically included
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'transaction_user',
            'amount_to_arabic', 'amount_to_english',
            
            'confirmation_user',   # ✅ NEW — set server-side only
        ]

    def validate(self, data):
        """Custom validation based on model requirements"""
        transaction_type = data.get('type')
        payment_method = data.get('payment_method')

        # Validate based on type and payment method
        if transaction_type == Transaction.DEPOSIT:
            if not data.get('account_from'):
                raise serializers.ValidationError({
                    'account_from': 'Account is required for Deposit'
                })

            if payment_method == Transaction.CASH and not data.get('cashbox'):
                raise serializers.ValidationError({
                    'cashbox': 'CashBox is required for Deposit via Cash'
                })

            if payment_method == Transaction.BANKS and not data.get('bank'):
                raise serializers.ValidationError({
                    'bank': 'Bank is required for Deposit via Banks'
                })

        elif transaction_type == Transaction.WITHDRAW:
            if not data.get('account_to'):
                raise serializers.ValidationError({
                    'account_to': 'Account is required for Withdraw'
                })

            if payment_method == Transaction.CASH and not data.get('cashbox'):
                raise serializers.ValidationError({
                    'cashbox': 'CashBox is required for Withdraw via Cash'
                })

            if payment_method == Transaction.BANKS and not data.get('bank'):
                raise serializers.ValidationError({
                    'bank': 'Bank is required for Withdraw via Banks'
                })

        # Validate amount
        amount = data.get('amount', 0)
        if amount <= 0:
            raise serializers.ValidationError({
                'amount': 'Amount must be greater than 0'
            })

        # Validate check fields when has_check is True
        if data.get('has_check'):
            if not data.get('check_no'):
                raise serializers.ValidationError({
                    'check_no': 'Check number is required when has_check is True'
                })

            if not data.get('check_bank'):
                raise serializers.ValidationError({
                    'check_bank': 'Check bank is required when has_check is True'
                })

            if not data.get('check_date'):
                raise serializers.ValidationError({
                    'check_date': 'Check date is required when has_check is True'
                })

        # Validate document fields when has_document is True
        if data.get('has_document'):
            if not data.get('document_no'):
                raise serializers.ValidationError({
                    'document_no': 'Document number is required when has_document is True'
                })

        return data

    def _convert_amount_to_words(self, amount):
        """Convert amount to Arabic and English words"""
        try:
            from num2words import num2words
            english_words = num2words(amount, lang='en')
            arabic_words = f"{amount:.2f} (بالعربية)"

            max_length = 255
            return {
                'arabic': arabic_words[:max_length],
                'english': english_words[:max_length]
            }

        except:
            return {
                'arabic': f"{amount:.2f} (بالعربية)",
                'english': f"{amount:.2f} (in English)"
            }

    def _set_amount_fields(self, validated_data):
        """Helper method to set amount_deposit and amount_withdraw"""
        transaction_type = validated_data.get('type')
        amount = validated_data.get('amount', 0)

        if transaction_type == Transaction.DEPOSIT:
            validated_data['amount_deposit'] = amount
            validated_data['amount_withdraw'] = 0.00
        else:  # WITHDRAW
            validated_data['amount_withdraw'] = amount
            validated_data['amount_deposit'] = 0.00

        # Auto-generate amount_to_arabic and amount_to_english
        amount_words = self._convert_amount_to_words(amount)
        validated_data['amount_to_arabic'] = amount_words['arabic']
        validated_data['amount_to_english'] = amount_words['english']

        return validated_data

    def _get_object_name(self, obj):
        """Get name from any object"""
        if obj is None:
            return None

        if isinstance(obj, str):
            return obj

        if hasattr(obj, 'name'):
            return obj.name

        if hasattr(obj, 'title'):
            return obj.title

        return str(obj)

    def _get_account_name(self, account_id):
        """Get account name from account ID"""
        if not account_id:
            return None

        try:
            if isinstance(account_id, str) and not account_id.isdigit():
                return account_id

            account = Account.objects.get(id=int(account_id))
            return account.name

        except Account.DoesNotExist:
            return str(account_id)

        except (ValueError, TypeError):
            return str(account_id)

        except Exception as e:
            print(f"Error getting account name: {e}")
            return str(account_id)

    def _get_bank_name(self, bank_id):
        """Get bank name from bank ID or object"""
        if not bank_id:
            return None

        try:
            if hasattr(bank_id, 'name'):
                return bank_id.name

            if isinstance(bank_id, str) and not bank_id.isdigit():
                return bank_id

            bank = Bank.objects.get(id=int(bank_id))
            return bank.name

        except Bank.DoesNotExist:
            return str(bank_id)

        except (ValueError, TypeError):
            return str(bank_id)

        except Exception as e:
            print(f"Error getting bank name: {e}")
            return str(bank_id)

    def _get_cashbox_name(self, cashbox_id):
        """Get cashbox name from cashbox ID"""
        if not cashbox_id:
            return None

        try:
            if hasattr(cashbox_id, 'name'):
                return cashbox_id.name

            if isinstance(cashbox_id, str) and not cashbox_id.isdigit():
                return cashbox_id

            cashbox = CashBox.objects.get(id=int(cashbox_id))
            return cashbox.name

        except CashBox.DoesNotExist:
            return str(cashbox_id)

        except (ValueError, TypeError):
            return str(cashbox_id)

        except Exception as e:
            print(f"Error getting cashbox name: {e}")
            return str(cashbox_id)

    def _set_account_fields(self, validated_data):
        """
        Set account_from and account_to based on type and payment method

        Mapping:
        - Deposit + Banks: account_from = Account NAME, account_to = Bank NAME
        - Deposit + Cash: account_from = Account NAME, account_to = CashBox NAME
        - Withdraw + Banks: account_from = Bank NAME, account_to = Account NAME
        - Withdraw + Cash: account_from = CashBox NAME, account_to = Account NAME
        """
        print("=" * 80)
        print("=== _SET_ACCOUNT_FIELDS CALLED ===")
        print(f"Data before: {validated_data}")
        print("-" * 80)

        transaction_type = validated_data.get('type')
        payment_method = validated_data.get('payment_method')

        print(f"Transaction type: {transaction_type}")
        print(f"Payment method: {payment_method}")

        if transaction_type == Transaction.DEPOSIT:
            account_from_value = validated_data.get('account_from')
            print(f"account_from_value: {account_from_value} (type: {type(account_from_value)})")

            if account_from_value:
                account_name = self._get_account_name(account_from_value)
                validated_data['account_from'] = account_name
                print(f"Converted account_from to: {account_name}")

            if payment_method == Transaction.BANKS:
                bank_value = validated_data.get('bank')
                print(f"bank_value: {bank_value} (type: {type(bank_value)})")

                if bank_value:
                    bank_name = self._get_bank_name(bank_value)
                    validated_data['account_to'] = bank_name
                    print(f"Converted bank to name: {bank_name}")
                else:
                    validated_data['account_to'] = None
                    print("bank_value is None or empty")

            elif payment_method == Transaction.CASH:
                cashbox_value = validated_data.get('cashbox')
                print(f"cashbox_value: {cashbox_value} (type: {type(cashbox_value)})")

                if cashbox_value:
                    cashbox_name = self._get_cashbox_name(cashbox_value)
                    validated_data['account_to'] = cashbox_name
                    print(f"Converted cashbox to name: {cashbox_name}")
                else:
                    validated_data['account_to'] = None
                    print("cashbox_value is None or empty")

        elif transaction_type == Transaction.WITHDRAW:
            if payment_method == Transaction.BANKS:
                bank_value = validated_data.get('bank')

                if bank_value:
                    bank_name = self._get_bank_name(bank_value)
                    validated_data['account_from'] = bank_name
                    print(f"Converted bank to name: {bank_name}")
                else:
                    validated_data['account_from'] = None

            elif payment_method == Transaction.CASH:
                cashbox_value = validated_data.get('cashbox')

                if cashbox_value:
                    cashbox_name = self._get_cashbox_name(cashbox_value)
                    validated_data['account_from'] = cashbox_name
                    print(f"Converted cashbox to name: {cashbox_name}")
                else:
                    validated_data['account_from'] = None

            account_to_value = validated_data.get('account_to')

            if account_to_value:
                account_name = self._get_account_name(account_to_value)
                validated_data['account_to'] = account_name
                print(f"Converted account_to to: {account_name}")

        print(f"Data after: {validated_data}")
        print("=" * 80)

        return validated_data

    def create(self, validated_data):
        """Create with auto-set amount and account fields"""
        print("=" * 80)
        print("=== CREATE METHOD CALLED ===")
        print(f"Validated data before processing: {validated_data}")
        print("-" * 80)

        # Set amount fields
        validated_data = self._set_amount_fields(validated_data)
        
        # ✅ NEW — on create, always confirmed by the transaction_user
        request = self.context.get('request')
        creating_user = getattr(request, 'user', None) if request else None
        validated_data['confirmation'] = True
        validated_data['confirmation_user'] = creating_user

        # Set account fields based on type and payment method (converts IDs to names)
        validated_data = self._set_account_fields(validated_data)

        # ✅ NEW — auto-assign / clear confirmation_user
        # validated_data = self._apply_confirmation_fields(validated_data)

        print(f"Final validated data: {validated_data}")
        print("=" * 80)

        # Keep bank and cashbox foreign keys for reference
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update with auto-set amount and account fields"""
        # Set amount fields
        validated_data = self._set_amount_fields(validated_data)

        # Set account fields based on type and payment method
        validated_data = self._set_account_fields(validated_data)

        # ✅ NEW — auto-assign / clear confirmation_user
        validated_data = self._apply_confirmation_fields(validated_data, instance=instance)

        return super().update(instance, validated_data)
     
    # ✅ NEW new helper method _apply_confirmation_fields (place it anywhere inside the class
        # ✅ NEW
    def _apply_confirmation_fields(self, validated_data, instance=None):
        """
        Auto-assign confirmation_user from the request user when
        confirmation is True, and clear it when confirmation is False.
        """
        if 'confirmation' not in validated_data:
            return validated_data

        if validated_data['confirmation']:
            request = self.context.get('request')
            user = getattr(request, 'user', None) if request else None
            if user and user.is_authenticated:
                validated_data['confirmation_user'] = user
            else:
                validated_data.setdefault(
                    'confirmation_user',
                    instance.confirmation_user if instance else None,
                )
        else:
            validated_data['confirmation_user'] = None

        return validated_data


class TransactionListSerializer(serializers.ModelSerializer):
    """Serializer for listing transactions with all fields"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    # Add these fields to display related object names
    bank_name = serializers.CharField(source='bank.name', read_only=True, default=None)
    cashbox_name = serializers.CharField(source='cashbox.name', read_only=True, default=None)

    # ✅ Display the transaction user's username instead of the raw user ID
    transaction_user_name = serializers.CharField(
        source='transaction_user.username',
        read_only=True,
        default=None
    )

    # ✅ NEW
    confirmation_user_name = serializers.CharField(
        source='confirmation_user.username',
        read_only=True,
        default=None,
    )

    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_no', 'transaction_date', 'type', 'type_display',

            # ✅ NEW: subtotal and vat added right before amount
            'subtotal', 'vat', 'amount',

            'amount_deposit', 'amount_withdraw', 'currency',
            'payment_method', 'payment_method_display',
            'account_from', 'account_to',
            'bank', 'bank_name', 'cashbox', 'cashbox_name',
            'statement', 'has_check', 'check_no', 'check_bank', 'check_date',
            'person_deliver', 'person_receipt', 'notes',
            'has_document', 'document', 'document_no',
            'transaction_user',
            'transaction_user_name',
            # ✅ NEW
            'confirmation', 'confirmation_user', 'confirmation_user_name',
            'created_at', 'updated_at',
            'amount_to_arabic', 'amount_to_english',
            'user_signature',
            'manager_signature',
            'second_person_signature'
        ]
        read_only_fields = fields  # All fields are read-only for list view


class TransactionDetailSerializer(serializers.ModelSerializer):
    """Serializer for transaction detail view"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    # Nested serializers for related objects
    bank_detail = serializers.SerializerMethodField()
    cashbox_detail = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = '__all__'   # ✅ subtotal + vat automatically included
        read_only_fields = [
            'id',
            'transaction_no',
            'created_at',
            'updated_at',
            'transaction_user',
            'confirmation_user',   # ✅ NEW
            'type_display',
            'payment_method_display',
            'bank_detail',
            'cashbox_detail',
        ]

    # ✅ Inject username into the output without declaring a serializer field,
    # so `fields = '__all__'` keeps working unchanged.
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['transaction_user_name'] = (
            instance.transaction_user.username if instance.transaction_user else None
        )
        # ✅ NEW
        data['confirmation_user_name'] = (
            instance.confirmation_user.username if instance.confirmation_user else None
        )
        return data

    def get_bank_detail(self, obj):
        if obj.bank:
            return {
                'id': obj.bank.id,
                'name': obj.bank.name,
            }
        return None

    def get_cashbox_detail(self, obj):
        if obj.cashbox:
            return {
                'id': obj.cashbox.id,
                'name': obj.cashbox.name,
            }
        return None
        

#===========================================
# Dashbord
#=========================================
class DashboardSummarySerializer(serializers.Serializer):
    """Serializer for dashboard summary data"""
    total_deposits = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_withdraws = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_balance = serializers.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_transactions = serializers.IntegerField(default=0)
    deposit_count = serializers.IntegerField(default=0)
    withdraw_count = serializers.IntegerField(default=0)

class DashboardChartSerializer(serializers.Serializer):
    """Serializer for chart data"""
    labels = serializers.ListField(child=serializers.CharField())
    deposits = serializers.ListField(child=serializers.FloatField(default=0))
    withdraws = serializers.ListField(child=serializers.FloatField(default=0))
    balance = serializers.ListField(child=serializers.FloatField(default=0))

    
class DashboardTransactionSerializer(serializers.ModelSerializer):
    """Serializer for recent transactions"""
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'transaction_no', 'transaction_date', 'type', 'type_display',
            'amount', 'payment_method', 'payment_method_display',
            'account_from', 'account_to', 'person_receipt', 'statement'
        ]

#-------------------------------------
#Customer Serializer
#-------------------------------------
class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone_number', 'created_at']
        read_only_fields = ['id', 'created_at']

    def validate_phone_number(self, value):
        """Validate phone number format"""
        # Basic validation - you can add more sophisticated checks
        if not value.startswith('+'):
            raise serializers.ValidationError(
                "Phone number must include country code, e.g., +1234567890"
            )
        if len(value) < 10:
            raise serializers.ValidationError(
                "Phone number is too short"
            )
        return value


#=======================================
# What's Up message serilizer
#=======================================
class WhatsAppMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppMessage
        fields = ['id', 'to_number', 'message_body', 'status', 'twilio_sid', 'error_message', 'created_at']
        read_only_fields = ['status', 'twilio_sid', 'error_message', 'created_at']

class SendWhatsAppSerializer(serializers.Serializer):
    """Used only for validating incoming send requests."""
    to_number = serializers.CharField(max_length=20)

    def validate_to_number(self, value):
        if not value.startswith('+'):
            raise serializers.ValidationError("Number must be in E.164 format, e.g. +9715XXXXXXXX")
        return value



##########################################
# Properties Management
#########################################

#==========================================
# One Serializer
#==========================================
class OwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Owner
        fields = [
            'id',
            'name',
            'phone',
            'address',
            'balance',
            'balance_opening',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'balance',
            'created_at',
            'updated_at',
        ]

    def validate_name(self, value):
        if value:
            value = value.strip()

        return value or None

    def validate_phone(self, value):
        if value:
            value = value.strip()

        return value or None

    def validate_address(self, value):
        if value:
            value = value.strip()

        return value or None

    def create(self, validated_data):
        # When creating a new owner:
        # balance = balance_opening
        balance_opening = validated_data.get('balance_opening', 0)

        validated_data['balance'] = balance_opening

        return Owner.objects.create(**validated_data)

#==========================================
# Category Serializer
#==========================================
class BuildingSerializer(serializers.ModelSerializer):
    owner_details = serializers.SerializerMethodField()

    class Meta:
        model = Building
        fields = [
            'id',
            'owner',
            'owner_details',
            'name',
            'type',
            'status',
            'area',
            'location',
            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'owner_details',
            'created_at',
            'updated_at',
        ]

    def get_owner_details(self, obj):
        if not obj.owner:
            return None

        return {
            'id': obj.owner.id,
            'name': obj.owner.name,
            'phone': obj.owner.phone,
            'address': obj.owner.address,
        }

    def validate_name(self, value):
        if value:
            value = value.strip()

        return value or None

    def validate_area(self, value):
        if value:
            value = value.strip()

        return value or None

    def validate_location(self, value):
        if value:
            value = value.strip()

        return value or None

#======================================
# Unit Serilizer
#======================================

# class UnitSerializer(serializers.ModelSerializer):
#     category_details = serializers.SerializerMethodField()
#     owner_details = serializers.SerializerMethodField()
#     floor_display = serializers.SerializerMethodField()

#     class Meta:
#         model = Unit
#         fields = [
#             'id',
#             'category',
#             'category_details',
#             'owner_details',

#             'name',
#             'type',
#             'status',
#             'floor',
#             'floor_display',
#             'price',
#             'security_deposit',      # ✅ NEW

#             'area',
#             'bedrooms',
#             'bathrooms',

#             'has_parking',
#             'parking',

#             'furnished',
#             #'unfurnished',

#             'image_1',
#             'image_2',
#             'image_3',
#             'image_4',

#             'created_at',
#             'updated_at',
#         ]

#         read_only_fields = [
#             'id',
#             'category_details',
#             'owner_details',
#             'floor_display',
#             'has_parking',
#             'created_at',
#             'updated_at',
#         ]

    
#     # ---------- existing methods (unchanged) ----------
#     def get_floor_display(self, obj):
#         if not obj.floor:
#             return None
#         return obj.get_floor_display()

#     def get_category_details(self, obj):
#         if not obj.category:
#             return None

#         category = obj.category

#         owner_details = None

#         if category.owner:
#             owner_details = {
#                 'id': category.owner.id,
#                 'name': category.owner.name,
#                 'phone': category.owner.phone,
#                 'address': category.owner.address,
#             }

#         return {
#             'id': category.id,
#             'name': category.name,
#             'type': category.type,
#             'status': category.status,
#             'area': category.area,
#             'location': category.location,
#             'owner': owner_details,
#         }

#     def get_owner_details(self, obj):
#         if not obj.category or not obj.category.owner:
#             return None

#         owner = obj.category.owner

#         return {
#             'id': owner.id,
#             'name': owner.name,
#             'phone': owner.phone,
#             'address': owner.address,
#             'balance_opening': owner.balance_opening,
#             'balance': owner.balance,
#         }

#     def validate_name(self, value):
#         if value:
#             value = value.strip()
#         return value or None

#     def validate_area(self, value):
#         if value:
#             value = value.strip()
#         return value or None

#     def validate_price(self, value):
#         if value is not None and value < 0:
#             raise serializers.ValidationError(
#                 "Price cannot be negative."
#             )
#         return value

#     def validate_bedrooms(self, value):
#         if value is not None and value < 0:
#             raise serializers.ValidationError(
#                 "Bedrooms cannot be negative."
#             )
#         return value

#     def validate_bathrooms(self, value):
#         if value is not None and value < 0:
#             raise serializers.ValidationError(
#                 "Bathrooms cannot be negative."
#             )
#         return value

#     def validate_parking(self, value):
#         if value is not None and value < 0:
#             raise serializers.ValidationError(
#                 "Parking spaces cannot be negative."
#             )
#         return value
#     # ... rest of your methods unchanged
#     def validate_security_deposit(self, value):    # ✅ NEW
#         if value is not None and value < 0:
#             raise serializers.ValidationError(
#                 "Security deposit cannot be negative."
#             )
#         return value


class UnitSerializer(serializers.ModelSerializer):
    category_details = serializers.SerializerMethodField()
    owner_details = serializers.SerializerMethodField()
    floor_display = serializers.SerializerMethodField()

    # ✅ Expose the derived property as a read-only boolean
    has_parking = serializers.SerializerMethodField()

    class Meta:
        model = Unit
        fields = [
            'id',
            'category',
            'category_details',
            'owner_details',

            'name',
            'type',
            'status',
            'floor',
            'floor_display',
            'price',
            'security_deposit',      # ✅ NEW

            'area',
            'bedrooms',
            'bathrooms',

            'has_parking',           # ✅ read-only (SerializerMethodField)
            'parking',

            'furnished',             # ✅ string field ("furnished" / "unfurnished")
            # 'unfurnished',         # ❌ REMOVED — no longer a model field

            'image_1',
            'image_2',
            'image_3',
            'image_4',

            'created_at',
            'updated_at',
        ]

        read_only_fields = [
            'id',
            'category_details',
            'owner_details',
            'floor_display',
            'has_parking',           # ✅ now read-only
            'created_at',
            'updated_at',
        ]

    # ---------- existing methods (unchanged) ----------

    def get_floor_display(self, obj):
        if not obj.floor:
            return None
        return obj.get_floor_display()

    def get_category_details(self, obj):
        if not obj.category:
            return None

        category = obj.category

        owner_details = None

        if category.owner:
            owner_details = {
                'id': category.owner.id,
                'name': category.owner.name,
                'phone': category.owner.phone,
                'address': category.owner.address,
            }

        return {
            'id': category.id,
            'name': category.name,
            'type': category.type,
            'status': category.status,
            'area': category.area,
            'location': category.location,
            'owner': owner_details,
        }

    def get_owner_details(self, obj):
        if not obj.category or not obj.category.owner:
            return None

        owner = obj.category.owner

        return {
            'id': owner.id,
            'name': owner.name,
            'phone': owner.phone,
            'address': owner.address,
            'balance_opening': owner.balance_opening,
            'balance': owner.balance,
        }

    # ---------- 👇 new property field ----------

    def get_has_parking(self, obj):
        return bool(obj.parking and obj.parking > 0)

    # ---------- validation ----------

    def validate_name(self, value):
        if value:
            value = value.strip()
        return value or None

    def validate_area(self, value):
        if value:
            value = value.strip()
        return value or None

    def validate_price(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Price cannot be negative."
            )
        return value

    def validate_bedrooms(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Bedrooms cannot be negative."
            )
        return value

    def validate_bathrooms(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Bathrooms cannot be negative."
            )
        return value

    def validate_parking(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Parking spaces cannot be negative."
            )
        return value

    def validate_security_deposit(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Security deposit cannot be negative."
            )
        return value

class RentalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rental
        fields = [
            'id',
            'name',
            'nationality',
            'phone_1',
            'phone_2',
            'id_number',
            'email',
            'insurance_balance',
            'balance',
        ]
        read_only_fields = ['id']

# ---------------------------------------------------------
# Field-level validation
# ---------------------------------------------------------

    def validate_name(self, value):
        if value is not None:
            value = value.strip()
        return value or None

    def validate_nationality(self, value):
        if value is not None:
            value = value.strip()
        return value or None

    def validate_phone_1(self, value):
        if value is not None:
            value = value.strip()
        return value or None

    def validate_phone_2(self, value):
        if value is not None:
            value = value.strip()
        return value or None

    def validate_id_number(self, value):
        if value is not None:
            value = value.strip()
        return value or None

    def validate_email(self, value):
        if value is not None:
            value = value.strip().lower()
        return value or None

    def validate_insurance_balance(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Insurance balance cannot be negative."
            )
        return value

    def validate_balance(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Balance cannot be negative."
            )
        return value


class RentalListSerializer(serializers.ModelSerializer):
    """
    Lighter serializer for list endpoints (if you don't
    need all fields on the list page).
    """

    class Meta:
        model = Rental
        fields = [
            'id',
            'name',
            'phone_1',
            'phone_2',
            'email',
            'balance',
        ]
        read_only_fields = ['id']

# ============================================================
# RENT SERIALIZER
# ============================================================

from decimal import Decimal, InvalidOperation
from rest_framework import serializers

from .models import Rent


class RentSerializer(serializers.ModelSerializer):
    # Read-only convenience fields
    tenant_name = serializers.SerializerMethodField()
    unit_display = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()
    unit_security_deposit = serializers.SerializerMethodField()
    monthly_payments_count = serializers.SerializerMethodField()

    class Meta:
        model = Rent
        fields = [
            "id",
            "rental_name",
            "unit_name",
            "start_date",
            "end_date",
            "total_months",
            "installment_no",
            "installment_amount",
            "tenant_name",
            "unit_display",
            "unit_price",
            "unit_security_deposit",
            "monthly_payments_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_months",
            "tenant_name",
            "unit_display",
            "unit_price",
            "unit_security_deposit",
            "monthly_payments_count",
            "created_at",
            "updated_at",
        ]

    # ---------- helpers ----------

    def get_tenant_name(self, obj):
        if not obj.rental_name:
            return None
        rental = obj.rental_name
        return (
            getattr(rental, "name", None)
            or getattr(rental, "tenant_name", None)
            or getattr(rental, "full_name", None)
            or str(rental)
        )

    def get_unit_display(self, obj):
        if not obj.unit_name:
            return None
        return getattr(obj.unit_name, "name", None) or f"Unit #{obj.unit_name.pk}"

    def get_unit_price(self, obj):
        if not obj.unit_name:
            return None
        return getattr(obj.unit_name, "price", None)

    def get_unit_security_deposit(self, obj):
        if not obj.unit_name:
            return None
        return getattr(obj.unit_name, "security_deposit", None)

    def get_monthly_payments_count(self, obj):
        return obj.monthly_payments.count()

    # ---------- validation & calculations ----------

    def validate(self, attrs):
        start_date = attrs.get("start_date") or getattr(self.instance, "start_date", None)
        end_date = attrs.get("end_date") or getattr(self.instance, "end_date", None)
        installment_no = attrs.get("installment_no") or getattr(self.instance, "installment_no", None)

        # 1) Date sanity check
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date."}
            )

        # 2) Installment count must be > 0
        if installment_no is not None and installment_no <= 0:
            raise serializers.ValidationError(
                {"installment_no": "Number of installments must be greater than 0."}
            )

        # 3) Calculate total_months
        if start_date and end_date:
            months = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month)
            attrs["total_months"] = max(months, 0)

        # 4) Calculate installment_amount = total contract value / installment_no
        #    The client sends the TOTAL value in `installment_amount`.
        #    On PATCH without new value, we recompute from the stored total.
        raw_total = attrs.get("installment_amount")
        if raw_total is None and self.instance is not None:
            # Recover the original total from stored values
            raw_total = self.instance.installment_amount * self.instance.installment_no

        if raw_total is not None and installment_no:
            try:
                attrs["installment_amount"] = (
                    Decimal(str(raw_total)) / Decimal(installment_no)
                ).quantize(Decimal("0.01"))
            except (InvalidOperation, ZeroDivisionError, TypeError):
                raise serializers.ValidationError(
                    {"installment_amount": "Invalid amount or installment number."}
                )

        return attrs

    def validate_installment_no(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Installment number cannot be negative.")
        return value


        

# ============================================================
# MONTHLY PAYMENT SERIALIZER
# ============================================================

class MonthlyPaymentSerializer(serializers.ModelSerializer):
    # Read-only convenience fields pulled from the related Unit via Rent
    unit_id = serializers.SerializerMethodField()
    unit_display = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()
    unit_security_deposit = serializers.SerializerMethodField()

    # Computed property exposed on the API
    amount_remaining = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )

    tenant_name = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyPayment
        fields = [
            "id",
            "rent",
            "month",
            "amount_due",
            "amount_paid",
            "amount_remaining",
            "security_deposit",
            "due_date",
            "paid_date",
            "status",
            "notes",
            # convenience / read-only
            "tenant_name",
            "unit_id",
            "unit_display",
            "unit_price",
            "unit_security_deposit",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "amount_remaining",
            "tenant_name",
            "unit_id",
            "unit_display",
            "unit_price",
            "unit_security_deposit",
            "created_at",
            "updated_at",
        ]

    # ---------- helpers ----------

    def _get_unit(self, obj):
        if not obj.rent or not obj.rent.unit_name:
            return None
        return obj.rent.unit_name

    def get_unit_id(self, obj):
        unit = self._get_unit(obj)
        return unit.pk if unit else None

    def get_unit_display(self, obj):
        unit = self._get_unit(obj)
        if not unit:
            return None
        return getattr(unit, "name", None) or f"Unit #{unit.pk}"

    def get_unit_price(self, obj):
        unit = self._get_unit(obj)
        return getattr(unit, "price", None) if unit else None

    def get_unit_security_deposit(self, obj):
        unit = self._get_unit(obj)
        return getattr(unit, "security_deposit", None) if unit else None

    def get_tenant_name(self, obj):
        if not obj.rent or not obj.rent.rental_name:
            return None
        rental = obj.rent.rental_name
        return (
            getattr(rental, "name", None)
            or getattr(rental, "tenant_name", None)
            or str(rental)
        )

    # ---------- auto-fill from Unit ----------

    def create(self, validated_data):
        rent = validated_data.get("rent")
        unit = rent.unit_name if rent else None

        # If client didn't send a security_deposit, auto-fill from Unit
        if not validated_data.get("security_deposit") and unit:
            validated_data["security_deposit"] = (
                getattr(unit, "security_deposit", None) or Decimal("0.00")
            )

        # If client didn't send amount_due, auto-fill from Unit price
        if not validated_data.get("amount_due") and unit:
            validated_data["amount_due"] = (
                getattr(unit, "price", None) or Decimal("0.00")
            )

        return super().create(validated_data)

    # ---------- validation ----------

    def validate_amount_due(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Amount due cannot be negative.")
        return value

    def validate_amount_paid(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Amount paid cannot be negative.")
        return value

    def validate_security_deposit(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Security deposit cannot be negative."
            )
        return value



###############################################################
###############################################################
# Website 
###############################################################
class SliderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Slider
        fields = [
            'id',
            'name',
            'location',

            'image',
            'image_1',
            'image_2',
            'image_3',
            'image_4',

            'starting_price',
            'payment_plan',
            'booking_fee',
            'handover',

            'developer',
            'area_from',
            'studios',
            'apartments',
            'townhouses',
            'duplexes',
            'penthouses',

            'license_number',
            'project_number',

            'description',
        ]
        extra_kwargs = {
            field: {'required': False, 'allow_null': True}
            for field in fields if field != 'id'
        }


#================================================
# Developer
#================================================

class DeveloperSerializer(serializers.ModelSerializer):
    """Used for list / create / update / delete."""

    class Meta:
        model = Developer
        fields = ['id', 'name', 'phone', 'type', 'email']

    def validate_name(self, value):
        if value is not None and len(value.strip()) == 0:
            raise serializers.ValidationError("Name cannot be blank.")
        return value


class DeveloperDetailSerializer(serializers.ModelSerializer):
    """Used for retrieve (detail) — can add extra/computed fields later."""

    class Meta:
        model = Developer
        fields = ['id', 'name', 'phone', 'type', 'email']
        read_only_fields = ['id']

# Send Email Developers/serializers.py
class SendEmailSerializer(serializers.Serializer):
    """
    Serializer for validating the bulk-email send request
    coming from the user interface.
    """
    subject = serializers.CharField(
        max_length=255,
        allow_blank=False,
        error_messages={
            'blank': 'الموضوع مطلوب',
            'required': 'الموضوع مطلوب',
        },
    )

    message = serializers.CharField(
        allow_blank=False,
        error_messages={
            'blank': 'نص الرسالة مطلوب',
            'required': 'نص الرسالة مطلوب',
        },
    )

    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
        error_messages={
            'empty': 'يجب اختيار مستلم واحد على الأقل',
            'required': 'قائمة المستلمين مطلوبة',
        },
    )

    def validate_recipient_ids(self, value):
        """
        Ensure all IDs exist and have a valid email address.
        """
        developers = Developer.objects.filter(id__in=value)

        if developers.count() != len(value):
            raise serializers.ValidationError(
                'بعض المطورين المحددين غير موجودين'
            )

        # Filter to only those with a non-empty email
        developers_with_email = developers.exclude(
            email__isnull=True
        ).exclude(email__exact='')

        if developers_with_email.count() == 0:
            raise serializers.ValidationError(
                'لا يوجد أي مطور محدد لديه بريد إلكتروني صالح'
            )

        return value




#===============================
# Offersale
#===============================
class OffersaleSerializer(serializers.ModelSerializer):
    """
    Full serializer — used for create, list, update.
    The 'image' field is returned as a full URL if present.
    """
    image = serializers.ImageField(required=False, allow_null=True)
    image_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Offersale
        fields = [
            "id",
            # Header
            "reference_no",
            "date",
            "recipient_name",
            # Project & Unit
            "project",
            "unit_no",
            "estimated_completion_date",
            # Listing headline
            "listing_title",
            # Unit details
            "unit_type",
            "unit_model",
            "bedrooms",
            "unit_position",
            "unit_grade",
            "unit_note",
            # Area
            "plot_area",
            "gross_saleable_area",
            "total_area",
            "internal_area",
            "terrace_area",
            # Property image
            "image",
            "image_url",
            "image_display",
            # Currency
            "currency",
            # Financial details
            "base_price",
            "selling_price",
            "premium_amount",
            "noc_fee",
            "transfer_fee",
            "agency_fee",
            "owner_paid_total",
            "buyer_total",
            # Promotion & waivers
            "promotion",
            "waiver",
            "waiver_second",
            # Meta
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "image_display"]

    def get_image_display(self, obj):
        """
        Returns either the uploaded image URL or the external image_url.
        Prefers the uploaded file if present.
        """
        request = self.context.get("request")
        if obj.image:
            url = obj.image.url
            if request:
                return request.build_absolute_uri(url)
            return url
        if obj.image_url:
            return obj.image_url
        return None


class OffersaleListSerializer(serializers.ModelSerializer):
    """
    Lighter serializer for list view — omits heavy fields if needed.
    Use only if you want a slim list response.
    """
    image_display = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Offersale
        fields = [
            "id",
            "reference_no",
            "date",
            "recipient_name",
            "project",
            "unit_no",
            "listing_title",
            "bedrooms",
            "selling_price",
            "currency",
            "image_display",
            "created_at",
        ]

    def get_image_display(self, obj):
        request = self.context.get("request")
        if obj.image:
            url = obj.image.url
            return request.build_absolute_uri(url) if request else url
        return obj.image_url or None




#=========================
# Payment Plan
#========================
from rest_framework import serializers
from .models import PaymentPlan, Offersale


class InstallmentItemSerializer(serializers.Serializer):
    inst_no = serializers.IntegerField(min_value=1)
    milestone = serializers.CharField(max_length=150)
    percentage = serializers.DecimalField(
        max_digits=6, decimal_places=2, min_value=0
    )
    date = serializers.DateField(required=False, allow_null=True)
    amount = serializers.DecimalField(
        max_digits=15, decimal_places=2, min_value=0,
        required=False, allow_null=True
    )


class PaymentPlanSerializer(serializers.ModelSerializer):
    installments = InstallmentItemSerializer(many=True, required=False)

    # ✅ Accepts "unit_no": "Lagoons-Wilds-SL7-V-175" from the frontend
    unit_no = serializers.SlugRelatedField(
        slug_field="unit_no",           # match on Offersale.unit_no
        queryset=Offersale.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = PaymentPlan
        fields = [
            "id",
            "unit_no",                  # returns the string, not the pk
            "installments",
            "base_price",
            "final_price",
            "adm_fee",
            "adm_admin_fee",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_installments(self, value):
        seen = set()
        for item in value:
            key = item.get("inst_no")
            if key in seen:
                raise serializers.ValidationError(
                    f"Duplicate installment number: {key}"
                )
            seen.add(key)
        return value




#==========================
# Monitoring
#==========================
# serializers.py
class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = [
            "id",
            "month",
            "property_no",
            "live_no",
            "draft_no",
            "sale_no",
            "rent_no",
        ]
        read_only_fields = ["id"]

        

class MonitorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Monitor
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class MonitorCreateSerializer(serializers.ModelSerializer):
    # Make every optional field explicitly not-required so the
    # frontend can POST partial payloads without triggering 400s.
    date = serializers.DateField(required=False, allow_null=True)
    month = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    lead_no = serializers.IntegerField(required=False, allow_null=True)
    lead_reassigned_no = serializers.IntegerField(required=False, allow_null=True)

    agent = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    agent_lead_no = serializers.IntegerField(required=False, allow_null=True)

    # ✅ NEW: added viewing_lead_no / success_lead_no for consistency
    viewing_lead_no = serializers.IntegerField(required=False, allow_null=True)
    success_lead_no = serializers.IntegerField(required=False, allow_null=True)

    # ✅ CharField (allows values like "45 min" / "1h 20m" / free text)
    agent_contact_duration = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )
    agent_contact_comment = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )

    # ✅ NEW fields — also CharField now
    agent_assigned_duration = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )
    agent_reassigned_comment = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )

    draws = serializers.FloatField(required=False, allow_null=True)
    draws_no = serializers.IntegerField(required=False, allow_null=True)
    draws_cause = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )

    # ✅ NEW: estimate field (CharField, optional)
    estimate = serializers.CharField(
        required=False, allow_null=True, allow_blank=True
    )

    class Meta:
        model = Monitor
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate(self, attrs):
        # Non-negative checks — only for the fields that are STILL integers
        non_negative_fields = [
            'lead_no',
            'lead_reassigned_no',
            'agent_lead_no',
            'viewing_lead_no',   # ✅ added
            'success_lead_no',   # ✅ added
            'draws_no',
            # ❌ Removed: agent_contact_duration, agent_assigned_duration
            #    (they are CharField now — no numeric check possible)
        ]
        for field in non_negative_fields:
            val = attrs.get(field)
            if val is not None and val < 0:
                raise serializers.ValidationError(
                    {field: f"{field} cannot be negative."}
                )

        return attrs
        

class PropertyColdCallsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyColdCalls
        fields = [
            'id', 
            'agent', 
            'coldcalls', 
            'project', 
            'created_at'
        ]
        # created_at is auto-generated, so we make it read-only
        read_only_fields = ['id', 'created_at']

    def validate_coldcalls(self, value):
        # Optional: Add custom validation (e.g., no negative numbers)
        if value < 0:
            raise serializers.ValidationError("Number of cold calls cannot be negative.")
        return value



class PropertyWantedAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyWantedArea
        fields = [
            'id', 
            'location', 
            'sale', 
            'rent', 
            'created_at'
        ]
        # created_at is auto-generated, so we make it read-only
        read_only_fields = ['id', 'created_at']

    def validate(self, data):
        # ✅ Optional Custom Validation: 
        # Ensure the client is either looking to Buy OR Rent (not both empty)
        if not data.get('sale') and not data.get('rent'):
            raise serializers.ValidationError(
                "You must select at least one option: 'sale' or 'rent'."
            )
        return data

# def validate(self, attrs):
#     # Optional: require at least one image
#     images = ['image_1', 'image_2', 'image_3', 'image_4']
#     if not any(attrs.get(img) for img in images):
#         raise serializers.ValidationError(
#             "At least one image is required."
#         )
#     return attrs


        
# class SendWhatsAppSerializer(serializers.Serializer):
#     """Used only for validating incoming send requests."""
#     to_number = serializers.CharField(max_length=20)
#     message_body = serializers.CharField()

#     def validate_to_number(self, value):
#         if not value.startswith('+'):
#             raise serializers.ValidationError("Number must be in E.164 format, e.g. +9715XXXXXXXX")
#         return value




        
    
# Type	 Payment Method	    Account From	               Account To
# Deposit	    Banks       Account(models.Model)-Forien   "banks" CHARFIELD just text    
# Deposit	    Cash        Account(models.Model)-Forien    CashBox(models.Model)-Forien   

# Withdraw	Banks	       "banks" CHARField just text      Account(models.Model)
# Withdraw	Cash	        CashBox(models.Model)-Forien    Account(models.Model)



        