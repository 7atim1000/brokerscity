from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from .models import Profile, CashBox, Bank, Transaction, Account, AccountCategory, Customer, WhatsAppMessage, Owner, Building, Unit, Slider, Rental, Developer, Offersale, PaymentPlan, Monitor, Rent, MonthlyPayment, get_or_create_today_log, Property, Permission, PropertyColdCalls, PropertyWantedArea, AdLead, LandingPageConfig, Lead,  CrmOwner, CrmListing, ListingImage, ArchiveOwner, PermitNo, ArchiveProperty, Maintenance 
from rest_framework.response import Response
from rest_framework import status, generics, filters
from django.shortcuts import render, get_object_or_404

from django.db.models import Q, Count
from django.shortcuts import get_object_or_404

# image upload: 
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
###############
import inspect

# Dashboard
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from decimal import Decimal
################
# Twilio
################
from rest_framework import viewsets
from rest_framework.decorators import action
from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client
from django.conf import settings
import logging
import traceback
from rest_framework_simplejwt.views import TokenObtainPairView
###############
# Backup
##############
import os
import subprocess
from django.http import JsonResponse

##############
# Website
#############
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser  #

##############
# Email
##############
from datetime import datetime
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.core.mail import send_mail  

###############
# Filter
###############
# pip install django-filter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

################
# Openpy xl | Bulk Create | pip install pandas openpyxl
################
import pandas as pd
from collections import Counter
from django.db import transaction
from rest_framework import serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from django.db.models import Q, CharField
# For search
from django.db.models.functions import Cast
from rest_framework import generics, filters

from .serializers import (
    UserSerializer,
    UserListSerializer,
    RegisterSerializer,
    LoginSerializer,
    BankSerializer,
    BankListSerializer,
    BankCreateUpdateSerializer,
    BankPagination,
    ManagerUserUpdateSerializer,
    SelfUserUpdateSerializer,

    CashBoxSerializer,
    CashBoxCreateUpdateSerializer,
    CashBoxListSerializer,
    
    AccountCategorySerializer, 
    AccountSerializer, 
    AccountListSerializer,

    TransactionListSerializer,
    TransactionDetailSerializer,
    TransactionCreateUpdateSerializer,

    DashboardSummarySerializer, 
    DashboardChartSerializer,
    DashboardTransactionSerializer,

    CustomerSerializer,
    # Twilio
    WhatsAppMessageSerializer,
    SendWhatsAppSerializer,


    # Properties Management 
    OwnerSerializer,
    BuildingSerializer,
    UnitSerializer,
    RentalSerializer,
    RentSerializer, MonthlyPaymentSerializer,
    MaintenanceSerializer,
    # Website
    SliderSerializer,
    
    # Developer
    DeveloperSerializer, DeveloperDetailSerializer, SendEmailSerializer, 

    # OfferSale
    OffersaleListSerializer,
    OffersaleDetailSerializer,
    OffersaleWriteSerializer,
    PaymentPlanSerializer,
    PaymentPlanSerializer,

    # Monitoring
    MonitorSerializer,
    MonitorCreateSerializer,
    PropertySerializer,
    PermissionSerializer,

    PropertyColdCallsSerializer,
    PropertyWantedAreaSerializer,
    AdLeadSerializer, LandingPageConfigSerializer, 

    # CRM
    LeadSerializer, 

    # CRM Listing
    CrmOwnerSerializer,
    CrmListingSerializer,
    ArchiveOwnerSerializer,

    PermitNoSerializer,
    ArchivePropertySerializer,
    
    )

# Dashboard

logger = logging.getLogger(__name__)


# Pagination
# from .pagination import ProjectPagination
from rest_framework.pagination import PageNumberPagination

# Login solve Login issue 
from rest_framework_simplejwt.tokens import RefreshToken   # ⬅️ ADD THIS
# crm 
from rest_framework import status as drf_status
# Work log
from calendar import monthrange


# Create your views here.
# manual database backup

# Restrict user usage Helper
def _user_can_view_worklog(user):
    """
    True if:
      - superuser / staff → always allowed
      - OR has Permission row with ListWorkLog=True
      - OR profile.can_view_users = True  (keep your existing rule)
    """
    if not user or not user.is_authenticated:
        return False

    if user.is_staff or user.is_superuser:
        return True

    # ✅ NEW: check Permission model
    perm = getattr(user, "custom_permission", None)   # related_name from OneToOneField
    if perm and perm.ListWorkLog:
        return True

    # keep existing fallback
    me_profile = getattr(user, "profile", None)
    if me_profile and me_profile.can_view_users:
        return True

    return False



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def database_backup_view(request):

    # Only admin users
    if not request.user.is_staff:
        return JsonResponse(
            {
                "success": False,
                "message": "Permission denied."
            },
            status=403
        )

    try:
        database_url = os.getenv("DATABASE_URL")

        if not database_url:
            return JsonResponse(
                {
                    "success": False,
                    "message": "DATABASE_URL is not configured."
                },
                status=500
            )

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        backup_dir = os.path.join(
            settings.BASE_DIR,
            "backups"
        )

        os.makedirs(
            backup_dir,
            exist_ok=True
        )

        backup_file = os.path.join(
            backup_dir,
            f"database_backup_{timestamp}.sql"
        )

        subprocess.run(
            [
                "pg_dump",
                database_url,
                "-f",
                backup_file,
            ],
            check=True
        )

        return JsonResponse(
            {
                "success": True,
                "message": "Database backup created successfully.",
                "filename": os.path.basename(backup_file),
            }
        )

    except subprocess.CalledProcessError as error:

        return JsonResponse(
            {
                "success": False,
                "message": f"Database backup failed: {error}"
            },
            status=500
        )

    except Exception as error:

        return JsonResponse(
            {
                "success": False,
                "message": str(error)
            },
            status=500
        )

#==============================================================================
# CRM
#==============================================================================
# Start Permissions
#==============================================================================
# views.py
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_permissions(request):
    """
    GET /api/permissions/me/
    Returns the current user's permission flags.
    If the user has no permission row, returns all false.
    """
    try:
        perm = Permission.objects.get(user=request.user)
    except Permission.DoesNotExist:
        # If no permissions row exists, return all False
        return Response({
            "ListWorkLog": False,
            "monitoring": False,
            "add_monitor": False,
            "property_management": False,
            "financials": False,
            "can_view_users": False,
            "can_manage_users": False,
            "can_manage_permissions": False,
            "ads": False,
            "leads": False,

            # CRM Lead 
            "view_all_lead": False,
            "view_my_lead": False,
            "create_new_lead": False,
            "update_lead": False,
            "update_lead_stage": False,
            "update_lead_responsible": False,
            "delete_lead": False,

            # CRM Listing
            "view_all_listing": False,
            "view_my_listing": False,
            "create_new_listing": False,
            "update_listing": False,
            "delete_listing": False,
            "confirm_listing": False,

            "view_all_listing_owners": False,
            "view_my_listing_owners": False,
            "create_new_listing_owners": False,
            "update_listing_owners": False,
            "delete_listing_owners": False,

            "view_all_archive_owners": False,
            "view_my_archive_owners": False,
            "create_bulk_archive_owners": False,
            "update_bulk_responsibility_archive_owners": False,
            "delete_bulk_archive_owners": False,

            "view_all_archive_properties": False,
            "view_my_archive_properties": False,
            "create_bulk_archive_properties": False,
            "update_bulk_responsibility_archive_properties": False,
            "delete_bulk_archive_properties": False,

            "view_all_permit_numbers": False,
            "create_new_permit_number": False,
            "update_permit_number": False,
            "delete_permit_number": False,
            
        })

    # ✅ FIXED: Added all fields to the success response
    return Response({
        "ListWorkLog": perm.ListWorkLog,
        "monitoring": perm.monitoring,
        "add_monitor": perm.add_monitor,
        "property_management": perm.property_management,
        "financials": perm.financials,
        "can_view_users": perm.can_view_users,
        "can_manage_users": perm.can_manage_users,
        "can_manage_permissions": perm.can_manage_permissions,
        "ads": perm.ads,
        "leads": perm.leads,

        # CRM Lead 
        "view_all_lead": perm.view_all_lead,
        "view_my_lead": perm.view_my_lead,
        "create_new_lead": perm.create_new_lead,
        "update_lead": perm.update_lead,
        "update_lead_stage": perm.update_lead_stage,
        "update_lead_responsible": perm.update_lead_responsible,
        "delete_lead": perm.delete_lead,

        # CRM Listing
        "view_all_listing": perm.view_all_listing,
        "view_my_listing": perm.view_my_listing,
        "create_new_listing": perm.create_new_listing,
        "update_listing": perm.update_listing,
        "delete_listing": perm.delete_listing,
        "confirm_listing": perm.confirm_listing,

        "view_all_listing_owners": perm.view_all_listing_owners,
        "view_my_listing_owners": perm.view_my_listing_owners,
        "create_new_listing_owners": perm.create_new_listing_owners,
        "update_listing_owners": perm.update_listing_owners,
        "delete_listing_owners": perm.delete_listing_owners,

        "view_all_archive_owners": perm.view_all_archive_owners,
        "view_my_archive_owners": perm.view_my_archive_owners,
        "create_bulk_archive_owners": perm.create_bulk_archive_owners,
        "update_bulk_responsibility_archive_owners": perm.update_bulk_responsibility_archive_owners,
        "delete_bulk_archive_owners": perm.delete_bulk_archive_owners,
       
    })

# ---------- CREATE ----------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def permission_create(request):
    """
    POST /api/permissions/create/
    Body: {
        "user": <id>,
        "ListWorkLog": true,
        "monitoring": false,
        "add_monitor": true
    }
    """
    serializer = PermissionSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                "message": "تم إضافة الصلاحيات بنجاح.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------- UPDATE (full or partial) ----------
@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def permission_update(request, pk):
    """
    PUT/PATCH /api/permissions/<pk>/update/
    Body (partial ok): { "ListWorkLog": false, "monitoring": true }
    """
    try:
        obj = Permission.objects.get(pk=pk)
    except Permission.DoesNotExist:
        return Response(
            {"error": "الصلاحيات غير موجودة."},
            status=status.HTTP_404_NOT_FOUND,
        )

    partial = request.method == "PATCH"
    serializer = PermissionSerializer(obj, data=request.data, partial=partial)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                "message": "تم تحديث الصلاحيات بنجاح.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------- LIST ----------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def permission_list(request):
    """
    GET /api/permissions/
    Returns all permission rows.
    Optional: ?user=<id> to filter by user.
    Optional: ?search=<text> to search by username/email.
    """
    queryset = (
        Permission.objects.select_related("user")
        .all()
        .order_by("-created_at")
    )

    user_id = request.query_params.get("user")
    if user_id:
        queryset = queryset.filter(user_id=user_id)

    search = request.query_params.get("search")
    if search:
        queryset = queryset.filter(
            user__username__icontains=search
        ) | queryset.filter(
            user__email__icontains=search
        )

    serializer = PermissionSerializer(queryset, many=True)
    return Response(
        {
            "count": queryset.count(),
            "results": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ---------- DELETE (optional, useful for UI) ----------
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def permission_delete(request, pk):
    """
    DELETE /api/permissions/<pk>/delete/
    """
    try:
        obj = Permission.objects.get(pk=pk)
    except Permission.DoesNotExist:
        return Response(
            {"error": "الصلاحيات غير موجودة."},
            status=status.HTTP_404_NOT_FOUND,
        )

    obj.delete()
    return Response(
        {"message": "تم حذف الصلاحيات بنجاح."},
        status=status.HTTP_200_OK,
    )


# ###########################
# Start Authentication
# ##########################
# =========================================================
# USERS — LIST ALL WITH STATUS
# =========================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def users_list_view(request):
    """
    List all users with their profile status.

    Permission gating is handled by the frontend via
    GET /api/permissions/me/ — see PermissionsContext.
    This endpoint only requires authentication.
    """
    qs = User.objects.select_related("profile").all().order_by("username")

    # ---------- Filters ----------
    status_filter = request.query_params.get("status")
    if status_filter:
        qs = qs.filter(profile__status=status_filter)

    role_filter = request.query_params.get("role")
    if role_filter:
        qs = qs.filter(profile__role=role_filter)

    active_filter = request.query_params.get("active")
    if active_filter is not None:
        active_filter = active_filter.lower()
        if active_filter in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        elif active_filter in ("false", "0", "no"):
            qs = qs.filter(is_active=False)

    search = request.query_params.get("search")
    if search:
        qs = qs.filter(
            Q(username__icontains=search) | Q(email__icontains=search)
        )

    serializer = UserListSerializer(qs, many=True)

    # ---------- Summary counts ----------
    # ✅ UPDATED: Removed logged_in and logged_out, kept only online, pause, offline
    summary = {
        "total": qs.count(),
        "online": qs.filter(profile__status=Profile.ONLINE).count(),
        "pause": qs.filter(profile__status=Profile.PAUSE).count(),
        "offline": qs.filter(profile__status=Profile.OFFLINE).count(),
        "active": qs.filter(is_active=True).count(),
        "inactive": qs.filter(is_active=False).count(),
    }

    return Response(
        {
            "count": qs.count(),
            "summary": summary,
            "users": serializer.data,
        },
        status=drf_status.HTTP_200_OK,
    )


# =========================================================
# USERS — DETAIL
# GET /api/users/<id>/
# =========================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def user_detail_view(request, pk):
    """
    Retrieve a single user with profile info.
    Requires: can_view_users (on Permission) OR staff.
    """
    # ✅ FIXED: Read from Permission model instead of Profile
    permission = getattr(request.user, "custom_permission", None)
    can_view_users = bool(getattr(permission, "can_view_users", False))

    has_permission = request.user.is_staff or can_view_users
    
    if not has_permission:
        return Response(
            {"message": "ليس لديك صلاحية لعرض المستخدمين."},
            status=drf_status.HTTP_403_FORBIDDEN,
        )

    try:
        # ✅ Removed select_related to prevent FieldError crashes
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(
            {"message": "المستخدم غير موجود."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    # Assuming UserSerializer is the one we updated earlier
    serializer = UserSerializer(user)
    
    return Response(
        {"user": serializer.data},
        status=drf_status.HTTP_200_OK,
    )

# =========================================================
# USERS — REMOVE
# DELETE /api/users/<id>/delete/
# =========================================================
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def user_delete_view(request, pk):
    """
    Delete a user (profile cascades).
    Requires: can_manage_users (on Permission) OR staff.
    """
    # ✅ FIXED: Read from Permission model instead of Profile
    permission = getattr(request.user, "custom_permission", None)
    can_manage_users = bool(getattr(permission, "can_manage_users", False))

    has_permission = request.user.is_staff or can_manage_users
    
    if not has_permission:
        return Response(
            {"message": "ليس لديك صلاحية لحذف المستخدمين."},
            status=drf_status.HTTP_403_FORBIDDEN,
        )

    # Prevent self-delete
    if request.user.id == pk:
        return Response(
            {"message": "لا يمكنك حذف حسابك الخاص."},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(
            {"message": "المستخدم غير موجود."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    username = user.username
    user.delete()

    return Response(
        {"message": f"تم حذف المستخدم {username} بنجاح."},
        status=drf_status.HTTP_200_OK,
    )



# =========================================================
# PROFILE — STATUS ENDPOINTS | Helper / Utility Function
# =========================================================

def _profile_response(user, message):
    """Helper to build a consistent response."""
    profile = getattr(user, "profile", None)
    return Response(
        {
            "message": message,
            "status": profile.status if profile else None,
            "status_display": profile.get_status_display() if profile else None,
            "last_seen_at": profile.last_seen_at if profile else None,
        },
        status=drf_status.HTTP_200_OK,
    )


# ---------------------------------------------------------
# HEARTBEAT → ONLINE  | Refresh from Db
# ---------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def profile_heartbeat_view(request):
    """
    Called periodically by the frontend while the user is active.
    Sets status to ONLINE and updates last_seen_at.
    If the current status is PAUSE, it stays PAUSE (no override).
    """
    
    user = request.user
    profile = getattr(user, "profile", None)
    if not profile:
        return Response(
            {"message": "لا يوجد ملف شخصي لهذا المستخدم."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    log = get_or_create_today_log(user)
    now = timezone.now()

    # ✅ 1. Handle PAUSE state safely
    if profile.status == profile.PAUSE:
        profile.last_seen_at = now
        
        if profile.last_pause_at:
            delta = (now - profile.last_pause_at).total_seconds()
            log.break_seconds += int(delta)
            log.save(update_fields=["break_seconds"])
            
            # 🔥 CRITICAL FIX: Reset last_pause_at so it doesn't double-count next heartbeat
            profile.last_pause_at = now
            
        profile.save(update_fields=["last_seen_at", "last_pause_at"])
        
        profile.refresh_from_db()
        return _profile_response(user, "لا يزال في حالة الإيقاف المؤقت.")

    # ✅ 2. Handle ONLINE state
    profile.mark_online()

    if log.clock_in:
        elapsed = (now - log.clock_in).total_seconds()
        log.total_work_seconds = max(0, int(elapsed - log.break_seconds))
        log.save(update_fields=["total_work_seconds"])

    # ✅ 3. Force refresh so the response returns the exact new status
    profile.refresh_from_db()

    return _profile_response(user, "تم تحديث الحالة إلى متصل.")


# ---------------------------------------------------------
# PAUSE | refresh_from_db
# ---------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def profile_pause_view(request):
    """
    User manually pauses their session.
    """
    user = request.user
    profile = getattr(user, "profile", None)
    if not profile:
        return Response(
            {"message": "لا يوجد ملف شخصي لهذا المستخدم."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    # ✅ 1. Mark the profile as paused
    profile.mark_pause()

    # ✅ 2. Get today's log and update the work timer up to this exact moment
    log = get_or_create_today_log(user)
    
    if log.clock_in:
        # Calculate how much work they did BEFORE they hit pause
        elapsed = (timezone.now() - log.clock_in).total_seconds()
        log.total_work_seconds = max(0, int(elapsed - log.break_seconds))
        log.save(update_fields=["total_work_seconds"])

    # ✅ 3. FORCE REFRESH so the response returns the new "pause" status
    profile.refresh_from_db()

    return _profile_response(user, "تم إيقاف النشاط مؤقتاً.")


# ---------------------------------------------------------
# RESUME (from pause → online) | refresh_from_db 
# ---------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def profile_resume_view(request):
    """
    Resume from pause → back to ONLINE.
    """
    user = request.user
    profile = getattr(user, "profile", None)
    if not profile:
        return Response(
            {"message": "لا يوجد ملف شخصي لهذا المستخدم."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    # ✅ 1. Before marking online, capture the break time if they were paused
    if profile.status == profile.PAUSE and profile.last_pause_at:
        log = get_or_create_today_log(user)
        now = timezone.now()
        
        # Calculate how long they were on pause
        delta = (now - profile.last_pause_at).total_seconds()
        
        # Add it to the daily log's break time
        log.break_seconds += int(delta)
        log.save(update_fields=["break_seconds"])
        
        # Clear last_pause_at so it doesn't double-count
        profile.last_pause_at = None
        profile.save(update_fields=["last_pause_at"])

    # ✅ 2. Mark the profile as online
    profile.mark_online()

    # ✅ 3. FORCE REFRESH so the response returns the new "online" status
    profile.refresh_from_db()

    return _profile_response(user, "تم استئناف النشاط.")


# ---------------------------------------------------------
# OFFLINE
# ---------------------------------------------------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def profile_offline_view(request):
    """
    Manually set to offline (usually triggered by inactivity or logout).
    """
    user = request.user
    profile = getattr(user, "profile", None)
    if not profile:
        return Response(
            {"message": "لا يوجد ملف شخصي لهذا المستخدم."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    # ✅ 1. Get today's log
    log = get_or_create_today_log(user)
    now = timezone.now()

    # ✅ 2. If they were on a pause, capture that final break time
    if profile.status == profile.PAUSE and profile.last_pause_at:
        delta = (now - profile.last_pause_at).total_seconds()
        log.break_seconds += int(delta)
        profile.last_pause_at = None
        profile.save(update_fields=["last_pause_at"])

    # ✅ 3. Calculate the final total work seconds
    if log.clock_in:
        elapsed = (now - log.clock_in).total_seconds()
        log.total_work_seconds = max(0, int(elapsed - log.break_seconds))

    # ✅ 4. Set the clock_out time
    log.clock_out = now
    log.save(update_fields=["break_seconds", "total_work_seconds", "clock_out"])

    # ✅ 5. Mark the profile offline
    profile.mark_offline()

    # ✅ 6. FORCE REFRESH so the response returns the new "offline" status
    profile.refresh_from_db()

    return _profile_response(user, "تم تعيين الحالة إلى غير متصل.")


# ---------------------------------------------------------
# LOGGED IN (optional — usually set by login_view)
# ---------------------------------------------------------

# @api_view(["POST"])
# @permission_classes([IsAuthenticated])
# def profile_logged_in_view(request):
#     """
#     Explicitly mark as ONLINE.
#     Normally handled by /api/login/ automatically.
#     """
#     user = request.user
#     profile = getattr(user, "profile", None)
#     if not profile:
#         return Response(
#             {"message": "لا يوجد ملف شخصي لهذا المستخدم."},
#             status=drf_status.HTTP_404_NOT_FOUND,
#         )

#     session_key = (
#         request.session.session_key
#         if hasattr(request, "session") and request.session.session_key
#         else None
#     )
    
#     # 1. Mark Online
#     profile.mark_online(session_key=session_key)
    
#     # 2. Ensure today's work log is ready
#     get_or_create_today_log(user)
    
#     # ✅ 3. Force a database refresh so `_profile_response` returns the exact new status
#     profile.refresh_from_db()
    
#     return _profile_response(user, "تم تسجيل الدخول.")




# ---------------------------------------------------------
# User Status 
# ---------------------------------------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_status_view(request):
    """
    Quick read of the current user's status.
    """
    user = request.user
    profile = getattr(user, "profile", None)
    if not profile:
        return Response(
            {"message": "لا يوجد ملف شخصي لهذا المستخدم."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "status": profile.status,
            "status_display": profile.get_status_display(),
            "last_login_at": profile.last_login_at,
            "last_logout_at": profile.last_logout_at,
            "last_seen_at": profile.last_seen_at,
            "last_pause_at": profile.last_pause_at,
            "total_online_days": profile.total_online_days,
            "total_pause_days": profile.total_pause_days,
            "total_offline_days": profile.total_offline_days,
            # ✅ REMOVED: total_logged_out_days (because the status was removed)
        },
        status=drf_status.HTTP_200_OK,
    )


# =========================================================
# REGISTER
# =========================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):

    serializer = RegisterSerializer(
        data=request.data
    )

    if serializer.is_valid():

        user = serializer.save()

        return Response(
            {
                "message": "User Created Successfully",
                "user": UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )

    print("REGISTER ERRORS:", serializer.errors)

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

##################################
# Get currently logged-in user
##################################
# =========================================================
# SELF — UPDATE OWN PROFILE
# PATCH /api/users/me/update/
# =========================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Read the logged-in user's profile."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=drf_status.HTTP_200_OK)

    
# def me_view(request):
#     serializer = UserSerializer(request.user)
#     return Response(
#         serializer.data,
#         status=status.HTTP_200_OK)


@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def user_self_update_view(request):

    user = request.user
    partial = request.method == "PATCH"

    serializer = SelfUserUpdateSerializer(
        user,
        data=request.data,
        partial=partial,
    )

    # ==========================================================
    # DEBUG: CHECK THE ACTUAL SERIALIZER AND USERNAME VALIDATORS
    # ==========================================================
    username_field = serializer.fields["username"]

    print("\n" + "=" * 70)
    print("SERIALIZER CLASS:", serializer.__class__)
    print("SERIALIZER MODULE:", serializer.__class__.__module__)
    print("SERIALIZER FILE:", inspect.getfile(serializer.__class__))
    print("USERNAME FIELD TYPE:", type(username_field))
    print("USERNAME VALIDATORS:", username_field.validators)
    print("RECEIVED USERNAME:", repr(request.data.get("username")))
    print("=" * 70)

    # ==========================================================
    # VALIDATION
    # ==========================================================
    if not serializer.is_valid():

        print("VALIDATION ERRORS:", serializer.errors)

        return Response(
            {
                "message": "فشل التحديث.",
                "errors": serializer.errors,
            },
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    # ==========================================================
    # SAVE PROFILE
    # ==========================================================
    serializer.save()
    user.refresh_from_db()

    return Response(
        {
            "message": "تم تحديث الملف الشخصي بنجاح.",
            "user": UserSerializer(user).data,
        },
        status=drf_status.HTTP_200_OK,
    )


# =========================================================
# MANAGER — UPDATE USER (role + permissions)
# PATCH /api/users/<id>/update/
# =========================================================
@api_view(["PATCH", "PUT"])
@permission_classes([IsAuthenticated])
def user_update_by_manager_view(request, pk):
    """
    Manager updates another user's role and is_active.
    Requires: can_manage_users (on Permission) OR is_staff.
    """
    # ✅ FIXED: Read from Permission model, NOT Profile
    permission = getattr(request.user, "custom_permission", None)
    can_manage_users = bool(getattr(permission, "can_manage_users", False))

    has_permission = request.user.is_staff or can_manage_users
    if not has_permission:
        return Response(
            {"message": "ليس لديك صلاحية لتعديل المستخدمين."},
            status=drf_status.HTTP_403_FORBIDDEN,
        )

    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response(
            {"message": "المستخدم غير موجود."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    partial = request.method == "PATCH"
    serializer = ManagerUserUpdateSerializer(
        user,
        data=request.data,
        partial=partial,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            {"message": "فشل التحديث.", "errors": serializer.errors},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    serializer.save()
    user.refresh_from_db()

    return Response(
        {
            "message": "تم تحديث المستخدم بنجاح.",
            "user": UserSerializer(user).data,
        },
        status=drf_status.HTTP_200_OK,
    )



###Add temporary debug to login_view
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    print("🔥🔥🔥 LOGIN VIEW CALLED 🔥🔥🔥", flush=True)
    print("Payload:", request.data, flush=True)

    serializer = LoginSerializer(data=request.data, context={"request": request})

    if not serializer.is_valid():
        print("SERIALIZER ERRORS:", serializer.errors, flush=True)
        return Response(serializer.errors, status=400)

    user = serializer.validated_data["user"]

    # ✅ FIXED: Update profile status to ONLINE and start the work log
    if hasattr(user, "profile"):
        session_key = (
            request.session.session_key
            if hasattr(request, "session") and request.session.session_key
            else None
        )
        # 1. Mark status as ONLINE
        user.profile.mark_online(session_key=session_key)
        
        # 2. Ensure today's work log is created
        get_or_create_today_log(user)

    refresh = RefreshToken.for_user(user)
    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": UserSerializer(user).data,
    })

    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    user = request.user
    profile = getattr(user, "profile", None)
    
    if profile:
        # ✅ 1. Get today's log and capture the current time
        log = get_or_create_today_log(user)
        now = timezone.now()
        
        # ✅ 2. Capture final break time if they were on pause
        if profile.status == profile.PAUSE and profile.last_pause_at:
            delta = (now - profile.last_pause_at).total_seconds()
            log.break_seconds += int(delta)
            profile.last_pause_at = None
            profile.save(update_fields=["last_pause_at"])

        # ✅ 3. Calculate final work time
        if log.clock_in:
            elapsed = (now - log.clock_in).total_seconds()
            log.total_work_seconds = max(0, int(elapsed - log.break_seconds))

        # ✅ 4. Set clock_out and save the log
        log.clock_out = now
        log.save(update_fields=["break_seconds", "total_work_seconds", "clock_out"])

        # ✅ 5. Mark the profile as OFFLINE (this replaces mark_logged_out)
        profile.mark_offline()

    return Response({"message": "تم تسجيل الخروج."}, status=200)


#####################
# End Authentication
#####################

#####################
# Start WorkLog
#####################
# Monthly grid
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_grid_view(request):
    """
    GET /api/reports/attendance/?year=2026&month=10
    Optional: department (not implemented yet), user_id
    Returns all users × all days of the month.
    """
    me_profile = getattr(request.user, "profile", None)

    # if not (request.user.is_staff or (me_profile and me_profile.can_view_users)):
    #     return Response(
    #         {"message": "ليس لديك صلاحية لعرض التقارير."},
    #         status=drf_status.HTTP_403_FORBIDDEN,
    #     )

    if not _user_can_view_worklog(request.user):
        return Response(                                   # ✅ correctly indented
            {"message": "ليس لديك صلاحية لعرض تقرير الحضور والانصراف."},
            status=drf_status.HTTP_403_FORBIDDEN,
        )

    try:
        year = int(request.query_params.get("year", date.today().year))
        month = int(request.query_params.get("month", date.today().month))
    except ValueError:
        return Response(
            {"message": "year/month غير صحيحين."},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    first_day = date(year, month, 1)
    last_day = date(year, month, monthrange(year, month)[1])

    # All users
    users = User.objects.select_related("profile").order_by("username")

    # All logs for this month
    logs = DailyWorkLog.objects.filter(
        date__gte=first_day, date__lte=last_day
    ).select_related("user")

    # Build lookup: {user_id: {date: log}}
    log_map = {}
    for log in logs:
        log_map.setdefault(log.user_id, {})[log.date] = log

    # Build days list
    days = []
    d = first_day
    while d <= last_day:
        days.append(d)
        d += timedelta(days=1)

    # Build rows
    rows = []
    for user in users:
        user_logs = log_map.get(user.id, {})
        day_cells = {}
        for d in days:
            log = user_logs.get(d)
            if log:
                day_cells[d.isoformat()] = {
                    "log_id": log.id,
                    "total_work_seconds": log.total_work_seconds,
                    "total_work_hours": log.total_work_hours,
                    "has_error": log.total_work_seconds == 0,
                }
            else:
                day_cells[d.isoformat()] = None

        rows.append({
            "user_id": user.id,
            "username": user.username,
            "role_display": (
                user.profile.get_role_display()
                if hasattr(user, "profile") else ""
            ),
            "user_image": (
                user.profile.image.url
                if hasattr(user, "profile") and user.profile.image else None
            ),
            "days": day_cells,
        })

    return Response({
        "year": year,
        "month": month,
        "days": [d.isoformat() for d in days],
        "rows": rows,
        "total": len(rows),
    })

# Single day details (for the modal)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def worklog_detail_view(request, user_id, date_str):
    """
    GET /api/reports/worklog/<user_id>/<YYYY-MM-DD>/
    Returns the daily log + comments, or 404 if not found.
    """
    me_profile = getattr(request.user, "profile", None)
    if not (request.user.is_staff or (me_profile and me_profile.can_view_users)):
        return Response(
            {"message": "ليس لديك صلاحية."},
            status=drf_status.HTTP_403_FORBIDDEN,
        )

    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        return Response(
            {"message": "التاريخ غير صحيح."},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    log = DailyWorkLog.objects.filter(
        user_id=user_id, date=target_date
    ).select_related("user", "user__profile").first()

    if not log:
        return Response(
            {"message": "لا يوجد سجل لهذا اليوم."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    return Response({
        "log": DailyWorkLogSerializer(log).data,
    })



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def worklog_add_comment_view(request, log_id):
    """
    POST /api/reports/worklog/<log_id>/comments/
    Body: {"text": "..."}
    """
    me_profile = getattr(request.user, "profile", None)
    if not (request.user.is_staff or (me_profile and me_profile.can_manage_users)):
        return Response(
            {"message": "ليس لديك صلاحية للتعليق."},
            status=drf_status.HTTP_403_FORBIDDEN,
        )

    try:
        log = DailyWorkLog.objects.get(pk=log_id)
    except DailyWorkLog.DoesNotExist:
        return Response(
            {"message": "السجل غير موجود."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    text = (request.data.get("text") or "").strip()
    if not text:
        return Response(
            {"message": "النص مطلوب."},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    comment = WorkLogComment.objects.create(
        log=log, author=request.user, text=text
    )
    return Response(
        WorkLogCommentSerializer(comment).data,
        status=drf_status.HTTP_201_CREATED,
    )


######################
# End WorkLog
#####################
######################
# Start Ad Lead
#######################
# ✅ 1. Endpoint for your React Frontend (Custom Landing Page)

# ==========================================
# 1. LANDING PAGE CONFIG (For Admin & Public)
# ==========================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_landing_config(request, pk):
    try:
        config = LandingPageConfig.objects.get(pk=pk)
        serializer = LandingPageConfigSerializer(config)
        return Response(serializer.data)
    except LandingPageConfig.DoesNotExist:
        return Response({"error": "Config not found"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # Admin only

# ✅ ADDED: Parsers to handle file uploads
@parser_classes([MultiPartParser, FormParser]) 
def create_landing_config(request):
    serializer = LandingPageConfigSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ==========================================
# 2. Ad_LEADS (For Frontend & Facebook)
# ==========================================

@api_view(['POST'])
@permission_classes([AllowAny])
def create_ad_lead(request):
    serializer = AdLeadSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Lead saved successfully!"}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def facebook_webhook(request):
    try:
        data = request.data
        lead = AdLead.objects.create(
            first_name=data.get('first_name', 'Unknown'),
            last_name=data.get('last_name', ''),
            email=data.get('email', ''),
            phone_number=data.get('phone_number', ''),
            fb_lead_id=data.get('id', None)
        )
        return Response({"status": "success"}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ✅ 1. List all Ad_leads (for the dashboard)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_leads(request):
    leads = AdLead.objects.all().order_by('-created_at')
    serializer = AdLeadSerializer(leads, many=True)
    return Response({"count": leads.count(), "leads": serializer.data})

# ✅ 2. Update a lead's status (e.g., from "New" to "Contacted")
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_lead_status(request, pk):
    try:
        lead = AdLead.objects.get(pk=pk)
    except AdLead.DoesNotExist:
        return Response({"error": "Lead not found"}, status=status.HTTP_404_NOT_FOUND)

    if 'status' in request.data:
        lead.status = request.data['status']
        lead.save()
        return Response({"message": "Status updated successfully"})
    
    return Response({"error": "No status provided"}, status=status.HTTP_400_BAD_REQUEST)


################################
# LEAD / CRM
################################
# class LeadViewSet(viewsets.ModelViewSet):
#     """
#     A ViewSet that provides CRUD operations for Leads.
#     """
#     queryset = Lead.objects.all().order_by('-created_at')
#     serializer_class = LeadSerializer
#     permission_classes = [IsAuthenticated] # Requires user to be logged in

#     # Enables searching by name, phone, or email
#     filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
#     search_fields = ['name', 'phone', 'phone1', 'phone2', 'email']
    
#     # Enables filtering by stage, responsible, or source (e.g., /api/leads/?stage=fresh_lead)
#     filterset_fields = ['stage', 'responsible', 'source', 'type']
    
#     # Enables ordering (e.g., /api/leads/?ordering=name)
#     ordering_fields = ['created_at', 'last_communication_date', 'name']

#     def perform_create(self, serializer):
#         # Optional: Automatically assign the logged-in user as the 'responsible' 
#         # person if not provided in the request.
#         if 'responsible' not in self.request.data:
#             serializer.save(responsible=self.request.user.profile)
#         else:
#             serializer.save()

#     def perform_destroy(self, instance):
#         # Optional: Instead of deleting the lead, you could just mark it as "Closed" or "Deleted"
#         # For now, it will permanently delete the lead.
#         instance.delete()


# Permissions in React are only for the UI (User Interface). A hacker can use Postman or CURL to call your Django API directly. Your backend must also check permissions.

# 1. INSERT (Create)
# ==========================================
# 5. Create Lead (Secured)
# ==========================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_lead(request):
    # ✅ BACKEND SECURITY CHECK: Does user have create_new_lead?
    try:
        perm = Permission.objects.get(user=request.user)
        if not perm.create_new_lead:
            return Response(
                {"error": "ليس لديك صلاحية لإنشاء ليد جديد."}, 
                status=status.HTTP_403_FORBIDDEN
            )
    except Permission.DoesNotExist:
        return Response({"error": "ليس لديك صلاحيات."}, status=status.HTTP_403_FORBIDDEN)

    serializer = LeadSerializer(data=request.data)
    if serializer.is_valid():
        if 'responsible' not in request.data:
            serializer.save(responsible=request.user.profile)
        else:
            serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)




# 2. FETCH ALL (List)

# ==========================================
# 1. Fetch All Leads (Secured)
# ==========================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lead_list(request):
    # ✅ BACKEND SECURITY CHECK: Does user have view_all_lead?
    try:
        perm = Permission.objects.get(user=request.user)
        if not perm.view_all_lead:
            return Response(
                {"error": "ليس لديك صلاحية لعرض جميع الليدز (View All Leads permission required)."}, 
                status=status.HTTP_403_FORBIDDEN
            )
    except Permission.DoesNotExist:
        return Response(
            {"error": "ليس لديك أي صلاحيات مخصصة في النظام."}, 
            status=status.HTTP_403_FORBIDDEN
        )

    # If they pass the check, proceed
    leads = Lead.objects.all().order_by('-created_at')
    
    # Optional: Filtering by stage
    stage = request.query_params.get('stage', None)
    if stage is not None:
        leads = leads.filter(stage=stage)
        
    serializer = LeadSerializer(leads, many=True)
    return Response(serializer.data)


# ==========================================
# 2. Fetch My Leads (Secured)
# ==========================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_leads(request):
    # ✅ BACKEND SECURITY CHECK: Does user have view_my_lead?
    try:
        perm = Permission.objects.get(user=request.user)
        if not perm.view_my_lead and not perm.view_all_lead:
            return Response(
                {"error": "ليس لديك صلاحية لعرض الليدز الخاصة بك (View My Leads permission required)."}, 
                status=status.HTTP_403_FORBIDDEN
            )
    except Permission.DoesNotExist:
        return Response(
            {"error": "ليس لديك أي صلاحيات مخصصة في النظام."}, 
            status=status.HTTP_403_FORBIDDEN
        )

    # Get the profile of the currently logged-in user
    user_profile = request.user.profile 
    
    # Filter leads where responsible = logged-in user
    leads = Lead.objects.filter(responsible=user_profile).order_by('-created_at')
    
    # Keep the stage filter for Kanban drag-and-drop functionality
    stage = request.query_params.get('stage', None)
    if stage is not None:
        leads = leads.filter(stage=stage)
        
    serializer = LeadSerializer(leads, many=True)
    return Response(serializer.data)

##########
# Update :
##########
# ==========================================
# 6. Full Edit Lead (Secured)
# ==========================================
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_lead(request, pk):
    # ✅ BACKEND SECURITY CHECK: Does user have update_lead?
    try:
        perm = Permission.objects.get(user=request.user)
        if not perm.update_lead:
            return Response(
                {"error": "ليس لديك صلاحية لتعديل بيانات الليد."}, 
                status=status.HTTP_403_FORBIDDEN
            )
    except Permission.DoesNotExist:
        return Response({"error": "ليس لديك صلاحيات."}, status=status.HTTP_403_FORBIDDEN)

    lead = get_object_or_404(Lead, pk=pk)
    
    partial = request.method == 'PATCH'
    serializer = LeadSerializer(lead, data=request.data, partial=partial)
    
    if serializer.is_valid():
        new_responsible = request.data.get('responsible')
        if new_responsible and int(new_responsible) != lead.responsible_id:
            lead.reassigned_at = timezone.now()
            
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



# ==========================================
# 3. Change Lead Stage (Secured)
# ==========================================
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def change_lead_stage(request, pk):
    # ✅ BACKEND SECURITY CHECK: Does user have update_lead_stage?
    try:
        perm = Permission.objects.get(user=request.user)
        if not perm.update_lead_stage:
            return Response(
                {"error": "ليس لديك صلاحية لتعديل مرحلة الليد."}, 
                status=status.HTTP_403_FORBIDDEN
            )
    except Permission.DoesNotExist:
        return Response({"error": "ليس لديك صلاحيات."}, status=status.HTTP_403_FORBIDDEN)

    lead = get_object_or_404(Lead, pk=pk)
    new_stage = request.data.get('stage')
    
    if not new_stage:
        return Response({"error": "Stage field is required"}, status=status.HTTP_400_BAD_REQUEST)
        
    lead.stage = new_stage
    lead.save()
    
    return Response({
        "message": "Stage updated successfully", 
        "stage": lead.stage
    }, status=status.HTTP_200_OK)


# ==========================================
# 4. Change Lead Responsible (Secured)
# ==========================================
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def change_lead_responsible(request, pk):
    # ✅ BACKEND SECURITY CHECK: Does user have update_lead_responsible?
    try:
        perm = Permission.objects.get(user=request.user)
        if not perm.update_lead_responsible:
            return Response(
                {"error": "ليس لديك صلاحية لتعديل المسؤول عن الليد."}, 
                status=status.HTTP_403_FORBIDDEN
            )
    except Permission.DoesNotExist:
        return Response({"error": "ليس لديك صلاحيات."}, status=status.HTTP_403_FORBIDDEN)

    lead = get_object_or_404(Lead, pk=pk)
    new_responsible_id = request.data.get('responsible')
    
    if not new_responsible_id:
        return Response({"error": "Responsible field is required"}, status=status.HTTP_400_BAD_REQUEST)
        
    from .models import Profile # Assuming Profile is in models
    try:
        new_profile = Profile.objects.get(id=new_responsible_id)
    except Profile.DoesNotExist:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        
    lead.responsible = new_profile
    lead.reassigned_at = timezone.now() 
    lead.save()
    
    return Response({
        "message": "Responsible person updated successfully", 
        "responsible_id": lead.responsible.id,
        "responsible_name": lead.responsible.name, 
        "reassigned_at": lead.reassigned_at
    }, status=status.HTTP_200_OK)


# ==========================================
# 7. Delete Lead (Secured)
# ==========================================
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_lead(request, pk):
    # ✅ BACKEND SECURITY CHECK: Does user have delete_lead?
    try:
        perm = Permission.objects.get(user=request.user)
        if not perm.delete_lead:
            return Response(
                {"error": "ليس لديك صلاحية لحذف الليد."}, 
                status=status.HTTP_403_FORBIDDEN
            )
    except Permission.DoesNotExist:
        return Response({"error": "ليس لديك صلاحيات."}, status=status.HTTP_403_FORBIDDEN)

    lead = get_object_or_404(Lead, pk=pk)
    lead.delete()
    return Response({"message": "Lead deleted successfully"}, status=status.HTTP_204_NO_CONTENT)



# 3. FETCH DETAIL (Retrieve)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lead_detail(request, pk):
    lead = get_object_or_404(Lead, pk=pk)
    serializer = LeadSerializer(lead)
    return Response(serializer.data)

# If managers need to see all leads via /lead/list/, but regular users need a separate page for their leads, you can create a dedicated URL





#==========================================================
# CashBox View
#=========================================================
# =========================================================
# List CashBoxes (No pagination)
# =========================================================

class CashBoxListView(generics.ListAPIView):
    """List all cash boxes (no pagination)"""
    queryset = CashBox.objects.all().order_by('name')
    serializer_class = CashBoxListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset"""
        queryset = super().get_queryset()
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset


# =========================================================
# Get CashBox Details
# =========================================================

class CashBoxDetailView(generics.RetrieveAPIView):
    """Get cash box details by ID"""
    queryset = CashBox.objects.all()
    serializer_class = CashBoxSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'


# =========================================================
# Create CashBox
# =========================================================

class CashBoxCreateView(generics.CreateAPIView):
    """Create a new cash box"""
    queryset = CashBox.objects.all()
    serializer_class = CashBoxCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create with additional logic"""
        serializer.save()


# =========================================================
# Update CashBox
# =========================================================

class CashBoxUpdateView(generics.UpdateAPIView):
    """Update an existing cash box"""
    queryset = CashBox.objects.all()
    serializer_class = CashBoxCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'


# =========================================================
# Delete CashBox
# =========================================================

class CashBoxDeleteView(generics.DestroyAPIView):
    """Delete a cash box"""
    queryset = CashBox.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "Cash box deleted successfully"},
            status=status.HTTP_200_OK
        )


# =========================================================
# Deposit/Withdraw CashBox
# =========================================================

class CashBoxTransactionView(generics.GenericAPIView):
    """Handle deposit and withdraw operations"""
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def post(self, request, id):
        cashbox = get_object_or_404(CashBox, id=id)
        
        transaction_type = request.data.get('type')
        amount = request.data.get('amount')
        
        if not transaction_type or not amount:
            return Response(
                {"error": "Type and amount are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = float(amount)
        except ValueError:
            return Response(
                {"error": "Invalid amount"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if transaction_type == 'deposit':
                new_balance = cashbox.deposit(amount)
                message = f"Deposited {amount} successfully"
            elif transaction_type == 'withdraw':
                new_balance = cashbox.withdraw(amount)
                message = f"Withdrew {amount} successfully"
            else:
                return Response(
                    {"error": "Invalid transaction type. Use 'deposit' or 'withdraw'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                "message": message,
                "new_balance": new_balance
            })
            
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


# =========================================================
# CashBox Summary (Total balance of all cash boxes)
# =========================================================

class CashBoxSummaryView(generics.GenericAPIView):
    """Get summary of all cash boxes"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        cashboxes = CashBox.objects.all()
        
        total_balance = sum(cashbox.balance for cashbox in cashboxes)
        total_opening = sum(cashbox.balance_opening for cashbox in cashboxes)
        total_growth = total_balance - total_opening
        
        return Response({
            "total_cashboxes": cashboxes.count(),
            "total_balance": total_balance,
            "total_opening_balance": total_opening,
            "total_growth": total_growth,
        })


#==========================================================
# Bank View
#==========================================================
# =========================================================
# List Banks (with pagination)
# =========================================================

class BankListView(generics.ListAPIView):
    """List all banks with pagination"""
    queryset = Bank.objects.all().order_by('name')
    serializer_class = BankListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = BankPagination
    
    def get_queryset(self):
        """Filter queryset"""
        queryset = super().get_queryset()
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        # Filter by currency
        currency = self.request.query_params.get('currency')
        if currency:
            queryset = queryset.filter(currency=currency)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset


# =========================================================
# Create Bank
# =========================================================

class BankCreateView(generics.CreateAPIView):
    """Create a new bank"""
    queryset = Bank.objects.all()
    serializer_class = BankCreateUpdateSerializer
    permission_classes = [IsAuthenticated]


# =========================================================
# Get Bank Details
# =========================================================

class BankDetailView(generics.RetrieveAPIView):
    """Get bank details by ID"""
    queryset = Bank.objects.all()
    serializer_class = BankSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'


# =========================================================
# Update Bank
# =========================================================

class BankUpdateView(generics.UpdateAPIView):
    """Update an existing bank"""
    queryset = Bank.objects.all()
    serializer_class = BankCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'


# =========================================================
# Delete Bank
# =========================================================

class BankDeleteView(generics.DestroyAPIView):
    """Delete a bank"""
    queryset = Bank.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "Bank deleted successfully"},
            status=status.HTTP_200_OK
        )


# =========================================================
# Toggle Bank Status
# =========================================================

class BankToggleStatusView(generics.GenericAPIView):
    """Toggle bank active status"""
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def patch(self, request, id):
        bank = get_object_or_404(Bank, id=id)
        bank.is_active = not bank.is_active
        bank.save()
        
        return Response({
            "id": bank.id,
            "name": bank.name,
            "is_active": bank.is_active,
            "message": f"Bank {'activated' if bank.is_active else 'deactivated'}"
        })


# =========================================================
# Deposit/Withdraw
# =========================================================

class BankTransactionView(generics.GenericAPIView):
    """Handle deposit and withdraw operations"""
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def post(self, request, id):
        bank = get_object_or_404(Bank, id=id)
        
        transaction_type = request.data.get('type')
        amount = request.data.get('amount')
        
        if not transaction_type or not amount:
            return Response(
                {"error": "Type and amount are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            amount = float(amount)
        except ValueError:
            return Response(
                {"error": "Invalid amount"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            if transaction_type == 'deposit':
                new_balance = bank.deposit(amount)
                message = f"Deposited {amount} successfully"
            elif transaction_type == 'withdraw':
                new_balance = bank.withdraw(amount)
                message = f"Withdrew {amount} successfully"
            else:
                return Response(
                    {"error": "Invalid transaction type"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                "message": message,
                "new_balance": new_balance,
                "formatted_balance": bank.get_formatted_balance()
            })
            
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )



#=====================================================
#AccountCategories and Accounts views
#=====================================================
class AccountCategoryListView(APIView):
    """List all account categories"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            categories = AccountCategory.objects.all().order_by('name')
            serializer = AccountCategorySerializer(categories, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in AccountCategoryListView: {e}")
            return Response(
                {"error": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AccountCategoryCreateView(generics.CreateAPIView):
    """Create a new account category"""
    queryset = AccountCategory.objects.all()
    serializer_class = AccountCategorySerializer
    permission_classes = [IsAuthenticated]

class AccountCategoryUpdateView(generics.UpdateAPIView):
    """Update an existing account category"""
    queryset = AccountCategory.objects.all()
    serializer_class = AccountCategorySerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

class AccountCategoryDeleteView(generics.DestroyAPIView):
    """Delete an account category"""
    queryset = AccountCategory.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            instance.delete()
            return Response(
                {"message": "Account category deleted successfully"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            if 'ProtectedError' in str(type(e)):
                return Response(
                    {"error": "Cannot delete category because it has associated accounts"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            raise e


# class AccountListView(generics.ListAPIView):
#     """List all accounts (no pagination)"""
#     queryset = Account.objects.all().select_related('category').order_by('name')
#     serializer_class = AccountListSerializer
#     permission_classes = [IsAuthenticated]
    
#     def get_queryset(self):
#         """Filter queryset"""
#         queryset = super().get_queryset()
        
#         # Search by name
#         search = self.request.query_params.get('search')
#         if search:
#             queryset = queryset.filter(name__icontains=search)
        
#         # Filter by type
#         account_type = self.request.query_params.get('type')
#         if account_type:
#             queryset = queryset.filter(type=account_type)
        
#         # Filter by category
#         category_id = self.request.query_params.get('category_id')
#         if category_id:
#             queryset = queryset.filter(category_id=category_id)
        
#         return queryset


class AccountListView(generics.ListAPIView):
    """List all accounts (no pagination)"""
    queryset = Account.objects.all().select_related('category').order_by('name')
    serializer_class = AccountListSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter queryset with debugging"""
        print("=== AccountListView called ===")
        print(f"User: {self.request.user}")
        print(f"Query params: {self.request.query_params}")
        
        queryset = super().get_queryset()
        print(f"Initial queryset count: {queryset.count()}")
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            print(f"Filtering by search: {search}")
            queryset = queryset.filter(name__icontains=search)
            print(f"After search filter count: {queryset.count()}")
        
        # Filter by type
        account_type = self.request.query_params.get('type')
        if account_type:
            print(f"Filtering by type: {account_type}")
            queryset = queryset.filter(type=account_type)
            print(f"After type filter count: {queryset.count()}")
        
        # Filter by category
        category_id = self.request.query_params.get('category_id')
        if category_id:
            print(f"Filtering by category_id: {category_id}")
            try:
                # Check if category exists
                category = AccountCategory.objects.get(id=category_id)
                print(f"Category found: {category.name}")
                queryset = queryset.filter(category_id=category_id)
                print(f"After category filter count: {queryset.count()}")
            except AccountCategory.DoesNotExist:
                print(f"⚠️ Category with ID {category_id} does not exist!")
                # Return empty queryset if category doesn't exist
                return Account.objects.none()
        
        print(f"Final queryset count: {queryset.count()}")
        print(f"Final SQL: {str(queryset.query)}")
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list method for additional debugging"""
        print("=== AccountListView.list() called ===")
        print(f"Request path: {request.path}")
        print(f"Request method: {request.method}")
        
        try:
            # Get the filtered queryset
            queryset = self.get_queryset()
            
            # Check if there are any accounts in the database
            total_accounts = Account.objects.all().count()
            print(f"Total accounts in database: {total_accounts}")
            
            # Serialize the data
            serializer = self.get_serializer(queryset, many=True)
            
            print(f"Serialized data length: {len(serializer.data)}")
            if len(serializer.data) > 0:
                print(f"First item sample: {serializer.data[0]}")
            
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            print(f"❌ ERROR in AccountListView: {e}")
            import traceback
            print(traceback.format_exc())
            return Response(
                {"error": str(e), "traceback": traceback.format_exc()},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

            
class AccountCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        print("=== AccountCreateView called ===")
        print(f"User: {request.user}")
        print(f"Request data: {request.data}")
        
        serializer = AccountSerializer(data=request.data)
        
        if serializer.is_valid():
            print("Data is valid, saving...")
            serializer.save()
            print("Account created successfully!")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        print("Validation errors:", serializer.errors)
        print("Invalid data:", request.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AccountUpdateView(generics.UpdateAPIView):
    """Update an existing account"""
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

class AccountDeleteView(generics.DestroyAPIView):
    """Delete an account"""
    queryset = Account.objects.all()
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "Account deleted successfully"},
            status=status.HTTP_200_OK
        )




class TransactionPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# 1. List Transactions (with pagination, filtering, search)
class TransactionListView(generics.ListAPIView):
    """
    GET /api/transactions/
    List all transactions with pagination, filtering, and search.

    Query Parameters:
    - page: Page number
    - page_size: Items per page (default: 20, max: 100)
    - search: Search by transaction_no, statement, check_no, person_receipt
    - type: Filter by type (deposit/withdraw)
    - payment_method: Filter by payment_method (banks/cash)
    - currency: Filter by currency (AED/USD/EUR/SAR)
    - has_check: Filter by has_check (true/false)
    - transaction_date_after: Filter by date (YYYY-MM-DD)
    - transaction_date_before: Filter by date (YYYY-MM-DD)
    - ordering: Order by field (transaction_date, created_at, amount)
    """
    serializer_class = TransactionListSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = TransactionPagination

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type', 'payment_method', 'currency', 'has_check']
    search_fields = ['transaction_no', 'statement', 'check_no', 'person_receipt']
    ordering_fields = ['transaction_date', 'created_at', 'amount']
    ordering = ['-transaction_date']

    def get_queryset(self):
        queryset = Transaction.objects.all()

        # Date filtering
        date_after = self.request.query_params.get('transaction_date_after')
        date_before = self.request.query_params.get('transaction_date_before')

        if date_after:
            queryset = queryset.filter(transaction_date__gte=date_after)
        if date_before:
            queryset = queryset.filter(transaction_date__lte=date_before)

        return queryset


# 2. Transaction Detail
class TransactionDetailView(generics.RetrieveAPIView):
    """
    GET /api/transactions/{id}/
    Get detailed information about a specific transaction.
    """
    serializer_class = TransactionDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Transaction.objects.all()


# 3. Create Transaction
class TransactionCreateView(generics.CreateAPIView):
    """
    POST /api/transactions/
    Create a new transaction.

    Required fields based on type and payment_method:
    - Deposit + Banks: transaction_no, account_from, bank
    - Deposit + Cash: transaction_no, account_from, cashbox
    - Withdraw + Banks: transaction_no, account_to, bank
    - Withdraw + Cash: transaction_no, account_to, cashbox

    Example - Deposit via Bank:
    {
        "transaction_no": "TRX-000001",
        "type": "deposit",
        "payment_method": "banks",
        "account_from": 1,
        "bank": 1,
        "subtotal": "1304.35",
        "vat": "195.65",
        "amount": "1500.00",
        "transaction_date": "2024-01-15",
        "statement": "Salary deposit",
        "currency": "AED",
        "amount_to_arabic": "ألف وخمسمائة درهم إماراتي فقط لا غير",
        "amount_to_english": "One thousand five hundred UAE Dirhams only"
    }
    """
    queryset = Transaction.objects.all()
    serializer_class = TransactionCreateUpdateSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        print("=" * 80)
        print("=== TRANSACTION CREATE VIEW CALLED ===")
        print(f"User: {request.user}")
        print(f"Request method: {request.method}")
        print(f"Request content type: {request.content_type}")
        print(f"Request data: {request.data}")
        print(f"Request FILES: {request.FILES}")
        print("=" * 80)

        # Check if it's FormData or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            print("=== FORM DATA RECEIVED ===")
            for key, value in request.data.items():
                print(f"  {key}: {value} (type: {type(value)})")
            print("=" * 80)

        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            print("=== SERIALIZER ERRORS ===")
            print(f"Errors: {serializer.errors}")
            print(f"Validated data before errors: {serializer.validated_data}")
            print("=" * 80)
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        print("=== SERIALIZER VALIDATED DATA ===")
        for key, value in serializer.validated_data.items():
            print(f"  {key}: {value} (type: {type(value)})")
        print("=" * 80)

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        print("=" * 80)
        print("=== PERFORM_CREATE CALLED ===")
        print(f"User: {self.request.user}")
        print(f"Serializer validated data before save: {serializer.validated_data}")
        print("=" * 80)

        # Save with the current user
        transaction = serializer.save(transaction_user=self.request.user)

        print("=" * 80)
        print("=== TRANSACTION SAVED ===")
        print(f"Transaction ID: {transaction.id}")
        print(f"Transaction No: {transaction.transaction_no}")
        print(f"Payment Method: {transaction.payment_method}")
        print(f"Subtotal: {transaction.subtotal}")   # 👈 NEW (for debugging)
        print(f"VAT: {transaction.vat}")             # 👈 NEW (for debugging)
        print(f"Amount: {transaction.amount}")
        print(f"Account From: {transaction.account_from}")
        print(f"Account To: {transaction.account_to}")
        print(f"Bank: {transaction.bank}")
        print(f"Cashbox: {transaction.cashbox}")
        print(f"Person Deliver: {transaction.person_deliver}")
        print(f"Person Receipt: {transaction.person_receipt}")
        print(f"Check No: {transaction.check_no}")
        print(f"Check Bank: {transaction.check_bank}")
        print(f"Check Date: {transaction.check_date}")
        print(f"Document No: {transaction.document_no}")
        print(f"Transaction User: {transaction.transaction_user}")
        print("=" * 80)


# 4. Update Transaction
class TransactionUpdateView(generics.UpdateAPIView):
    """
    PUT /api/transactions/{id}/update/
    PATCH /api/transactions/{id}/update/
    Update an existing transaction.
    """
    serializer_class = TransactionCreateUpdateSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Transaction.objects.all()


# 5. Delete Transaction
class TransactionDeleteView(generics.DestroyAPIView):
    """
    DELETE /api/transactions/{id}/delete/
    Delete a transaction.
    """
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return Transaction.objects.all()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        transaction_no = instance.transaction_no
        self.perform_destroy(instance)
        return Response({
            'message': f'Transaction {transaction_no} deleted successfully'
        }, status=status.HTTP_200_OK)


# 6. Combined View (All-in-One - Recommended)
class TransactionViewSet(generics.GenericAPIView):
    """
    Combined view for all transaction operations.

    GET    /api/transactions/          - List with pagination
    POST   /api/transactions/          - Create
    GET    /api/transactions/{id}/     - Detail
    PUT    /api/transactions/{id}/     - Update
    PATCH  /api/transactions/{id}/     - Partial update
    DELETE /api/transactions/{id}/     - Delete
    """
    permission_classes = [IsAuthenticated]
    pagination_class = TransactionPagination

    def get_serializer_class(self):
        if self.request.method == 'GET':
            if self.kwargs.get('id'):
                return TransactionDetailSerializer
            return TransactionListSerializer
        return TransactionCreateUpdateSerializer

    def get_queryset(self):
        return Transaction.objects.all()

    def get(self, request, *args, **kwargs):
        """GET /api/transactions/ - List all transactions"""
        if kwargs.get('id'):
            # Detail view
            instance = self.get_queryset().filter(id=kwargs['id']).first()
            if not instance:
                return Response(
                    {'error': 'Transaction not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = TransactionDetailSerializer(instance)
            return Response(serializer.data)

        # List view with pagination
        queryset = self.get_queryset()

        # Apply filters from query params
        date_after = request.query_params.get('transaction_date_after')
        date_before = request.query_params.get('transaction_date_before')
        transaction_type = request.query_params.get('type')
        payment_method = request.query_params.get('payment_method')

        if date_after:
            queryset = queryset.filter(transaction_date__gte=date_after)
        if date_before:
            queryset = queryset.filter(transaction_date__lte=date_before)
        if transaction_type:
            queryset = queryset.filter(type=transaction_type)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = TransactionListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TransactionListSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        """POST /api/transactions/ - Create a new transaction"""
        serializer = TransactionCreateUpdateSerializer(data=request.data,  context={'request': request},)
        
        if serializer.is_valid():
            serializer.save(transaction_user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        """PUT /api/transactions/{id}/ - Update a transaction"""
        instance = self.get_queryset().filter(id=kwargs.get('id')).first()
        if not instance:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = TransactionCreateUpdateSerializer(instance, data=request.data, context={'request': request},)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, *args, **kwargs):
        """PATCH /api/transactions/{id}/ - Partial update"""
        return self.put(request, *args, **kwargs)

    def delete(self, request, *args, **kwargs):
        """DELETE /api/transactions/{id}/ - Delete a transaction"""
        instance = self.get_queryset().filter(id=kwargs.get('id')).first()
        if not instance:
            return Response(
                {'error': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        transaction_no = instance.transaction_no
        instance.delete()
        return Response({
            'message': f'Transaction {transaction_no} deleted successfully'
        }, status=status.HTTP_200_OK)



#=======================================
# Dashbord :-
#=====================================
class DashboardSummaryView(APIView):
    """View to get dashboard summary statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get date range (last 30 days by default)
            days = request.query_params.get('days', 30)
            try:
                days = int(days)
            except ValueError:
                days = 30
                
            end_date = timezone.now().date()  # Use date, not datetime
            start_date = end_date - timedelta(days=days)
            
            # Get all transactions in date range
            transactions = Transaction.objects.filter(
                transaction_date__gte=start_date,
                transaction_date__lte=end_date
            )
            
            # Calculate totals
            total_deposits = transactions.filter(type='deposit').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            
            total_withdraws = transactions.filter(type='withdraw').aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0')
            
            total_balance = total_deposits - total_withdraws
            
            deposit_count = transactions.filter(type='deposit').count()
            withdraw_count = transactions.filter(type='withdraw').count()
            total_transactions = transactions.count()
            
            data = {
                'total_deposits': float(total_deposits),
                'total_withdraws': float(total_withdraws),
                'total_balance': float(total_balance),
                'total_transactions': total_transactions,
                'deposit_count': deposit_count,
                'withdraw_count': withdraw_count,
            }
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in DashboardSummaryView: {str(e)}")
            return Response(
                {'error': 'Failed to fetch dashboard summary'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DashboardChartView(APIView):
    """View to get chart data for dashboard"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            # Get period and days
            period = request.query_params.get('period', 'daily')
            days = request.query_params.get('days', 30)
            
            try:
                days = int(days)
            except ValueError:
                days = 30
                
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days)
            
            # Get all transactions in date range
            transactions = Transaction.objects.filter(
                transaction_date__gte=start_date,
                transaction_date__lte=end_date
            )
            
            # Group by period
            if period == 'daily':
                # Group by date
                deposits = transactions.filter(type='deposit').annotate(
                    period_date=TruncDate('transaction_date')
                ).values('period_date').annotate(
                    total=Sum('amount')
                ).order_by('period_date')
                
                withdraws = transactions.filter(type='withdraw').annotate(
                    period_date=TruncDate('transaction_date')
                ).values('period_date').annotate(
                    total=Sum('amount')
                ).order_by('period_date')
                
            elif period == 'weekly':
                # Group by week
                deposits = transactions.filter(type='deposit').annotate(
                    period_date=TruncWeek('transaction_date')
                ).values('period_date').annotate(
                    total=Sum('amount')
                ).order_by('period_date')
                
                withdraws = transactions.filter(type='withdraw').annotate(
                    period_date=TruncWeek('transaction_date')
                ).values('period_date').annotate(
                    total=Sum('amount')
                ).order_by('period_date')
                
            else:  # monthly
                # Group by month
                deposits = transactions.filter(type='deposit').annotate(
                    period_date=TruncMonth('transaction_date')
                ).values('period_date').annotate(
                    total=Sum('amount')
                ).order_by('period_date')
                
                withdraws = transactions.filter(type='withdraw').annotate(
                    period_date=TruncMonth('transaction_date')
                ).values('period_date').annotate(
                    total=Sum('amount')
                ).order_by('period_date')
            
            # Create dictionaries for easy lookup
            deposits_dict = {item['period_date']: float(item['total']) for item in deposits}
            withdraws_dict = {item['period_date']: float(item['total']) for item in withdraws}
            
            # Generate full date range
            labels = []
            deposits_data = []
            withdraws_data = []
            balance_data = []
            
            current_date = start_date
            running_balance = 0.0
            
            while current_date <= end_date:
                # Get the period key based on period
                if period == 'daily':
                    period_key = current_date
                    label = current_date.strftime('%Y-%m-%d')
                elif period == 'weekly':
                    # Get the week start date
                    week_start = current_date - timedelta(days=current_date.weekday())
                    period_key = week_start
                    label = f"الأسبوع {current_date.isocalendar()[1]}"
                else:  # monthly
                    # Get the month start date
                    month_start = current_date.replace(day=1)
                    period_key = month_start
                    label = current_date.strftime('%Y-%m')
                
                labels.append(label)
                
                # Get data for this period
                deposit_amount = deposits_dict.get(period_key, 0.0)
                withdraw_amount = withdraws_dict.get(period_key, 0.0)
                
                deposits_data.append(deposit_amount)
                withdraws_data.append(withdraw_amount)
                
                running_balance += deposit_amount - withdraw_amount
                balance_data.append(running_balance)
                
                # Move to next day
                current_date += timedelta(days=1)
            
            data = {
                'labels': labels,
                'deposits': deposits_data,
                'withdraws': withdraws_data,
                'balance': balance_data,
            }
            
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Error in DashboardChartView: {str(e)}\n{error_details}")
            return Response(
                {'error': f'Failed to fetch chart data: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DashboardRecentTransactionsView(APIView):
    """View to get recent transactions for dashboard"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            limit = request.query_params.get('limit', 10)
            try:
                limit = int(limit)
            except ValueError:
                limit = 10
                
            transactions = Transaction.objects.all().order_by('-transaction_date')[:limit]
            
            serializer = DashboardTransactionSerializer(transactions, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in DashboardRecentTransactionsView: {str(e)}")
            return Response(
                {'error': 'Failed to fetch recent transactions'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# -------------------------------------
# Customer-Twilio
#----------------------------------------

class CustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Customer CRUD operations with custom SMS action
    """
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer

    @action(detail=False, methods=['post'], url_path='send-sms')
    def send_sms(self, request):
        """
        Custom endpoint to send SMS to a customer
        POST /api/customers/send-sms/
        Body: {"customer_id": 1, "message": "Broker City Properties. Your integrated digital real estate platform!"}
        """
        serializer = SMSSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        customer_id = serializer.validated_data['customer_id']
        message_body = serializer.validated_data['message']
        
        try:
            customer = Customer.objects.get(id=customer_id)
            message_sid = self._send_twilio_sms(customer.phone_number, message_body)
            
            return Response({
                'success': True,
                'message': f'SMS sent to {customer.name}',
                'message_sid': message_sid
            }, status=status.HTTP_200_OK)
            
        except Customer.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Customer not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _send_twilio_sms(self, phone_number, message_body):
        """
        Helper method to send SMS via Twilio
        """
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=message_body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        return message.sid

    # Optional: Send SMS automatically when creating a customer
    def perform_create(self, serializer):
        """Override create to send welcome SMS when customer is added"""
        customer = serializer.save()
        try:
            self._send_twilio_sms(
                customer.phone_number,
                f"Welcome {customer.name}! You're now registered."
            )
        except Exception as e:
            # Log error but don't fail the creation
            print(f"Welcome SMS failed: {e}")


#############################################################
# Properties Management
#############################################################


# ============================================================
# CREATE OWNER
# POST /api/owners/create/
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_owner(request):

    serializer = OwnerSerializer(data=request.data)

    if serializer.is_valid():
        owner = serializer.save()

        return Response(
            {
                'message': 'Owner created successfully.',
                'owner': OwnerSerializer(owner).data
            },
            status=status.HTTP_201_CREATED
        )

    return Response(
        {
            'message': 'Failed to create owner.',
            'errors': serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )

# ============================================================
# FETCH ALL OWNERS
# GET /api/owners/
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_owners(request):

    owners = Owner.objects.all().order_by('-created_at')

    serializer = OwnerSerializer(
        owners,
        many=True
    )

    return Response(
        {
            'count': owners.count(),
            'owners': serializer.data
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# FETCH OWNER DETAILS
# GET /api/owners/<id>/
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_owner_details(request, pk):

    try:
        owner = Owner.objects.get(pk=pk)

    except Owner.DoesNotExist:
        return Response(
            {
                'message': 'Owner not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = OwnerSerializer(owner)

    return Response(
        {
            'owner': serializer.data
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# UPDATE OWNER
# PUT /api/owners/<id>/update/
# PATCH /api/owners/<id>/update/
# ============================================================

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_owner(request, pk):

    try:
        owner = Owner.objects.get(pk=pk)

    except Owner.DoesNotExist:
        return Response(
            {
                'message': 'Owner not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    # PATCH allows partial updates.
    # PUT requires the complete object.
    partial = request.method == 'PATCH'

    serializer = OwnerSerializer(
        owner,
        data=request.data,
        partial=partial
    )

    if serializer.is_valid():

        owner = serializer.save()

        return Response(
            {
                'message': 'Owner updated successfully.',
                'owner': OwnerSerializer(owner).data
            },
            status=status.HTTP_200_OK
        )

    return Response(
        {
            'message': 'Failed to update owner.',
            'errors': serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )


# ============================================================
# DELETE OWNER
# DELETE /api/owners/<id>/delete/
# ============================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_owner(request, pk):

    try:
        owner = Owner.objects.get(pk=pk)

    except Owner.DoesNotExist:
        return Response(
            {
                'message': 'Owner not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    owner.delete()

    return Response(
        {
            'message': 'Owner deleted successfully.'
        },
        status=status.HTTP_200_OK
    )


#####################################
# Buildings
#####################################
# ============================================================
# CREATE BUILDING
# POST /api/buildings/create/
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_building(request):

    serializer = BuildingSerializer(
        data=request.data
    )

    if serializer.is_valid():
        building = serializer.save()

        return Response(
            {
                'message': 'Building created successfully.',
                'building': BuildingSerializer(building).data
            },
            status=status.HTTP_201_CREATED
        )

    return Response(
        {
            'message': 'Failed to create building.',
            'errors': serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )


# ============================================================
# FETCH ALL BUILDING
# GET /api/buildings/
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_buildings(request):

    buildings = (
        Building.objects
        .select_related('owner')
        .all()
        .order_by('-created_at')
    )

    serializer = BuildingSerializer(
        buildings,
        many=True
    )

    return Response(
        {
            'count': buildings.count(),
            'buildings': serializer.data
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# FETCH BUILDING DETAILS
# GET /api/buildings/<id>/
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_building_details(request, pk):

    try:
        building = (
            Building.objects
            .select_related('owner')
            .get(pk=pk)
        )

    except Building.DoesNotExist:
        return Response(
            {
                'message': 'Building not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = BuildingSerializer(building)

    return Response(
        {
            'building': serializer.data
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# UPDATE Building
# PUT /api/buildings/<id>/update/
# PATCH /api/buildings/<id>/update/
# ============================================================

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_building(request, pk):

    try:
        building = Building.objects.get(pk=pk)

    except Building.DoesNotExist:
        return Response(
            {
                'message': 'Building not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    partial = request.method == 'PATCH'

    serializer = BuildingSerializer(
        building,
        data=request.data,
        partial=partial
    )

    if serializer.is_valid():

        building = serializer.save()

        return Response(
            {
                'message': 'Building updated successfully.',
                'building': BuildingSerializer(building).data
            },
            status=status.HTTP_200_OK
        )

    return Response(
        {
            'message': 'Failed to update building.',
            'errors': serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )


# ============================================================
# DELETE BUILDING
# DELETE /api//buildings/<id>/delete/
# ============================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_building(request, pk):

    try:
        building = Building.objects.get(pk=pk)

    except Building.DoesNotExist:
        return Response(
            {
                'message': 'Building not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    building.delete()

    return Response(
        {
            'message': 'Building deleted successfully.'
        },
        status=status.HTTP_200_OK
    )



# ============================================================
# RENT — LIST
# GET /api/rents/
# ============================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_rents(request):
    rents = (
        Rent.objects
        .select_related("rental_name", "unit_name")
        .all()
        .order_by("-start_date")
    )

    serializer = RentSerializer(rents, many=True)

    return Response(
        {
            "count": rents.count(),
            "rents": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


# ============================================================
# RENT — CREATE
# POST /api/rents/create/
# ============================================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_rent(request):
    serializer = RentSerializer(data=request.data)

    if serializer.is_valid():
        rent = serializer.save()

        rent = (
            Rent.objects
            .select_related("rental_name", "unit_name")
            .get(pk=rent.pk)
        )

        return Response(
            {
                "message": "Rent created successfully.",
                "rent": RentSerializer(rent).data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {
            "message": "Failed to create rent.",
            "errors": serializer.errors,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


# ============================================================
# RENT — DETAILS
# GET /api/rents/<id>/
# ============================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_rent_details(request, pk):
    try:
        rent = (
            Rent.objects
            .select_related("rental_name", "unit_name")
            .get(pk=pk)
        )
    except Rent.DoesNotExist:
        return Response(
            {"message": "Rent not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {"rent": RentSerializer(rent).data},
        status=status.HTTP_200_OK,
    )


# ============================================================
# RENT — UPDATE
# PUT    /api/rents/<id>/update/
# PATCH  /api/rents/<id>/update/
# ============================================================
@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_rent(request, pk):
    try:
        rent = Rent.objects.get(pk=pk)
    except Rent.DoesNotExist:
        return Response(
            {"message": "Rent not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    partial = request.method == "PATCH"
    serializer = RentSerializer(rent, data=request.data, partial=partial)

    if serializer.is_valid():
        rent = serializer.save()

        rent = (
            Rent.objects
            .select_related("rental_name", "unit_name")
            .get(pk=rent.pk)
        )

        return Response(
            {
                "message": "Rent updated successfully.",
                "rent": RentSerializer(rent).data,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {
            "message": "Failed to update rent.",
            "errors": serializer.errors,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


# ============================================================
# RENT — DELETE
# DELETE /api/rents/<id>/delete/
# ============================================================
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_rent(request, pk):
    try:
        rent = Rent.objects.get(pk=pk)
    except Rent.DoesNotExist:
        return Response(
            {"message": "Rent not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    rent.delete()

    return Response(
        {"message": "Rent deleted successfully."},
        status=status.HTTP_200_OK,
    )

#  Example request body
# json
# {
#   "rental_name": 1,
#   "unit_name": 1,
#   "start_date": "2026-01-01",
#   "end_date": "2026-12-31",
#   "installment_no": 12,
#   "installment_amount": "120000.00"
# }


# ============================================================
# MONTHLY PAYMENT — LIST + CREATE
# GET  /api/monthly-payments/
# POST /api/monthly-payments/create/
# GET  /api/monthly-payments/?rent=<id>   (optional filter)
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_all_monthly_payments(request):
    queryset = (
        MonthlyPayment.objects
        .select_related(
            "rent",
            "rent__rental_name",
            "rent__unit_name",
        )
        .all()
        .order_by("-created_at") # ✅ Changed from "-month" because text sorting fails
    )

    # Optional filter by rent id
    rent_id = request.query_params.get("rent")
    if rent_id:
        queryset = queryset.filter(rent_id=rent_id)

    serializer = MonthlyPaymentSerializer(queryset, many=True)

    return Response(
        {
            "count": queryset.count(),
            "monthly_payments": serializer.data,
        },
        status=status.HTTP_200_OK,
    )
    

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_monthly_payment(request):
    serializer = MonthlyPaymentSerializer(data=request.data)

    if serializer.is_valid():
        payment = serializer.save()

        payment = (
            MonthlyPayment.objects
            .select_related(
                "rent",
                "rent__rental_name",
                "rent__unit_name",
            )
            .get(pk=payment.pk)
        )

        return Response(
            {
                "message": "Monthly payment created successfully.",
                "monthly_payment": MonthlyPaymentSerializer(payment).data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(
        {
            "message": "Failed to create monthly payment.",
            "errors": serializer.errors,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


# ============================================================
# MONTHLY PAYMENT — DETAILS / UPDATE / DELETE
# GET    /api/monthly-payments/<id>/
# PUT    /api/monthly-payments/<id>/update/
# PATCH  /api/monthly-payments/<id>/update/
# DELETE /api/monthly-payments/<id>/delete/
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_monthly_payment_details(request, pk):
    try:
        payment = (
            MonthlyPayment.objects
            .select_related(
                "rent",
                "rent__rental_name",
                "rent__unit_name",
            )
            .get(pk=pk)
        )
    except MonthlyPayment.DoesNotExist:
        return Response(
            {"message": "Monthly payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {"monthly_payment": MonthlyPaymentSerializer(payment).data},
        status=status.HTTP_200_OK,
    )


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def update_monthly_payment(request, pk):
    try:
        payment = MonthlyPayment.objects.get(pk=pk)
    except MonthlyPayment.DoesNotExist:
        return Response(
            {"message": "Monthly payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    partial = request.method == "PATCH"
    serializer = MonthlyPaymentSerializer(
        payment,
        data=request.data,
        partial=partial,
    )

    if serializer.is_valid():
        payment = serializer.save()

        payment = (
            MonthlyPayment.objects
            .select_related(
                "rent",
                "rent__rental_name",
                "rent__unit_name",
            )
            .get(pk=payment.pk)
        )

        return Response(
            {
                "message": "Monthly payment updated successfully.",
                "monthly_payment": MonthlyPaymentSerializer(payment).data,
            },
            status=status.HTTP_200_OK,
        )

    return Response(
        {
            "message": "Failed to update monthly payment.",
            "errors": serializer.errors,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_monthly_payment(request, pk):
    try:
        payment = MonthlyPayment.objects.get(pk=pk)
    except MonthlyPayment.DoesNotExist:
        return Response(
            {"message": "Monthly payment not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    payment.delete()

    return Response(
        {"message": "Monthly payment deleted successfully."},
        status=status.HTTP_200_OK,
    )

    

# ===================================
# Twilio Whatsup Messages WITH message_body
# ===================================

# class SendWhatsAppView(APIView):
#     def post(self, request):
#         serializer = SendWhatsAppSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)

#         to_number = serializer.validated_data['to_number']
#         message_body = serializer.validated_data['message_body']

#         # Create a pending record first
#         msg_record = WhatsAppMessage.objects.create(
#             to_number=to_number,
#             message_body=message_body,
#             status='pending'
#         )

#         try:
#             client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
#             message = client.messages.create(
#                 body=message_body,
#                 from_=settings.TWILIO_PHONE_NUMBER,  # e.g. whatsapp:+14155238886
#                 to=f"whatsapp:{to_number}"
#             )
#             msg_record.status = 'sent'
#             msg_record.twilio_sid = message.sid
#             msg_record.save()

#             return Response(WhatsAppMessageSerializer(msg_record).data, status=status.HTTP_201_CREATED)

#         except TwilioRestException as e:
#             msg_record.status = 'failed'
#             msg_record.error_message = str(e)
#             msg_record.save()

#             return Response(
#                 {"error": str(e), "record": WhatsAppMessageSerializer(msg_record).data},
#                 status=status.HTTP_400_BAD_REQUEST
#             )


# class WhatsAppMessageListView(generics.ListAPIView):
#     """View history of sent messages."""
#     queryset = WhatsAppMessage.objects.all().order_by('-created_at')
#     serializer_class = WhatsAppMessageSerializer


# class WhatsAppWebhookView(APIView):
#     """Handles incoming WhatsApp messages from Twilio (replies from users)."""
#     def post(self, request):
#         incoming_msg = request.data.get('Body', '')
#         from_number = request.data.get('From', '')

#         print(f"Received from {from_number}: {incoming_msg}")
#         # TODO: process/store incoming message as needed

#         return Response(status=status.HTTP_200_OK)


# ===================================
# Twilio Whatsup without message_body
# ===================================


class SendWhatsAppView(APIView):
    #DEFAULT_MESSAGE = "🏢 Broker City Properties. Your integrated digital real estate platform" # <-- set your fixed text here
    DEFAULT_MESSAGE = "🏙️ *بروكر سيتي العقارية*\nمنصتك العقارية الرقمية المتكاملة"
#     message = client.messages.create(
#     body=message_body,
#     media_url=["https://yourdomain.com/static/logo.png"],  # must be a public URL
#     from_=settings.TWILIO_PHONE_NUMBER,
#     to=f"whatsapp:{to_number}"
# )
    
    def post(self, request):
        serializer = SendWhatsAppSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        to_number = serializer.validated_data['to_number']
        message_body = self.DEFAULT_MESSAGE

        msg_record = WhatsAppMessage.objects.create(
            to_number=to_number,
            message_body=message_body,
            status='pending'
        )

        try:
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=message_body,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=f"whatsapp:{to_number}"
            )
            msg_record.status = 'sent'
            msg_record.twilio_sid = message.sid
            msg_record.save()

            return Response(WhatsAppMessageSerializer(msg_record).data, status=status.HTTP_201_CREATED)

        except TwilioRestException as e:
            msg_record.status = 'failed'
            msg_record.error_message = str(e)
            msg_record.save()

            return Response(
                {"error": str(e), "record": WhatsAppMessageSerializer(msg_record).data},
                status=status.HTTP_400_BAD_REQUEST
            )


class WhatsAppMessageListView(generics.ListAPIView):
    """View history of sent messages."""
    queryset = WhatsAppMessage.objects.all().order_by('-created_at')
    serializer_class = WhatsAppMessageSerializer


class WhatsAppWebhookView(APIView):
    """Handles incoming WhatsApp messages from Twilio (replies from users)."""
    def post(self, request):
        incoming_msg = request.data.get('Body', '')
        from_number = request.data.get('From', '')

        print(f"Received from {from_number}: {incoming_msg}")

        return Response(status=status.HTTP_200_OK)

#============================================
#  Unit Views
#============================================
# ============================================================
# CREATE UNIT
# POST /api/units/create/
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def create_unit(request):

    serializer = UnitSerializer(
        data=request.data
    )

    if serializer.is_valid():

        unit = serializer.save()

        # Re-fetch with related objects
        unit = (
            Unit.objects
            .select_related(
                'category',
                'category__owner',
            )
            .get(pk=unit.pk)
        )

        return Response(
            {
                'message': 'Unit created successfully.',
                'unit': UnitSerializer(unit).data
            },
            status=status.HTTP_201_CREATED
        )

    return Response(
        {
            'message': 'Failed to create unit.',
            'errors': serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )
# ============================================================
# FETCH ALL UNITS
# GET /api/units/
# ============================================================

# ============================================================
# FETCH ALL UNITS
# GET /api/units/
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_units(request):

    units = (
        Unit.objects
        .select_related(
            'category',
            'category__owner',
        )
        .all()
        .order_by('-created_at')
    )

    serializer = UnitSerializer(units, many=True)

    return Response(
        {
            'count': units.count(),
            'units': serializer.data
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# FETCH UNIT DETAILS
# GET /api/units/<id>/
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unit_details(request, pk):

    try:

        unit = (
            Unit.objects
            .select_related(
                'category',
                'category__owner',
            )
            .get(pk=pk)
        )

    except Unit.DoesNotExist:

        return Response(
            {
                'message': 'Unit not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = UnitSerializer(unit)

    return Response(
        {
            'unit': serializer.data
        },
        status=status.HTTP_200_OK
    )

# ============================================================
# UPDATE UNIT
# PUT /api/units/<id>/update/
# PATCH /api/units/<id>/update/
# ============================================================

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def update_unit(request, pk):

    try:
        unit = Unit.objects.get(pk=pk)

    except Unit.DoesNotExist:

        return Response(
            {
                'message': 'Unit not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    partial = request.method == 'PATCH'

    serializer = UnitSerializer(
        unit,
        data=request.data,
        # depend on Serializer
        partial=partial
    )

    if serializer.is_valid():

        unit = serializer.save()

        # Re-fetch with related objects
        unit = (
            Unit.objects
            .select_related(
                'category',
                'category__owner',
            )
            .get(pk=unit.pk)
        )

        return Response(
            {
                'message': 'Unit updated successfully.',
                'unit': UnitSerializer(unit).data
            },
            status=status.HTTP_200_OK
        )

    return Response(
        {
            'message': 'Failed to update unit.',
            'errors': serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )

# ============================================================
# DELETE UNIT
# DELETE /api/units/<id>/delete/
# ============================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_unit(request, pk):

    try:

        unit = Unit.objects.get(pk=pk)

    except Unit.DoesNotExist:

        return Response(
            {
                'message': 'Unit not found.'
            },
            status=status.HTTP_404_NOT_FOUND
        )

    unit.delete()

    return Response(
        {
            'message': 'Unit deleted successfully.'
        },
        status=status.HTTP_200_OK
    )


###################################
# Rental 
###################################


# ============================================================
# CREATE RENTAL
# POST /api/rentals/create/
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_rental(request):

    serializer = RentalSerializer(data=request.data)

    if serializer.is_valid():

        rental = serializer.save()

        return Response(
            {
                'message': 'Rental created successfully.',
                'rental': RentalSerializer(rental).data,
            },
            status=status.HTTP_201_CREATED
        )

    return Response(
        {
            'message': 'Failed to create rental.',
            'errors': serializer.errors,
        },
        status=status.HTTP_400_BAD_REQUEST
    )


# ============================================================
# FETCH ALL RENTALS
# GET /api/rentals/
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_rentals(request):

    rentals = (
        Rental.objects
        .all()
        .order_by('-id')
    )

    serializer = RentalSerializer(rentals, many=True)

    return Response(
        {
            'count': rentals.count(),
            'rentals': serializer.data,
        },
        status=status.HTTP_200_OK
    )


# ============================================================
# FETCH RENTAL DETAILS
# GET /api/rentals/<pk>/
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_rental_details(request, pk):

    try:
        rental = Rental.objects.get(pk=pk)

    except Rental.DoesNotExist:

        return Response(
            {'message': 'Rental not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = RentalSerializer(rental)

    return Response(
        {'rental': serializer.data},
        status=status.HTTP_200_OK
    )


# ============================================================
# UPDATE RENTAL
# PUT /api/rentals/<pk>/update/
# PATCH /api/rentals/<pk>/update/
# ============================================================

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_rental(request, pk):

    try:
        rental = Rental.objects.get(pk=pk)

    except Rental.DoesNotExist:

        return Response(
            {'message': 'Rental not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    partial = request.method == 'PATCH'

    serializer = RentalSerializer(
        rental,
        data=request.data,
        partial=partial,
    )

    if serializer.is_valid():

        rental = serializer.save()

        return Response(
            {
                'message': 'Rental updated successfully.',
                'rental': RentalSerializer(rental).data,
            },
            status=status.HTTP_200_OK
        )

    return Response(
        {
            'message': 'Failed to update rental.',
            'errors': serializer.errors,
        },
        status=status.HTTP_400_BAD_REQUEST
    )


# ============================================================
# DELETE RENTAL
# DELETE /api/rentals/<pk>/delete/
# ============================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_rental(request, pk):

    try:
        rental = Rental.objects.get(pk=pk)

    except Rental.DoesNotExist:

        return Response(
            {'message': 'Rental not found.'},
            status=status.HTTP_404_NOT_FOUND
        )

    rental.delete()

    return Response(
        {'message': 'Rental deleted successfully.'},
        status=status.HTTP_200_OK
    )




# ==========================================
# Maintenance
# ==========================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def maintenance_list(request):
    queryset = Maintenance.objects.all().order_by('-date')
    
    # Optional search filter by location or notes
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(location__icontains=search) | queryset.filter(notes__icontains=search)
        
    serializer = MaintenanceSerializer(queryset, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ==========================================
# CREATE VIEW
# ==========================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def maintenance_create(request):
    serializer = MaintenanceSerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                "message": "Maintenance record created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )
        
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# DELETE VIEW
# ==========================================
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def maintenance_delete(request, pk):
    try:
        obj = Maintenance.objects.get(pk=pk)
    except Maintenance.DoesNotExist:
        return Response({"error": "Maintenance record not found."}, status=status.HTTP_404_NOT_FOUND)

    obj.delete()
    return Response({"message": "Maintenance record deleted successfully."}, status=status.HTTP_200_OK)


############################WEBSITE###########################
##############################################################
class SliderListCreateView(generics.ListCreateAPIView):
    queryset = Slider.objects.all().order_by('-id')
    serializer_class = SliderSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class SliderDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Slider.objects.all()
    serializer_class = SliderSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]


#=============================================================
# Developer
#=============================================================
# ---------- LIST + CREATE ----------
class DeveloperListCreateView(generics.ListCreateAPIView):
    queryset = Developer.objects.all().order_by('-id')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DeveloperSerializer
        return DeveloperSerializer


# ---------- RETRIEVE + UPDATE + DELETE ----------
class DeveloperDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Developer.objects.all()

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return DeveloperDetailSerializer
        return DeveloperSerializer



# =============================================================
# NEW: Send Bulk Email
# =============================================================

# class SendBulkEmailView(APIView):
#     """
#     POST /api/developers/send-email/

#     Body:
#     {
#         "subject": "...",
#         "message": "...",
#         "recipient_ids": [1, 2, 3]
#     }

#     The backend:
#     1. Validates the payload.
#     2. Loads the selected Developer records.
#     3. Filters out records without a valid email.
#     4. Sends one email per recipient (BCC/CC optional).
#     5. Returns a per-recipient status report.
#     """
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         serializer = SendEmailSerializer(data=request.data)

#         if not serializer.is_valid():
#             return Response(
#                 serializer.errors,
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         data = serializer.validated_data
#         subject = data['subject']
#         message = data['message']
#         recipient_ids = data['recipient_ids']

#         # Load only the developers that were selected AND have an email
#         developers = (
#             Developer.objects
#             .filter(id__in=recipient_ids)
#             .exclude(email__isnull=True)
#             .exclude(email__exact='')
#         )

#         if not developers.exists():
#             return Response(
#                 {'detail': 'لا يوجد أي مطور محدد لديه بريد إلكتروني صالح'},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         from_email = settings.DEFAULT_FROM_EMAIL

#         sent = []
#         failed = []

#         # Use a single connection for all sends — much faster than
#         # opening a new SMTP connection per message.
#         connection = get_connection(fail_silently=False)

#         try:
#             connection.open()

#             for dev in developers:
#                 try:
#                     send_mail(
#                         subject=subject,
#                         message=message,
#                         from_email=from_email,
#                         recipient_list=[dev.email],
#                         fail_silently=False,
#                         connection=connection,
#                     )
#                     sent.append({
#                         'id': dev.id,
#                         'name': dev.name or '',
#                         'email': dev.email,
#                     })
#                 except Exception as e:
#                     failed.append({
#                         'id': dev.id,
#                         'name': dev.name or '',
#                         'email': dev.email,
#                         'error': str(e),
#                     })
#         finally:
#             try:
#                 connection.close()
#             except Exception:
#                 pass

#         response_payload = {
#             'status': 'success' if sent else 'error',
#             'sent_count': len(sent),
#             'failed_count': len(failed),
#             'sent': sent,
#             'failed': failed,
#         }

#         # If nothing sent → 500, if partial → 200 with errors listed
#         http_status = (
#             status.HTTP_200_OK
#             if sent
#             else status.HTTP_500_INTERNAL_SERVER_ERROR
#         )

#         return Response(response_payload, status=http_status)


class SendBulkEmailView(APIView):
    """
    POST /api/developers/send-email/

    Body:
    {
        "subject": "...",
        "message": "...",
        "recipient_ids": [1, 2, 3]
    }

    Uses Anymail (Mailgun) — no persistent SMTP connection needed.
    Each send_mail() call makes one HTTPS request to the Mailgun API.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SendEmailSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        subject = data['subject']
        message = data['message']
        recipient_ids = data['recipient_ids']

        # Load only the developers that were selected AND have an email
        developers = (
            Developer.objects
            .filter(id__in=recipient_ids)
            .exclude(email__isnull=True)
            .exclude(email__exact='')
        )

        if not developers.exists():
            return Response(
                {'detail': 'لا يوجد أي مطور محدد لديه بريد إلكتروني صالح'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from_email = settings.DEFAULT_FROM_EMAIL

        logger.info(
            f"Bulk email start | from={from_email} | "
            f"subject={subject!r} | recipients={developers.count()}"
        )

        sent = []
        failed = []

        for dev in developers:
            try:
                # ✅ Simple send_mail — Anymail handles the transport
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=from_email,
                    recipient_list=[dev.email],
                    fail_silently=False,
                    # ⚠️ DO NOT pass connection=... with Anymail
                )
                sent.append({
                    'id': dev.id,
                    'name': dev.name or '',
                    'email': dev.email,
                })
                logger.info(f"✅ Sent to {dev.email}")

            except Exception as e:
                logger.error(
                    f"❌ Failed to send to {dev.email}: {e}",
                    exc_info=True,
                )
                failed.append({
                    'id': dev.id,
                    'name': dev.name or '',
                    'email': dev.email,
                    'error': str(e),
                })

        response_payload = {
            'status': 'success' if sent else 'error',
            'sent_count': len(sent),
            'failed_count': len(failed),
            'sent': sent,
            'failed': failed,
        }

        http_status = (
            status.HTTP_200_OK
            if sent
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )

        return Response(response_payload, status=http_status)

# =============================================================
# OPTIONAL: Test endpoint (keep your existing one)
# =============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_email_view(request):
    try:
        send_mail(
            subject="Test from Broker's City",
            message=(
                "Broker City Properties welcomes you. "
                "If you received this in your inbox (not spam), "
                "everything is working!"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=["mohammad-alahmad@brokerscity.ae"],
            fail_silently=False,
        )
        return Response({"status": "success", "message": "Email sent!"})
    except Exception as e:
        return Response(
            {"status": "error", "message": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

        

#==========Offersale

# =========================================================
# LIST  +  CREATE
# =========================================================

# =========================================================
# OFFERSALE — LIST + CREATE
# =========================================================
class OffersaleListCreateView(APIView):
    """
    GET  /api/offersales/   → list all offers (slim)
    POST /api/offersales/   → create offer (nested installments + fees)
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        queryset = (
            Offersale.objects
            .prefetch_related("installments", "fees")
            .all()
            .order_by("-id")
        )
        serializer = OffersaleListSerializer(
            queryset, many=True, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        write = OffersaleWriteSerializer(
            data=request.data, context={"request": request}
        )
        write.is_valid(raise_exception=True)
        offer = write.save()

        # Return the full detail payload on create
        detail = OffersaleDetailSerializer(
            offer, context={"request": request}
        )
        return Response(detail.data, status=status.HTTP_201_CREATED)


# =========================================================
# OFFERSALE — DETAIL (retrieve)
# =========================================================
class OffersaleDetailView(APIView):
    """
    GET /api/offersales/<pk>/   → retrieve one offer (full)
    """
    def get(self, request, pk):
        try:
            obj = (
                Offersale.objects
                .prefetch_related("installments", "fees")
                .get(pk=pk)
            )
        except Offersale.DoesNotExist:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = OffersaleDetailSerializer(
            obj, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


# =========================================================
# OFFERSALE — UPDATE + DELETE
# =========================================================
class OffersaleUpdateDeleteView(APIView):
    """
    PUT    /api/offersales/<pk>/   → full update
    PATCH  /api/offersales/<pk>/   → partial update
    DELETE /api/offersales/<pk>/   → delete (cascades to children)
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk):
        try:
            return (
                Offersale.objects
                .prefetch_related("installments", "fees")
                .get(pk=pk)
            )
        except Offersale.DoesNotExist:
            return None

    def put(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        write = OffersaleWriteSerializer(
            obj, data=request.data, context={"request": request}
        )
        write.is_valid(raise_exception=True)
        offer = write.save()
        detail = OffersaleDetailSerializer(
            offer, context={"request": request}
        )
        return Response(detail.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        write = OffersaleWriteSerializer(
            obj, data=request.data, partial=True,
            context={"request": request},
        )
        write.is_valid(raise_exception=True)
        offer = write.save()
        detail = OffersaleDetailSerializer(
            offer, context={"request": request}
        )
        return Response(detail.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        obj.delete()  # cascades to OfferInstallment + OfferFee
        return Response(status=status.HTTP_204_NO_CONTENT)


######################################
# Payment Plan
######################################

# =========================================================
# PAYMENT PLAN — LIST + CREATE
# =========================================================
class PaymentPlanListCreateView(APIView):
    """
    GET  /api/payment-plans/   → list all payment plans
    POST /api/payment-plans/   → create a new payment plan
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        queryset = (
            PaymentPlan.objects
            .select_related("offer")
            .prefetch_related("offer__installments")
            .all()
            .order_by("-id")
        )
        serializer = PaymentPlanSerializer(
            queryset, many=True, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PaymentPlanSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# =========================================================
# PAYMENT PLAN — DETAIL (retrieve)
# =========================================================
class PaymentPlanDetailView(APIView):
    """
    GET /api/payment-plans/<pk>/   → retrieve one payment plan
    """
    def get(self, request, pk):
        try:
            obj = (
                PaymentPlan.objects
                .select_related("offer")
                .prefetch_related("offer__installments")
                .get(pk=pk)
            )
        except PaymentPlan.DoesNotExist:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = PaymentPlanSerializer(
            obj, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


# =========================================================
# PAYMENT PLAN — UPDATE + DELETE
# =========================================================
class PaymentPlanUpdateDeleteView(APIView):
    """
    PUT    /api/payment-plans/<pk>/   → full update
    PATCH  /api/payment-plans/<pk>/   → partial update
    DELETE /api/payment-plans/<pk>/   → delete
    """
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk):
        try:
            return PaymentPlan.objects.select_related("offer").get(pk=pk)
        except PaymentPlan.DoesNotExist:
            return None

    def put(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = PaymentPlanSerializer(
            obj, data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        serializer = PaymentPlanSerializer(
            obj, data=request.data, partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        obj = self.get_object(pk)
        if not obj:
            return Response(
                {"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND
            )
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

################################
# Monitoring
################################
# =========================================================
# PROPERTIES — LIST + CREATE
# GET  /api/properties/
# POST /api/properties/create/
# =========================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def properties_list_view(request):
    """
    List all properties.
    """
    qs = Property.objects.all().order_by("-id")
    serializer = PropertySerializer(qs, many=True)
    return Response(
        {
            "count": qs.count(),
            "properties": serializer.data,
        },
        status=drf_status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def property_create_view(request):
    """
    Create a new property.
    """
    serializer = PropertySerializer(data=request.data)

    if not serializer.is_valid():
        return Response(
            {"message": "فشل الإضافة.", "errors": serializer.errors},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    property_obj = serializer.save()

    return Response(
        {
            "message": "تم إضافة العقار بنجاح.",
            "property": PropertySerializer(property_obj).data,
        },
        status=drf_status.HTTP_201_CREATED,
    )

# ========================================================
class PropertyColdCallsListCreateView(APIView):
    """
    GET: List all cold calls
    POST: Create a new cold call record
    """
    # ✅ Requires the user to be logged in (Remove this line if you want it public)
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        # Fetch all records ordered by newest first
        queryset = PropertyColdCalls.objects.all().order_by('-created_at')

        # Optional: Filter by agent if provided in URL (e.g., ?agent=Ahmed)
        agent_name = request.query_params.get('agent')
        if agent_name:
            queryset = queryset.filter(agent__icontains=agent_name)

        # Pagination (10 records per page)
        paginator = PageNumberPagination()
        paginator.page_size = 10
        paginated_queryset = paginator.paginate_queryset(queryset, request)
        
        serializer = PropertyColdCallsSerializer(paginated_queryset, many=True)
        
        # Return paginated response
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        # Pass the incoming data to the serializer
        serializer = PropertyColdCallsSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Cold call record created successfully!", "data": serializer.data},
                status=status.HTTP_201_CREATED
            )
        
        # Return validation errors (e.g., if coldcalls is negative)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





class PropertyColdCallDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        """
        Delete a specific PropertyColdCall record by ID.
        """
        try:
            # Find the record by Primary Key (pk)
            record = PropertyColdCalls.objects.get(pk=pk)
            
            # Optional: Check if the user has permission to delete this record
            # For example, only the agent who created it or an admin can delete it
            user_profile = getattr(request.user, 'profile', None)
            user_role = getattr(user_profile, 'role', 'user') if user_profile else 'user'
            
            # if user_role not in ['admin', 'manager'] and record.agent != user_profile:
            #     return Response(
            #         {"error": "You do not have permission to delete this record."}, 
            #         status=status.HTTP_403_FORBIDDEN
            #     )

            # Delete the record
            record.delete()
            
            return Response(
                {"message": "Record deleted successfully."}, 
                status=status.HTTP_204_NO_CONTENT
            )

        except PropertyColdCalls.DoesNotExist:
            return Response(
                {"error": "Record not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to delete record: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# If you prefer function-based views, you can use this instead:)            
# @api_view(['DELETE'])
# @permission_classes([IsAuthenticated])
# def delete_cold_call(request, pk):
#     try:
#         record = PropertyColdCalls.objects.get(pk=pk)
#         record.delete()
#         return Response({"message": "Deleted successfully"}, status=status.HTTP_204_NO_CONTENT)
#     except PropertyColdCalls.DoesNotExist:
#         return Response({"error": "Record not found"}, status=status.HTTP_404_NOT_FOUND)
        
# ========================================================
# Property Wanted Locations and Area
# ========================================================
# class PropertyWantedAreaListCreateView(APIView):
#     """
#     GET: List all wanted areas
#     POST: Create a new wanted area record
#     """
#     # ✅ Requires the user to be logged in
#     permission_classes = [IsAuthenticated] 

#     def get(self, request):
#         # Fetch all records ordered by newest first
#         queryset = PropertyWantedArea.objects.all().order_by('-created_at')

#         # Optional: Filter by location if provided in URL (e.g., ?location=Marina)
#         location = request.query_params.get('location')
#         if location:
#             queryset = queryset.filter(location__icontains=location)

#         # Pagination (10 records per page)
#         paginator = PageNumberPagination()
#         paginator.page_size = 10
#         paginated_queryset = paginator.paginate_queryset(queryset, request)
        
#         serializer = PropertyWantedAreaSerializer(paginated_queryset, many=True)
        
#         # Return paginated response
#         return paginator.get_paginated_response(serializer.data)

#     def post(self, request):
#         serializer = PropertyWantedAreaSerializer(data=request.data)
        
#         if serializer.is_valid():
#             serializer.save()
#             return Response(
#                 {"message": "Wanted area record created successfully!", "data": serializer.data},
#                 status=status.HTTP_201_CREATED
#             )
        
#         # Return validation errors (e.g., if both sale and rent are false)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PropertyWantedAreaListCreateView(APIView):
    """
    GET: List all wanted areas
    POST: Create a new wanted area record
    """
    permission_classes = [IsAuthenticated] 

    def get(self, request):
        # Fetch all records ordered by newest first
        queryset = PropertyWantedArea.objects.all().order_by('-created_at')

        # Optional: Filter by location if provided in URL
        location = request.query_params.get('location')
        if location:
            queryset = queryset.filter(location__icontains=location)

        # ✅ REMOVED: Pagination logic. 
        # We now pass the full queryset directly to the serializer.
        serializer = PropertyWantedAreaSerializer(queryset, many=True)
        
        # Return the standard list (Array) directly
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PropertyWantedAreaSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Wanted area record created successfully!", "data": serializer.data},
                status=status.HTTP_201_CREATED
            )
        
        # Return validation errors (e.g., if both sale and rent are false)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        

class PropertyWantedAreaDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        # Find the record by ID, or return 404 if it doesn't exist
        wanted_area = get_object_or_404(PropertyWantedArea, pk=pk)
        
        # Delete the record
        wanted_area.delete()
        
        return Response(
            {"message": "تم حذف المنطقة المطلوبة بنجاح"}, 
            status=status.HTTP_204_NO_CONTENT
        )


# PROPERTY — DELETE
# DELETE /api/properties/<id>/delete/
# =========================================================
@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def property_delete_view(request, pk):
    """
    Delete a property by ID.
    """
    try:
        property_obj = Property.objects.get(pk=pk)
    except Property.DoesNotExist:
        return Response(
            {"message": "العقار غير موجود."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    property_obj.delete()

    return Response(
        {"message": "تم حذف العقار بنجاح."},
        status=drf_status.HTTP_200_OK,
    )

# ---------- Pagination ----------
# ============================================================
#  MONITOR — Pagination, Filters, CRUD endpoints
# ============================================================
class MonitorPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


# ---------- Helpers ----------
def _parse_date(value, field_name):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        raise ValueError(f"Invalid {field_name} format. Use YYYY-MM-DD.")


def _clean_payload(data):
    """
    Convert empty strings to None for all fields, and drop keys whose
    value is None for optional fields (so the serializer uses its default).
    Keeps the request tolerant of partial payloads from the frontend.
    """
    if not isinstance(data, dict):
        return data

    cleaned = {}
    for k, v in data.items():
        if isinstance(v, str) and v.strip() == "":
            cleaned[k] = None
        else:
            cleaned[k] = v
    return cleaned


def _apply_monitor_filters(queryset, request):
    search = request.query_params.get('search')
    if search:
        q = Q(agent__icontains=search) | Q(draws_cause__icontains=search) | Q(estimate__icontains=search)  
        if search.isdigit():
            num = int(search)
            q |= (
                Q(lead_no=num)
                | Q(lead_reassigned_no=num)
                | Q(agent_lead_no=num)
                | Q(viewing_lead_no=num)    # ✅ Added
                | Q(success_lead_no=num)    # ✅ Added
                | Q(draws_no=num)
            )
        queryset = queryset.filter(q)

    day = request.query_params.get('day') or request.query_params.get('date')
    if day:
        queryset = queryset.filter(date=_parse_date(day, "day"))

    month = request.query_params.get('month')
    if month:
        queryset = queryset.filter(month__iexact=month)

    from_date = request.query_params.get('from_date')
    to_date = request.query_params.get('to_date')
    if from_date and to_date:
        start = _parse_date(from_date, "from_date")
        end = _parse_date(to_date, "to_date")
        if start > end:
            raise ValueError("from_date cannot be after to_date.")
        queryset = queryset.filter(date__range=(start, end))
    elif from_date:
        queryset = queryset.filter(
            date__gte=_parse_date(from_date, "from_date")
        )
    elif to_date:
        queryset = queryset.filter(
            date__lte=_parse_date(to_date, "to_date")
        )

    return queryset

# -------- CREATE ----------
@api_view(['POST'])
def monitor_create(request):
    # Normalize empty strings to None first
    payload = _clean_payload(request.data)

    serializer = MonitorCreateSerializer(data=payload)
    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                "message": "Monitor created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    # Print the exact errors to your server console for debugging
    print("Monitor create validation errors:", serializer.errors)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ---------- DELETE ----------
@api_view(['DELETE'])
def monitor_delete(request, pk):
    try:
        obj = Monitor.objects.get(pk=pk)
    except Monitor.DoesNotExist:
        return Response(
            {"error": "Monitor not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    obj.delete()
    return Response(
        {"message": "Monitor deleted successfully."},
        status=status.HTTP_200_OK,
    )


# ---------- LIST ----------
@api_view(['GET'])
def monitor_list(request):
    queryset = Monitor.objects.all().order_by('-created_at')
    try:
        queryset = _apply_monitor_filters(queryset, request)
    except ValueError as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    paginator = MonitorPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = MonitorSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


# ---------- DETAIL ----------
@api_view(['GET'])
def monitor_detail(request, pk):
    try:
        obj = Monitor.objects.get(pk=pk)
    except Monitor.DoesNotExist:
        return Response(
            {"error": "Monitor not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    serializer = MonitorSerializer(obj)
    return Response(serializer.data, status=status.HTTP_200_OK)



######################################
# CRM LISTING
######################################
# ==========================================
# HELPER FUNCTIONS
# ==========================================
def _clean_payload(data):
    """Normalize empty strings to None to prevent unique constraint collisions."""
    cleaned = data.copy()
    for key, value in cleaned.items():
        if value == "":
            cleaned[key] = None
    return cleaned

def _apply_owner_filters(queryset, request):
    """Apply search filtering."""
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) | 
            Q(company__icontains=search) | 
            Q(phone__icontains=search) |
            Q(email__icontains=search)
        )
    return queryset

# ==========================================
# LIST VIEW
# ==========================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def landlord_list(request):
    # ✅ Annotate the queryset to count units efficiently in one DB query
    queryset = CrmOwner.objects.annotate(unit_count=Count('listings')).order_by('-created_at')
    
    # Role-based filtering
    user_profile = getattr(request.user, 'profile', None)
    user_role = getattr(user_profile, 'role', 'user') if user_profile else 'user'
    user_role = str(user_role).lower()

    if user_role not in ['admin', 'manager']:
        # Regular users only see what they created
        queryset = queryset.filter(created_by=user_profile)
        
    # Apply search filters
    queryset = _apply_owner_filters(queryset, request)
    
    serializer = CrmOwnerSerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# ==========================================
# DETAIL VIEW
# ==========================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def landlord_detail(request, pk):
    try:
        # ✅ Annotate for the detail view so 'units_count' is accurate
        obj = CrmOwner.objects.annotate(unit_count=Count('listings')).get(pk=pk)
    except CrmOwner.DoesNotExist:
        return Response(
            {"error": "Owner not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
        
    serializer = CrmOwnerSerializer(obj, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# ==========================================
# CREATE VIEW
# ==========================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def landlord_create(request):
    payload = _clean_payload(request.data)
    
    serializer = CrmOwnerSerializer(data=payload, context={'request': request})
    if serializer.is_valid():
        # ✅ Auto-assign created_by
        profile = getattr(request.user, 'profile', None)
        serializer.save(created_by=profile)
        
        return Response(
            {
                "message": "Owner created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    print("Owner create validation errors:", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# UPDATE VIEW
# ==========================================
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def landlord_update(request, pk):
    try:
        obj = CrmOwner.objects.get(pk=pk)
    except CrmOwner.DoesNotExist:
        return Response(
            {"error": "Owner not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Normalize empty strings to None
    payload = _clean_payload(request.data)
    partial = request.method == 'PATCH'
    
    serializer = CrmOwnerSerializer(obj, data=payload, partial=partial, context={'request': request})
    if serializer.is_valid():
        # ✅ Auto-assign updated_by
        profile = getattr(request.user, 'profile', None)
        serializer.save(updated_by=profile)
        
        return Response(
            {
                "message": "Owner updated successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    print("Owner update validation errors:", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# DELETE VIEW
# ==========================================
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def landlord_delete(request, pk):
    try:
        obj = CrmOwner.objects.get(pk=pk)
    except CrmOwner.DoesNotExist:
        return Response(
            {"error": "Owner not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    obj.delete()
    return Response(
        {"message": "Owner deleted successfully."},
        status=status.HTTP_200_OK,
    )


# ==========================================
# Archive Owner Views
# ==========================================

# Reusing or creating a filter helper for search

# Reusing or creating a filter helper for search
# from django.db.models.functions import Cast
# from django.db.models import CharField

logger = logging.getLogger(__name__)


def _apply_archive_owner_filters(queryset, request):
    search = request.query_params.get('search')
    area = request.query_params.get('area')
    community = request.query_params.get('community')
    sub_community = request.query_params.get('sub_community')
    responsibility_id = request.query_params.get('responsibility')
    last_comm_date = request.query_params.get('last_communication_date')
    start_date = request.query_params.get('start_date')

    # 1. General Text Search
    if search:
        queryset = queryset.annotate(
            date_str=Cast('last_communication_date', output_field=CharField())
        ).filter(
            Q(name__icontains=search) | 
            Q(company__icontains=search) | 
            Q(phone__icontains=search) |
            Q(unit_no__icontains=search) |
            Q(refrence_no__icontains=search) |
            Q(area__icontains=search) |
            Q(community__icontains=search) |
            Q(sub_community__icontains=search) |
            Q(date_str__icontains=search)
        )
    
    # 2. Specific Area Filters
    if area:
        queryset = queryset.filter(area__icontains=area)
    if community:
        queryset = queryset.filter(community__icontains=community)
    if sub_community:
        queryset = queryset.filter(sub_community__icontains=sub_community)

    # 3. Responsibility Filter
    if responsibility_id:
        if responsibility_id == 'unassigned':
            # ✅ Handle the "Unassigned" case
            queryset = queryset.filter(responsibility__isnull=True)
        else:
            try:
                queryset = queryset.filter(responsibility_id=int(responsibility_id))
            except ValueError:
                pass 
    
    # 4. Exact Date Filter
    if last_comm_date:
        queryset = queryset.filter(last_communication_date=last_comm_date)
        
    # 5. Date Range Filter
    if start_date:
        queryset = queryset.filter(last_communication_date__gte=start_date)
    
    # 6. Property Category & Offer Filters
    prop_cat = request.query_params.get('property_category')
    if prop_cat:
        queryset = queryset.filter(property_category__icontains=prop_cat)
        
    prop_offer = request.query_params.get('property_offer')
    if prop_offer:
        queryset = queryset.filter(property_offer__icontains=prop_offer)

    return queryset



class ArchiveOwnerPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def archive_owner_list(request):
    queryset = ArchiveOwner.objects.select_related('responsibility__user').order_by('-created_at')

    user_profile = getattr(request.user, 'profile', None)
    user_role = str(getattr(user_profile, 'role', 'user') if user_profile else 'user').lower()
    if user_role not in ['admin', 'manager']:
        queryset = queryset.filter(responsibility=user_profile)

    queryset = _apply_archive_owner_filters(queryset, request)

    paginator = ArchiveOwnerPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = ArchiveOwnerSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)

# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def archive_owner_list(request):
#     # 1. Start with all objects
#     queryset = ArchiveOwner.objects.select_related('responsibility__user').all().order_by('-created_at')
    
#     # 2. Check User Role
#     user_profile = getattr(request.user, 'profile', None)
#     user_role = getattr(user_profile, 'role', 'user') if user_profile else 'user'
#     user_role = str(user_role).lower()

#     # 3. Apply Role-based filtering
#     if user_role not in ['admin', 'manager']:
#         queryset = queryset.filter(responsibility=user_profile)
        
#     # 4. Apply search filters
#     queryset = _apply_archive_owner_filters(queryset, request)
    
#     # 5. Return response
#     serializer = ArchiveOwnerSerializer(queryset, many=True, context={'request': request})
#     return Response(serializer.data, status=status.HTTP_200_OK)


#############################
# Bulk Insert | pandas | delete | update
############################
# ... (Keep your _apply_archive_owner_filters and archive_owner_list views exactly as they are) ...

#############################
# Bulk Insert | pandas | delete | update
############################

BATCH_SIZE = 500
MAX_ERRORS_RETURNED = 100

PLACEHOLDER_NAMES = {"0", "-", "n/a", "na", "none", "null"}

def _clean(value):
    """NaN / empty -> None, everything else -> stripped string."""
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    return text or None

def _to_date(value):
    """Return a date or None."""
    value = _clean(value)
    if value is None:
        return None
    parsed = pd.to_datetime(value, errors="coerce")
    return None if pd.isna(parsed) else parsed.date()

def _to_decimal(value):
    """Convert to decimal or None."""
    value = _clean(value)
    if value is None:
        return None
    try:
        clean_value = str(value).replace(",", "").replace("AED", "").strip()
        return float(clean_value)
    except ValueError:
        return None

def _to_truncated_string(value, max_length=500):
    """✅ FIX: Safely truncate strings, handling None values."""
    val = _clean(value)
    if val is None:
        return None
    return val[:max_length]

def _validation_message(exc):
    """First human-readable message of a DRF ValidationError."""
    detail = exc.detail
    first = next(iter(detail.values()), "Invalid data") if isinstance(detail, dict) else detail
    if isinstance(first, (list, tuple)):
        first = first[0] if first else "Invalid data"
    return str(first)

def _db_message(exc):
    """Readable, short version of a database exception."""
    lines = [line.strip() for line in str(exc).splitlines() if line.strip()]
    return " ".join(lines[:2])[:300] or exc.__class__.__name__


# OLD DATA BULK
# @api_view(["POST"])
# @permission_classes([IsAuthenticated])
# @parser_classes([MultiPartParser, FormParser])
# def archive_owner_bulk_create(request):
#     # 1. Validate file
#     file_obj = request.FILES.get("file")
#     if not file_obj:
#         return Response(
#             {"error": "No file uploaded. Please upload an Excel or CSV file."},
#             status=status.HTTP_400_BAD_REQUEST,
#         )

#     try:
#         # 2. Read file. dtype=str keeps phone numbers as text
#         filename = file_obj.name.lower()
#         if filename.endswith(".csv"):
#             df = pd.read_csv(file_obj, dtype=str)
#         elif filename.endswith((".xls", ".xlsx")):
#             df = pd.read_excel(file_obj, dtype=str)
#         else:
#             return Response(
#                 {"error": "Unsupported file format. Please upload .xlsx, .xls, or .csv"},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
#         records = df.to_dict("records")

#         user_profile = getattr(request.user, "profile", None)
#         rules = ArchiveOwnerSerializer()

#         # ✅ FETCH EXISTING UNIQUE VALUES FROM DATABASE
#         # This prevents the IntegrityError by pre-checking duplicates
#         existing_unit_nos = set(
#             ArchiveOwner.objects.exclude(unit_no__isnull=True).values_list('unit_no', flat=True)
#         )
#         existing_ref_nos = set(
#             ArchiveOwner.objects.exclude(refrence_no__isnull=True).values_list('refrence_no', flat=True)
#         )
        
#         # Track values seen in the current file to prevent duplicates within the file itself
#         seen_unit_nos = set()
#         seen_ref_nos = set()

#         success_count = 0
#         error_count = 0
#         skipped_count = 0
#         errors = []

#         # 3. Validate + build model objects in memory
#         objects, row_numbers, row_labels = [], [], []
#         for index, row in enumerate(records):
#             row_num = index + 2

#             name = _clean(row.get("name"))
#             if name and name.lower() in PLACEHOLDER_NAMES:
#                 name = None
#             company = _clean(row.get("company"))

#             phone = _clean(row.get("phone"))
#             if phone:
#                 phone = phone.replace(" ", "").split("/")[0]

#             if not phone and not name and not company:
#                 skipped_count += 1
#                 continue

#             owner_type_raw = _clean(row.get("owner_type"))
#             owner_type = "company" if owner_type_raw and "comp" in owner_type_raw.lower() else "individual"
#             label = name or company or phone

#             # Validate using the Serializer rules
#             try:
#                 rules.validate({"owner_type": owner_type, "company": company, "phone": phone})
#             except serializers.ValidationError as exc:
#                 error_count += 1
#                 errors.append({"row": row_num, "owner": label, "error": _validation_message(exc)})
#                 continue

#             # ✅ CHECK FOR DUPLICATE UNIT_NO AND REFRENCE_NO
#             unit_no = _clean(row.get("unit_no"))
#             refrence_no = _clean(row.get("refrence_no"))

#             # Check Unit No
#             if unit_no:
#                 if unit_no in existing_unit_nos or unit_no in seen_unit_nos:
#                     error_count += 1
#                     errors.append({"row": row_num, "owner": label, "error": f"Unit Number '{unit_no}' already exists."})
#                     continue # 👈 THIS IS THE GRACEFUL SKIP
#                 seen_unit_nos.add(unit_no) # Track for within-file duplicates

#             # Check Reference No
#             if refrence_no:
#                 if refrence_no in existing_ref_nos or refrence_no in seen_ref_nos:
#                     error_count += 1
#                     errors.append({"row": row_num, "owner": label, "error": f"Reference Number '{refrence_no}' already exists."})
#                     continue # 👈 THIS IS THE GRACEFUL SKIP
#                 seen_ref_nos.add(refrence_no) # Track for within-file duplicates

#             # ✅ Build model object safely
#             objects.append(
#                 ArchiveOwner(
#                     owner_type=owner_type,
#                     name=name,
#                     company=company,
#                     phone=phone,
                    
#                     property_category=_clean(row.get("property_category")),
#                     property_offer=_clean(row.get("property_offer")),
#                     sale_price=_to_decimal(row.get("sale_price")),
#                     rent_price=_to_decimal(row.get("rent_price")),
                    
#                     unit_no=unit_no,
#                     refrence_no=refrence_no,
                    
#                     area=_clean(row.get("area")),
#                     community=_clean(row.get("community")),
#                     sub_community=_clean(row.get("sub_community")),
#                     description=_clean(row.get("description")),
                    
#                     # Safely truncate the URL to 500 chars
#                     property_location=_to_truncated_string(row.get("property_location"), max_length=500),
                    
#                     remarks=_clean(row.get("remarks")),
#                     last_communication_date=_to_date(row.get("last_communication_date")),

#                     created_by=user_profile,
#                     updated_by=user_profile.id,
#                 )
#             )
#             row_numbers.append(row_num)
#             row_labels.append(label)

#         # 4. Insert in batches
#         for start in range(0, len(objects), BATCH_SIZE):
#             chunk = objects[start:start + BATCH_SIZE]
#             chunk_rows = row_numbers[start:start + BATCH_SIZE]
#             chunk_labels = row_labels[start:start + BATCH_SIZE]
#             try:
#                 with transaction.atomic():
#                     ArchiveOwner.objects.bulk_create(chunk, batch_size=BATCH_SIZE)
#                 success_count += len(chunk)
#             except Exception as batch_exc:
#                 logger.warning(
#                     "Bulk insert of rows %s-%s failed (%s: %s) - retrying row by row",
#                     chunk_rows[0], chunk_rows[-1], batch_exc.__class__.__name__, _db_message(batch_exc),
#                 )
#                 same_error_in_a_row = 0
#                 last_key = None
#                 last_message = None
#                 for obj, row_num, label in zip(chunk, chunk_rows, chunk_labels):
#                     if same_error_in_a_row >= 25:
#                         error_count += 1
#                         errors.append({"row": row_num, "owner": label, "error": last_message})
#                         continue
#                     try:
#                         with transaction.atomic():
#                             obj.save()
#                         success_count += 1
#                         same_error_in_a_row = 0
#                         last_key = None
#                     except Exception as e:
#                         message = _db_message(e)
#                         key = message.split(" DETAIL")[0]
#                         same_error_in_a_row = same_error_in_a_row + 1 if key == last_key else 1
#                         last_key, last_message = key, message
#                         error_count += 1
#                         errors.append({"row": row_num, "owner": label, "error": message})

#         # 5. Summary
#         errors.sort(key=lambda item: item["row"])
#         error_summary = [
#             {"error": message, "count": count}
#             for message, count in Counter(item["error"] for item in errors).most_common(5)
#         ]
        
#         message = (
#             f"Import completed. Imported: {success_count}, Failed: {error_count}, "
#             f"Skipped (empty): {skipped_count}"
#         )

#         return Response(
#             {
#                 "message": message,
#                 "total_rows": len(records),
#                 "success_count": success_count,
#                 "error_count": error_count,
#                 "skipped_count": skipped_count,
#                 "error_summary": error_summary,
#                 "errors": errors[:MAX_ERRORS_RETURNED],
#             },
#             status=status.HTTP_200_OK,
#         )

#     except Exception as e:
#         logger.exception("Failed to process file")
#         return Response(
#             {"error": f"Failed to process file: {str(e)}"},
#             status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#         )



import pandas as pd
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status, serializers
from collections import Counter
import logging

logger = logging.getLogger(__name__)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def archive_owner_bulk_create(request):
    # 1. Validate file
    file_obj = request.FILES.get("file")
    if not file_obj:
        return Response(
            {"error": "No file uploaded. Please upload an Excel or CSV file."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # 2. Read file dynamically
        filename = file_obj.name.lower()
        if filename.endswith(".csv"):
            # For CSV, find the header row first
            raw_df = pd.read_csv(file_obj, dtype=str, header=None)
        elif filename.endswith((".xls", ".xlsx")):
            raw_df = pd.read_excel(file_obj, dtype=str, header=None)
        else:
            return Response(
                {"error": "Unsupported file format. Please upload .xlsx, .xls, or .csv"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ DYNAMIC HEADER DETECTION
        # Scan the first 20 rows to find the row that actually contains "phone" or "name"
        header_row_index = 0
        for i in range(min(20, len(raw_df))):
            row_values = [str(val).strip().lower() for val in raw_df.iloc[i].values if pd.notna(val)]
            if "phone" in row_values or "name" in row_values:
                header_row_index = i
                break

        # Re-read the file using the detected header row
        if filename.endswith(".csv"):
            file_obj.seek(0)
            df = pd.read_csv(file_obj, dtype=str, header=header_row_index)
        else:
            file_obj.seek(0)
            df = pd.read_excel(file_obj, dtype=str, header=header_row_index)

        # Clean headers (lowercase, replace spaces with underscores)
        df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
        records = df.to_dict("records")

        user_profile = getattr(request.user, "profile", None)
        rules = ArchiveOwnerSerializer()

        # ✅ FETCH EXISTING UNIQUE VALUES FROM DATABASE
        existing_unit_nos = set(
            ArchiveOwner.objects.exclude(unit_no__isnull=True).values_list('unit_no', flat=True)
        )
        existing_ref_nos = set(
            ArchiveOwner.objects.exclude(refrence_no__isnull=True).values_list('refrence_no', flat=True)
        )
        
        seen_unit_nos = set()
        seen_ref_nos = set()

        success_count = 0
        error_count = 0
        skipped_count = 0
        errors = []

        # 3. Validate + build model objects in memory
        objects, row_numbers, row_labels = [], [], []
        
        for index, row in enumerate(records):
            # Calculate the actual Excel row number for error reporting
            row_num = index + header_row_index + 2

            name = _clean(row.get("name"))
            if name and name.lower() in PLACEHOLDER_NAMES:
                name = None
            company = _clean(row.get("company"))

            phone = _clean(row.get("phone"))
            if phone:
                phone = phone.replace(" ", "").split("/")[0]

            if not phone and not name and not company:
                skipped_count += 1
                continue

            owner_type_raw = _clean(row.get("owner_type"))
            owner_type = "company" if owner_type_raw and "comp" in owner_type_raw.lower() else "individual"
            label = name or company or phone

            # ✅ HANDLE DUPLICATES GRACEFULLY (Skip instead of error)
            unit_no = _clean(row.get("unit_no"))
            refrence_no = _clean(row.get("refrence_no"))

            # Check Unit No
            if unit_no:
                if unit_no in existing_unit_nos or unit_no in seen_unit_nos:
                    skipped_count += 1
                    errors.append({"row": row_num, "owner": label, "error": f"Skipped: Unit Number '{unit_no}' already exists."})
                    continue 
                seen_unit_nos.add(unit_no)

            # Check Reference No
            if refrence_no:
                if refrence_no in existing_ref_nos or refrence_no in seen_ref_nos:
                    skipped_count += 1
                    errors.append({"row": row_num, "owner": label, "error": f"Skipped: Reference Number '{refrence_no}' already exists."})
                    continue 
                seen_ref_nos.add(refrence_no)

            # Validate using the Serializer rules
            try:
                rules.validate({"owner_type": owner_type, "company": company, "phone": phone})
            except serializers.ValidationError as exc:
                error_count += 1
                errors.append({"row": row_num, "owner": label, "error": _validation_message(exc)})
                continue

            # ✅ Build model object safely
            objects.append(
                ArchiveOwner(
                    owner_type=owner_type,
                    name=name,
                    company=company,
                    phone=phone,
                    
                    property_category=_clean(row.get("property_category")),
                    property_offer=_clean(row.get("property_offer")),
                    sale_price=_to_decimal(row.get("sale_price")),
                    rent_price=_to_decimal(row.get("rent_price")),
                    
                    unit_no=unit_no,
                    refrence_no=refrence_no,
                    
                    area=_clean(row.get("area")),
                    community=_clean(row.get("community")),
                    sub_community=_clean(row.get("sub_community")),
                    
                    # Location fields
                    municipality=_clean(row.get("municipality")),
                    municipality_no=_clean(row.get("municipality_no")),
                    zone=_clean(row.get("zone")),
                    plot_no=_clean(row.get("plot_no")),
                    land_no=_clean(row.get("land_no")),
                    road_name=_clean(row.get("road_name")),
                    plot_address=_clean(row.get("plot_address")),
                    
                    description=_clean(row.get("description")),
                    property_location=_to_truncated_string(row.get("property_location"), max_length=500),
                    remarks=_clean(row.get("remarks")),
                    last_communication_date=_to_date(row.get("last_communication_date")),

                    created_by=user_profile,
                    updated_by=user_profile.id,
                )
            )
            row_numbers.append(row_num)
            row_labels.append(label)

        # 4. Insert in batches
        for start in range(0, len(objects), BATCH_SIZE):
            chunk = objects[start:start + BATCH_SIZE]
            chunk_rows = row_numbers[start:start + BATCH_SIZE]
            chunk_labels = row_labels[start:start + BATCH_SIZE]
            try:
                with transaction.atomic():
                    ArchiveOwner.objects.bulk_create(chunk, batch_size=BATCH_SIZE)
                success_count += len(chunk)
            except Exception as batch_exc:
                logger.warning(
                    "Bulk insert of rows %s-%s failed (%s: %s) - retrying row by row",
                    chunk_rows[0], chunk_rows[-1], batch_exc.__class__.__name__, _db_message(batch_exc),
                )
                same_error_in_a_row = 0
                last_key = None
                last_message = None
                for obj, row_num, label in zip(chunk, chunk_rows, chunk_labels):
                    if same_error_in_a_row >= 25:
                        error_count += 1
                        errors.append({"row": row_num, "owner": label, "error": last_message})
                        continue
                    try:
                        with transaction.atomic():
                            obj.save()
                        success_count += 1
                        same_error_in_a_row = 0
                        last_key = None
                    except Exception as e:
                        message = _db_message(e)
                        key = message.split(" DETAIL")[0]
                        same_error_in_a_row = same_error_in_a_row + 1 if key == last_key else 1
                        last_key, last_message = key, message
                        error_count += 1
                        errors.append({"row": row_num, "owner": label, "error": message})

        # 5. Summary
        errors.sort(key=lambda item: item["row"])
        error_summary = [
            {"error": message, "count": count}
            for message, count in Counter(item["error"] for item in errors).most_common(5)
        ]
        
        message = (
            f"Import completed. Imported: {success_count}, Failed: {error_count}, "
            f"Skipped (empty/duplicate): {skipped_count}"
        )

        return Response(
            {
                "message": message,
                "total_rows": len(records),
                "success_count": success_count,
                "error_count": error_count,
                "skipped_count": skipped_count,
                "error_summary": error_summary,
                "errors": errors[:MAX_ERRORS_RETURNED],
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception("Failed to process file")
        return Response(
            {"error": f"Failed to process file: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

        
        

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def archive_owner_bulk_delete(request):
    # 1. Check User Role
    user_profile = getattr(request.user, 'profile', None)
    user_role = getattr(user_profile, 'role', 'user') if user_profile else 'user'
    user_role = str(user_role).lower()

    # 2. Get the IDs from the request payload
    ids_to_delete = request.data.get('ids', [])

    if not ids_to_delete:
        return Response(
            {"error": "No record IDs provided for deletion."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # 3. Filter ONLY the selected IDs
        queryset = ArchiveOwner.objects.filter(id__in=ids_to_delete)

        # 4. Optional: If you want non-admins to only delete their own records
        if user_role not in ['admin', 'manager']:
            queryset = queryset.filter(responsibility=user_profile)

        # 5. Count how many records will be deleted
        count = queryset.count()

        if count == 0:
            return Response(
                {"message": "No matching records found to delete."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 6. Perform the delete
        queryset.delete()

        return Response(
            {
                "message": f"Successfully deleted {count} archived owners.",
                "deleted_count": count
            }, 
            status=status.HTTP_200_OK
        )

    except Exception as e:
        return Response(
            {"error": f"Failed to delete records: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

        
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def archive_owner_bulk_assign(request):
    # ... same as before ...
    user_profile = getattr(request.user, 'profile', None)
    if not user_profile:
        return Response({"error": "User profile not found."}, status=status.HTTP_403_FORBIDDEN)

    ids_to_update = request.data.get('ids', [])
    responsibility_id = request.data.get('responsibility_id')

    if not ids_to_update or not isinstance(ids_to_update, list):
        return Response({"error": "Please provide a list of 'ids' to update."}, status=status.HTTP_400_BAD_REQUEST)

    if not responsibility_id:
        return Response({"error": "Please provide a 'responsibility_id'."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target_profile = Profile.objects.get(id=responsibility_id)
    except Profile.DoesNotExist:
        return Response({"error": "The selected Profile (responsibility) does not exist."}, status=status.HTTP_404_NOT_FOUND)

    try:
        queryset = ArchiveOwner.objects.filter(id__in=ids_to_update)
        count = queryset.count()
        
        if count == 0:
            return Response({"error": "No matching records found to update."}, status=status.HTTP_404_NOT_FOUND)

        queryset.update(responsibility=target_profile, updated_by=user_profile.id)
        return Response({"message": f"Successfully reassigned {count} records.", "updated_count": count}, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": f"Failed to update records: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

#================================
# Archive Properties views 
#================================
# =========================================================
# SEARCH / FILTER HELPER
# =========================================================
def _apply_archive_property_filters(queryset, request):
    search = request.query_params.get('search')
    municipality = request.query_params.get('municipality')
    zone = request.query_params.get('zone')
    sector = request.query_params.get('sector')
    responsibility_id = request.query_params.get('responsibility')
    
    # 1. General Text Search
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search) | 
            Q(phone__icontains=search) |
            Q(property_type__icontains=search) |
            Q(property_category__icontains=search) |
            Q(property_offer__icontains=search) |
            Q(municipality__icontains=search) |
            Q(zone__icontains=search) |
            Q(sector__icontains=search) |
            Q(road_name__icontains=search) |
            Q(land_no__icontains=search) |
            Q(plot_no__icontains=search) |
            Q(plot_address__icontains=search)
        )
    
    # 2. Location Filters
    if municipality:
        queryset = queryset.filter(municipality__icontains=municipality)
    if zone:
        queryset = queryset.filter(zone__icontains=zone)
    if sector:
        queryset = queryset.filter(sector__icontains=sector)

    # 3. Responsibility Filter
    if responsibility_id:
        if responsibility_id == 'unassigned':
            queryset = queryset.filter(responsibility__isnull=True)
        else:
            try:
                queryset = queryset.filter(responsibility_id=int(responsibility_id))
            except ValueError:
                pass 
    
    # 4. Property Category & Offer Filters
    prop_cat = request.query_params.get('property_category')
    if prop_cat:
        queryset = queryset.filter(property_category__icontains=prop_cat)
        
    prop_offer = request.query_params.get('property_offer')
    if prop_offer:
        queryset = queryset.filter(property_offer__icontains=prop_offer)

    return queryset


# =========================================================
# LIST VIEW
# =========================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def archive_property_list(request):
    # 1. Start with all objects
    queryset = ArchiveProperty.objects.select_related('responsibility__user').all().order_by('-created_at')
    
    # 2. Check User Role
    user_profile = getattr(request.user, 'profile', None)
    user_role = getattr(user_profile, 'role', 'user') if user_profile else 'user'
    user_role = str(user_role).lower()

    # 3. Apply Role-based filtering
    if user_role not in ['admin', 'manager']:
        queryset = queryset.filter(responsibility=user_profile)
        
    # 4. Apply search filters
    queryset = _apply_archive_property_filters(queryset, request)
    
    # 5. Return response
    serializer = ArchivePropertySerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# =========================================================
# BULK INSERT | PANDAS | DELETE | UPDATE
# =========================================================
BATCH_SIZE = 500
MAX_ERRORS_RETURNED = 100

def _clean(value):
    """NaN / empty -> None, everything else -> stripped string."""
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    return text or None

def _to_decimal(value):
    """Convert to decimal or None."""
    value = _clean(value)
    if value is None:
        return None
    try:
        clean_value = str(value).replace(",", "").replace("AED", "").strip()
        return float(clean_value)
    except ValueError:
        return None

def _to_truncated_string(value, max_length=500):
    """Safely truncate strings, handling None values."""
    val = _clean(value)
    if val is None:
        return None
    return val[:max_length]

def _validation_message(exc):
    """First human-readable message of a DRF ValidationError."""
    detail = exc.detail
    first = next(iter(detail.values()), "Invalid data") if isinstance(detail, dict) else detail
    if isinstance(first, (list, tuple)):
        first = first[0] if first else "Invalid data"
    return str(first)

def _db_message(exc):
    """Readable, short version of a database exception."""
    lines = [line.strip() for line in str(exc).splitlines() if line.strip()]
    return " ".join(lines[:2])[:300] or exc.__class__.__name__


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def archive_property_bulk_create(request):
    # 1. Validate file
    file_obj = request.FILES.get("file")
    if not file_obj:
        return Response(
            {"error": "No file uploaded. Please upload an Excel or CSV file."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        # 2. Read file. dtype=str keeps phone numbers as text
        filename = file_obj.name.lower()
        if filename.endswith(".csv"):
            df = pd.read_csv(file_obj, dtype=str)
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(file_obj, dtype=str)
        else:
            return Response(
                {"error": "Unsupported file format. Please upload .xlsx, .xls, or .csv"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
        records = df.to_dict("records")

        user_profile = getattr(request.user, "profile", None)
        rules = ArchivePropertySerializer()

        success_count = 0
        error_count = 0
        skipped_count = 0
        errors = []

        # 3. Validate + build model objects in memory
        objects, row_numbers, row_labels = [], [], []
        for index, row in enumerate(records):
            row_num = index + 2

            name = _clean(row.get("name"))
            phone = _clean(row.get("phone"))
            if phone:
                phone = phone.replace(" ", "").split("/")[0]

            # Skip completely empty rows
            if not phone and not name:
                skipped_count += 1
                continue

            label = name or phone or "Unknown"

            # Validate using the Serializer rules
            try:
                rules.validate({
                    "property_offer": _clean(row.get("property_offer")),
                    "sale_price": _to_decimal(row.get("sale_price")),
                    "rent_price": _to_decimal(row.get("rent_price")),
                })
            except serializers.ValidationError as exc:
                error_count += 1
                errors.append({"row": row_num, "owner": label, "error": _validation_message(exc)})
                continue

            # ✅ Build model object safely
            objects.append(
                ArchiveProperty(
                    name=name,
                    phone=phone,
                    property_type=_clean(row.get("property_type")),
                    property_category=_clean(row.get("property_category")),
                    property_offer=_clean(row.get("property_offer")),
                    plot_size=_to_decimal(row.get("plot_size")),
                    sale_price=_to_decimal(row.get("sale_price")),
                    rent_price=_to_decimal(row.get("rent_price")),
                    
                    municipality=_clean(row.get("municipality")),
                    zone=_clean(row.get("zone")),
                    sector=_clean(row.get("sector")),
                    road_name=_clean(row.get("road_name")),
                    land_no=_clean(row.get("land_no")),
                    plot_no=_clean(row.get("plot_no")),
                    plot_address=_clean(row.get("plot_address")),
                    
                    description=_clean(row.get("description")),
                    remarks=_clean(row.get("remarks")),
                    
                    created_by=user_profile,
                    updated_by=user_profile.id,
                )
            )
            row_numbers.append(row_num)
            row_labels.append(label)

        # 4. Insert in batches
        for start in range(0, len(objects), BATCH_SIZE):
            chunk = objects[start:start + BATCH_SIZE]
            chunk_rows = row_numbers[start:start + BATCH_SIZE]
            chunk_labels = row_labels[start:start + BATCH_SIZE]
            try:
                with transaction.atomic():
                    ArchiveProperty.objects.bulk_create(chunk, batch_size=BATCH_SIZE)
                success_count += len(chunk)
            except Exception as batch_exc:
                logger.warning(
                    "Bulk insert of rows %s-%s failed (%s: %s) - retrying row by row",
                    chunk_rows[0], chunk_rows[-1], batch_exc.__class__.__name__, _db_message(batch_exc),
                )
                same_error_in_a_row = 0
                last_key = None
                last_message = None
                for obj, row_num, label in zip(chunk, chunk_rows, chunk_labels):
                    if same_error_in_a_row >= 25:
                        error_count += 1
                        errors.append({"row": row_num, "owner": label, "error": last_message})
                        continue
                    try:
                        with transaction.atomic():
                            obj.save()
                        success_count += 1
                        same_error_in_a_row = 0
                        last_key = None
                    except Exception as e:
                        message = _db_message(e)
                        key = message.split(" DETAIL")[0]
                        same_error_in_a_row = same_error_in_a_row + 1 if key == last_key else 1
                        last_key, last_message = key, message
                        error_count += 1
                        errors.append({"row": row_num, "owner": label, "error": message})

        # 5. Summary
        errors.sort(key=lambda item: item["row"])
        error_summary = [
            {"error": message, "count": count}
            for message, count in Counter(item["error"] for item in errors).most_common(5)
        ]
        
        message = (
            f"Import completed. Imported: {success_count}, Failed: {error_count}, "
            f"Skipped (empty): {skipped_count}"
        )

        return Response(
            {
                "message": message,
                "total_rows": len(records),
                "success_count": success_count,
                "error_count": error_count,
                "skipped_count": skipped_count,
                "error_summary": error_summary,
                "errors": errors[:MAX_ERRORS_RETURNED],
            },
            status=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.exception("Failed to process file")
        return Response(
            {"error": f"Failed to process file: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


# =========================================================
# BULK DELETE
# =========================================================
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def archive_property_bulk_delete(request):
    # 1. Check User Role
    user_profile = getattr(request.user, 'profile', None)
    user_role = getattr(user_profile, 'role', 'user') if user_profile else 'user'
    user_role = str(user_role).lower()

    # 2. Get the IDs from the request payload
    ids_to_delete = request.data.get('ids', [])

    if not ids_to_delete:
        return Response(
            {"error": "No record IDs provided for deletion."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # 3. Filter ONLY the selected IDs
        queryset = ArchiveProperty.objects.filter(id__in=ids_to_delete)

        # 4. Optional: If you want non-admins to only delete their own records
        if user_role not in ['admin', 'manager']:
            queryset = queryset.filter(responsibility=user_profile)

        # 5. Count how many records will be deleted
        count = queryset.count()

        if count == 0:
            return Response(
                {"message": "No matching records found to delete."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 6. Perform the delete
        queryset.delete()

        return Response(
            {
                "message": f"Successfully deleted {count} archived properties.",
                "deleted_count": count
            }, 
            status=status.HTTP_200_OK
        )

    except Exception as e:
        return Response(
            {"error": f"Failed to delete records: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# =========================================================
# BULK ASSIGN RESPONSIBILITY
# =========================================================
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def archive_property_bulk_assign(request):
    # 1. Get User Profile (Used for 'updated_by' tracking)
    user_profile = getattr(request.user, 'profile', None)
    if not user_profile:
        return Response(
            {"error": "User profile not found."}, 
            status=status.HTTP_403_FORBIDDEN
        )

    # 2. Validate incoming data
    ids_to_update = request.data.get('ids', [])
    responsibility_id = request.data.get('responsibility_id')

    if not ids_to_update or not isinstance(ids_to_update, list):
        return Response(
            {"error": "Please provide a list of 'ids' to update."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    if not responsibility_id:
        return Response(
            {"error": "Please provide a 'responsibility_id'."}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    # 3. Validate that the target Profile exists
    try:
        target_profile = Profile.objects.get(id=responsibility_id)
    except Profile.DoesNotExist:
        return Response(
            {"error": "The selected Profile (responsibility) does not exist."}, 
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        # 4. Filter the queryset
        queryset = ArchiveProperty.objects.filter(id__in=ids_to_update)
        
        # Count how many are actually being updated
        count = queryset.count()
        
        if count == 0:
            return Response(
                {"error": "No matching records found to update."}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # 5. Perform the update on all selected rows
        queryset.update(
            responsibility=target_profile,
            updated_by=user_profile.id
        )

        return Response(
            {
                "message": f"Successfully reassigned {count} properties.",
                "updated_count": count
            }, 
            status=status.HTTP_200_OK
        )

    except Exception as e:
        return Response(
            {"error": f"Failed to update records: {str(e)}"}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )






# Permit Number
FILE_PARSERS = (MultiPartParser, FormParser, JSONParser)  # needed for title_deed upload

# ==========================================
# HELPERS
# ==========================================
def _get_profile_and_role(request):
    profile = getattr(request.user, 'profile', None)
    role = str(getattr(profile, 'role', 'user')).lower() if profile else 'user'
    return profile, role


def _permit_queryset(request):
    """Admin / manager see everything. Everyone else sees only what they created."""
    profile, role = _get_profile_and_role(request)
    qs = PermitNo.objects.select_related(
        'managed_by', 'managed_by__user', 'created_by', 'created_by__user'
    ).order_by('-created_at')
    if role not in ['admin', 'manager']:
        qs = qs.filter(created_by=profile)
    return qs


def _clean_permit_payload(data):
    """Multipart forms send "" for empty fields -> convert to None.
    Keeps real uploaded files untouched and drops an empty title_deed."""
    cleaned = {}
    for key in data.keys():
        value = data.get(key)
        if key == 'title_deed':
            if hasattr(value, 'read'):      # a real uploaded file
                cleaned[key] = value
            continue                        # "", "null" etc. -> ignore, keep the stored file
        if isinstance(value, str):
            value = value.strip()
            if value == '' or value.lower() == 'null':
                value = None
        cleaned[key] = value
    return cleaned


def _apply_permit_filters(queryset, request):
    params = request.query_params

    search = (params.get('search') or '').strip()
    if search:
        queryset = queryset.filter(
            Q(permit_no__icontains=search)
            | Q(refrence_no__icontains=search)
            | Q(title__icontains=search)
            | Q(permit_status__icontains=search)
            | Q(property_offer__icontains=search)  # ✅ ADDED: search by offer
        )

    managed_by = params.get('managed_by')
    if managed_by:
        queryset = queryset.filter(managed_by_id=managed_by)

    permit_status = params.get('permit_status')
    if permit_status:
        queryset = queryset.filter(permit_status=permit_status)
        
    # ✅ ADDED: Filter by property offer
    property_offer = params.get('property_offer')
    if property_offer:
        queryset = queryset.filter(property_offer=property_offer)

    # ✅ ADDED: Filter by min and max price
    min_price = params.get('min_price')
    if min_price:
        queryset = queryset.filter(price__gte=min_price)

    max_price = params.get('max_price')
    if max_price:
        queryset = queryset.filter(price__lte=max_price)



    return queryset


# ==========================================
# LIST VIEW
# ==========================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def permit_list(request):
    queryset = _apply_permit_filters(_permit_queryset(request), request)
    serializer = PermitNoSerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)


# ==========================================
# CREATE VIEW
# ==========================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes(FILE_PARSERS)
def permit_create(request):
    payload = _clean_permit_payload(request.data)

    serializer = PermitNoSerializer(data=payload, context={'request': request})
    if serializer.is_valid():
        # ✅ Auto-assign created_by
        profile = getattr(request.user, 'profile', None)
        serializer.save(created_by=profile)

        return Response(
            {
                "message": "Permit record created successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )

    print("Permit create validation errors:", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# UPDATE VIEW
# ==========================================
@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes(FILE_PARSERS)
def permit_update(request, pk):
    try:
        obj = _permit_queryset(request).get(pk=pk)
    except PermitNo.DoesNotExist:
        return Response({"error": "Permit record not found."}, status=status.HTTP_404_NOT_FOUND)

    payload = _clean_permit_payload(request.data)
    partial = request.method == 'PATCH'

    serializer = PermitNoSerializer(obj, data=payload, partial=partial, context={'request': request})
    if serializer.is_valid():
        serializer.save()

        return Response(
            {
                "message": "Permit record updated successfully.",
                "data": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    print("Permit update validation errors:", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# DELETE VIEW
# ==========================================
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def permit_delete(request, pk):
    try:
        obj = _permit_queryset(request).get(pk=pk)
    except PermitNo.DoesNotExist:
        return Response({"error": "Permit record not found."}, status=status.HTTP_404_NOT_FOUND)

    obj.delete()  # the model's delete() also removes the file from storage
    return Response({"message": "Permit record deleted successfully."}, status=status.HTTP_200_OK)
    

##################
# CRM Listing Parent and Child images
##################  
# ==========================================
# HELPER FUNCTIONS
# ==========================================
def _clean_payload(data):
    """Normalize empty strings to None to prevent unique constraint collisions."""
    cleaned = data.copy()
    for key, value in cleaned.items():
        if value == "":
            cleaned[key] = None
    return cleaned

def _apply_listing_filters(queryset, request):
    """Apply search and filtering to the listing queryset."""
    search = request.query_params.get('search')
    offer_type = request.query_params.get('offer_type')
    property_type = request.query_params.get('property_type')

    if search:
        queryset = queryset.filter(
            Q(title__icontains=search) |
            Q(reference__icontains=search) |
            Q(unit_no__icontains=search) |
            Q(location_text__icontains=search)
        )
    if offer_type:
        queryset = queryset.filter(offer_type=offer_type)
    if property_type:
        queryset = queryset.filter(property_type__icontains=property_type)

    return queryset


# ==========================================
# CRM LISTING VIEWS
# ==========================================
# ---------- CREATE ----------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def listing_create(request):
    payload = _clean_payload(request.data)
    
    # ✅ Force default status to 'draft' if not provided
    if 'status' not in payload or not payload['status']:
        payload['status'] = 'draft'

    serializer = CrmListingSerializer(data=payload)
    if serializer.is_valid():
        # ✅ Auto-assign created_by so they can see it in "My Listings"
        profile = getattr(request.user, 'profile', None)
        listing = serializer.save(created_by=profile)

        # Handle images
        images = request.FILES.getlist('gallery_images')
        for image in images:
            ListingImage.objects.create(listing=listing, image=image)

        return Response(
            {
                "message": "Listing created successfully.",
                "data": CrmListingSerializer(listing).data,
            },
            status=status.HTTP_201_CREATED,
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ---------- LIST ----------
# @api_view(['GET'])
# @permission_classes([IsAuthenticated])
# def listing_list(request):
#     queryset = CrmListing.objects.all().order_by('-created_at')
#     queryset = _apply_listing_filters(queryset, request)
    
#     serializer = CrmListingSerializer(queryset, many=True)
#     return Response(serializer.data, status=status.HTTP_200_OK)

# It checks if the logged-in user is an admin or manager. If they are not, 
# it filters the listings to only show the ones where created_by matches the user's profile.


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listing_list(request):
    # 1. Start with all objects
    queryset = CrmListing.objects.all().order_by('-created_at')
    
    # 2. Check User Role
    user_profile = getattr(request.user, 'profile', None)
    user_role = getattr(user_profile, 'role', 'user') if user_profile else 'user'
    user_role = str(user_role).lower()

    # 3. Apply Role-based filtering
    if user_role not in ['admin', 'manager']:
        # ✅ Regular users only see listings they created
        queryset = queryset.filter(created_by=user_profile)
        
    # 4. Apply search filters (if you have any text search)
    queryset = _apply_listing_filters(queryset, request) # Assuming this is defined elsewhere

    # ✅ 5. Apply Frontend Filter Bar logic
    filter_type = request.query_params.get('filter')
    
    if filter_type == 'draft':
        # Handles 'draft' string or null
        queryset = queryset.filter(Q(property_status='draft') | Q(property_status__isnull=True))
        
    elif filter_type == 'live':
        queryset = queryset.filter(property_status__iexact='live')
        
    elif filter_type == 'sale':
        # ✅ Updated to use property_offer
        queryset = queryset.filter(property_offer__iexact='sale')
        
    elif filter_type == 'rent':
        # ✅ Updated to use property_offer
        queryset = queryset.filter(property_offer__iexact='rent')
        
    elif filter_type == 'hot_deal':
        queryset = queryset.filter(hot_deal=True)
    
    # 6. Return response
    serializer = CrmListingSerializer(queryset, many=True, context={'request': request})
    return Response(serializer.data, status=status.HTTP_200_OK)

    
# ---------- DETAIL ----------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def listing_detail(request, pk):
    try:
        obj = CrmListing.objects.get(pk=pk)
    except CrmListing.DoesNotExist:
        return Response({"error": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)
        
    serializer = CrmListingSerializer(obj)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ---------- UPDATE ----------
# @api_view(['PUT', 'PATCH'])
# @permission_classes([IsAuthenticated])
# @parser_classes([MultiPartParser, FormParser])
# def listing_update(request, pk):
#     try:
#         listing = CrmListing.objects.get(pk=pk)
#     except CrmListing.DoesNotExist:
#         return Response({"error": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)

#     payload = _clean_payload(request.data)
#     partial = request.method == 'PATCH'
    
#     serializer = CrmListingSerializer(listing, data=payload, partial=partial)
#     if serializer.is_valid():
#         profile = getattr(request.user, 'profile', None)
#         serializer.save(updated_by=profile)

#         # ✅ Handle adding NEW images if they were uploaded
#         images = request.FILES.getlist('gallery_images')
#         for image in images:
#             ListingImage.objects.create(listing=listing, image=image)

#         return Response(
#             {
#                 "message": "Listing updated successfully.",
#                 "data": CrmListingSerializer(listing).data,
#             },
#             status=status.HTTP_200_OK,
#         )

#     print("Listing update validation errors:", serializer.errors)
#     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# (Assuming you already have this helper function above your views)
def _clean_payload(data):
    """Normalize empty strings to None to prevent validation errors."""
    cleaned = data.copy()
    for key, value in cleaned.items():
        if value == "":
            # ✅ Dates and numbers must be None (null), not empty strings
            if key in ["issue_expiry", "sale_price", "sale_price_sqft", "service_charge", "rent_price", "rent_price_yearly"]:
                cleaned[key] = None
    return cleaned

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def listing_update(request, pk):
    try:
        listing = CrmListing.objects.get(pk=pk)
    except CrmListing.DoesNotExist:
        return Response({"error": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)

    # 1. Clean the incoming FormData (multipart/form-data)
    payload = _clean_payload(request.data)
    partial = request.method == 'PATCH'
    
    # 2. Validate and Save
    serializer = CrmListingSerializer(listing, data=payload, partial=partial)
    
    if serializer.is_valid():
        profile = getattr(request.user, 'profile', None)
        # ✅ Save and automatically set updated_by
        serializer.save(updated_by=profile)

        # ✅ Handle adding NEW gallery images if they were uploaded
        images = request.FILES.getlist('gallery_images')
        for image in images:
            ListingImage.objects.create(listing=listing, image=image)

        return Response(
            {
                "message": "Listing updated successfully.",
                "data": CrmListingSerializer(listing).data,
            },
            status=status.HTTP_200_OK,
        )

    # ❌ If we reach here, validation failed. Print the exact error.
    print("❌ Listing update validation errors:", serializer.errors)
    
    # Return the exact errors to the frontend so it can display the toast
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ---------- DELETE ----------
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def listing_delete(request, pk):
    try:
        obj = CrmListing.objects.get(pk=pk)
    except CrmListing.DoesNotExist:
        return Response({"error": "Listing not found."}, status=status.HTTP_404_NOT_FOUND)
    
    # Note: Because ListingImage has on_delete=models.CASCADE, 
    # deleting the listing will automatically delete its images from the DB.
    obj.delete()
    return Response({"message": "Listing deleted successfully."}, status=status.HTTP_200_OK)


# ==========================================
# LISTING IMAGE VIEWS
# ==========================================

# ---------- DELETE SINGLE IMAGE ----------
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def listing_image_delete(request, pk):
    try:
        image = ListingImage.objects.get(pk=pk)
    except ListingImage.DoesNotExist:
        return Response({"error": "Image not found."}, status=status.HTTP_404_NOT_FOUND)
    
    # ✅ Delete the physical file from the server storage, then delete the DB row
    image.image.delete(save=False) 
    image.delete()
    
    return Response({"message": "Image deleted successfully."}, status=status.HTTP_200_OK)
