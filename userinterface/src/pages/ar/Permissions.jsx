import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddPermission from "../../components/ar/permissions/Addpermission";

// import { usePermissions } from "../context/PermissionsContext"; 

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
    FaBullhorn,
    FaAddressCard,
    FaEye,
    FaUserTag,
    FaPlusCircle,
    FaEdit,
    FaExchangeAlt,
    FaArchive,
    FaFileAlt,        // ✅ added for permit numbers / properties
    FaMapMarkerAlt,   // ✅ added for properties
} from "react-icons/fa";
import { MdModeEdit } from "react-icons/md";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// =========================================================
// PERMISSION COLUMNS CONFIG (moved outside component)
// =========================================================
const PERMISSION_COLUMNS = [
    { key: "ListWorkLog", label: "سجل الحضور" },
    { key: "monitoring", label: "المراقبة" },
    { key: "add_monitor", label: "إضافة مراقبة" },
    { key: "property_management", label: "إدارة العقارات" },
    { key: "financials", label: "الإدارة المالية" },
    { key: "can_view_users", label: "عرض المستخدمين" },
    { key: "can_manage_users", label: "إدارة المستخدمين" },
    { key: "can_manage_permissions", label: "إدارة الصلاحيات" },
    { key: "ads", label: "الإعلانات" },
    { key: "leads", label: "الليدز" },

    // Lead Columns
    { key: "view_all_lead", label: "عرض كل الليدز" },
    { key: "view_my_lead", label: "عرض ليدزي" },
    { key: "create_new_lead", label: "إنشاء ليد" },
    { key: "update_lead", label: "تعديل ليد" },
    { key: "update_lead_stage", label: "تعديل المرحلة" },
    { key: "update_lead_responsible", label: "تعديل المسؤول" },
    { key: "delete_lead", label: "حذف ليد" },

    // Listing Columns
    { key: "view_all_listing", label: "عرض كل العقارات" },
    { key: "view_my_listing", label: "عرض عقاراتي" },
    { key: "create_new_listing", label: "إضافة عقار" },
    { key: "update_listing", label: "تعديل عقار" },
    { key: "delete_listing", label: "حذف عقار" },
    { key: "confirm_listing", label: "تأكيد عقار" },

    // Listing Owners Columns
    { key: "view_all_listing_owners", label: "عرض كل الملاك" },
    { key: "view_my_listing_owners", label: "عرض ملاكي" },
    { key: "create_new_listing_owners", label: "إضافة مالك" },
    { key: "update_listing_owners", label: "تعديل مالك" },
    { key: "delete_listing_owners", label: "حذف مالك" },

    // ✅ Archive Owners Columns
    { key: "view_all_archive_owners", label: "عرض كل ملاك الأرشيف" },
    { key: "view_my_archive_owners", label: "عرض ملاك أرشيفي" },
    { key: "create_bulk_archive_owners", label: "إضافة ملاك بالأرشيف" },
    { key: "update_bulk_responsibility_archive_owners", label: "تعديل مسؤولية الأرشيف" },
    { key: "delete_bulk_archive_owners", label: "حذف ملاك الأرشيف" },

    // ✅ ADDED: Archive Properties Columns
    { key: "view_all_archive_properties", label: "عرض كل عقارات الأرشيف" },
    { key: "view_my_archive_properties", label: "عرض عقارات أرشيفي" },
    { key: "create_bulk_archive_properties", label: "إضافة عقارات بالأرشيف" },
    { key: "update_bulk_responsibility_archive_properties", label: "تعديل مسؤولية عقارات الأرشيف" },
    { key: "delete_bulk_archive_properties", label: "حذف عقارات الأرشيف" },

    // ✅ ADDED: Permit Numbers Columns
    { key: "view_all_permit_numbers", label: "عرض كل أرقام التراخيص" },
    { key: "create_new_permit_number", label: "إضافة رقم ترخيص" },
    { key: "update_permit_number", label: "تعديل رقم ترخيص" },
    { key: "delete_permit_number", label: "حذف رقم ترخيص" },
];

// =========================================================
// SUMMARY CARDS CONFIG (moved outside component)
// =========================================================
const SUMMARY_CARDS = [
    { key: null, label: "الإجمالي", icon: FaShieldAlt, border: "border-[#a47d52]", text: "text-[#a47d52]" },
    { key: "ListWorkLog", label: "سجل العمل", icon: FaUserCircle, border: "border-emerald-500", text: "text-emerald-600" },
    { key: "monitoring", label: "المراقبة", icon: FaUsers, border: "border-blue-500", text: "text-blue-600" },
    { key: "add_monitor", label: "إضافة مراقبة", icon: FaUserShield, border: "border-amber-500", text: "text-amber-600" },
    { key: "property_management", label: "إدارة العقارات", icon: FaBuilding, border: "border-purple-500", text: "text-purple-600" },
    { key: "financials", label: "الإدارة المالية", icon: FaMoneyBillWave, border: "border-rose-500", text: "text-rose-600" },
    { key: "can_view_users", label: "عرض المستخدمين", icon: FaUserCheck, border: "border-indigo-500", text: "text-indigo-600" },
    { key: "can_manage_users", label: "إدارة المستخدمين", icon: FaUserCog, border: "border-cyan-500", text: "text-cyan-600" },
    { key: "can_manage_permissions", label: "إدارة الصلاحيات", icon: FaKey, border: "border-slate-600", text: "text-slate-700" },
    { key: "ads", label: "الإعلانات", icon: FaBullhorn, border: "border-pink-500", text: "text-pink-600" },
    { key: "leads", label: "الليدز", icon: FaAddressCard, border: "border-teal-500", text: "text-teal-600" },
    { key: "view_all_lead", label: "عرض كل الليدز", icon: FaEye, border: "border-orange-500", text: "text-orange-600" },
    { key: "view_my_lead", label: "عرض ليدزي", icon: FaUserTag, border: "border-lime-500", text: "text-lime-600" },
    { key: "create_new_lead", label: "إنشاء ليد", icon: FaPlusCircle, border: "border-fuchsia-500", text: "text-fuchsia-600" },
    { key: "update_lead", label: "تعديل ليد", icon: FaEdit, border: "border-sky-500", text: "text-sky-600" },
    { key: "update_lead_stage", label: "تعديل المرحلة", icon: FaExchangeAlt, border: "border-violet-500", text: "text-violet-600" },
    { key: "update_lead_responsible", label: "تعديل المسؤول", icon: FaUserShield, border: "border-emerald-600", text: "text-emerald-700" },
    { key: "delete_lead", label: "حذف ليد", icon: FaTrash, border: "border-red-600", text: "text-red-700" },
    // ✅ ADDED: Archive Properties summary cards
    { key: "view_all_archive_properties", label: "عرض كل عقارات الأرشيف", icon: FaArchive, border: "border-amber-600", text: "text-amber-700" },
    { key: "create_bulk_archive_properties", label: "إضافة عقارات بالأرشيف", icon: FaPlusCircle, border: "border-stone-500", text: "text-stone-600" },
    { key: "delete_bulk_archive_properties", label: "حذف عقارات الأرشيف", icon: FaTrash, border: "border-red-500", text: "text-red-600" },
    // ✅ ADDED: Permit Numbers summary cards
    { key: "view_all_permit_numbers", label: "عرض كل التراخيص", icon: FaFileAlt, border: "border-blue-600", text: "text-blue-700" },
    { key: "create_new_permit_number", label: "إضافة ترخيص", icon: FaPlusCircle, border: "border-cyan-600", text: "text-cyan-700" },
    { key: "delete_permit_number", label: "حذف ترخيص", icon: FaTrash, border: "border-rose-600", text: "text-rose-700" },
];

// =========================================================
// SMALL TOGGLE SWITCH COMPONENT
// =========================================================
const SmallToggle = ({ checked, onChange, disabled, title }) => (
    <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        title={title}
        aria-checked={checked}
        role="switch"
        className={`
            relative inline-flex items-center
            h-3.5 w-7 rounded-full
            transition-colors duration-200
            ${checked ? "bg-green-600" : "bg-gray-300"}
            ${disabled ? "opacity-50 cursor-wait" : "cursor-pointer hover:opacity-90"}
            focus:outline-none focus:ring-1 focus:ring-offset-0 focus:ring-[#a47d52]
        `}
    >
        <span
            className={`
                absolute top-0.5 h-2.5 w-2.5 bg-white rounded-full shadow
                transition-all duration-200
                ${checked ? "right-0.5" : "right-[calc(100%-0.875rem)]"}
            `}
        />
    </button>
);

const Permissions = () => {
    
    // const { refresh } = usePermissions();   
    // ✅ add this line
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
            
            // ✅ ADD
            // await refresh();         
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
            // ✅ ADD
            // refresh();
            
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
        // ✅ ADD
        //refresh();
    };

    // =========================================================
    // STATS
    // =========================================================
    const counts = useMemo(() => {
        const result = { total: permissions.length };

        PERMISSION_COLUMNS.forEach((col) => {
            result[col.key] = 0;
        });

        for (const row of permissions) {
            for (const col of PERMISSION_COLUMNS) {
                if (row[col.key]) {
                    result[col.key] += 1;
                }
            }
        }

        return result;
    }, [permissions]);

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

            {/* SUMMARY CARDS */}
            <div className="max-w-full mx-auto px-2 md:px-3 mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                {SUMMARY_CARDS.map((card) => {
                    const Icon = card.icon;
                    const value = card.key === null ? counts.total : (counts[card.key] ?? 0);
                    return (
                        <div
                            key={card.label}
                            className={`bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 ${card.border}`}
                        >
                            <div>
                                <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                                <p className={`text-xl md:text-2xl font-extrabold ${card.text} mt-1`}>
                                    {value}
                                </p>
                            </div>
                            <Icon className="opacity-50" size="24" />
                        </div>
                    );
                })}
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
                            <p className="text-gray-500 text-sm">جاري تحميل الصلاحيات...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <p className="text-red-600 text-lg font-semibold">{error}</p>
                            <button
                                onClick={() => fetchPermissions(searchTerm)}
                                className="mt-4 px-5 py-2 bg-[#a47d52] text-white rounded-lg text-sm"
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    ) : permissions.length === 0 ? (
                        <div className="text-center py-20">
                            <FaUserShield className="mx-auto text-gray-300" size="56" />
                            <p className="text-gray-500 text-lg mt-3">
                                {searchTerm ? "لا توجد نتائج مطابقة للبحث" : "لا توجد صلاحيات"}
                            </p>
                            <p className="text-gray-400 text-sm mt-2">
                                {searchTerm ? "جرّب كلمة بحث أخرى" : "قم بإضافة صلاحيات جديدة"}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-max">
                                <thead className="bg-[#e9e6e1] text-[#a47d52]">
                                    <tr>
                                        <th className="px-3 md:px-4 py-4 text-right text-sm font-bold">#</th>
                                        <th className="px-3 md:px-4 py-4 text-right text-sm font-bold">المستخدم</th>
                                        {PERMISSION_COLUMNS.map((col) => (
                                            <th key={col.key} className="px-2 md:px-3 py-4 text-center text-xs md:text-sm font-bold">
                                                {col.label}
                                            </th>
                                        ))}
                                        <th className="px-3 md:px-4 py-4 text-center text-sm font-bold">الإجراءات</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {permissions.map((row, index) => (
                                        <tr
                                            key={row.id}
                                            className="border-b border-gray-200 odd:bg-white even:bg-gray-50 hover:bg-[#f8f2e7] transition-colors duration-200"
                                        >
                                            <td className="px-3 md:px-4 py-4 text-right text-sm text-gray-700">{index + 1}</td>

                                            <td className="px-3 md:px-4 py-4 text-right">
                                                <div className="font-semibold text-gray-800 text-sm whitespace-nowrap">
                                                    {row.user_full_name || row.username || "-"}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
                                                    {row.username}{row.user_email ? ` — ${row.user_email}` : ""}
                                                </div>
                                            </td>

                                            {PERMISSION_COLUMNS.map((col) => (
                                                <td key={col.key} className="px-2 md:px-3 py-4 text-center">
                                                    <SmallToggle
                                                        checked={!!row[col.key]}
                                                        onChange={() => handleToggle(row, col.key)}
                                                        disabled={togglingId === `${row.id}-${col.key}`}
                                                        title={row[col.key] ? "إيقاف" : "تفعيل"}
                                                    />
                                                </td>
                                            ))}

                                            <td className="px-3 md:px-4 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenEdit(row)}
                                                        className="cursor-pointer px-2 py-2 bg-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-110 hover:bg-blue-50"
                                                        title="تعديل"
                                                    >
                                                        <MdModeEdit className="text-blue-600" size="20" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDelete(row.id)}
                                                        disabled={deletingId === row.id}
                                                        className="cursor-pointer px-2 py-2 bg-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-110 hover:bg-red-50 disabled:opacity-50"
                                                        title="حذف"
                                                    >
                                                        <FaTrash className="text-red-600" size="18" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                                {/* SUMMARY FOOTER */}
                                <tfoot>
                                    <tr className="bg-[#e6d5c0] border-t-2 border-[#BF9000]">
                                        <td colSpan={2} className="px-3 md:px-4 py-4 text-right text-sm font-extrabold text-gray-900 whitespace-nowrap">
                                            الإجمالي
                                        </td>

                                        {PERMISSION_COLUMNS.map((col) => (
                                            <td
                                                key={col.key}
                                                className="px-2 md:px-3 py-4 text-center text-sm font-extrabold text-[#a47d52]"
                                            >
                                                {counts[col.key] ?? 0}
                                            </td>
                                        ))}

                                        <td className="px-3 md:px-4 py-4 text-center text-sm text-gray-700 whitespace-nowrap">
                                            {counts.total} سجل
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




// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import AddPermission from "../../components/ar/permissions/Addpermission";

// import {
//     FaPlus,
//     FaSearch,
//     FaSyncAlt,
//     FaTrash,
//     FaShieldAlt,
//     FaUsers,
//     FaUserShield,
//     FaUserCircle,
//     FaBuilding,
//     FaMoneyBillWave,
//     FaUserCheck,
//     FaUserCog,
//     FaKey,
//     FaBullhorn,
//     FaAddressCard,
//     FaEye,
//     FaUserTag,
//     FaPlusCircle,
//     FaEdit,
//     FaExchangeAlt,
//     FaArchive,
// } from "react-icons/fa";
// import { MdModeEdit } from "react-icons/md";

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// // =========================================================
// // PERMISSION COLUMNS CONFIG (moved outside component)
// // =========================================================
// const PERMISSION_COLUMNS = [
//     { key: "ListWorkLog", label: "سجل الحضور" },
//     { key: "monitoring", label: "المراقبة" },
//     { key: "add_monitor", label: "إضافة مراقبة" },
//     { key: "property_management", label: "إدارة العقارات" },
//     { key: "financials", label: "الإدارة المالية" },
//     { key: "can_view_users", label: "عرض المستخدمين" },
//     { key: "can_manage_users", label: "إدارة المستخدمين" },
//     { key: "can_manage_permissions", label: "إدارة الصلاحيات" },
//     { key: "ads", label: "الإعلانات" },
//     { key: "leads", label: "الليدز" },

//     // Lead Columns
//     { key: "view_all_lead", label: "عرض كل الليدز" },
//     { key: "view_my_lead", label: "عرض ليدزي" },
//     { key: "create_new_lead", label: "إنشاء ليد" },
//     { key: "update_lead", label: "تعديل ليد" },
//     { key: "update_lead_stage", label: "تعديل المرحلة" },
//     { key: "update_lead_responsible", label: "تعديل المسؤول" },
//     { key: "delete_lead", label: "حذف ليد" },

//     // Listing Columns
//     { key: "view_all_listing", label: "عرض كل العقارات" },
//     { key: "view_my_listing", label: "عرض عقاراتي" },
//     { key: "create_new_listing", label: "إضافة عقار" },
//     { key: "update_listing", label: "تعديل عقار" },
//     { key: "delete_listing", label: "حذف عقار" },
//     { key: "confirm_listing", label: "تأكيد عقار" },

//     // Listing Owners Columns
//     { key: "view_all_listing_owners", label: "عرض كل الملاك" },
//     { key: "view_my_listing_owners", label: "عرض ملاكي" },
//     { key: "create_new_listing_owners", label: "إضافة مالك" },
//     { key: "update_listing_owners", label: "تعديل مالك" },
//     { key: "delete_listing_owners", label: "حذف مالك" },

//     // ✅ ADDED: Archive Owners Columns
//     { key: "view_all_archive_owners", label: "عرض كل ملاك الأرشيف" },
//     { key: "view_my_archive_owners", label: "عرض ملاك أرشيفي" },
//     { key: "create_bulk_archive_owners", label: "إضافة ملاك بالأرشيف" },
//     { key: "update_bulk_responsibility_archive_owners", label: "تعديل مسؤولية الأرشيف" },
//     { key: "delete_bulk_archive_owners", label: "حذف ملاك الأرشيف" },
// ];

// // =========================================================
// // SUMMARY CARDS CONFIG (moved outside component)
// // =========================================================
// const SUMMARY_CARDS = [
//     { key: null, label: "الإجمالي", icon: FaShieldAlt, border: "border-[#a47d52]", text: "text-[#a47d52]" },
//     { key: "ListWorkLog", label: "سجل العمل", icon: FaUserCircle, border: "border-emerald-500", text: "text-emerald-600" },
//     { key: "monitoring", label: "المراقبة", icon: FaUsers, border: "border-blue-500", text: "text-blue-600" },
//     { key: "add_monitor", label: "إضافة مراقبة", icon: FaUserShield, border: "border-amber-500", text: "text-amber-600" },
//     { key: "property_management", label: "إدارة العقارات", icon: FaBuilding, border: "border-purple-500", text: "text-purple-600" },
//     { key: "financials", label: "الإدارة المالية", icon: FaMoneyBillWave, border: "border-rose-500", text: "text-rose-600" },
//     { key: "can_view_users", label: "عرض المستخدمين", icon: FaUserCheck, border: "border-indigo-500", text: "text-indigo-600" },
//     { key: "can_manage_users", label: "إدارة المستخدمين", icon: FaUserCog, border: "border-cyan-500", text: "text-cyan-600" },
//     { key: "can_manage_permissions", label: "إدارة الصلاحيات", icon: FaKey, border: "border-slate-600", text: "text-slate-700" },
//     { key: "ads", label: "الإعلانات", icon: FaBullhorn, border: "border-pink-500", text: "text-pink-600" },
//     { key: "leads", label: "الليدز", icon: FaAddressCard, border: "border-teal-500", text: "text-teal-600" },
//     { key: "view_all_lead", label: "عرض كل الليدز", icon: FaEye, border: "border-orange-500", text: "text-orange-600" },
//     { key: "view_my_lead", label: "عرض ليدزي", icon: FaUserTag, border: "border-lime-500", text: "text-lime-600" },
//     { key: "create_new_lead", label: "إنشاء ليد", icon: FaPlusCircle, border: "border-fuchsia-500", text: "text-fuchsia-600" },
//     { key: "update_lead", label: "تعديل ليد", icon: FaEdit, border: "border-sky-500", text: "text-sky-600" },
//     { key: "update_lead_stage", label: "تعديل المرحلة", icon: FaExchangeAlt, border: "border-violet-500", text: "text-violet-600" },
//     { key: "update_lead_responsible", label: "تعديل المسؤول", icon: FaUserShield, border: "border-emerald-600", text: "text-emerald-700" },
//     { key: "delete_lead", label: "حذف ليد", icon: FaTrash, border: "border-red-600", text: "text-red-700" },
// ];

// // =========================================================
// // SMALL TOGGLE SWITCH COMPONENT
// // =========================================================
// const SmallToggle = ({ checked, onChange, disabled, title }) => (
//     <button
//         type="button"
//         onClick={onChange}
//         disabled={disabled}
//         title={title}
//         aria-checked={checked}
//         role="switch"
//         className={`
//             relative inline-flex items-center
//             h-3.5 w-7 rounded-full
//             transition-colors duration-200
//             ${checked ? "bg-green-600" : "bg-gray-300"}
//             ${disabled ? "opacity-50 cursor-wait" : "cursor-pointer hover:opacity-90"}
//             focus:outline-none focus:ring-1 focus:ring-offset-0 focus:ring-[#a47d52]
//         `}
//     >
//         <span
//             className={`
//                 absolute top-0.5 h-2.5 w-2.5 bg-white rounded-full shadow
//                 transition-all duration-200
//                 ${checked ? "right-0.5" : "right-[calc(100%-0.875rem)]"}
//             `}
//         />
//     </button>
// );

// const Permissions = () => {
//     // =========================================================
//     // STATE
//     // =========================================================
//     const [permissions, setPermissions] = useState([]);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState("");
//     const [searchTerm, setSearchTerm] = useState("");

//     const [showModal, setShowModal] = useState(false);
//     const [editingPermission, setEditingPermission] = useState(null);

//     const [togglingId, setTogglingId] = useState(null);
//     const [deletingId, setDeletingId] = useState(null);

//     // =========================================================
//     // FETCH LIST
//     // =========================================================
//     const fetchPermissions = useCallback(async (search = "") => {
//         setLoading(true);
//         setError("");

//         try {
//             const token = localStorage.getItem("access_token");

//             if (!token) {
//                 toast.error("يرجى تسجيل الدخول لعرض الصلاحيات");
//                 setLoading(false);
//                 return;
//             }

//             let url = `${BASE}/api/permissions/`;
//             if (search) {
//                 url += `?search=${encodeURIComponent(search)}`;
//             }

//             const response = await fetch(url, {
//                 method: "GET",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             if (!response.ok) {
//                 if (response.status === 401) {
//                     toast.error("انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى");
//                 } else {
//                     toast.error("فشل تحميل الصلاحيات");
//                 }
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const data = await response.json();

//             if (data && data.results && Array.isArray(data.results)) {
//                 setPermissions(data.results);
//             } else if (Array.isArray(data)) {
//                 setPermissions(data);
//             } else {
//                 setPermissions([]);
//             }
//         } catch (err) {
//             console.error("Error fetching permissions:", err);
//             setError("فشل تحميل الصلاحيات");
//             toast.error("❌ حدث خطأ أثناء جلب الصلاحيات");
//         } finally {
//             setLoading(false);
//         }
//     }, []);

//     // =========================================================
//     // INITIAL LOAD + DEBOUNCED SEARCH
//     // =========================================================
//     useEffect(() => {
//         const delay = setTimeout(() => {
//             fetchPermissions(searchTerm);
//         }, 400);

//         return () => clearTimeout(delay);
//     }, [searchTerm, fetchPermissions]);

//     // =========================================================
//     // INLINE TOGGLE
//     // =========================================================
//     const handleToggle = async (row, field) => {
//         const token = localStorage.getItem("access_token");
//         if (!token) {
//             toast.error("يرجى تسجيل الدخول");
//             return;
//         }

//         setTogglingId(`${row.id}-${field}`);

//         setPermissions((prev) =>
//             prev.map((p) =>
//                 p.id === row.id ? { ...p, [field]: !p[field] } : p
//             )
//         );

//         try {
//             const response = await fetch(
//                 `${BASE}/api/permissions/${row.id}/update/`,
//                 {
//                     method: "PATCH",
//                     headers: {
//                         "Content-Type": "application/json",
//                         Authorization: `Bearer ${token}`,
//                     },
//                     body: JSON.stringify({ [field]: !row[field] }),
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error("فشل التحديث");
//             }

//             toast.success("✅ تم التحديث");
//         } catch (err) {
//             console.error("Toggle error:", err);
//             setPermissions((prev) =>
//                 prev.map((p) =>
//                     p.id === row.id ? { ...p, [field]: row[field] } : p
//                 )
//             );
//             toast.error("❌ فشل تحديث الصلاحية");
//         } finally {
//             setTogglingId(null);
//         }
//     };

//     // =========================================================
//     // DELETE
//     // =========================================================
//     const handleDelete = async (id) => {
//         if (!window.confirm("هل أنت متأكد من حذف هذه الصلاحيات؟")) return;

//         const token = localStorage.getItem("access_token");
//         if (!token) {
//             toast.error("يرجى تسجيل الدخول");
//             return;
//         }

//         setDeletingId(id);

//         try {
//             const response = await fetch(
//                 `${BASE}/api/permissions/${id}/delete/`,
//                 {
//                     method: "DELETE",
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                     },
//                 }
//             );

//             if (!response.ok) {
//                 throw new Error("فشل الحذف");
//             }

//             toast.success("✅ تم حذف الصلاحيات");
//             fetchPermissions(searchTerm);
//         } catch (err) {
//             console.error("Delete error:", err);
//             toast.error("❌ حدث خطأ أثناء الحذف");
//         } finally {
//             setDeletingId(null);
//         }
//     };

//     // =========================================================
//     // MODAL HANDLERS
//     // =========================================================
//     const handleOpenCreate = () => {
//         setEditingPermission(null);
//         setShowModal(true);
//     };

//     const handleOpenEdit = (row) => {
//         setEditingPermission(row);
//         setShowModal(true);
//     };

//     const handleCloseModal = () => {
//         setShowModal(false);
//         setEditingPermission(null);
//     };

//     const handleModalSuccess = () => {
//         setShowModal(false);
//         setEditingPermission(null);
//         fetchPermissions(searchTerm);
//     };

//     // =========================================================
//     // STATS — single reduce pass over permissions
//     // =========================================================
//     const counts = useMemo(() => {
//         const result = { total: permissions.length };

//         PERMISSION_COLUMNS.forEach((col) => {
//             result[col.key] = 0;
//         });

//         for (const row of permissions) {
//             for (const col of PERMISSION_COLUMNS) {
//                 if (row[col.key]) {
//                     result[col.key] += 1;
//                 }
//             }
//         }

//         return result;
//     }, [permissions]);

//     // =========================================================
//     // RENDER
//     // =========================================================
//     return (
//         <div className="min-h-screen bg-[#f8f7f5] py-8 px-4 md:py-10 md:px-6 lg:py-6 lg:px-0 rtl">
//             <ToastContainer
//                 position="top-center"
//                 autoClose={3000}
//                 hideProgressBar={false}
//                 newestOnTop={false}
//                 closeOnClick
//                 rtl={true}
//                 pauseOnFocusLoss
//                 draggable
//                 pauseOnHover
//                 theme="light"
//             />

//             {/* HEADER */}
//             <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-2 md:px-3 mb-6 md:mb-8 gap-4">
//                 <div className="flex items-center gap-4 text-center sm:text-right">
//                     <div className="hidden sm:flex h-14 w-14 rounded-2xl bg-[#a47d52]/10 items-center justify-center">
//                         <FaUserShield className="text-[#a47d52] text-2xl" />
//                     </div>
//                     <div>
//                         <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-800 tracking-wide">
//                             إدارة الصلاحيات
//                         </h2>
//                         <p className="text-sm md:text-base text-gray-600 mt-1">
//                             تحكم في صلاحيات المستخدمين
//                         </p>
//                     </div>
//                 </div>

//                 <div className="flex gap-3">
//                     <button
//                         onClick={() => fetchPermissions(searchTerm)}
//                         disabled={loading}
//                         className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 md:px-5 py-3 rounded-lg font-semibold text-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
//                     >
//                         <FaSyncAlt className={loading ? "animate-spin" : ""} />
//                         تحديث
//                     </button>

//                     <button
//                         onClick={handleOpenCreate}
//                         className="flex items-center gap-2 bg-[#a47d52] text-white px-5 md:px-7 py-3 rounded-lg font-extrabold text-sm md:text-base uppercase tracking-wide transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
//                     >
//                         <FaPlus />
//                         إضافة صلاحيات
//                     </button>
//                 </div>
//             </div>

//             {/* SUMMARY CARDS — generated from config */}
//             <div className="max-w-full mx-auto px-2 md:px-3 mb-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
//                 {SUMMARY_CARDS.map((card) => {
//                     const Icon = card.icon;
//                     const value = card.key === null ? counts.total : (counts[card.key] ?? 0);
//                     return (
//                         <div
//                             key={card.label}
//                             className={`bg-white rounded-xl shadow-md p-4 flex items-center justify-between border-r-4 ${card.border}`}
//                         >
//                             <div>
//                                 <p className="text-xs text-gray-500 font-medium">{card.label}</p>
//                                 <p className={`text-xl md:text-2xl font-extrabold ${card.text} mt-1`}>
//                                     {value}
//                                 </p>
//                             </div>
//                             <Icon className="opacity-50" size="24" />
//                         </div>
//                     );
//                 })}
//             </div>

//             {/* SEARCH BAR */}
//             <div className="max-w-full mx-auto px-2 md:px-3 mb-6">
//                 <div className="bg-white rounded-xl shadow-md p-4 flex flex-col md:flex-row gap-3 items-center">
//                     <div className="w-full relative">
//                         <FaSearch className="absolute top-1/2 -translate-y-1/2 right-4 text-gray-400" />
//                         <input
//                             type="text"
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                             placeholder="ابحث باسم المستخدم أو البريد الإلكتروني..."
//                             className="w-full pr-11 pl-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white"
//                         />
//                     </div>

//                     {searchTerm && (
//                         <button
//                             onClick={() => setSearchTerm("")}
//                             className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-600 text-sm hover:bg-gray-50 transition-colors duration-200"
//                         >
//                             <FaSyncAlt />
//                             إعادة تعيين
//                         </button>
//                     )}
//                 </div>
//             </div>

//             {/* TABLE */}
//             <div className="max-w-full mx-auto px-2 md:px-3">
//                 <div className="bg-white rounded-xl shadow-lg overflow-hidden">
//                     {loading ? (
//                         <div className="flex flex-col justify-center items-center py-24 gap-3">
//                             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />
//                             <p className="text-gray-500 text-sm">جاري تحميل الصلاحيات...</p>
//                         </div>
//                     ) : error ? (
//                         <div className="text-center py-20">
//                             <p className="text-red-600 text-lg font-semibold">{error}</p>
//                             <button
//                                 onClick={() => fetchPermissions(searchTerm)}
//                                 className="mt-4 px-5 py-2 bg-[#a47d52] text-white rounded-lg text-sm"
//                             >
//                                 إعادة المحاولة
//                             </button>
//                         </div>
//                     ) : permissions.length === 0 ? (
//                         <div className="text-center py-20">
//                             <FaUserShield className="mx-auto text-gray-300" size="56" />
//                             <p className="text-gray-500 text-lg mt-3">
//                                 {searchTerm ? "لا توجد نتائج مطابقة للبحث" : "لا توجد صلاحيات"}
//                             </p>
//                             <p className="text-gray-400 text-sm mt-2">
//                                 {searchTerm ? "جرّب كلمة بحث أخرى" : "قم بإضافة صلاحيات جديدة"}
//                             </p>
//                         </div>
//                     ) : (
//                         <div className="overflow-x-auto">
//                             <table className="w-full min-w-max">
//                                 <thead className="bg-[#e9e6e1] text-[#a47d52]">
//                                     <tr>
//                                         <th className="px-3 md:px-4 py-4 text-right text-sm font-bold">#</th>
//                                         <th className="px-3 md:px-4 py-4 text-right text-sm font-bold">المستخدم</th>
//                                         {PERMISSION_COLUMNS.map((col) => (
//                                             <th key={col.key} className="px-2 md:px-3 py-4 text-center text-xs md:text-sm font-bold">
//                                                 {col.label}
//                                             </th>
//                                         ))}
//                                         <th className="px-3 md:px-4 py-4 text-center text-sm font-bold">الإجراءات</th>
//                                     </tr>
//                                 </thead>

//                                 <tbody>
//                                     {permissions.map((row, index) => (
//                                         <tr
//                                             key={row.id}
//                                             className="border-b border-gray-200 odd:bg-white even:bg-gray-50 hover:bg-[#f8f2e7] transition-colors duration-200"
//                                         >
//                                             <td className="px-3 md:px-4 py-4 text-right text-sm text-gray-700">{index + 1}</td>

//                                             <td className="px-3 md:px-4 py-4 text-right">
//                                                 <div className="font-semibold text-gray-800 text-sm whitespace-nowrap">
//                                                     {row.user_full_name || row.username || "-"}
//                                                 </div>
//                                                 <div className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">
//                                                     {row.username}{row.user_email ? ` — ${row.user_email}` : ""}
//                                                 </div>
//                                             </td>

//                                             {PERMISSION_COLUMNS.map((col) => (
//                                                 <td key={col.key} className="px-2 md:px-3 py-4 text-center">
//                                                     <SmallToggle
//                                                         checked={!!row[col.key]}
//                                                         onChange={() => handleToggle(row, col.key)}
//                                                         disabled={togglingId === `${row.id}-${col.key}`}
//                                                         title={row[col.key] ? "إيقاف" : "تفعيل"}
//                                                     />
//                                                 </td>
//                                             ))}

//                                             <td className="px-3 md:px-4 py-4 text-center">
//                                                 <div className="flex justify-center gap-2">
//                                                     <button
//                                                         onClick={() => handleOpenEdit(row)}
//                                                         className="cursor-pointer px-2 py-2 bg-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-110 hover:bg-blue-50"
//                                                         title="تعديل"
//                                                     >
//                                                         <MdModeEdit className="text-blue-600" size="20" />
//                                                     </button>

//                                                     <button
//                                                         onClick={() => handleDelete(row.id)}
//                                                         disabled={deletingId === row.id}
//                                                         className="cursor-pointer px-2 py-2 bg-white rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-110 hover:bg-red-50 disabled:opacity-50"
//                                                         title="حذف"
//                                                     >
//                                                         <FaTrash className="text-red-600" size="18" />
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>

//                                 {/* SUMMARY FOOTER */}
//                                 <tfoot>
//                                     <tr className="bg-[#e6d5c0] border-t-2 border-[#BF9000]">
//                                         <td colSpan={2} className="px-3 md:px-4 py-4 text-right text-sm font-extrabold text-gray-900 whitespace-nowrap">
//                                             الإجمالي
//                                         </td>

//                                         {PERMISSION_COLUMNS.map((col) => (
//                                             <td
//                                                 key={col.key}
//                                                 className="px-2 md:px-3 py-4 text-center text-sm font-extrabold text-[#a47d52]"
//                                             >
//                                                 {counts[col.key] ?? 0}
//                                             </td>
//                                         ))}

//                                         <td className="px-3 md:px-4 py-4 text-center text-sm text-gray-700 whitespace-nowrap">
//                                             {counts.total} سجل
//                                         </td>
//                                     </tr>
//                                 </tfoot>
//                             </table>
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {/* MODAL */}
//             {showModal && (
//                 <AddPermission
//                     onClose={handleCloseModal}
//                     permissionData={editingPermission}
//                     onSuccess={handleModalSuccess}
//                 />
//             )}
//         </div>
//     );
// };

// export default Permissions;
