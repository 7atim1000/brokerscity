import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddPermission from "../../components/ar/permissions/Addpermission";

import {
    FaPlus,
    FaSearch,
    FaSyncAlt,
    FaTrash,
    FaShieldAlt,
    FaUsers,
    FaUserShield,
    FaUserCircle,
    FaBuilding,
    FaMoneyBillWave,
    FaUserCheck,
    FaUserCog,
    FaKey,
} from "react-icons/fa";
import { MdModeEdit } from "react-icons/md";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const Permissions = () => {
    // =========================================================
    // STATE
    // =========================================================
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingPermission, setEditingPermission] = useState(null);

    const [togglingId, setTogglingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // =========================================================
    // FETCH LIST
    // =========================================================
    const fetchPermissions = useCallback(async (search = "") => {
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("access_token");

            if (!token) {
                toast.error("يرجى تسجيل الدخول لعرض الصلاحيات");
                setLoading(false);
                return;
            }

            let url = `${BASE}/api/permissions/`;
            if (search) {
                url += `?search=${encodeURIComponent(search)}`;
            }

            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى");
                } else {
                    toast.error("فشل تحميل الصلاحيات");
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.results && Array.isArray(data.results)) {
                setPermissions(data.results);
            } else if (Array.isArray(data)) {
                setPermissions(data);
            } else {
                setPermissions([]);
            }
        } catch (err) {
            console.error("Error fetching permissions:", err);
            setError("فشل تحميل الصلاحيات");
            toast.error("❌ حدث خطأ أثناء جلب الصلاحيات");
        } finally {
            setLoading(false);
        }
    }, []);

    // =========================================================
    // INITIAL LOAD + DEBOUNCED SEARCH
    // =========================================================
    useEffect(() => {
        const delay = setTimeout(() => {
            fetchPermissions(searchTerm);
        }, 400);

        return () => clearTimeout(delay);
    }, [searchTerm, fetchPermissions]);

    // =========================================================
    // INLINE TOGGLE
    // =========================================================
    const handleToggle = async (row, field) => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            toast.error("يرجى تسجيل الدخول");
            return;
        }

        setTogglingId(`${row.id}-${field}`);

        setPermissions((prev) =>
            prev.map((p) =>
                p.id === row.id ? { ...p, [field]: !p[field] } : p
            )
        );

        try {
            const response = await fetch(
                `${BASE}/api/permissions/${row.id}/update/`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ [field]: !row[field] }),
                }
            );

            if (!response.ok) {
                throw new Error("فشل التحديث");
            }

            toast.success("✅ تم التحديث");
        } catch (err) {
            console.error("Toggle error:", err);
            setPermissions((prev) =>
                prev.map((p) =>
                    p.id === row.id ? { ...p, [field]: row[field] } : p
                )
            );
            toast.error("❌ فشل تحديث الصلاحية");
        } finally {
            setTogglingId(null);
        }
    };

    // =========================================================
    // DELETE
    // =========================================================
    const handleDelete = async (id) => {
        if (!window.confirm("هل أنت متأكد من حذف هذه الصلاحيات؟")) return;

        const token = localStorage.getItem("access_token");
        if (!token) {
            toast.error("يرجى تسجيل الدخول");
            return;
        }

        setDeletingId(id);

        try {
            const response = await fetch(
                `${BASE}/api/permissions/${id}/delete/`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("فشل الحذف");
            }

            toast.success("✅ تم حذف الصلاحيات");
            fetchPermissions(searchTerm);
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("❌ حدث خطأ أثناء الحذف");
        } finally {
            setDeletingId(null);
        }
    };

    // =========================================================
    // MODAL HANDLERS
    // =========================================================
    const handleOpenCreate = () => {
        setEditingPermission(null);
        setShowModal(true);
    };

    const handleOpenEdit = (row) => {
        setEditingPermission(row);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPermission(null);
    };

    const handleModalSuccess = () => {
        setShowModal(false);
        setEditingPermission(null);
        fetchPermissions(searchTerm);
    };

    // =========================================================
    // STATS
    // =========================================================
    const totalPermissions = permissions.length;
    const workLogCount = permissions.filter((p) => p.ListWorkLog).length;
    const monitoringCount = permissions.filter((p) => p.monitoring).length;
    const addMonitorCount = permissions.filter((p) => p.add_monitor).length;
    const propertyManagementCount = permissions.filter(
        (p) => p.property_management
    ).length;
    const financialsCount = permissions.filter((p) => p.financials).length;
    // ✅ ADDED — stats for the 3 new fields
    const canViewUsersCount = permissions.filter(
        (p) => p.can_view_users
    ).length;
    const canManageUsersCount = permissions.filter(
        (p) => p.can_manage_users
    ).length;
    const canManagePermissionsCount = permissions.filter(
        (p) => p.can_manage_permissions
    ).length;

    // =========================================================
    // PERMISSION COLUMNS CONFIG — 8 columns
    // =========================================================
    const permissionColumns = [
        { key: "ListWorkLog", label: "سجل الحضور" },
        { key: "monitoring", label: "المراقبة" },
        { key: "add_monitor", label: "إضافة مراقبة" },
        { key: "property_management", label: "إدارة العقارات" },
        { key: "financials", label: "الإدارة المالية" },
        { key: "can_view_users", label: "عرض المستخدمين" },
        { key: "can_manage_users", label: "إدارة المستخدمين" },
        { key: "can_manage_permissions", label: "إدارة الصلاحيات" },
    ];

    // =========================================================
    // RENDER
    // =========================================================
    return (
        <div className="min-h-screen bg-[#f8f7f5] py-8 px-4 md:py-10 md:px-6 lg:py-6 lg:px-0 rtl">
            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={true}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-2 md:px-3 mb-6 md:mb-8 gap-4">
                <div className="flex items-center gap-4 text-center sm:text-right">
                    <div className="hidden sm:flex h-14 w-14 rounded-2xl bg-[#a47d52]/10 items-center justify-center">
                        <FaUserShield className="text-[#a47d52] text-2xl" />
                    </div>
                    <div>
                        <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-800 tracking-wide">
                            إدارة الصلاحيات
                        </h2>
                        <p className="text-sm md:text-base text-gray-600 mt-1">
                            تحكم في صلاحيات المستخدمين
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => fetchPermissions(searchTerm)}
                        disabled={loading}
                        className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 md:px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <FaSyncAlt className={loading ? "animate-spin" : ""} />
                        تحديث
                    </button>

                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center gap-2 bg-[#a47d52] text-white px-5 md:px-7 py-3 rounded-lg font-extrabold text-sm md:text-base uppercase tracking-wide transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        <FaPlus />
                        إضافة صلاحيات
                    </button>
                </div>
            </div>

            {/* SUMMARY CARDS — 9 total (1 total + 8 permissions) */}
            <div className="max-w-full mx-auto px-2 md:px-3 mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3 md:gap-4">
                {/* Total */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 border-[#a47d52]">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">
                            الإجمالي
                        </p>
                        <p className="text-xl md:text-2xl font-extrabold text-[#a47d52] mt-1">
                            {totalPermissions}
                        </p>
                    </div>
                    <FaShieldAlt className="text-[#a47d52]/50" size="24" />
                </div>

                {/* ListWorkLog */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 border-emerald-500">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">
                            سجل العمل
                        </p>
                        <p className="text-xl md:text-2xl font-extrabold text-emerald-600 mt-1">
                            {workLogCount}
                        </p>
                    </div>
                    <FaUserCircle
                        className="text-emerald-500/50"
                        size="24"
                    />
                </div>

                {/* Monitoring */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 border-blue-500">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">
                            المراقبة
                        </p>
                        <p className="text-xl md:text-2xl font-extrabold text-blue-600 mt-1">
                            {monitoringCount}
                        </p>
                    </div>
                    <FaUsers className="text-blue-500/50" size="24" />
                </div>

                {/* Add Monitor */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 border-amber-500">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">
                            إضافة مراقبة
                        </p>
                        <p className="text-xl md:text-2xl font-extrabold text-amber-600 mt-1">
                            {addMonitorCount}
                        </p>
                    </div>
                    <FaUserShield
                        className="text-amber-500/50"
                        size="24"
                    />
                </div>

                {/* Property Management */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 border-purple-500">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">
                            إدارة العقارات
                        </p>
                        <p className="text-xl md:text-2xl font-extrabold text-purple-600 mt-1">
                            {propertyManagementCount}
                        </p>
                    </div>
                    <FaBuilding className="text-purple-500/50" size="24" />
                </div>

                {/* Financials */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 border-rose-500">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">
                            الإدارة المالية
                        </p>
                        <p className="text-xl md:text-2xl font-extrabold text-rose-600 mt-1">
                            {financialsCount}
                        </p>
                    </div>
                    <FaMoneyBillWave
                        className="text-rose-500/50"
                        size="24"
                    />
                </div>

                {/* ✅ ADDED — Can View Users */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 border-indigo-500">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">
                            عرض المستخدمين
                        </p>
                        <p className="text-xl md:text-2xl font-extrabold text-indigo-600 mt-1">
                            {canViewUsersCount}
                        </p>
                    </div>
                    <FaUserCheck
                        className="text-indigo-500/50"
                        size="24"
                    />
                </div>

                {/* ✅ ADDED — Can Manage Users */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 border-cyan-500">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">
                            إدارة المستخدمين
                        </p>
                        <p className="text-xl md:text-2xl font-extrabold text-cyan-600 mt-1">
                            {canManageUsersCount}
                        </p>
                    </div>
                    <FaUserCog
                        className="text-cyan-500/50"
                        size="24"
                    />
                </div>

                {/* ✅ ADDED — Can Manage Permissions */}
                <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 border-slate-600">
                    <div>
                        <p className="text-xs text-gray-500 font-medium">
                            إدارة الصلاحيات
                        </p>
                        <p className="text-xl md:text-2xl font-extrabold text-slate-700 mt-1">
                            {canManagePermissionsCount}
                        </p>
                    </div>
                    <FaKey
                        className="text-slate-600/50"
                        size="24"
                    />
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="max-w-full mx-auto px-2 md:px-3 mb-6">
                <div className="bg-white rounded-xl shadow-md p-4 flex flex-col md:flex-row gap-3 items-center">
                    <div className="w-full relative">
                        <FaSearch className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ابحث باسم المستخدم أو البريد الإلكتروني..."
                            className="w-full pr-11 pl-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white"
                        />
                    </div>

                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm("")}
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-600 text-sm hover:bg-gray-50 transition-colors duration-200"
                        >
                            <FaSyncAlt />
                            إعادة تعيين
                        </button>
                    )}
                </div>
            </div>

            {/* TABLE */}
            <div className="max-w-full mx-auto px-2 md:px-3">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center py-24 gap-3">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />
                            <p className="text-gray-500 text-sm">
                                جاري تحميل الصلاحيات...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <p className="text-red-600 text-lg font-semibold">
                                {error}
                            </p>
                            <button
                                onClick={() => fetchPermissions(searchTerm)}
                                className="mt-4 px-5 py-2 bg-[#a47d52] text-white rounded-lg text-sm"
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    ) : permissions.length === 0 ? (
                        <div className="text-center py-20">
                            <FaUserShield
                                className="mx-auto text-gray-300"
                                size="56"
                            />
                            <p className="text-gray-500 text-lg mt-3">
                                {searchTerm
                                    ? "لا توجد نتائج مطابقة للبحث"
                                    : "لا توجد صلاحيات"}
                            </p>
                            <p className="text-gray-400 text-sm mt-2">
                                {searchTerm
                                    ? "جرّب كلمة بحث أخرى"
                                    : "قم بإضافة صلاحيات جديدة"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#e9e6e1] text-[#a47d52]">
                                    <tr>
                                        <th className="px-3 md:px-4 py-4 text-right text-sm font-bold">
                                            #
                                        </th>
                                        <th className="px-3 md:px-4 py-4 text-right text-sm font-bold">
                                            المستخدم
                                        </th>
                                        {permissionColumns.map((col) => (
                                            <th
                                                key={col.key}
                                                className="px-3 md:px-4 py-4 text-center text-sm font-bold"
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                        <th className="px-3 md:px-4 py-4 text-center text-sm font-bold">
                                            الإجراءات
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {permissions.map((row, index) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-200 odd:bg-white even:bg-gray-50 hover:bg-[#f8f2e7] transition-colors duration-200"
                                        >
                                            <td className="px-3 md:px-4 py-4 text-right text-sm text-gray-700">
                                                {index + 1}
                                            </td>

                                            <td className="px-3 md:px-4 py-4 text-right">
                                                <div className="font-semibold text-gray-800 text-sm">
                                                    {row.user_full_name ||
                                                        row.username ||
                                                        "-"}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5">
                                                    {row.username}
                                                    {row.user_email
                                                        ? ` — ${row.user_email}`
                                                        : ""}
                                                </div>
                                            </td>

                                            {permissionColumns.map((col) => (
                                                <td
                                                    key={col.key}
                                                    className="px-3 md:px-4 py-4 text-center"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleToggle(
                                                                row,
                                                                col.key
                                                            )
                                                        }
                                                        disabled={
                                                            togglingId ===
                                                            `${row.id}-${col.key}`
                                                        }
                                                        title={
                                                            row[col.key]
                                                                ? "إيقاف"
                                                                : "تفعيل"
                                                        }
                                                        className={`
                                                            relative inline-flex
                                                            h-6 w-11 rounded-full
                                                            transition-colors duration-300
                                                            ${
                                                                row[col.key]
                                                                    ? "bg-green-600"
                                                                    : "bg-gray-300"
                                                            }
                                                            ${
                                                                togglingId ===
                                                                `${row.id}-${col.key}`
                                                                    ? "opacity-60 cursor-wait"
                                                                    : "cursor-pointer hover:opacity-90"
                                                            }
                                                        `}
                                                    >
                                                        <span
                                                            className={`
                                                                absolute top-0.5
                                                                h-5 w-5 bg-white rounded-full shadow-md
                                                                transition-all duration-300
                                                                flex items-center justify-center
                                                                ${
                                                                    row[
                                                                        col.key
                                                                    ]
                                                                        ? "right-0.5"
                                                                        : "right-[calc(100%-1.375rem)]"
                                                                }
                                                            `}
                                                        >
                                                            {row[col.key] && (
                                                                <span className="text-[#a47d52] text-[10px] font-bold">
                                                                    ✓
                                                                </span>
                                                            )}
                                                        </span>
                                                    </button>
                                                </td>
                                            ))}

                                            <td className="px-3 md:px-4 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() =>
                                                            handleOpenEdit(row)
                                                        }
                                                        className="cursor-pointer px-2 py-2 bg-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-110 hover:bg-blue-50"
                                                        title="تعديل"
                                                    >
                                                        <MdModeEdit
                                                            className="text-blue-600"
                                                            size="20"
                                                        />
                                                    </button>

                                                    <button
                                                        onClick={() =>
                                                            handleDelete(row.id)
                                                        }
                                                        disabled={
                                                            deletingId ===
                                                            row.id
                                                        }
                                                        className="cursor-pointer px-2 py-2 bg-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-110 hover:bg-red-50 disabled:opacity-50"
                                                        title="حذف"
                                                    >
                                                        <FaTrash
                                                            className="text-red-600"
                                                            size="18"
                                                        />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                                {/* SUMMARY FOOTER — 8 permission totals + record count */}
                                <tfoot>
                                    <tr className="bg-[#e6d5c0] border-t-2 border-[#BF9000]">
                                        <td
                                            colSpan={2}
                                            className="px-3 md:px-4 py-4 text-right text-sm font-extrabold text-gray-900"
                                        >
                                            الإجمالي
                                        </td>
                                        <td className="px-3 md:px-4 py-4 text-center text-sm font-extrabold text-[#a47d52]">
                                            {workLogCount}
                                        </td>
                                        <td className="px-3 md:px-4 py-4 text-center text-sm font-extrabold text-[#a47d52]">
                                            {monitoringCount}
                                        </td>
                                        <td className="px-3 md:px-4 py-4 text-center text-sm font-extrabold text-[#a47d52]">
                                            {addMonitorCount}
                                        </td>
                                        <td className="px-3 md:px-4 py-4 text-center text-sm font-extrabold text-[#a47d52]">
                                            {propertyManagementCount}
                                        </td>
                                        <td className="px-3 md:px-4 py-4 text-center text-sm font-extrabold text-[#a47d52]">
                                            {financialsCount}
                                        </td>
                                        {/* ✅ ADDED — 3 new totals */}
                                        <td className="px-3 md:px-4 py-4 text-center text-sm font-extrabold text-[#a47d52]">
                                            {canViewUsersCount}
                                        </td>
                                        <td className="px-3 md:px-4 py-4 text-center text-sm font-extrabold text-[#a47d52]">
                                            {canManageUsersCount}
                                        </td>
                                        <td className="px-3 md:px-4 py-4 text-center text-sm font-extrabold text-[#a47d52]">
                                            {canManagePermissionsCount}
                                        </td>
                                        <td className="px-3 md:px-4 py-4 text-center text-sm text-gray-700">
                                            {totalPermissions} سجل
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <AddPermission
                    onClose={handleCloseModal}
                    permissionData={editingPermission}
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
};

export default Permissions;