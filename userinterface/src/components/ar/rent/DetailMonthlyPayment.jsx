import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
    FaMoneyBillWave,
    FaUserTie,
    FaBuilding,
    FaCalendarAlt,
    FaCheckCircle,
    FaClock,
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
} from "react-icons/fa";

import { MdClose } from "react-icons/md";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const DetailMonthlyPayment = ({ paymentId, onClose }) => {
    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchPayment = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("access_token");
                const res = await fetch(
                    `${BASE}/api/monthly-payments/${paymentId}/`,
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!res.ok) throw new Error("فشل تحميل الدفعة");

                const data = await res.json();
                if (!cancelled) {
                    setPayment(data?.payment || data);
                }
            } catch (err) {
                console.error("Fetch payment detail error:", err);
                if (!cancelled)
                    toast.error("❌ فشل تحميل تفاصيل الدفعة");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (paymentId) fetchPayment();
        return () => {
            cancelled = true;
        };
    }, [paymentId]);

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

    const InfoRow = ({ icon, label, value }) => (
        <div className="flex items-center gap-2">
            {icon && <span className="text-[#a47d52]">{icon}</span>}
            <span className="text-xs text-gray-500 font-bold">{label}:</span>
            <span
                className="text-sm text-gray-800 font-bold truncate"
                dir="auto"
            >
                {value ?? "-"}
            </span>
        </div>
    );

    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
            <div className="w-full max-w-3xl max-h-[95vh] bg-[#f8f7f5] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* HEADER */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                            <FaMoneyBillWave size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-800">
                                تفاصيل الدفعة
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                عرض معلومات الدفعة الشهرية
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-all"
                    >
                        <MdClose size={24} />
                    </button>
                </div>

                {/* BODY */}
                <div className="overflow-y-auto p-6 flex-1 space-y-5">
                    {loading ? (
                        <p className="text-center py-12 text-gray-500">
                            جاري التحميل...
                        </p>
                    ) : !payment ? (
                        <p className="text-center py-12 text-gray-500">
                            لم يتم العثور على الدفعة.
                        </p>
                    ) : (
                        <>
                            {/* STATUS + AMOUNTS */}
                            <div className="rounded-xl bg-white border border-gray-200 p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-extrabold text-gray-800">
                                        ملخص الدفعة
                                    </h3>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-extrabold border ${getStatusColor(
                                            payment.status
                                        )}`}
                                    >
                                        {getStatusLabel(payment.status)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <AmountCard
                                        label="المبلغ المستحق"
                                        value={payment.amount_due}
                                        color="text-gray-800"
                                    />
                                    <AmountCard
                                        label="المبلغ المدفوع"
                                        value={payment.amount_paid}
                                        color="text-green-700"
                                    />
                                    <AmountCard
                                        label="المبلغ المتبقي"
                                        value={payment.amount_remaining}
                                        color="text-red-600"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <AmountCard
                                        label="التأمين"
                                        value={payment.security_deposit}
                                        color="text-[#a47d52]"
                                    />
                                    <AmountCard
                                        label="سعر الوحدة"
                                        value={payment.unit_price}
                                        color="text-gray-700"
                                    />
                                    <AmountCard
                                        label="تأمين الوحدة"
                                        value={payment.unit_security_deposit}
                                        color="text-gray-700"
                                    />
                                </div>
                            </div>

                            {/* DATES */}
                            <div className="rounded-xl bg-white border border-gray-200 p-5">
                                <h3 className="font-extrabold text-gray-800 mb-4">
                                    التواريخ
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <InfoRow
                                        icon={<FaCalendarAlt />}
                                        label="الشهر"
                                        value={payment.month}
                                    />
                                    <InfoRow
                                        icon={<FaClock />}
                                        label="تاريخ الاستحقاق"
                                        value={payment.due_date}
                                    />
                                    <InfoRow
                                        icon={<FaCheckCircle />}
                                        label="تاريخ الدفع"
                                        value={payment.paid_date}
                                    />
                                </div>
                            </div>

                            {/* TENANT / UNIT */}
                            <div className="rounded-xl bg-white border border-gray-200 p-5">
                                <h3 className="font-extrabold text-gray-800 mb-4">
                                    المستأجر والوحدة
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <InfoRow
                                        icon={<FaUserTie />}
                                        label="المستأجر"
                                        value={payment.tenant_name}
                                    />
                                    <InfoRow
                                        icon={<FaBuilding />}
                                        label="الوحدة"
                                        value={payment.unit_display}
                                    />
                                </div>
                            </div>

                            {/* NOTES */}
                            {payment.notes && (
                                <div className="rounded-xl bg-white border border-gray-200 p-5">
                                    <h3 className="font-extrabold text-gray-800 mb-2">
                                        ملاحظات
                                    </h3>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {payment.notes}
                                    </p>
                                </div>
                            )}

                            {/* META */}
                            <div className="rounded-xl bg-white border border-gray-200 p-5">
                                <h3 className="font-extrabold text-gray-800 mb-3 text-sm">
                                    معلومات إضافية
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <InfoRow
                                        label="تاريخ الإنشاء"
                                        value={payment.created_at}
                                    />
                                    <InfoRow
                                        label="آخر تحديث"
                                        value={payment.updated_at}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div className="border-t border-gray-200 p-6 bg-white shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full cursor-pointer font-extrabold bg-[#a47d52] text-white px-6 py-3 rounded-lg transition-all hover:bg-[#8a6a44]"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ---------- small helper ---------- */
const AmountCard = ({ label, value, color }) => (
    <div className="rounded-lg border border-gray-200 bg-[#f8f7f5] p-3 text-center">
        <p className="text-xs text-gray-500 font-bold mb-1">{label}</p>
        <p className={`text-lg font-extrabold ${color}`} dir="ltr">
            {value ?? "—"}
        </p>
    </div>
);

export default DetailMonthlyPayment;