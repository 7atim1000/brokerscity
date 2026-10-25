# crm/models.py
from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from rest_framework.pagination import PageNumberPagination
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from decimal import Decimal


import uuid
from django.utils import timezone
from datetime import date


# Authentication
# class Profile(models.Model):
#     USER = 'user'
#     VENDOR = 'vendor'
#     PROSPECT = 'prospect'  # Add PROSPECT if you need it

#     ROLE_CHOICES = [
#         (USER, 'User'),
#         (VENDOR, 'Vendor'),
#         (PROSPECT, 'Prospect'),  # Add this if needed
#     ]

#     user = models.OneToOneField(User, on_delete=models.CASCADE)
#     image = models.ImageField(upload_to='profiles/', null=True, blank=True)
#     role = models.CharField(
#         max_length=10,
#         choices=ROLE_CHOICES,
#         default=USER  # Or PROSPECT if that's your default
#     )

#     def __str__(self):
#         return self.user.username


class Permission(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="custom_permission",
    )

    # ---------- Work & Monitoring ----------
    ListWorkLog = models.BooleanField(
        default=False,
        help_text="Allow listing work logs",
    )
    monitoring = models.BooleanField(
        default=False,
        help_text="Allow listing monitoring logs",
    )
    add_monitor = models.BooleanField(
        default=False,
        help_text="Allow add monitoring",
    )

    # ---------- Business modules ----------
    property_management = models.BooleanField(
        default=False,
        help_text="Allow manage rent",
    )
    financials = models.BooleanField(
        default=False,
        help_text="Allow manage financials",
    )

    # ✅ MOVED from Profile → Permission
    can_view_users = models.BooleanField(
        default=False,
        help_text="Whether this user can view the full user list.",
    )
    can_manage_users = models.BooleanField(
        default=False,
        help_text="Whether this user can edit other users' profiles/roles.",
    )
    can_manage_permissions = models.BooleanField(
        default=False,
        help_text="Whether this user can change permissions.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Permission"
        verbose_name_plural = "Permissions"

    def __str__(self):
        enabled = [
            f.name
            for f in self._meta.fields
            if isinstance(f, models.BooleanField) and getattr(self, f.name)
        ]
        return f"Permission #{self.pk} — {', '.join(enabled) or 'none'}"



class Profile(models.Model):
    # ---------- Role ----------
    USER = 'user'

    LISTING = 'listing'
    AGENT = 'agent'
    MANAGER = 'manager'

    ROLE_CHOICES = [
        (USER, 'User'),
        (LISTING, 'Listing'),
        (AGENT, 'Agent'),
        (MANAGER, 'Manager'),
    ]

    # ---------- Activity Status ----------
    LOGGED_IN = 'logged_in'
    ONLINE = 'online'
    PAUSE = 'pause'
    OFFLINE = 'offline'
    LOGGED_OUT = 'logged_out'

    STATUS_CHOICES = [
        (LOGGED_IN, 'Logged In'),
        (ONLINE, 'Online'),
        (PAUSE, 'Pause'),
        (OFFLINE, 'Offline'),
        (LOGGED_OUT, 'Logged Out'),
    ]

    # ---------- Fields ----------
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='profiles/', null=True, blank=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=USER)

    status = models.CharField(
        max_length=15, choices=STATUS_CHOICES, default=OFFLINE,
    )

    # Timestamps
    last_login_at = models.DateTimeField(null=True, blank=True)
    last_logout_at = models.DateTimeField(null=True, blank=True)
    last_seen_at = models.DateTimeField(null=True, blank=True)
    last_pause_at = models.DateTimeField(null=True, blank=True)

    # Session tracking
    current_session_key = models.CharField(
        max_length=40, null=True, blank=True,
    )

    # ---------- Aggregated durations (in seconds) ----------
    total_online_seconds = models.BigIntegerField(default=0)
    total_pause_seconds = models.BigIntegerField(default=0)
    total_offline_seconds = models.BigIntegerField(default=0)
    total_logged_out_seconds = models.BigIntegerField(default=0)

    # ❌ REMOVED — the three permission fields below now live in the Permission model
    # can_view_users = models.BooleanField(...)
    # can_manage_users = models.BooleanField(...)
    # can_manage_permissions = models.BooleanField(...)

    class Meta:
        verbose_name = "Profile"
        verbose_name_plural = "Profiles"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.user.username} ({self.get_status_display()})"

    # ---------- Duration helpers ----------
    @property
    def total_online_days(self):
        return round(self.total_online_seconds / 86400, 2)

    @property
    def total_pause_days(self):
        return round(self.total_pause_seconds / 86400, 2)

    @property
    def total_offline_days(self):
        return round(self.total_offline_seconds / 86400, 2)

    @property
    def total_logged_out_days(self):
        return round(self.total_logged_out_seconds / 86400, 2)

    # ---------- Status helpers ----------
    def mark_logged_in(self, session_key=None):
        from django.utils import timezone
        self.status = self.LOGGED_IN
        self.last_login_at = timezone.now()
        self.last_seen_at = timezone.now()
        if session_key:
            self.current_session_key = session_key
        self.save(update_fields=[
            "status", "last_login_at", "last_seen_at", "current_session_key",
        ])

    def mark_online(self):
        from django.utils import timezone
        self.status = self.ONLINE
        self.last_seen_at = timezone.now()
        self.save(update_fields=["status", "last_seen_at"])

    def mark_pause(self):
        from django.utils import timezone
        self.status = self.PAUSE
        self.last_pause_at = timezone.now()
        self.save(update_fields=["status", "last_pause_at"])

    def mark_offline(self):
        self.status = self.OFFLINE
        self.save(update_fields=["status"])

    def mark_logged_out(self):
        
        from django.utils import timezone
        self.status = self.LOGGED_OUT
        self.last_logout_at = timezone.now()
        self.current_session_key = None
        self.save(update_fields=[
            "status", "last_logout_at", "current_session_key",
        ])
##############################################################
# DailyWorkLog
##############################################################
class DailyWorkLog(models.Model):
    """
    One record per user per day. Tracks that day's work session.
    """
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="daily_work_logs"
    )
    date = models.DateField()                     # the day this log belongs to

    # Times (local time)
    clock_in = models.DateTimeField(null=True, blank=True)
    clock_out = models.DateTimeField(null=True, blank=True)

    # Durations in seconds
    break_seconds = models.BigIntegerField(default=0)
    total_work_seconds = models.BigIntegerField(default=0)

    # Reason / metadata
    REASON_AUTO = "auto"
    REASON_MANUAL = "manual"
    REASON_CHOICES = [
        (REASON_AUTO, "Auto checked out"),
        (REASON_MANUAL, "Manual"),
    ]
    reason_for_change = models.CharField(
        max_length=20, choices=REASON_CHOICES, default=REASON_AUTO
    )

    class Meta:
        unique_together = ("user", "date")
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["date"]),
        ]

    def __str__(self):
        return f"{self.user.username} — {self.date}"

    @property
    def total_work_hours(self):
        h = self.total_work_seconds // 3600
        m = (self.total_work_seconds % 3600) // 60
        return f"{h}h {m}m"


class WorkLogComment(models.Model):
    """
    Comments attached to a daily work log.
    """
    log = models.ForeignKey(
        DailyWorkLog, on_delete=models.CASCADE, related_name="comments"
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.author.username}: {self.text[:40]}"


####
def get_or_create_today_log(user):
    today = timezone.localdate()
    log, created = DailyWorkLog.objects.get_or_create(
        user=user, date=today, defaults={"clock_in": timezone.now()}
    )
    return log



###############################################################
# Bank Model
###############################################################


###############################################################
# Bank Model
###############################################################
class Bank(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Name of the bank"
    )
    
    balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Current balance of the bank"
    )
    
    balance_opening = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Opening balance of the bank"
    )
    
    currency = models.CharField(
        max_length=3,
        default='SAR',
        choices=[
            ('AED', 'UAE Dirham'),
            ('USD', 'US Dollar'),
            ('EUR', 'Euro'),
            ('SAR', 'Saudi Riyal'),
        ],
        help_text="Currency of the account"
    )
    
    account_number = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Bank account number"
    )
    
    iban = models.CharField(
        max_length=34,
        blank=True,
        null=True,
        help_text="International Bank Account Number"
    )
    
    swift_code = models.CharField(
        max_length=11,
        blank=True,
        null=True,
        help_text="SWIFT/BIC code"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the bank account is active"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when the bank was created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date and time when the bank was last updated"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes about the bank"
    )


###############################################################
# Cash Box Model
###############################################################
class CashBox(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Name of the cash box"
    )
    
    balance_opening = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Opening balance of the cash box"
    )
    
    balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Current balance of the cash box"
    )
    
    currency = models.CharField(
        max_length=3,
        default='SAR',
        choices=[
            ('AED', 'UAE Dirham'),
            ('USD', 'US Dollar'),
            ('EUR', 'Euro'),
            ('SAR', 'Saudi Riyal'),
        ],
        help_text="Currency of the cash box"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the cash box is active"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date and time when last updated"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes about the cash box"
    )



###############################################################
# Accounts and Categories Model
###############################################################
class AccountCategory(models.Model):
    name = models.CharField(
        max_length=100,
        help_text="Name of the payment method"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date and time when last updated"
    )
    
    def __str__(self):
        return self.name
    
    


class Account(models.Model):
    EXPENSES = "expenses"
    REVENUES = "revenues"
    
    TYPE_CHOICES = [
        (EXPENSES, "Expenses"),  # Better display names
        (REVENUES, "Revenues"),
    ]
    
    name = models.CharField(
        max_length=100,
        help_text="Name of the payment method"
    )
    
    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
    )
    
    category = models.ForeignKey(
    AccountCategory,
    on_delete=models.PROTECT,  # Prevents deletion if accounts exist
    related_name="accounts",
    help_text="Categories of account"
)
# No null=True, no blank=True - field is required OR use CASCADE
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date and time when last updated"
    )
    
    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"
    

###############################################################
# Transaction Model
###############################################################
# def generate_default_transaction_no():
#     """Generate default transaction number starting from 101"""
#     try:
#         last_transaction = Transaction.objects.order_by('-id').first()
#         if last_transaction and last_transaction.transaction_no:
#             try:
#                 last_no = int(last_transaction.transaction_no)
#                 return str(last_no + 1)
#             except (ValueError, TypeError):
#                 return '101'
#         return '101'
#     except Exception:
#         return '101'



def generate_default_transaction_no():
    """Generate a shorter transaction number (max 20 chars)"""
    # Format: TRX-YYMMDD-XXXX (14 characters)
    timestamp = timezone.now().strftime('%y%m%d')
    random_num = uuid.uuid4().hex[:4].upper()
    return f"TRX-{timestamp}-{random_num}"  # e.g., TRX-240831-A1B2 (14 chars)


class Transaction(models.Model):
    WITHDRAW = "withdraw"
    DEPOSIT = "deposit"
    
    BANKS = "banks"
    CASH = "cash"
    
    TYPE_CHOICES = [
        (DEPOSIT, "Deposit / Income"),
        (WITHDRAW, "Withdraw / Expense"),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        (BANKS, "Banks"),
        (CASH, "Cash"),
    ]
    
    # Auto-generated transaction number - ensure it's not longer than 20 chars
    # transaction_no = models.CharField(
    #     max_length=20,  # Keep as 20
    #     unique=True,
    #     editable=False,
    #     default=generate_default_transaction_no,
    #     help_text="Auto-generated transaction number"
    # )
    
    transaction_no = models.CharField(
    max_length=20,
    unique=True,
    editable=True,
    help_text="Manual transaction number"
)
    
    transaction_date = models.DateField(
        help_text="Date of the transaction"
    )
    
    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        help_text="Type of transaction (deposit or withdraw)"
    )
    
    
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.01)],
        help_text="Transaction amount"
    )
    vat = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.01)],
        help_text="Transaction amount"
    )
    
    
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.01)],
        help_text="Transaction amount"
    )
    
    amount_deposit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.01)],
        help_text="Deposit amount"
    )
    
    amount_withdraw = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.01)],
        help_text="Withdraw amount"
    )
    
    amount_to_arabic = models.CharField(
        max_length=255,  # Increased to 255 to avoid truncation
        help_text="Amount number to arabic language",
        blank=True,
        null=True
    )
    amount_to_english = models.CharField(
        max_length=255,  # Increased to 255 to avoid truncation
        help_text="Amount number to english language",
        blank=True,
        null=True
    )
    
    currency = models.CharField(
        max_length=10,
        default="AED",
        choices=[
            ('AED', 'UAE Dirham'),
            ('USD', 'US Dollar'),
            ('EUR', 'Euro'),
            ('SAR', 'Saudi Riyal'),
        ],
        help_text="Currency of the transaction"
    )
    
    payment_method = models.CharField(
        max_length=10,
        choices=PAYMENT_METHOD_CHOICES,
        help_text="Type of payment (banks or cash)"
    )

    # Account From and To as CharFields
    # 🔧 CHANGED: Added default='' to fix migration
    account_from = models.CharField(
        max_length=255, 
        blank=True, 
        default='',  # ← ADDED: Default for migration
        verbose_name="From Account"
    )
    
    # 🔧 CHANGED: Added default='' to fix migration
    account_to = models.CharField(
        max_length=255, 
        blank=True, 
        default='',  # ← ADDED: Default for migration
        verbose_name="To Account"
    )
        
    # CashBox (used for Deposit via Cash or Withdraw via Cash)
    cashbox = models.ForeignKey(
        'CashBox',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        help_text="CashBox used for Cash transactions"
    )
    
    # Bank field (required if payment_method is banks)
    bank = models.ForeignKey(
        'Bank',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions_bank",
        help_text="Bank used on this transaction (required if payment_method is banks)"
    )
    
    # Check-related fields
    has_check = models.BooleanField(
        default=False,
        help_text="Check if transaction has a check"
    )
    
    # 🔧 CHANGED: Added default='' to fix migration
    check_no = models.CharField(
        max_length=50,
        blank=True,
        default='',  # ← ADDED: Default for migration
        help_text="Check number"
    )
    
    # 🔧 CHANGED: Added default='' to fix migration
    check_bank = models.CharField(
        max_length=100,
        blank=True,
        default='',  # ← ADDED: Default for migration
        help_text="Bank name on the check"
    )
    
    # 🔧 CHANGED: Added default='2024-01-01' to fix migration (DateField needs valid date!)
    check_date = models.DateField(
        blank=True,
        default='2024-01-01',  # ← ADDED: Default for migration (DateField!)
        help_text="Date on the check"
    )
    
    statement = models.CharField(
        max_length=100,
        help_text="Transaction description or statement"
    )
    
    # Person fields 
    # Withdraw
    person_receipt = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Person who received the amount"
    )
    
    # 🔧 CHANGED: Added default='' to fix migration
    person_deliver = models.CharField(
        max_length=100,
        blank=True,
        default='',  # ← ADDED: Default for migration
        help_text="Person who delivered the amount"
    )
    
    # Signature fields (base64 encoded)
    user_signature = models.TextField(
        null=True,
        blank=True,
        help_text="Signature of the transaction user (base64 encoded)"
    )
    
    manager_signature = models.TextField(
        null=True,
        blank=True,
        help_text="Signature of the transaction manager (base64 encoded)"
    )
    
    second_person_signature = models.TextField(
        null=True,
        blank=True,
        help_text="Signature of the person who received the amount (base64 encoded)"
    )
    # Frontend sends only the Base64 string (or the full data:image/...;base64, prefix — pick one convention and stick to it).
    
    # Document fields
    has_document = models.BooleanField(
        default=False,
        help_text="Check if transaction has a document"
    )
    document = models.ImageField(
        upload_to='transactions/documents/',
        null=True,
        blank=True,
        help_text="Upload scanned document or receipt"
    )
    
    # 🔧 CHANGED: Added default='' to fix migration
    document_no = models.CharField(
        max_length=50,
        blank=True,
        default='',  # ← ADDED: Default for migration
        help_text="Document or reference number",
        null=True
    )
    
    # User who created the transaction
    transaction_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions_created",
        help_text="User who created this transaction"
    )

    confirmation = models.BooleanField(default = False, help_text="confirmation status")
    confirmation_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions_confirmed",
        help_text="User who confirmed this transaction"
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when the transaction was created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date and time when the transaction was last updated"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Additional notes about the transaction"
    )
    
    def __str__(self):
        return f"{self.transaction_no} - {self.statement[:50]}"
    
    def save(self, *args, **kwargs):
        # Ensure transaction_no is not too long
        if self.transaction_no and len(self.transaction_no) > 20:
            # Truncate or regenerate
            self.transaction_no = self.transaction_no[:20]
        super().save(*args, **kwargs)



# Customers 
# pip install twilio python-dotenv
class Customer(models.Model):
    name = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=15, unique=True)  # e.g., +1234567890
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.phone_number}"


# What's messaages
class WhatsAppMessage(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    ]

    to_number = models.CharField(max_length=20)  # e.g. +9715XXXXXXXX
    message_body = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    twilio_sid = models.CharField(max_length=50, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"WhatsApp to {self.to_number} - {self.status}"


################################################
# Properties Management
################################################

class Owner(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        help_text="Name of the owner"
    )

    phone = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        help_text="Phone number of the owner"
    )

    # New field
    id_number = models.CharField(max_length=100, help_text="Ownwe id number", null=True,)
    email = models.CharField(max_length=100, help_text="Owner email", null=True,)

    address = models.CharField(
        max_length=255,
        db_index=True,
        blank=True,
        null=True,
        help_text="Address of the owner"
    )

    balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        blank=True,
        null=True,
        help_text="Current balance of the owner"
    )

    balance_opening = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        blank=True,
        null=True,
        help_text="Opening balance of the owner"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when the owner was created"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date and time when the owner was last updated"
    )

    def __str__(self):
        return self.name or f"Owner #{self.pk}"


class Building(models.Model):

    TYPE_CHOICES = [
        ('building', 'Building'),
        ('vila', 'Vila'),
    ]

    STATUS_CHOICES = [
        ('residential', 'Residential'),
        ('commercial', 'Commercial'),
    ]

    owner = models.ForeignKey(
        Owner,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="building_owner",
        help_text="Owner who owns this building"
    )

    name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True,
        null=True,
        help_text="Name of the category"
    )

    type = models.CharField(
        max_length=100,
        choices=TYPE_CHOICES,
        default='building',
        blank=True,
        null=True
    )

    status = models.CharField(
        max_length=100,
        choices=STATUS_CHOICES,
        default='residential',
        blank=True,
        null=True
    )

    area = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    location = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Date and time when the category was created"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Date and time when the category was last updated"
    )

    def __str__(self):
        return self.name or f"Category #{self.pk}"



class Unit(models.Model):

    TYPE_CHOICES = [
        ("apartment", "Apartment"),
        ("vila", "Vila"),
        ("room", "Room"),
    ]

    STATUS_CHOICES = [
        ("occupied", "Occupied"),
        ("available", "Available"),
    ]

    FLOOR_CHOICES = [
        ("first", "First"),
        ("second", "Second"),
        ("third", "Third"),
        ("forth", "Forth"),
        ("fifth", "Fifth"),
        ("sixth", "Sixth"),
        ("seventh", "Seventh"),
        ("eighth", "Eighth"),
        ("ninth", "Ninth"),
        ("tenth", "Tenth"),
    ]

    FURNISHED_CHOICES = [
        ("furnished", "Furnished"),
        ("unfurnished", "Unfurnished"),
    ]

    category = models.ForeignKey(
        "Building",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="units",
        help_text="Category of unit",
    )

    name = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        null=True,     # allow multiple unnamed units
        help_text="Name of unit",
    )

    floor = models.CharField(
        max_length=100,
        choices=FLOOR_CHOICES,
        default="first",
        blank=True,
        null=True,
    )

    type = models.CharField(
        max_length=100,
        choices=TYPE_CHOICES,
        default="apartment",
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=100,
        choices=STATUS_CHOICES,
        default="available",   # ✅ fixed default
        blank=True,
        null=True,
    )

    price = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
        blank=True, 
        null=True,
        help_text="Current price of the unit",
    )

    security_deposit = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0"))],
        blank=True,
        null=True,
        help_text="Security deposit of the unit",
    )

    area = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Area of unit",
    )

    
    bedrooms = models.PositiveIntegerField(blank=True, null=True)
    bathrooms = models.PositiveIntegerField(blank=True, null=True)

    parking = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Number of parking spaces",
    )

    # New field
    kind = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Kind of unit",
    )

    # has_parking can be derived:
    @property
    def has_parking(self):
        return bool(self.parking and self.parking > 0)

    furnished = models.CharField(
        max_length=20,
        choices=FURNISHED_CHOICES,
        default="unfurnished",
    )

    image_1 = models.ImageField(upload_to="units/", blank=True, null=True)
    image_2 = models.ImageField(upload_to="units/", blank=True, null=True)
    image_3 = models.ImageField(upload_to="units/", blank=True, null=True)
    image_4 = models.ImageField(upload_to="units/", blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Unit"
        verbose_name_plural = "Units"
        indexes = [
            models.Index(fields=["status", "type"]),
        ]

    def __str__(self):
        return self.name or f"Unit #{self.pk}"




class Rental(models.Model):
    name = models.CharField(max_length=100, help_text="Rental name", null=True,)
    nationality = models.CharField(max_length=100, help_text="Rental location", null=True,)
    phone_1 = models.CharField(max_length=100, help_text="Rental phone number", null=True,)
    phone_2 = models.CharField(max_length=100, help_text="Rental second phone number", null=True,)
    id_number = models.CharField(max_length=100, help_text="Rental phone number", null=True,)
    email = models.CharField(max_length=100, help_text="Rental email address", null=True,)
    insurance_balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        blank=True,
        null=True,
        help_text="Current balance of the owner"
    )
    balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        blank=True,
        null=True,
        help_text="Current balance of the owner"
    )

    
    def __str__(self):
        return self.name





class Rent(models.Model):
    rental_name = models.ForeignKey(
        Rental,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rents",
        help_text="The Tenant / Rental contract",
    )
    unit_name = models.ForeignKey(
        Unit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rents",
        help_text="The unit that will be rented",
    )

    start_date = models.DateField(help_text="Rent start date")
    end_date = models.DateField(help_text="Rent end date")

    # Auto-calculated in serializer: months between start_date and end_date
    total_months = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Total number of months in the contract",
    )

    # Number of installments (e.g., 12 monthly, 4 quarterly)
    installment_no = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Number of installments",
    )

    # Auto-calculated in serializer: total_value / installment_no
    installment_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Installment amount",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]
        verbose_name = "Rent"
        verbose_name_plural = "Rents"

    def __str__(self):
        tenant = self.rental_name or "—"
        unit = self.unit_name or "—"
        return f"{tenant} — {unit} ({self.start_date} → {self.end_date})"

        

class MonthlyPayment(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("partial", "Partial"),
        ("late", "Late"),
        ("cancelled", "Cancelled"),
    ]

    rent = models.ForeignKey(
        Rent,
        on_delete=models.CASCADE,
        related_name="monthly_payments",
    )

     # ✅ UPDATED: Max length increased for text ("October")
    month = models.CharField(
        max_length=20, 
        help_text="Month name (e.g., October)", 
        blank=True, 
        null=True
    )

    amount_due = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    amount_paid = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    # 👇 new — auto-fill from Unit, can be overridden
    security_deposit = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Security deposit for this payment (auto-filled from Unit, can be overridden)",
    )

    due_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )

    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["rent", "month"],
                name="unique_rent_month_payment",
            ),
        ]

    # def __str__(self):
    #     return f"{self.rent} — {self.month:%Y-%m} — {self.status}"
    def __str__(self):
        # ✅ FIXED: Removed the Date formatting (%Y-%m) to prevent a crash
        return f"{self.rent} — {self.month or 'No Month'} — {self.status}"

    # 👇 computed, always correct
    @property
    def amount_remaining(self):
        return (self.amount_due or Decimal("0.00")) - (
            self.amount_paid or Decimal("0.00")
        )




#######################################################
#######################################################
# WEBSITE 

class Slider(models.Model):
    name = models.CharField(max_length=200, help_text="Slider name", null=True,)
    location = models.CharField(max_length=100, help_text="Slider location", null=True,)

    image = models.ImageField(
        upload_to='slider/', blank=True, null=True, help_text="Main slider image"
    )
    image_1 = models.ImageField(
        upload_to='slider/', blank=True, null=True, help_text="First slider image"
    )
    image_2 = models.ImageField(
        upload_to='slider/', blank=True, null=True, help_text="Second slider image"
    )
    image_3 = models.ImageField(
        upload_to='slider/', blank=True, null=True, help_text="Third slider image"
    )
    image_4 = models.ImageField(
        upload_to='slider/', blank=True, null=True, help_text="Fourth slider image"
    )

    starting_price = models.CharField(max_length=100, help_text="Starting price", null=True,)
    payment_plan = models.CharField(max_length=100, help_text="Payment plan", null=True,)
    booking_fee = models.CharField(max_length=100, help_text="Booking fee", null=True,)
    handover = models.CharField(max_length=100, help_text="Handover", null=True,)

    developer = models.CharField(max_length=100, help_text="Developer", null=True,)
    area_from = models.CharField(max_length=100, help_text="Area from", null=True,)
    studios = models.CharField(max_length=100, help_text="Studios", null=True,)
    apartments = models.CharField(max_length=100, help_text="Apartments", null=True,)
    townhouses = models.CharField(max_length=100, help_text="Townhouses", null=True,)
    duplexes = models.CharField(max_length=100, help_text="Duplexes", null=True,)
    penthouses = models.CharField(max_length=100, help_text="Penthouses", null=True,)

    license_number = models.CharField(max_length=100, help_text="License number", null=True,)
    project_number = models.CharField(max_length=100, help_text="Project number", null=True,)

    description = models.TextField(help_text="Slider description", null=True,)

    def __str__(self):
        return self.name
        




#######################################################
#######################################################
# Devolpers

class Developer(models.Model):
    name = models.CharField(max_length=100, help_text="Developer name", null=True, blank=True)
    phone = models.CharField(max_length=100, help_text="Developer phone", null=True, blank=True)
    email = models.CharField(max_length=100, help_text="Rental email address", null=True, blank=True)
    type = models.CharField(max_length=100, help_text="Developer type", null=True, blank=True)
    Registered = models.BooleanField(
        blank=True,
        null=True,
        help_text="Whether the unit has parking"
    )

    def __str__(self):
        return self.name or f"Developer #{self.pk}"



class Offersale(models.Model):
    # ---------- Header ------------------
    reference_no = models.CharField(max_length=100, help_text="Reference No", null=True, blank=True)
    date = models.DateField(null=True, blank=True, help_text="Offer date")
    recipient_name = models.CharField(max_length=200, null=True, blank=True,help_text="Recipient / customer name (Dear X)")
    
    # ---------- Project & Unit ----------
    project = models.CharField(max_length=100, help_text="Project name", null=True, blank=True)
    unit_no = models.CharField(
        max_length=100,
        unique=True,          # ← required for FK to_field
        null=True,
        blank=True,
        help_text="Unit Number",
    )
    estimated_completion_date = models.CharField(max_length=100, help_text="Estimated Date", null=True, blank=True)

    # ---------- Listing headline ----------
    listing_title = models.CharField(max_length=200, null=True, blank=True, help_text="e.g. 6BR Villa for Sale in Saadiyat Lagoons")
    
    # ---------- Unit details ----------
    unit_type = models.CharField(max_length=100, help_text="Unit type", null=True, blank=True)
    unit_model = models.CharField(max_length=100, help_text="Unit type", null=True, blank=True)
    bedrooms = models.CharField(max_length=50, null=True, blank=True, help_text="e.g. 6BR Villa")
    unit_position = models.CharField(max_length=100, null=True, blank=True, help_text="e.g. Single row-Corner")
    unit_grade = models.CharField(max_length=50, null=True, blank=True, help_text="e.g. Premium")
    unit_note = models.CharField(max_length=100, null=True, blank=True, help_text="Extra note e.g. Cool")
    
    # ---------- Area
    plot_area = models.CharField(max_length=100, help_text="Total Area", null=True, blank=True)
    gross_saleable_area = models.CharField(max_length=100, help_text="Total Area", null=True, blank=True)
    total_area = models.CharField(max_length=100, help_text="Total Area", null=True, blank=True)
    internal_area = models.CharField(max_length=100, help_text="Total Area", null=True, blank=True)
    terrace_area = models.CharField(max_length=100, help_text="Total Area", null=True, blank=True)

    # ---------- Property image ----------
    image = models.ImageField(
        upload_to="offersale/images/",
        null=True, blank=True,
        help_text="Property image"
    )
    image_url = models.URLField(
        null=True, blank=True,
        help_text="Optional external image URL (alternative to upload)"
    )
    # ---------- Currency ----------
    currency = models.CharField(max_length=10, default="AED", help_text="Currency code",)
    
    # ---------- Financial details ----------
    base_price = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], blank=True, null=True,
        help_text="Original / Base Price"
    )
    selling_price = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], blank=True, null=True,
        help_text="Selling price"
    )
    premium_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], blank=True, null=True,
        help_text="Premium amount"
    )
    noc_fee = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], blank=True, null=True,
        help_text="NOC fee paid by buyer"
    )
    transfer_fee = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], blank=True, null=True,
        help_text="Transfer fee (usually 2%)"
    )
    agency_fee = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], blank=True, null=True,
        help_text="Agency fee (2% + VAT)"
    )
    owner_paid_total = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], blank=True, null=True,
        help_text="Total paid by owner to developer"
    )
    buyer_total = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], blank=True, null=True,
        help_text="Total fees and payments to be paid by buyer"
    )

    # ---------- Promotion & Waivers ----------
    promotion = models.CharField(
        max_length=200, help_text="Promotion title", null=True, blank=True
    )
    waiver = models.CharField(
        max_length=100, help_text="Waiver (AMC)", null=True, blank=True,  
    )
    waiver_second = models.CharField(
        max_length=100, help_text="Waiver (DLP)", null=True, blank=True
    )



    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return self.reference_no or f"Offersale #{self.pk}"


#=======Payment Plan

class PaymentPlan(models.Model):
    """
    Payment plan linked to an Offersale via unit_no.
    Installments are stored as a JSON list of objects:
    [
      {"inst_no": 1, "milestone": "Payment 1", "percentage": "5.00",
       "date": "2024-09-11", "amount": "443777.00"},
      ...
    ]
    """
    # ---------- ForeignKey to Offersale using unit_no ----------
    unit_no = models.ForeignKey(
        "Offersale",
        to_field="unit_no",           # ← match by unit_no string
        db_column="unit_no",
        on_delete=models.CASCADE,
        related_name="payment_plans",
        null=True,
        blank=True,
    )

    # ---------- Installments (JSON list of objects) ----------
    installments = models.JSONField(
        default=list,
        blank=True,
        help_text="List of installment objects "
                  "(inst_no, milestone, percentage, date, amount)"
    )

    # ---------- Summary block ----------
    base_price = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], null=True, blank=True,
        help_text="Base Price"
    )
    final_price = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], null=True, blank=True,
        help_text="Final Price"
    )
    adm_fee = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], null=True, blank=True,
        help_text="ADM Fee"
    )
    adm_admin_fee = models.DecimalField(
        max_digits=15, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)], null=True, blank=True,
        help_text="ADM Admin Fee"
    )

    # ---------- Meta ----------
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        verbose_name = "Payment Plan"
        verbose_name_plural = "Payment Plans"
        ordering = ["-id"]

    def __str__(self):
        return f"Plan for {self.unit_no_id or 'N/A'}"




#================================
# Monitoring
#================================
class Property(models.Model):
    month = models.CharField(max_length=20, null=True, blank=True)
    property_no = models.IntegerField(help_text="Property No", null=True, blank=True)
    live_no = models.IntegerField(help_text="Live No", null=True, blank=True)
    draft_no = models.IntegerField(help_text="Draft No", null=True, blank=True)
    sale_no = models.IntegerField(help_text="Sale No", null=True, blank=True)
    rent_no = models.IntegerField(help_text="Rent No", null=True, blank=True)
    

    def __str__(self):
        return f"Property #{self.property_no or self.pk} - {self.month or ''}"




class PropertyColdCalls(models.Model):
    agent = models.CharField(
        max_length=100, 
        help_text="Agent name", 
        null=True, 
        blank=True
    )

    # ✅ FIXED: Added () to instantiate the field. Added default=0.
    coldcalls = models.IntegerField(default=0, help_text="Number of cold calls")
    project = models.CharField(
        max_length=100, 
        help_text="Project name", # ✅ FIXED: Changed from "Agent name"
        null=True, 
        blank=True
    )
    
    # Optional: Add created_at so you know when the call was logged
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        # ✅ FIXED: Removed non-existent fields (property_no, month)
        # Now shows the Agent and the Project
        return f"{self.agent or 'Unknown Agent'} - {self.project or 'No Project'} ({self.coldcalls} calls)"




class PropertyWantedArea(models.Model):
    location = models.CharField(
        max_length=100, 
        help_text="Desired location", # ✅ FIXED: Changed from "Agent name"
        null=True, 
        blank=True
    )
    # ✅ FIXED: Added () and default=False
    sale = models.BooleanField(
        default=False, 
        help_text="Is the client looking to buy (Sale)?"
    )
    # ✅ FIXED: Added () and default=False
    rent = models.BooleanField(
        default=False, 
        help_text="Is the client looking to rent?"
    )
    
    # Optional: Add created_at
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)

    def __str__(self):
        # ✅ FIXED: Removed non-existent fields (property_no, month)
        # Now shows the Location and what the client wants
        wants = []
        if self.sale: wants.append("Sale")
        if self.rent: wants.append("Rent")
        action = " & ".join(wants) if wants else "Unknown"
        
        return f"{self.location or 'Unknown Location'} - ({action})"


class Monitor(models.Model):
    """
    Monitoring Model
    """
    date = models.DateField(null=True, blank=True)
    month = models.CharField(max_length=20, null=True, blank=True)

    lead_no = models.IntegerField(help_text="Lead No", null=True, blank=True)
    
    agent = models.CharField(max_length=100, help_text="Agent name", null=True, blank=True)

    agent_contact_duration = models.CharField(help_text="Agent contact duration", null=True, blank=True)
    agent_assigned_duration = models.CharField(help_text="Agent contact duration", null=True, blank=True)
    
    agent_lead_no = models.IntegerField(help_text="Agent Lead No", null=True, blank=True)
    lead_reassigned_no = models.IntegerField(help_text="Lead No", null=True, blank=True)
    viewing_lead_no = models.IntegerField(help_text="Agent Viewing Lead No", null=True, blank=True)
    success_lead_no = models.IntegerField(help_text="Agent Success Lead No", null=True, blank=True)

    agent_contact_comment = models.CharField(max_length=255, help_text="Agent Contact Comment", null=True, blank=True)
    agent_reassigned_comment = models.CharField(max_length=255, help_text="Agent Contact Comment", null=True, blank=True)

    draws = models.FloatField(null=True, blank=True)
    draws_no = models.IntegerField(help_text="Draws No", null=True, blank=True)
    draws_cause = models.CharField(max_length=255, help_text="Draws cause", null=True, blank=True)

    estimate = models.CharField(max_length=255, help_text="Draws cause", null=True, blank=True)

    # ---------- Meta ----------
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Monitoring for Lead {self.lead_no}"


        


# created_at field WHEN migrations: 
# It is impossible to add the field 'created_at' with 'auto_now_add=True' to paymentmethod without providing a default.
# Please select a fix:
#  1) Provide a one-off default now which will be set on all existing rows
#  2) Quit and manually define a default value in models.py.
# Select an option: 
# Enter 1 and then use this default value:

# text
# timezone.now