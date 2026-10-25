import AddMonthlyPayment from "../../components/ar/rent/AddMonthlyPayment";
import DetailMonthlyPayment from "../../components/ar/rent/DetailMonthlyPayment";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast"; // ✅ Changed to react-hot-toast
import { Toaster } from "react-hot-toast";

import {
    FaPlus,
    FaSearch,
    FaEye,
    FaEdit,
    FaTrash,
    FaMoneyBillWave,
    FaCalendarAlt,
    FaCheckCircle,
    FaClock,
    FaExclamationTriangle,
    FaThLarge,
    FaList,
} from "react-icons/fa";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const MonthlyPayment = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [showAdd, setShowAdd] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

    // ✅ Added states for view mode and custom delete confirmation
    const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    /* =========================================================
       FETCH LIST
    ========================================================= */
    const fetchPayments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${BASE}/api/monthly-payments/`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error("فشل تحميل الدفعات");

            const data = await res.json();

            let list = [];
            if (Array.isArray(data)) list = data;
            else if (Array.isArray(data.results)) list = data.results;
            else if (Array.isArray(data.payments)) list = data.payments;
            else if (Array.isArray(data.monthly_payments))
                list = data.monthly_payments;

            setPayments(list);
        } catch (err) {
            console.error("Fetch payments error:", err);
            toast.error("❌ فشل تحميل قائمة الدفعات");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, []);

    /* =========================================================
       HELPERS
    ========================================================= */
    const getStatusLabel = (s) => {
        const map = {
            paid: "مدفوع",
            pending: "قيد الانتظار",
            late: "متأخر",
            partial: "جزئي",
        };
        return map[s] || s || "-";
    };

    const getStatusColor = (s) => {
        const map = {
            paid: "bg-green-100 text-green-700 border-green-300",
            pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
            late: "bg-red-100 text-red-700 border-red-300",
            partial: "bg-blue-100 text-blue-700 border-blue-300",
        };
        return map[s] || "bg-gray-100 text-gray-700 border-gray-300";
    };

    const filtered = payments.filter((p) => {
        const s = search.trim().toLowerCase();
        if (!s) return true;
        return (
            String(p.tenant_name || "").toLowerCase().includes(s) ||
            String(p.unit_display || "").toLowerCase().includes(s) ||
            String(p.month || "").toLowerCase().includes(s) ||
            String(p.status || "").toLowerCase().includes(s)
        );
    });

    /* =========================================================
       ACTIONS
    ========================================================= */
    const handleOpenAdd = () => {
        setSelectedPayment(null);
        setShowAdd(true);
    };

    const handleOpenDetail = (payment) => {
        setSelectedPayment(payment);
        setShowDetail(true);
    };

    // ✅ Updated to use the custom modal state instead of window.confirm
    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);

        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(
                `${BASE}/api/monthly-payments/${confirmDelete.id}/delete/`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) throw new Error("فشل حذف الدفعة");

            toast.success("تم حذف الدفعة بنجاح.");
            setConfirmDelete(null);
            fetchPayments();
        } catch (err) {
            console.error("Delete payment error:", err);
            toast.error(err.message || "حدث خطأ أثناء الحذف");
        } finally {
            setDeleting(false);
        }
    };

    /* =========================================================
       RENDER: CARDS VIEW
    ========================================================= */
    const renderCardsView = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p) => (
                <div
                    key={p.id}
                    className="bg-white border border-[#e9e6e1] rounded-xl shadow-sm hover:shadow-md transition-all p-5 relative group"
                >
                    {/* Header - Tenant & Unit */}
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-extrabold text-gray-800 text-lg truncate max-w-[180px]">
                                {p.tenant_name || "-"}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-[180px]">
                                {p.unit_display || "-"}
                            </p>
                        </div>
                        <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${getStatusColor(
                                p.status
                            )}`}
                        >
                            {getStatusLabel(p.status)}
                        </span>
                    </div>

                    {/* Month */}
                    <div className="flex items-center gap-2 mb-4 bg-[#f8f7f5] p-2 rounded-lg">
                        <FaCalendarAlt className="text-[#a47d52]" />
                        <span className="font-bold text-gray-700 text-sm">
                            {p.month || "-"}
                        </span>
                    </div>

                    {/* Amounts */}
                    <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-bold">المستحق:</span>
                            <span className="font-extrabold text-gray-800" dir="ltr">
                                {p.amount_due ?? "-"}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-bold">المدفوع:</span>
                            <span className="font-extrabold text-green-700" dir="ltr">
                                {p.amount_paid ?? "-"}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                            <span className="text-gray-500 font-bold">المتبقي:</span>
                            <span className="font-extrabold text-red-600" dir="ltr">
                                {p.amount_remaining ?? "-"}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                        <button
                            onClick={() => handleOpenDetail(p)}
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs hover:bg-blue-100 transition cursor-pointer"
                        >
                            <FaEye size={12} /> عرض
                        </button>
                        <button
                            onClick={() => {
                                setSelectedPayment(p);
                                setShowAdd(true);
                            }}
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-amber-50 text-amber-600 rounded-lg font-bold text-xs hover:bg-amber-100 transition cursor-pointer"
                        >
                            <FaEdit size={12} /> تعديل
                        </button>
                        <button
                            onClick={() => setConfirmDelete(p)}
                            className="flex-1 flex items-center justify-center gap-1 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs hover:bg-red-100 transition cursor-pointer"
                        >
                            <FaTrash size={12} /> حذف
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    /* =========================================================
       RENDER: TABLE VIEW
    ========================================================= */
    const renderTableView = () => (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-[#f8f7f5] text-gray-600 text-sm">
                        <tr>
                            <th className="p-4 font-extrabold">المستأجر</th>
                            <th className="p-4 font-extrabold">الوحدة</th>
                            <th className="p-4 font-extrabold">الشهر</th>
                            <th className="p-4 font-extrabold">المبلغ المستحق</th>
                            <th className="p-4 font-extrabold">المدفوع</th>
                            <th className="p-4 font-extrabold">المتبقي</th>
                            <th className="p-4 font-extrabold">الحالة</th>
                            <th className="p-4 font-extrabold">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((p) => (
                            <tr
                                key={p.id}
                                className="border-t border-gray-100 hover:bg-[#f8f7f5]"
                            >
                                <td className="p-4 font-bold text-gray-800">
                                    {p.tenant_name || "-"}
                                </td>
                                <td className="p-4 text-gray-700">
                                    {p.unit_display || "-"}
                                </td>
                                <td className="p-4 text-gray-700">
                                    {p.month || "-"}
                                </td>
                                <td
                                    className="p-4 font-bold text-gray-800"
                                    dir="ltr"
                                >
                                    {p.amount_due ?? "-"}
                                </td>
                                <td
                                    className="p-4 font-bold text-green-700"
                                    dir="ltr"
                                >
                                    {p.amount_paid ?? "-"}
                                </td>
                                <td
                                    className="p-4 font-bold text-red-600"
                                    dir="ltr"
                                >
                                    {p.amount_remaining ?? "-"}
                                </td>
                                <td className="p-4">
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${getStatusColor(
                                            p.status
                                        )}`}
                                    >
                                        {getStatusLabel(p.status)}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenDetail(p)}
                                            className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center cursor-pointer hover:bg-blue-100"
                                            title="عرض"
                                        >
                                            <FaEye size={14} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedPayment(p);
                                                setShowAdd(true);
                                            }}
                                            className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center cursor-pointer hover:bg-amber-100"
                                            title="تعديل"
                                        >
                                            <FaEdit size={14} />
                                        </button>
                                        <button
                                            onClick={() => setConfirmDelete(p)}
                                            className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center cursor-pointer hover:bg-red-100"
                                            title="حذف"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div dir="rtl" className="min-h-screen bg-[#f8f7f5] p-4 md:p-6">
            <Toaster position="top-center" reverseOrder={false} />

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                        <FaMoneyBillWave size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-800">
                            الدفعات الشهرية
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            إدارة جميع دفعات عقود الإيجار
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleOpenAdd}
                    className="flex items-center justify-center gap-2 bg-[#a47d52] text-white font-extrabold px-5 py-3 rounded-lg cursor-pointer transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02]"
                >
                    <FaPlus />
                    إضافة دفعة جديدة
                </button>
            </div>

            {/* SEARCH + VIEW TOGGLE */}
            <div className="flex flex-col md:flex-row gap-4 mb-5">
                <div className="relative flex-1">
                    <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث بالمستأجر أو الوحدة أو الشهر أو الحالة..."
                        className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52]"
                    />
                </div>

                {/* View Mode Toggle */}
                <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm shrink-0">
                    <button
                        onClick={() => setViewMode("cards")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                            viewMode === "cards"
                                ? "bg-[#a47d52] text-white shadow-sm"
                                : "text-gray-500 hover:text-[#a47d52]"
                        }`}
                    >
                        <FaThLarge size={14} /> بطاقات
                    </button>
                    <button
                        onClick={() => setViewMode("table")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                            viewMode === "table"
                                ? "bg-[#a47d52] text-white shadow-sm"
                                : "text-gray-500 hover:text-[#a47d52]"
                        }`}
                    >
                        <FaList size={14} /> جدول
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            {loading ? (
                <div className="flex justify-center items-center py-20 bg-white rounded-xl border border-gray-200">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#a47d52]" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
                    <FaMoneyBillWave className="mx-auto text-gray-300 mb-3" size={40} />
                    <p className="text-gray-500 font-bold">لا توجد دفعات</p>
                </div>
            ) : viewMode === "cards" ? (
                renderCardsView()
            ) : (
                renderTableView()
            )}

            {/* MODALS */}
            {showAdd && (
                <AddMonthlyPayment
                    payment={selectedPayment}
                    onClose={() => {
                        setShowAdd(false);
                        setSelectedPayment(null);
                    }}
                    onSuccess={() => {
                        fetchPayments();
                    }}
                />
            )}

            {showDetail && selectedPayment && (
                <DetailMonthlyPayment
                    paymentId={selectedPayment.id}
                    onClose={() => {
                        setShowDetail(false);
                        setSelectedPayment(null);
                    }}
                />
            )}

            {/* ✅ CUSTOM DELETE CONFIRMATION MODAL */}
            {confirmDelete && (
                <div
                    className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !deleting)
                            setConfirmDelete(null);
                    }}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.3)] overflow-hidden"
                        style={{ animation: "modalIn 0.25s ease-out" }}
                    >
                        <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-red-400" />

                        <div className="flex justify-center pt-6">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />
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
                                هل أنت متأكد من حذف هذه الدفعة؟
                                <br />
                                <span className="font-extrabold text-gray-800 mt-1 inline-block">
                                    {confirmDelete.tenant_name || "دفعة"} - {confirmDelete.month || ""}
                                </span>
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
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-red-600 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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

export default MonthlyPayment;

// import AddMonthlyPayment from "../../components/ar/rent/AddMonthlyPayment";
// import DetailMonthlyPayment from "../../components/ar/rent/DetailMonthlyPayment";


// import React, { useEffect, useState } from "react";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// import {
//     FaPlus,
//     FaSearch,
//     FaEye,
//     FaEdit,
//     FaTrash,
//     FaMoneyBillWave,
//     FaCalendarAlt,
//     FaCheckCircle,
//     FaClock,
// } from "react-icons/fa";



// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// const MonthlyPayment = () => {
//     const [payments, setPayments] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [search, setSearch] = useState("");

//     const [showAdd, setShowAdd] = useState(false);
//     const [showDetail, setShowDetail] = useState(false);
//     const [selectedPayment, setSelectedPayment] = useState(null);

//     /* =========================================================
//        FETCH LIST
//     ========================================================= */
//     const fetchPayments = async () => {
//         setLoading(true);
//         try {
//             const token = localStorage.getItem("access_token");
//             const res = await fetch(`${BASE}/api/monthly-payments/`, {
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             if (!res.ok) throw new Error("فشل تحميل الدفعات");

//             const data = await res.json();

//             let list = [];
//             if (Array.isArray(data)) list = data;
//             else if (Array.isArray(data.results)) list = data.results;
//             else if (Array.isArray(data.payments)) list = data.payments;
//             else if (Array.isArray(data.monthly_payments))
//                 list = data.monthly_payments;

//             setPayments(list);
//         } catch (err) {
//             console.error("Fetch payments error:", err);
//             toast.error("❌ فشل تحميل قائمة الدفعات");
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchPayments();
//     }, []);

//     /* =========================================================
//        HELPERS
//     ========================================================= */
//     const getStatusLabel = (s) => {
//         const map = {
//             paid: "مدفوع",
//             pending: "قيد الانتظار",
//             late: "متأخر",
//             partial: "جزئي",
//         };
//         return map[s] || s || "-";
//     };

//     const getStatusColor = (s) => {
//         const map = {
//             paid: "bg-green-100 text-green-700 border-green-300",
//             pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
//             late: "bg-red-100 text-red-700 border-red-300",
//             partial: "bg-blue-100 text-blue-700 border-blue-300",
//         };
//         return map[s] || "bg-gray-100 text-gray-700 border-gray-300";
//     };

//     const filtered = payments.filter((p) => {
//         const s = search.trim().toLowerCase();
//         if (!s) return true;
//         return (
//             String(p.tenant_name || "").toLowerCase().includes(s) ||
//             String(p.unit_display || "").toLowerCase().includes(s) ||
//             String(p.month || "").toLowerCase().includes(s) ||
//             String(p.status || "").toLowerCase().includes(s)
//         );
//     });

//     /* =========================================================
//        ACTIONS
//     ========================================================= */
//     const handleOpenAdd = () => {
//         setSelectedPayment(null);
//         setShowAdd(true);
//     };

//     const handleOpenDetail = (payment) => {
//         setSelectedPayment(payment);
//         setShowDetail(true);
//     };

//     const handleDelete = async (payment) => {
//         if (!window.confirm("هل أنت متأكد من حذف هذه الدفعة؟")) return;

//         try {
//             const token = localStorage.getItem("access_token");
//             const res = await fetch(
//                 `${BASE}/api/monthly-payments/${payment.id}/delete/`,
//                 {
//                     method: "DELETE",
//                     headers: { Authorization: `Bearer ${token}` },
//                 }
//             );

//             if (!res.ok) throw new Error("فشل حذف الدفعة");

//             toast.success("تم حذف الدفعة بنجاح.");
//             fetchPayments();
//         } catch (err) {
//             console.error("Delete payment error:", err);
//             toast.error(err.message || "حدث خطأ أثناء الحذف");
//         }
//     };

//     /* =========================================================
//        RENDER
//     ========================================================= */
//     return (
//         <div dir="rtl" className="min-h-screen bg-[#f8f7f5] p-4 md:p-6">
//             {/* HEADER */}
//             <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
//                 <div className="flex items-center gap-3">
//                     <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
//                         <FaMoneyBillWave size={22} />
//                     </div>
//                     <div>
//                         <h1 className="text-2xl font-extrabold text-gray-800">
//                             الدفعات الشهرية
//                         </h1>
//                         <p className="text-sm text-gray-500 mt-1">
//                             إدارة جميع دفعات عقود الإيجار
//                         </p>
//                     </div>
//                 </div>

//                 <button
//                     onClick={handleOpenAdd}
//                     className="flex items-center justify-center gap-2 bg-[#a47d52] text-white font-extrabold px-5 py-3 rounded-lg cursor-pointer transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02]"
//                 >
//                     <FaPlus />
//                     إضافة دفعة جديدة
//                 </button>
//             </div>

//             {/* SEARCH */}
//             <div className="relative mb-5">
//                 <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
//                 <input
//                     type="text"
//                     value={search}
//                     onChange={(e) => setSearch(e.target.value)}
//                     placeholder="بحث بالمستأجر أو الوحدة أو الشهر أو الحالة..."
//                     className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52]"
//                 />
//             </div>

//             {/* TABLE */}
//             <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
//                 {loading ? (
//                     <p className="text-center py-12 text-gray-500">
//                         جاري التحميل...
//                     </p>
//                 ) : filtered.length === 0 ? (
//                     <p className="text-center py-12 text-gray-500">
//                         لا توجد دفعات
//                     </p>
//                 ) : (
//                     <div className="overflow-x-auto">
//                         <table className="w-full text-right">
//                             <thead className="bg-[#f8f7f5] text-gray-600 text-sm">
//                                 <tr>
//                                     <th className="p-4 font-extrabold">
//                                         المستأجر
//                                     </th>
//                                     <th className="p-4 font-extrabold">
//                                         الوحدة
//                                     </th>
//                                     <th className="p-4 font-extrabold">
//                                         الشهر
//                                     </th>
//                                     <th className="p-4 font-extrabold">
//                                         المبلغ المستحق
//                                     </th>
//                                     <th className="p-4 font-extrabold">
//                                         المدفوع
//                                     </th>
//                                     <th className="p-4 font-extrabold">
//                                         المتبقي
//                                     </th>
//                                     <th className="p-4 font-extrabold">
//                                         الحالة
//                                     </th>
//                                     <th className="p-4 font-extrabold">
//                                         إجراءات
//                                     </th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                                 {filtered.map((p) => (
//                                     <tr
//                                         key={p.id}
//                                         className="border-t border-gray-100 hover:bg-[#f8f7f5]"
//                                     >
//                                         <td className="p-4 font-bold text-gray-800">
//                                             {p.tenant_name || "-"}
//                                         </td>
//                                         <td className="p-4 text-gray-700">
//                                             {p.unit_display || "-"}
//                                         </td>
//                                         <td className="p-4 text-gray-700">
//                                             {p.month || "-"}
//                                         </td>
//                                         <td
//                                             className="p-4 font-bold text-gray-800"
//                                             dir="ltr"
//                                         >
//                                             {p.amount_due ?? "-"}
//                                         </td>
//                                         <td
//                                             className="p-4 font-bold text-green-700"
//                                             dir="ltr"
//                                         >
//                                             {p.amount_paid ?? "-"}
//                                         </td>
//                                         <td
//                                             className="p-4 font-bold text-red-600"
//                                             dir="ltr"
//                                         >
//                                             {p.amount_remaining ?? "-"}
//                                         </td>
//                                         <td className="p-4">
//                                             <span
//                                                 className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border ${getStatusColor(
//                                                     p.status
//                                                 )}`}
//                                             >
//                                                 {getStatusLabel(p.status)}
//                                             </span>
//                                         </td>
//                                         <td className="p-4">
//                                             <div className="flex items-center gap-2">
//                                                 <button
//                                                     onClick={() =>
//                                                         handleOpenDetail(p)
//                                                     }
//                                                     className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center cursor-pointer hover:bg-blue-100"
//                                                     title="عرض"
//                                                 >
//                                                     <FaEye size={14} />
//                                                 </button>
//                                                 <button
//                                                     onClick={() => {
//                                                         setSelectedPayment(p);
//                                                         setShowAdd(true);
//                                                     }}
//                                                     className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center cursor-pointer hover:bg-amber-100"
//                                                     title="تعديل"
//                                                 >
//                                                     <FaEdit size={14} />
//                                                 </button>
//                                                 <button
//                                                     onClick={() =>
//                                                         handleDelete(p)
//                                                     }
//                                                     className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center cursor-pointer hover:bg-red-100"
//                                                     title="حذف"
//                                                 >
//                                                     <FaTrash size={14} />
//                                                 </button>
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}
//             </div>

//             {/* MODALS */}
//             {showAdd && (
//                 <AddMonthlyPayment
//                     payment={selectedPayment}
//                     onClose={() => {
//                         setShowAdd(false);
//                         setSelectedPayment(null);
//                     }}
//                     onSuccess={() => {
//                         fetchPayments();
//                     }}
//                 />
//             )}

//             {showDetail && selectedPayment && (
//                 <DetailMonthlyPayment
//                     paymentId={selectedPayment.id}
//                     onClose={() => {
//                         setShowDetail(false);
//                         setSelectedPayment(null);
//                     }}
//                 />
//             )}
//         </div>
//     );
// };

// export default MonthlyPayment;