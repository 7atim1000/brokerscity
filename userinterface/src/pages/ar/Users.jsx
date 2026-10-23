import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { IoMdSettings } from "react-icons/io";

import {
    FaSearch,
    FaUserPlus,
    FaSync,
    FaUserShield,
    FaTrash,
    FaCircle,
    FaUsers as FaUsersIcon,
    FaExclamationTriangle,
    FaThLarge,
    FaList,
    FaEnvelope,
    FaClock,
    FaEdit,
    FaSave,
    FaCheck,
} from "react-icons/fa";

import { FaClockRotateLeft } from "react-icons/fa6";

import { MdClose } from "react-icons/md";

import Registration from "../../components/ar/users/Registration";
import Permissions from "../../components/ar/users/Permissions";

import { getAccessToken, authFetch } from "../../utils/auth";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

/* ============================================================
   STATUS CONFIG
============================================================ */
const STATUS_CONFIG = {
    online: {
        label: "متصل",
        color: "bg-emerald-500",
        text: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        glow: "shadow-emerald-500/30",
    },
    logged_in: {
        label: "مسجل الدخول",
        color: "bg-blue-500",
        text: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
        glow: "shadow-blue-500/30",
    },
    pause: {
        label: "متوقف مؤقتاً",
        color: "bg-amber-500",
        text: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        glow: "shadow-amber-500/30",
    },
    offline: {
        label: "غير متصل",
        color: "bg-gray-400",
        text: "text-gray-600",
        bg: "bg-gray-50",
        border: "border-gray-200",
        glow: "shadow-gray-400/30",
    },
    logged_out: {
        label: "خرج",
        color: "bg-red-500",
        text: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        glow: "shadow-red-500/30",
    },
};

const getStatusConfig = (status) =>
    STATUS_CONFIG[status] || STATUS_CONFIG.offline;

/* ============================================================
   ROLE CONFIG
============================================================ */
const ROLE_OPTIONS = [
    { value: "user", label: "مستخدم" },
    { value: "vendor", label: "مورد" },
 
    { value: "listing", label: "ليستنق" },
    { value: "agent", label: "وكيل" },
    { value: "manager", label: "مدير" },
];

const ROLE_LABELS = ROLE_OPTIONS.reduce((acc, r) => {
    acc[r.value] = r.label;
    return acc;
}, {});

/* ============================================================
   USERS — Parent Component
============================================================ */
const Users = () => {
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // View mode
    const [viewMode, setViewMode] = useState("cards");

    // Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [roleFilter, setRoleFilter] = useState("all");
    const [activeFilter, setActiveFilter] = useState("all");

    // Modals
    const [showRegistration, setShowRegistration] = useState(false);
    const [showPermissions, setShowPermissions] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Delete
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        role: "user",
        is_active: true,
        can_view_users: false,
        can_manage_users: false,
        can_manage_permissions: false,
    });
    const [editErrors, setEditErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const intervalRef = useRef(null);

    /* =========================================================
       PERSIST VIEW MODE
    ========================================================= */
    useEffect(() => {
        const saved = localStorage.getItem("users_view_mode");
        if (saved === "cards" || saved === "table") {
            setViewMode(saved);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("users_view_mode", viewMode);
    }, [viewMode]);

    /* =========================================================
       FETCH USERS
    ========================================================= */
    const fetchUsers = async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);

        try {
            const token = getAccessToken();
            if (!token) {
                toast.error("يجب تسجيل الدخول أولاً.");
                return;
            }

            const params = new URLSearchParams();
            if (search.trim()) params.append("search", search.trim());
            if (statusFilter !== "all")
                params.append("status", statusFilter);
            if (roleFilter !== "all") params.append("role", roleFilter);
            if (activeFilter !== "all")
                params.append("active", activeFilter);

            const url = `${BASE}/api/users/${
                params.toString() ? `?${params.toString()}` : ""
            }`;

            const res = await authFetch(url);

            if (res.status === 403) {
                toast.error("ليس لديك صلاحية لعرض المستخدمين.");
                setUsers([]);
                setSummary(null);
                return;
            }

            if (!res.ok) throw new Error("فشل تحميل المستخدمين");

            const data = await res.json();
            setUsers(Array.isArray(data.users) ? data.users : []);
            setSummary(data.summary || null);
        } catch (err) {
            console.error("Fetch users error:", err);
            if (!silent) toast.error("❌ فشل تحميل قائمة المستخدمين");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    /* =========================================================
       INIT + AUTO REFRESH
    ========================================================= */
    useEffect(() => {
        fetchUsers();
        intervalRef.current = setInterval(() => fetchUsers(true), 30000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const t = setTimeout(fetchUsers, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, statusFilter, roleFilter, activeFilter]);

    /* =========================================================
       HANDLERS
    ========================================================= */
    const handleRefresh = () => fetchUsers();

    const handleOpenRegistration = () => {
        setSelectedUser(null);
        setShowRegistration(true);
    };

    const handleOpenPermissions = (user) => {
        setSelectedUser(user);
        setShowPermissions(true);
    };

    const handleOpenDelete = (user) => setConfirmDelete(user);

    /* ---- EDIT ---- */
    const handleOpenEdit = (user) => {
        setSelectedUser(user);
        setEditForm({
            role: user.role || "user",
            is_active: user.is_active ?? true,
            can_view_users: user.can_view_users ?? false,
            can_manage_users: user.can_manage_users ?? false,
            can_manage_permissions:
                user.can_manage_permissions ?? false,
        });
        setEditErrors({});
        setShowEdit(true);
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        setEditErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleEditToggle = (field) => {
        setEditForm((prev) => ({ ...prev, [field]: !prev[field] }));
        setEditErrors((prev) => ({ ...prev, [field]: "" }));
    };

    const handleSaveEdit = async () => {
        if (!selectedUser) return;
        setSaving(true);
        setEditErrors({});

        try {
            const res = await authFetch(
                `${BASE}/api/users/${selectedUser.id}/update/`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(editForm),
                }
            );

            let data = {};
            try {
                data = await res.json();
            } catch {}

            if (!res.ok) {
                if (data?.errors) setEditErrors(data.errors);
                throw new Error(data?.message || "فشل تحديث المستخدم");
            }

            toast.success(data?.message || "✅ تم تحديث المستخدم بنجاح");
            setShowEdit(false);
            setSelectedUser(null);
            fetchUsers();
        } catch (err) {
            console.error("Update user error:", err);
            toast.error(err.message || "❌ حدث خطأ أثناء التحديث");
        } finally {
            setSaving(false);
        }
    };

    const handleCloseModals = () => {
        setShowRegistration(false);
        setShowPermissions(false);
        setShowEdit(false);
        setSelectedUser(null);
    };

    /* =========================================================
       DELETE
    ========================================================= */
    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);

        try {
            const res = await authFetch(
                `${BASE}/api/users/${confirmDelete.id}/delete/`,
                { method: "DELETE" }
            );

            let data = {};
            try {
                data = await res.json();
            } catch {}

            if (!res.ok) {
                throw new Error(data?.message || "فشل حذف المستخدم");
            }

            toast.success(data?.message || "✅ تم حذف المستخدم بنجاح");
            setConfirmDelete(null);
            fetchUsers();
        } catch (err) {
            console.error("Delete user error:", err);
            toast.error(err.message || "❌ حدث خطأ أثناء الحذف");
        } finally {
            setDeleting(false);
        }
    };

    /* =========================================================
       SUMMARY CARDS DATA
    ========================================================= */
    const summaryCards = useMemo(() => {
        if (!summary) return [];
        return [
            {
                key: "total",
                label: "الإجمالي",
                value: summary.total,
                color: "from-[#a47d52]/20 to-[#a47d52]/5",
                iconColor: "text-[#a47d52]",
            },
            {
                key: "online",
                label: "متصل",
                value: summary.online,
                color: "from-emerald-500/20 to-emerald-500/5",
                iconColor: "text-emerald-600",
            },
            {
                key: "logged_in",
                label: "مسجل الدخول",
                value: summary.logged_in,
                color: "from-blue-500/20 to-blue-500/5",
                iconColor: "text-blue-600",
            },
            {
                key: "pause",
                label: "متوقف",
                value: summary.pause,
                color: "from-amber-500/20 to-amber-500/5",
                iconColor: "text-amber-600",
            },
            {
                key: "offline",
                label: "غير متصل",
                value: summary.offline,
                color: "from-gray-500/20 to-gray-500/5",
                iconColor: "text-gray-600",
            },
            {
                key: "logged_out",
                label: "خرج",
                value: summary.logged_out,
                color: "from-red-500/20 to-red-500/5",
                iconColor: "text-red-600",
            },
        ];
    }, [summary]);

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <div dir="rtl" className="min-h-screen bg-[#f8f7f5] p-4 md:p-6">
            {/* ===================== HEADER ===================== */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                        <FaUsersIcon size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-800">
                            المستخدمون
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            إدارة جميع مستخدمي المنصة وحالاتهم
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* VIEW TOGGLE */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                        <button
                            onClick={() => setViewMode("cards")}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-md
                                text-xs font-extrabold transition-all duration-200
                                cursor-pointer
                                ${
                                    viewMode === "cards"
                                        ? "bg-[#a47d52] text-white shadow-sm"
                                        : "text-gray-500 hover:text-[#a47d52]"
                                }
                            `}
                        >
                            <FaThLarge size={12} />
                            بطاقات
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-md
                                text-xs font-extrabold transition-all duration-200
                                cursor-pointer
                                ${
                                    viewMode === "table"
                                        ? "bg-[#a47d52] text-white shadow-sm"
                                        : "text-gray-500 hover:text-[#a47d52]"
                                }
                            `}
                        >
                            <FaList size={12} />
                            جدول
                        </button>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={loading || refreshing}
                        className="
                            flex items-center gap-2
                            bg-white border border-gray-200
                            hover:bg-[#a47d52]/5 hover:border-[#a47d52]/40
                            text-gray-700 font-bold
                            px-4 py-2.5 rounded-lg
                            transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed
                            cursor-pointer
                        "
                    >
                        <FaSync
                            className={refreshing ? "animate-spin" : ""}
                            size={14}
                        />
                        تحديث
                    </button>
                    
                    {/* 🔄 ADDED — attendance button */}
                    <button
                        onClick={() => navigate("/ar/attendance")}
                        className="
                            flex items-center justify-center gap-2
                            bg-white border border-gray-200
                            hover:bg-[#a47d52]/5 hover:border-[#a47d52]/40
                            text-gray-700 font-bold
                            px-4 py-2.5 rounded-lg
                            transition-all duration-200
                            cursor-pointer
                        "
                        title="تقرير الحضور والانصراف"
                    >
                        <FaClockRotateLeft size={14} />
                        الحضور والانصراف
                    </button>
                    {/* 🔄 END ADDED */}

                    <button
                        onClick={handleOpenRegistration}
                        className="
                            flex items-center justify-center gap-2
                            bg-[#a47d52] text-white font-extrabold
                            px-5 py-2.5 rounded-lg
                            transition-all duration-300
                            hover:bg-[#8a6a44] hover:scale-[1.02]
                            cursor-pointer
                        "
                    >
                        <FaUserPlus />
                        مستخدم جديد
                    </button>
                    
                    <button
                        onClick={() => navigate('/ar/permissions')}
                        className="
                            flex items-center justify-center gap-2
                            text-white font-extrabold
                            px-5 py-2.5 rounded-lg
                            transition-all duration-300
                            hover:scale-[1.02]
                            cursor-pointer
                        "
                    >
                        <IoMdSettings className = 'text-green-600' size={30}/>
                        
                    </button>
                </div>
            </div>

            {/* ===================== SUMMARY CARDS ===================== */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {summaryCards.map((card) => (
                        <div
                            key={card.key}
                            className={`
                                rounded-xl border border-gray-200
                                bg-gradient-to-br ${card.color}
                                p-4
                                transition-all duration-300
                                hover:shadow-md hover:-translate-y-0.5
                            `}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <FaCircle
                                    className={`${card.iconColor}`}
                                    size={8}
                                />
                                <span className="text-xs text-gray-500 font-bold">
                                    {card.label}
                                </span>
                            </div>
                            <div className="text-2xl font-extrabold text-gray-800">
                                {card.value}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ===================== FILTERS ===================== */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="relative md:col-span-2">
                        <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="بحث بالاسم أو البريد الإلكتروني..."
                            className="
                                w-full bg-white border border-gray-200
                                border-r-4 border-r-[#a47d52]
                                rounded-lg py-3 pr-11 pl-4 outline-none
                                focus:ring-2 focus:ring-[#a47d52]/10
                                focus:border-[#a47d52]
                                text-sm
                            "
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="
                            w-full bg-white border border-gray-200
                            border-r-4 border-r-[#a47d52]
                            rounded-lg py-3 px-4 outline-none
                            focus:ring-2 focus:ring-[#a47d52]/10
                            focus:border-[#a47d52]
                            text-sm font-bold text-gray-700 cursor-pointer
                        "
                    >
                        <option value="all">جميع الحالات</option>
                        <option value="online">متصل</option>
                        <option value="logged_in">مسجل الدخول</option>
                        <option value="pause">متوقف مؤقتاً</option>
                        <option value="offline">غير متصل</option>
                        <option value="logged_out">خرج</option>
                    </select>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="
                            w-full bg-white border border-gray-200
                            border-r-4 border-r-[#a47d52]
                            rounded-lg py-3 px-4 outline-none
                            focus:ring-2 focus:ring-[#a47d52]/10
                            focus:border-[#a47d52]
                            text-sm font-bold text-gray-700 cursor-pointer
                        "
                    >
                        <option value="all">جميع الأدوار</option>
                        {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ===================== CONTENT ===================== */}
            {loading ? (
                <div className="bg-white border border-gray-200 rounded-xl">
                    <p className="text-center py-16 text-gray-500">
                        جاري التحميل...
                    </p>
                </div>
            ) : users.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl">
                    <p className="text-center py-16 text-gray-500">
                        لا يوجد مستخدمون
                    </p>
                </div>
            ) : viewMode === "cards" ? (
                /* ============================================ */
                /* CARDS VIEW                                    */
                /* ============================================ */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {users.map((u) => {
                        const sc = getStatusConfig(u.status);

                        return (
                            <div
                                key={u.id}
                                className="
                                    group relative bg-white rounded-2xl
                                    border border-gray-200 p-5
                                    transition-all duration-300
                                    hover:shadow-lg hover:-translate-y-1
                                    hover:border-[#a47d52]/30 overflow-hidden
                                "
                            >
                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#a47d52] via-[#d4a574] to-[#a47d52] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                {/* Header */}
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="relative shrink-0">
                                        {u.image ? (
                                            <img
                                                src={`${BASE}${u.image}`}
                                                alt={u.username}
                                                className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#a47d52] to-[#8a6a44] flex items-center justify-center border-2 border-white shadow-md text-white font-extrabold text-lg">
                                                {u.username?.charAt(0)?.toUpperCase() || "?"}
                                            </div>
                                        )}
                                        <span
                                            className={`
                                                absolute -bottom-1 -left-1
                                                w-4 h-4 rounded-full
                                                ${sc.color} border-2 border-white
                                                ${sc.glow} shadow-lg
                                            `}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="font-extrabold text-gray-800 text-base truncate">
                                            {u.username}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                                            <FaEnvelope size={10} />
                                            {u.email || "-"}
                                        </p>

                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#a47d52]/10 text-[#7a5220] border border-[#a47d52]/20">
                                                {ROLE_LABELS[u.role] || u.role || "-"}
                                            </span>
                                            <span
                                                className={`
                                                    inline-flex items-center gap-1.5
                                                    px-2.5 py-0.5 rounded-full
                                                    text-[10px] font-extrabold
                                                    ${sc.bg} ${sc.text}
                                                    border ${sc.border}
                                                `}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${sc.color}`} />
                                                {sc.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    <div className="rounded-lg bg-[#f8f7f5] border border-gray-100 p-2.5 text-center">
                                        <p className="text-[10px] text-gray-500 font-bold mb-0.5 flex items-center justify-center gap-1">
                                            <FaClock size={9} />
                                            آخر ظهور
                                        </p>
                                        <p className="text-[11px] text-gray-700 font-bold truncate">
                                            {u.last_seen_at
                                                ? new Date(u.last_seen_at).toLocaleString("ar-EG", {
                                                      dateStyle: "short",
                                                      timeStyle: "short",
                                                  })
                                                : "-"}
                                        </p>
                                    </div>
                                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2.5 text-center">
                                        <p className="text-[10px] text-emerald-700 font-bold mb-0.5">
                                            وقت الاتصال
                                        </p>
                                        <p className="text-[11px] text-emerald-700 font-extrabold">
                                            {u.total_online_days ?? 0} يوم
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenEdit(u)}
                                        className="
                                            flex-1 flex items-center justify-center gap-2
                                            bg-[#a47d52]/10 text-[#a47d52]
                                            hover:bg-[#a47d52] hover:text-white
                                            font-extrabold text-xs
                                            px-3 py-2 rounded-lg
                                            transition-all duration-200 cursor-pointer
                                        "
                                        title="تعديل"
                                    >
                                        <FaEdit size={12} />
                                        تعديل
                                    </button>

                                    <button
                                        onClick={() => handleOpenPermissions(u)}
                                        className="
                                            w-9 h-9 rounded-lg
                                            bg-blue-50 text-blue-600
                                            hover:bg-blue-100
                                            flex items-center justify-center
                                            transition-all duration-200
                                            cursor-pointer shrink-0
                                        "
                                        title="الصلاحيات"
                                    >
                                        <FaUserShield size={13} />
                                    </button>

                                    <button
                                        onClick={() => handleOpenDelete(u)}
                                        className="
                                            w-9 h-9 rounded-lg
                                            bg-red-50 text-red-600
                                            hover:bg-red-100
                                            flex items-center justify-center
                                            transition-all duration-200
                                            cursor-pointer shrink-0
                                        "
                                        title="حذف"
                                    >
                                        <FaTrash size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ============================================ */
                /* TABLE VIEW                                    */
                /* ============================================ */
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-[#f8f7f5] text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 font-extrabold">المستخدم</th>
                                    <th className="p-4 font-extrabold">الدور</th>
                                    <th className="p-4 font-extrabold">الحالة</th>
                                    <th className="p-4 font-extrabold hidden md:table-cell">
                                        آخر ظهور
                                    </th>
                                    <th className="p-4 font-extrabold hidden lg:table-cell">
                                        وقت الاتصال
                                    </th>
                                    <th className="p-4 font-extrabold text-center">
                                        إجراءات
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const sc = getStatusConfig(u.status);

                                    return (
                                        <tr
                                            key={u.id}
                                            className="border-t border-gray-100 hover:bg-[#f8f7f5]/60 transition-colors"
                                        >
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative shrink-0">
                                                        {u.image ? (
                                                            <img
                                                                src={`${BASE}${u.image}`}
                                                                alt={u.username}
                                                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a47d52] to-[#8a6a44] flex items-center justify-center border-2 border-white shadow-sm text-white font-extrabold text-sm">
                                                                {u.username?.charAt(0)?.toUpperCase() || "?"}
                                                            </div>
                                                        )}
                                                        <span
                                                            className={`
                                                                absolute -bottom-0.5 -left-0.5
                                                                w-3 h-3 rounded-full
                                                                ${sc.color} border-2 border-white
                                                            `}
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-extrabold text-gray-800 truncate">
                                                            {u.username}
                                                        </p>
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {u.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="p-4">
                                                <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-[#a47d52]/10 text-[#7a5220] border border-[#a47d52]/20">
                                                    {ROLE_LABELS[u.role] || u.role || "-"}
                                                </span>
                                            </td>

                                            <td className="p-4">
                                                <span
                                                    className={`
                                                        inline-flex items-center gap-2
                                                        px-3 py-1 rounded-full
                                                        text-xs font-extrabold
                                                        ${sc.bg} ${sc.text}
                                                        border ${sc.border}
                                                    `}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${sc.color}`} />
                                                    {sc.label}
                                                </span>
                                            </td>

                                            <td className="p-4 text-xs text-gray-600 hidden md:table-cell">
                                                {u.last_seen_at
                                                    ? new Date(u.last_seen_at).toLocaleString("ar-EG", {
                                                          dateStyle: "short",
                                                          timeStyle: "short",
                                                      })
                                                    : "-"}
                                            </td>

                                            <td className="p-4 text-xs hidden lg:table-cell">
                                                <span className="font-bold text-emerald-700">
                                                    {u.total_online_days ?? 0} يوم
                                                </span>
                                            </td>

                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(u)}
                                                        className="
                                                            w-9 h-9 rounded-lg
                                                            bg-[#a47d52]/10 text-[#a47d52]
                                                            flex items-center justify-center
                                                            cursor-pointer
                                                            hover:bg-[#a47d52]/20
                                                            transition-all
                                                        "
                                                        title="تعديل"
                                                    >
                                                        <FaEdit size={14} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenPermissions(u)}
                                                        className="
                                                            w-9 h-9 rounded-lg
                                                            bg-blue-50 text-blue-600
                                                            flex items-center justify-center
                                                            cursor-pointer
                                                            hover:bg-blue-100
                                                            transition-all
                                                        "
                                                        title="الصلاحيات"
                                                    >
                                                        <FaUserShield size={14} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenDelete(u)}
                                                        className="
                                                            w-9 h-9 rounded-lg
                                                            bg-red-50 text-red-600
                                                            flex items-center justify-center
                                                            cursor-pointer
                                                            hover:bg-red-100
                                                            transition-all
                                                        "
                                                        title="حذف"
                                                    >
                                                        <FaTrash size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===================== REGISTRATION ===================== */}
            {showRegistration && (
                <Registration
                    onClose={() => setShowRegistration(false)}
                    onSuccess={() => {
                        setShowRegistration(false);
                        fetchUsers();
                    }}
                />
            )}

            {/* ===================== PERMISSIONS ===================== */}
            {showPermissions && selectedUser && (
                <Permissions
                    user={selectedUser}
                    onClose={handleCloseModals}
                    onSuccess={() => {
                        handleCloseModals();
                        fetchUsers();
                    }}
                />
            )}

            {/* ===================== EDIT MODAL ===================== */}
            {showEdit && selectedUser && (
                <div
                    className="
                        fixed inset-0 z-[65] bg-black/60 backdrop-blur-sm
                        flex items-center justify-center p-4
                    "
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !saving)
                            handleCloseModals();
                    }}
                >
                    <div
                        className="
                            w-full max-w-lg
                            bg-white rounded-2xl
                            shadow-[0_25px_80px_rgba(0,0,0,0.3)]
                            overflow-hidden
                        "
                        style={{ animation: "modalIn 0.25s ease-out" }}
                    >
                        {/* Top bar */}
                        <div className="h-1.5 bg-gradient-to-r from-[#a47d52] via-[#d4a574] to-[#a47d52]"></div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 bg-[#f8f7f5] border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#a47d52]/10 text-[#a47d52] flex items-center justify-center">
                                    <FaEdit size={16} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-800 text-lg">
                                        تعديل بيانات المستخدم
                                    </h3>
                                    <p className="text-xs text-gray-500 truncate">
                                        {selectedUser.username} — {selectedUser.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleCloseModals}
                                disabled={saving}
                                className="
                                    w-9 h-9 rounded-full
                                    bg-white hover:bg-red-50
                                    text-gray-500 hover:text-red-500
                                    flex items-center justify-center
                                    transition-all cursor-pointer
                                    disabled:opacity-50
                                "
                            >
                                <MdClose size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                            {/* Role */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    نوع المستخدم 
                                </label>
                                <select
                                    name="role"
                                    value={editForm.role}
                                    onChange={handleEditChange}
                                    disabled={saving}
                                    className="
                                        w-full bg-white border border-gray-200
                                        border-r-4 border-r-[#a47d52]
                                        rounded-lg py-3 px-4 outline-none
                                        focus:ring-2 focus:ring-[#a47d52]/10
                                        focus:border-[#a47d52]
                                        text-sm font-bold text-gray-700
                                        cursor-pointer
                                    "
                                >
                                    {ROLE_OPTIONS.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                                {editErrors.role && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {Array.isArray(editErrors.role)
                                            ? editErrors.role[0]
                                            : editErrors.role}
                                    </p>
                                )}
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between bg-[#f8f7f5] border border-gray-200 rounded-lg p-4">
                                <div>
                                    <p className="font-extrabold text-gray-800 text-sm">
                                        الحساب نشط
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        عند التعطيل لا يمكن للمستخدم تسجيل الدخول
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleEditToggle("is_active")}
                                    disabled={saving}
                                    className={`
                                        relative w-14 h-8 rounded-full
                                        transition-all duration-300 cursor-pointer
                                        disabled:opacity-50
                                        ${
                                            editForm.is_active                                                ? "bg-emerald-500"
                                                : "bg-gray-300"
                                        }
                                    `}
                                >
                                    <span
                                        className={`
                                            absolute top-1 w-6 h-6 rounded-full bg-white shadow-md
                                            transition-all duration-300
                                            ${
                                                editForm.is_active
                                                    ? "right-1"
                                                    : "right-7"
                                            }
                                        `}
                                    />
                                </button>
                            </div>

                            {/* Permissions */}
                            <div className="border-t border-gray-200 pt-5">
                                <h4 className="font-extrabold text-gray-800 text-sm mb-3 flex items-center gap-2">
                                    <FaUserShield className="text-[#a47d52]" size={14} />
                                    الصلاحيات
                                </h4>

                                <div className="space-y-2">
                                    <PermissionRow
                                        label="عرض المستخدمين"
                                        description="يمكنه رؤية قائمة جميع المستخدمين"
                                        checked={editForm.can_view_users}
                                        onChange={() =>
                                            handleEditToggle("can_view_users")
                                        }
                                        disabled={saving}
                                    />
                                    <PermissionRow
                                        label="إدارة المستخدمين"
                                        description="يمكنه تعديل وحذف المستخدمين"
                                        checked={editForm.can_manage_users}
                                        onChange={() =>
                                            handleEditToggle("can_manage_users")
                                        }
                                        disabled={saving}
                                    />
                                    <PermissionRow
                                        label="إدارة الصلاحيات"
                                        description="يمكنه تعديل صلاحيات الآخرين"
                                        checked={
                                            editForm.can_manage_permissions
                                        }
                                        onChange={() =>
                                            handleEditToggle(
                                                "can_manage_permissions"
                                            )
                                        }
                                        disabled={saving}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col md:flex-row gap-3 p-6 bg-[#f8f7f5] border-t border-gray-200">
                            <button
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="
                                    flex-1 flex items-center justify-center gap-2
                                    bg-[#a47d52] text-white font-extrabold
                                    px-5 py-3 rounded-xl
                                    transition-all duration-300
                                    hover:bg-[#8a6a44] hover:scale-[1.02]
                                    disabled:opacity-60 disabled:cursor-not-allowed
                                    cursor-pointer
                                "
                            >
                                {saving ? (
                                    <>
                                        <svg
                                            className="animate-spin h-4 w-4 text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        جاري الحفظ...
                                    </>
                                ) : (
                                    <>
                                        <FaSave size={14} />
                                        حفظ التعديلات
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleCloseModals}
                                disabled={saving}
                                className="
                                    flex-1 flex items-center justify-center gap-2
                                    bg-gray-100 text-gray-700 font-extrabold
                                    px-5 py-3 rounded-xl
                                    transition-all duration-300
                                    hover:bg-gray-200
                                    disabled:opacity-60 disabled:cursor-not-allowed
                                    cursor-pointer
                                "
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===================== DELETE CONFIRMATION ===================== */}
            {confirmDelete && (
                <div
                    className="
                        fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm
                        flex items-center justify-center p-4
                    "
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !deleting)
                            setConfirmDelete(null);
                    }}
                >
                    <div
                        className="
                            w-full max-w-md bg-white rounded-2xl
                            shadow-[0_25px_80px_rgba(0,0,0,0.3)]
                            overflow-hidden
                        "
                        style={{ animation: "modalIn 0.25s ease-out" }}
                    >
                        <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-red-400"></div>

                        <div className="flex justify-center pt-6">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse"></div>
                                <div className="relative w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                                    <FaExclamationTriangle
                                        className="text-red-500"
                                        size={28}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pt-4 pb-6 text-center">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">
                                تأكيد الحذف
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                هل أنت متأكد من حذف المستخدم؟
                                <br />
                                <span className="font-extrabold text-gray-800 mt-1 inline-block">
                                    {confirmDelete.username}
                                </span>
                                {confirmDelete.email && (
                                    <>
                                        <br />
                                        <span className="text-xs text-gray-500" dir="ltr">
                                            {confirmDelete.email}
                                        </span>
                                    </>
                                )}
                            </p>

                            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-4">
                                <p className="text-xs text-red-700 font-bold">
                                    ⚠️ لا يمكن التراجع عن هذا الإجراء
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3">
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={deleting}
                                    className="
                                        flex-1 flex items-center justify-center gap-2
                                        bg-red-500 text-white font-extrabold
                                        px-5 py-3 rounded-xl
                                        transition-all duration-300
                                        hover:bg-red-600 hover:scale-[1.02]
                                        disabled:opacity-60 disabled:cursor-not-allowed
                                        cursor-pointer
                                    "
                                >
                                    {deleting ? (
                                        <>
                                            <svg
                                                className="animate-spin h-4 w-4 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            جاري الحذف...
                                        </>
                                    ) : (
                                        <>
                                            <FaTrash size={14} />
                                            نعم، احذف
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    disabled={deleting}
                                    className="
                                        flex-1 flex items-center justify-center gap-2
                                        bg-gray-100 text-gray-700 font-extrabold
                                        px-5 py-3 rounded-xl
                                        transition-all duration-300
                                        hover:bg-gray-200
                                        disabled:opacity-60 disabled:cursor-not-allowed
                                        cursor-pointer
                                    "
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(15px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

/* ============================================================
   PERMISSION ROW
============================================================ */
const PermissionRow = ({ label, description, checked, onChange, disabled }) => (
    <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`
            w-full flex items-center justify-between
            p-3 rounded-lg border text-right
            transition-all duration-200 cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
                checked
                    ? "bg-[#a47d52]/5 border-[#a47d52]/40"
                    : "bg-white border-gray-200 hover:border-[#a47d52]/30"
            }
        `}
    >
        <div className="flex-1 min-w-0 ml-3">
            <p className="font-extrabold text-gray-800 text-sm">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        <div
            className={`
                w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0
                transition-all duration-200
                ${
                    checked
                        ? "bg-[#a47d52] border-[#a47d52]"
                        : "bg-white border-gray-300"
                }
            `}
        >
            {checked && <FaCheck size={11} className="text-white" />}
        </div>
    </button>
);

export default Users ;



