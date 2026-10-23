import AddMonthlyPayment from "../../components/ar/rent/AddMonthlyPayment";
import DetailMonthlyPayment from "../../components/ar/rent/DetailMonthlyPayment";


import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
} from "react-icons/fa";



const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const MonthlyPayment = () => {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const [showAdd, setShowAdd] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);

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

    const handleDelete = async (payment) => {
        if (!window.confirm("هل أنت متأكد من حذف هذه الدفعة؟")) return;

        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(
                `${BASE}/api/monthly-payments/${payment.id}/delete/`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!res.ok) throw new Error("فشل حذف الدفعة");

            toast.success("تم حذف الدفعة بنجاح.");
            fetchPayments();
        } catch (err) {
            console.error("Delete payment error:", err);
            toast.error(err.message || "حدث خطأ أثناء الحذف");
        }
    };

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <div dir="rtl" className="min-h-screen bg-[#f8f7f5] p-4 md:p-6">
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

            {/* SEARCH */}
            <div className="relative mb-5">
                <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="بحث بالمستأجر أو الوحدة أو الشهر أو الحالة..."
                    className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52]"
                />
            </div>

            {/* TABLE */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {loading ? (
                    <p className="text-center py-12 text-gray-500">
                        جاري التحميل...
                    </p>
                ) : filtered.length === 0 ? (
                    <p className="text-center py-12 text-gray-500">
                        لا توجد دفعات
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-[#f8f7f5] text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 font-extrabold">
                                        المستأجر
                                    </th>
                                    <th className="p-4 font-extrabold">
                                        الوحدة
                                    </th>
                                    <th className="p-4 font-extrabold">
                                        الشهر
                                    </th>
                                    <th className="p-4 font-extrabold">
                                        المبلغ المستحق
                                    </th>
                                    <th className="p-4 font-extrabold">
                                        المدفوع
                                    </th>
                                    <th className="p-4 font-extrabold">
                                        المتبقي
                                    </th>
                                    <th className="p-4 font-extrabold">
                                        الحالة
                                    </th>
                                    <th className="p-4 font-extrabold">
                                        إجراءات
                                    </th>
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
                                                    onClick={() =>
                                                        handleOpenDetail(p)
                                                    }
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
                                                    onClick={() =>
                                                        handleDelete(p)
                                                    }
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
                )}
            </div>

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
        </div>
    );
};

export default MonthlyPayment;