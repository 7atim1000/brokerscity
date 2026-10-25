import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast"; 
import { Toaster } from "react-hot-toast";

import {
    FaSave,
    FaMoneyBillWave,
    FaSearch,
    FaCheck,
    FaCalendarAlt,
    FaBuilding,
    FaHandHoldingUsd,
    FaMoneyCheckAlt,
    FaCreditCard,
    FaUniversity,   
    FaWallet,
} from "react-icons/fa";

import { MdClose } from "react-icons/md";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const PAYMENT_METHODS = [
    { value: "cash", label: "نقداً", icon: <FaMoneyBillWave />, color: "text-green-700", bg: "bg-green-50 border-green-300" },
    { value: "card", label: "بطاقة", icon: <FaCreditCard />, color: "text-blue-700", bg: "bg-blue-50 border-blue-300" },
    { value: "bank_transfer", label: "تحويل بنكي", icon: <FaUniversity />, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-300" },
    { value: "cheque", label: "شيك", icon: <FaMoneyCheckAlt />, color: "text-amber-700", bg: "bg-amber-50 border-amber-300" },
    { value: "wallet", label: "محفظة إلكترونية", icon: <FaWallet />, color: "text-purple-700", bg: "bg-purple-50 border-purple-300" },
];

const MONTHS = [
    { value: "Jan", label: "يناير (Jan)" },
    { value: "Feb", label: "فبراير (Feb)" },
    { value: "Mar", label: "مارس (Mar)" },
    { value: "Apr", label: "أبريل (Apr)" },
    { value: "May", label: "مايو (May)" },
    { value: "Jun", label: "يونيو (Jun)" },
    { value: "Jul", label: "يوليو (Jul)" },
    { value: "Aug", label: "أغسطس (Aug)" },
    { value: "Sep", label: "سبتمبر (Sep)" },
    { value: "Oct", label: "أكتوبر (Oct)" },
    { value: "Nov", label: "نوفمبر (Nov)" },
    { value: "Dec", label: "ديسمبر (Dec)" },
];

const AddMonthlyPayment = ({ payment = null, onClose, onSuccess }) => {
    const isEditMode = Boolean(payment?.id);

    const [formData, setFormData] = useState({
        rent: payment?.rent?.id ?? payment?.rent ?? "",
        month: payment?.month ?? "",
        amount_due: payment?.amount_due ?? "",
        amount_paid: payment?.amount_paid ?? "",
        security_deposit: payment?.security_deposit ?? "",
        due_date: payment?.due_date ?? "",
        paid_date: payment?.paid_date ?? "",
        status: payment?.status ?? "paid", 
        notes: payment?.notes ?? "",
        payment_method: payment?.payment_method ?? "cash",
        payment_type: payment?.payment_type ?? "installment",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const [rents, setRents] = useState([]);
    const [loadingRents, setLoadingRents] = useState(true);
    const [rentSearch, setRentSearch] = useState("");

    const formRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        const fetchRents = async () => {
            setLoadingRents(true);
            try {
                const token = localStorage.getItem("access_token");
                const res = await fetch(`${BASE}/api/rents/`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error("فشل تحميل العقود");
                const data = await res.json();

                let list = [];
                if (Array.isArray(data)) list = data;
                else if (Array.isArray(data.results)) list = data.results;
                else if (Array.isArray(data.rents)) list = data.rents;

                if (!cancelled) setRents(list);
            } catch (err) {
                console.error("Fetch rents error:", err);
                if (!cancelled) toast.error("❌ فشل تحميل العقود");
            } finally {
                if (!cancelled) setLoadingRents(false);
            }
        };

        fetchRents();
        return () => {
            cancelled = true;
        };
    }, []);

    const getRentLabel = (r) => {
        const tenant =
            r?.tenant_name ||
            r?.rental_name?.name ||
            r?.rental_name?.tenant_name ||
            `عقد #${r?.id ?? "-"}`;
        const unit =
            r?.unit_display ||
            r?.unit_name?.name ||
            `وحدة #${r?.unit_name?.id ?? "-"}`;
        return `${tenant} — ${unit}`;
    };

    const selectedRent = useMemo(
        () =>
            rents.find((r) => String(r.id) === String(formData.rent)) || null,
        [rents, formData.rent]
    );

    const filteredRents = useMemo(() => {
        const s = rentSearch.trim().toLowerCase();
        if (!s) return rents;
        return rents.filter((r) =>
            getRentLabel(r).toLowerCase().includes(s)
        );
    }, [rents, rentSearch]);

    const computedRemaining = useMemo(() => {
        const due = Number(formData.amount_due);
        const paid = Number(formData.amount_paid);
        if (!due && !paid) return null;
        return (Number(due || 0) - Number(paid || 0)).toFixed(2);
    }, [formData.amount_due, formData.amount_paid]);

    const isDeposit = formData.payment_type === "deposit";

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleMonthChange = (e) => {
        const monthValue = e.target.value;
        setFormData((prev) => ({ ...prev, month: monthValue }));
        setErrors((prev) => ({ ...prev, month: "" }));
    };

    // ✅ UPDATED: Both amount_due and amount_paid now pull from installment_amount
    const handleSelectRent = (rent) => {
        const installmentAmount = rent?.installment_amount || "";
        
        // Fallback just in case installment_amount is missing
        const fallbackAmount = rent?.unit_price || rent?.unit_name?.price || "";

        setFormData((prev) => ({
            ...prev,
            rent: rent.id,
            // Both now default to installment_amount
            amount_due: prev.amount_due || installmentAmount || fallbackAmount,
            amount_paid: prev.amount_paid || installmentAmount || fallbackAmount,
            security_deposit:
                prev.security_deposit ||
                rent?.unit_security_deposit ||
                rent?.unit_name?.security_deposit ||
                "",
        }));
        setErrors((prev) => ({ ...prev, rent: "" }));
    };

    const handleClearRent = () => {
        setFormData((prev) => ({ ...prev, rent: "" }));
    };

    const handlePaymentTypeChange = (type) => {
        setFormData((prev) => ({
            ...prev,
            payment_type: type,
            ...(type === "deposit"
                ? {
                      amount_due: "",
                      amount_paid: "",
                      status: "paid",
                  }
                : {
                      security_deposit: "",
                      status: "paid",
                  }),
        }));
        setErrors({});
    };

    const handleSelectPaymentMethod = (value) => {
        setFormData((prev) => ({ ...prev, payment_method: value }));
    };

    const handleKeyDown = (e) => {
        if (e.key !== "Enter") return;
        if (e.target.tagName === "TEXTAREA" && !e.shiftKey) return;

        e.preventDefault();
        const form = formRef.current;
        if (!form) return;

        const focusable = Array.from(
            form.querySelectorAll(
                'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[data-submit="true"]'
            )
        ).filter((el) => el.offsetParent !== null);

        const index = focusable.indexOf(e.target);
        if (index === -1) return;

        const next = focusable[index + 1];

        if (next && next.tagName !== "BUTTON") {
            next.focus();
            if (next.select) next.select();
        } else {
            form.requestSubmit();
        }
    };

    const validateForm = () => {
        const e = {};
        if (!formData.rent) e.rent = "يرجى اختيار العقد.";
        if (!formData.month) e.month = "الشهر مطلوب.";

        if (isDeposit) {
            if (
                formData.security_deposit === "" ||
                Number(formData.security_deposit) < 0
            ) {
                e.security_deposit = "مبلغ التأمين غير صالح.";
            }
        } else {
            if (formData.amount_due === "" || Number(formData.amount_due) < 0)
                e.amount_due = "المبلغ المستحق غير صالح.";
            if (
                formData.amount_paid !== "" &&
                Number(formData.amount_paid) < 0
            )
                e.amount_paid = "المبلغ المدفوع غير صالح.";
        }

        if (!formData.payment_method)
            e.payment_method = "يرجى اختيار طريقة الدفع.";

        setErrors(e);
        if (Object.keys(e).length) {
            toast.error("يرجى مراجعة البيانات.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const url = isEditMode
                ? `${BASE}/api/monthly-payments/${payment.id}/update/`
                : `${BASE}/api/monthly-payments/create/`;
            const method = isEditMode ? "PATCH" : "POST";

            const payload = {
                rent: formData.rent,
                month: formData.month,
                amount_due: isDeposit ? "0.00" : formData.amount_due || "0.00",
                amount_paid: isDeposit
                    ? "0.00"
                    : formData.amount_paid || "0.00",
                security_deposit: isDeposit
                    ? formData.security_deposit || "0.00"
                    : "0.00",
                due_date: formData.due_date || null,
                paid_date: formData.paid_date || null,
                status: formData.status,
                notes: formData.notes || "",
                payment_method: formData.payment_method,
            };

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            let data = {};
            try {
                data = await res.json();
            } catch {}

            if (!res.ok) {
                const backendErrors = data?.errors;
                if (backendErrors && typeof backendErrors === "object") {
                    const f = {};
                    Object.entries(backendErrors).forEach(([k, v]) => {
                        f[k] = Array.isArray(v) ? v.join(" ") : String(v);
                    });
                    setErrors(f);
                }
                throw new Error(data?.message || "فشل حفظ الدفعة.");
            }

            toast.success(
                data?.message ||
                    (isEditMode
                        ? "تم تحديث الدفعة."
                        : "تم إنشاء الدفعة.")
            );

            if (onSuccess) onSuccess(data?.payment || data);
            if (onClose) onClose();
        } catch (err) {
            console.error("Save payment error:", err);
            toast.error(err.message || "حدث خطأ.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (name) => {
        const hasError = Boolean(errors[name]);
        return `w-full rounded-lg border border-gray-200 border-r-4 ${
            hasError ? "border-r-red-500" : "border-r-[#a47d52]"
        } bg-white px-4 py-3 outline-none transition-all duration-200 focus:border-[#a47d52] focus:ring-2 focus:ring-[#a47d52]/10`;
    };

    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
            <Toaster position="top-center" reverseOrder={false} />

            <div className="w-full max-w-3xl max-h-[95vh] bg-[#f8f7f5] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* HEADER */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                            <FaMoneyBillWave size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-800">
                                {isEditMode
                                    ? "تعديل الدفعة"
                                    : "إضافة دفعة جديدة"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                {isDeposit
                                    ? "دفعة تأمين"
                                    : "دفعة قسط شهري"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                    >
                        <MdClose size={24} />
                    </button>
                </div>

                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    onKeyDown={handleKeyDown}
                    className="flex flex-col flex-1 min-h-0"
                >
                    <div className="overflow-y-auto p-6 flex-1 space-y-6">
                        <section className="bg-white border border-gray-200 rounded-xl p-5">
                            <h3 className="font-extrabold text-gray-800 mb-3">
                                نوع الدفعة
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        handlePaymentTypeChange("installment")
                                    }
                                    disabled={loading}
                                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-extrabold border-2 transition-all cursor-pointer ${
                                        !isDeposit
                                            ? "bg-gradient-to-l from-[#b88d63]/40 to-[#a47d52] text-white border-[#a47d52]"
                                            : "bg-white text-gray-700 border-gray-200 hover:border-[#a47d52]"
                                    }`}
                                >
                                    <FaHandHoldingUsd />
                                    قسط شهري
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        handlePaymentTypeChange("deposit")
                                    }
                                    disabled={loading}
                                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-extrabold border-2 transition-all cursor-pointer ${
                                        isDeposit
                                            ? "bg-[#a47d52] text-white border-[#a47d52]"
                                            : "bg-white text-gray-700 border-gray-200 hover:border-[#a47d52]"
                                    }`}
                                >
                                    <FaMoneyCheckAlt />
                                    مبلغ تأمين
                                </button>
                            </div>
                        </section>

                        <section className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                                    <FaBuilding size={16} />
                                </div>
                                <h3 className="font-extrabold text-gray-800">
                                    العقد
                                </h3>
                            </div>

                            {selectedRent ? (
                                <div className="rounded-lg bg-[#a47d52]/10 border border-[#a47d52]/30 p-4 flex items-start justify-between gap-4">
                                    <div>
                                        <p className="font-extrabold text-gray-800">
                                            {getRentLabel(selectedRent)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {selectedRent.start_date} →{" "}
                                            {selectedRent.end_date}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearRent}
                                        disabled={loading}
                                        className="text-red-500 hover:text-red-700 cursor-pointer font-bold text-xs"
                                    >
                                        تغيير
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative mb-3">
                                        <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            value={rentSearch}
                                            onChange={(e) =>
                                                setRentSearch(e.target.value)
                                            }
                                            placeholder="بحث عن عقد..."
                                            className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10"
                                        />
                                    </div>
                                    <div className="border border-green-100 bg-green-100 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                                        {loadingRents ? (
                                            <p className="text-center py-6 text-gray-500">
                                                جاري التحميل...
                                            </p>
                                        ) : filteredRents.length === 0 ? (
                                            <p className="text-center py-6 text-gray-500">
                                                لا توجد نتائج
                                            </p>
                                        ) : (
                                            <ul>
                                                {filteredRents.map((r) => (
                                                    <li
                                                        key={r.id}
                                                        onClick={() =>
                                                            handleSelectRent(r)
                                                        }
                                                        className="cursor-pointer border-t border-gray-100 hover:bg-[#f8f7f5] p-3 flex items-center justify-between"
                                                    >
                                                        <span className="font-bold text-gray-800 truncate">
                                                            {getRentLabel(r)}
                                                        </span>
                                                        <FaCheck className="text-green-600" />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </>
                            )}
                            {errors.rent && (
                                <p className="text-red-500 text-xs mt-2">
                                    {errors.rent}
                                </p>
                            )}
                        </section>

                        <section className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                                    <FaCalendarAlt size={16} />
                                </div>
                                <h3 className="font-extrabold text-gray-800">
                                    تفاصيل الدفعة
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block mb-2 font-bold text-gray-700">
                                        الشهر
                                    </label>
                                    <select
                                        name="month"
                                        value={formData.month}
                                        onChange={handleMonthChange}
                                        disabled={loading}
                                        className={inputClass("month")}
                                    >
                                        <option value="">اختر الشهر...</option>
                                        {MONTHS.map((m) => (
                                            <option key={m.value} value={m.value}>
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.month && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.month}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block mb-2 font-bold text-gray-700">
                                        الحالة
                                    </label>
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className={inputClass("status")}
                                    >
                                        <option value="paid">كامل</option>
                                        <option value="partial">جزئي</option>
                                    </select>
                                </div>

                                {!isDeposit && (
                                    <>
                                        <div>
                                            <label className="block mb-2 font-bold text-gray-700">
                                                المبلغ المستحق
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                name="amount_due"
                                                // ✅ FIXED: Changed to formData.amount_due
                                                value={formData.amount_due}
                                                onChange={handleChange}
                                                disabled={loading}
                                                placeholder="0.00"
                                                className={inputClass(
                                                    "amount_due"
                                                )}
                                            />
                                            {errors.amount_due && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {errors.amount_due}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block mb-2 font-bold text-gray-700">
                                                المبلغ المدفوع
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                name="amount_paid"
                                                value={formData.amount_paid}
                                                onChange={handleChange}
                                                disabled={loading}
                                                placeholder="0.00"
                                                className={inputClass(
                                                    "amount_paid"
                                                )}
                                            />
                                            {errors.amount_paid && (
                                                <p className="text-red-500 text-xs mt-1">
                                                    {errors.amount_paid}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {isDeposit && (
                                    <div className="md:col-span-2">
                                        <label className="block mb-2 font-bold text-gray-700">
                                            مبلغ التأمين
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            name="security_deposit"
                                            value={
                                                formData.security_deposit
                                            }
                                            onChange={handleChange}
                                            disabled={loading}
                                            placeholder="0.00"
                                            className={inputClass(
                                                "security_deposit"
                                            )}
                                        />
                                        {errors.security_deposit && (
                                            <p className="text-red-500 text-xs mt-1">
                                                {errors.security_deposit}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block mb-2 font-bold text-gray-700">
                                        تاريخ الاستحقاق
                                    </label>
                                    <input
                                        type="date"
                                        name="due_date"
                                        value={formData.due_date}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className={inputClass("due_date")}
                                    />
                                </div>

                                <div>
                                    <label className="block mb-2 font-bold text-gray-700">
                                        تاريخ الدفع
                                    </label>
                                    <input
                                        type="date"
                                        name="paid_date"
                                        value={formData.paid_date}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className={inputClass("paid_date")}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block mb-2 font-bold text-gray-700">
                                        ملاحظات
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        disabled={loading}
                                        rows={2}
                                        className={inputClass("notes")}
                                        placeholder="ملاحظات إضافية..."
                                    />
                                </div>

                                {!isDeposit && (
                                    <div className="md:col-span-2">
                                        <div className="rounded-lg border border-[#a47d52]/30 bg-[#a47d52]/5 p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-extrabold text-gray-800 text-sm">
                                                    المبلغ المتبقي
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    يُحسب تلقائياً: المستحق −
                                                    المدفوع
                                                </p>
                                            </div>
                                            <span
                                                className="text-2xl font-extrabold text-[#a47d52]"
                                                dir="ltr"
                                            >
                                                {computedRemaining ?? "—"}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="bg-white border border-gray-200 rounded-xl p-5">
                            <h3 className="font-extrabold text-gray-800 mb-3">
                                طريقة الدفع
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {PAYMENT_METHODS.map((m) => {
                                    const active =
                                        formData.payment_method === m.value;
                                    return (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() =>
                                                handleSelectPaymentMethod(
                                                    m.value
                                                )
                                            }
                                            disabled={loading}
                                            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-extrabold border-2 transition-all cursor-pointer ${
                                                active
                                                    ? `${m.bg} ${m.color} border-current`
                                                    : "bg-white text-gray-600 border-gray-200 hover:border-[#a47d52]"
                                            }`}
                                        >
                                            <span className="text-lg">
                                                {m.icon}
                                            </span>
                                            {m.label}
                                        </button>
                                    );
                                })}
                            </div>
                            {errors.payment_method && (
                                <p className="text-red-500 text-xs mt-2">
                                    {errors.payment_method}
                                </p>
                            )}
                        </section>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 border-t border-gray-200 p-6 bg-white shrink-0">
                        <button
                            type="submit"
                            data-submit="true"
                            disabled={loading}
                            className="flex-5 flex items-center justify-center gap-2 cursor-pointer font-extrabold bg-gradient-to-l from-[#b88d63]/40 to-[#a47d52] text-white px-6 py-3 rounded-lg transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] disabled:opacity-50"
                        >
                            <FaSave size={18} />
                            {loading
                                ? "جاري الحفظ..."
                                : isEditMode
                                ? "حفظ التعديلات"
                                : "حفظ الدفعة"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 cursor-pointer font-extrabold bg-gray-300 text-red-600 px-6 py-3 rounded-lg transition-all hover:bg-gray-400 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <MdClose size={20} />
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddMonthlyPayment;


// import React, { useEffect, useMemo, useState } from "react";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// import {
//     FaSave,
//     FaUserTie,
//     FaBuilding,
//     FaCalendarAlt,
//     FaMoneyBillWave,
//     FaSearch,
//     FaCheck,
//     FaUser,
//     FaPhone,
//     FaEnvelope,
//     FaMapMarkerAlt,
// } from "react-icons/fa";

// import { MdClose } from "react-icons/md";

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// const RentAddEdit = ({ rent = null, onClose, onSuccess }) => {
//     const isEditMode = Boolean(rent?.id);

//     /* =========================================================
//        STATE
//     ========================================================= */

//     const [formData, setFormData] = useState({
//         rental_name: rent?.rental_name?.id ?? rent?.rental_name ?? "",
//         unit_name: rent?.unit_name?.id ?? rent?.unit_name ?? "",
//         start_date: rent?.start_date ?? "",
//         end_date: rent?.end_date ?? "",
//         installment_no: rent?.installment_no ?? "",
//     });

//     const [errors, setErrors] = useState({});
//     const [loading, setLoading] = useState(false);

//     // Data lists
//     const [rentals, setRentals] = useState([]);
//     const [units, setUnits] = useState([]);

//     const [loadingRentals, setLoadingRentals] = useState(true);
//     const [loadingUnits, setLoadingUnits] = useState(true);

//     // Search inputs
//     const [rentalSearch, setRentalSearch] = useState("");
//     const [unitSearch, setUnitSearch] = useState("");

//     /* =========================================================
//        FETCH RENTALS
//     ========================================================= */

//     useEffect(() => {
//         let cancelled = false;

//         const fetchRentals = async () => {
//             setLoadingRentals(true);

//             try {
//                 const token = localStorage.getItem("access_token");

//                 const res = await fetch(`${BASE}/api/rentals/`, {
//                     method: "GET",
//                     headers: {
//                         "Content-Type": "application/json",
//                         Authorization: `Bearer ${token}`,
//                     },
//                 });

//                 if (!res.ok) throw new Error("فشل تحميل المستأجرين");

//                 const data = await res.json();

//                 let list = [];
//                 if (Array.isArray(data)) list = data;
//                 else if (Array.isArray(data.results)) list = data.results;
//                 else if (Array.isArray(data.rentals)) list = data.rentals;

//                 if (!cancelled) setRentals(list);
//             } catch (err) {
//                 console.error("Fetch rentals error:", err);
//                 if (!cancelled)
//                     toast.error("❌ فشل تحميل قائمة المستأجرين");
//             } finally {
//                 if (!cancelled) setLoadingRentals(false);
//             }
//         };

//         fetchRentals();

//         return () => {
//             cancelled = true;
//         };
//     }, []);

//     /* =========================================================
//        FETCH UNITS
//     ========================================================= */

//     useEffect(() => {
//         let cancelled = false;

//         const fetchUnits = async () => {
//             setLoadingUnits(true);

//             try {
//                 const token = localStorage.getItem("access_token");

//                 const res = await fetch(`${BASE}/api/units/`, {
//                     method: "GET",
//                     headers: {
//                         "Content-Type": "application/json",
//                         Authorization: `Bearer ${token}`,
//                     },
//                 });

//                 if (!res.ok) throw new Error("فشل تحميل الوحدات");

//                 const data = await res.json();

//                 let list = [];
//                 if (Array.isArray(data)) list = data;
//                 else if (Array.isArray(data.results)) list = data.results;
//                 else if (Array.isArray(data.units)) list = data.units;

//                 if (!cancelled) setUnits(list);
//             } catch (err) {
//                 console.error("Fetch units error:", err);
//                 if (!cancelled)
//                     toast.error("❌ فشل تحميل قائمة الوحدات");
//             } finally {
//                 if (!cancelled) setLoadingUnits(false);
//             }
//         };

//         fetchUnits();

//         return () => {
//             cancelled = true;
//         };
//     }, []);

//     /* =========================================================
//        HELPERS — RENTAL / UNIT / BUILDING / OWNER
//     ========================================================= */

//     const getRentalName = (r) =>
//         r?.name ||
//         r?.rental_name ||
//         r?.tenant_name ||
//         `#${r?.id ?? "-"}`;

//     const getRentalNationality = (r) =>
//         r?.nationality || r?.nationality_name || "-";

//     const getRentalPhone = (r) => r?.phone_1 || r?.phone || "-";

//     const getRentalEmail = (r) => r?.email || "-";

//     const getUnitName = (u) => u?.name || `Unit #${u?.id ?? "-"}`;

//     const getUnitPrice = (u) => u?.price;

//     const getUnitSecurityDeposit = (u) => u?.security_deposit;

//     const getUnitBuilding = (u) => {
//         // Unit.category is a Building
//         const category = u?.category_details || u?.category;

//         if (!category) return null;

//         if (typeof category === "string") return { name: category };

//         return category;
//     };

//     const getBuildingName = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";
//         return b.name || `Building #${b.id ?? "-"}`;
//     };

//     const getBuildingType = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";

//         const map = { building: "عمارة", vila: "فيلا" };
//         return map[b.type] || b.type || "-";
//     };

//     const getBuildingStatus = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";

//         const map = { residential: "سكني", commercial: "تجاري" };
//         return map[b.status] || b.status || "-";
//     };

//     const getBuildingLocation = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";
//         return b.location || "-";
//     };

//     const getBuildingArea = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";
//         return b.area || "-";
//     };

//     const getBuildingOwner = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return null;

//         const owner = b.owner_details || b.owner;
//         if (!owner) return null;
//         if (typeof owner === "string") return { name: owner };
//         return owner;
//     };

//     const getOwnerName = (u) => {
//         const o = getBuildingOwner(u);
//         if (!o) return "-";
//         return o.name || o.full_name || o.owner_name || "-";
//     };

//     const getOwnerPhone = (u) => {
//         const o = getBuildingOwner(u);
//         if (!o) return "-";
//         return o.phone || o.phone_1 || o.mobile || "-";
//     };

//     const getOwnerAddress = (u) => {
//         const o = getBuildingOwner(u);
//         if (!o) return "-";
//         return o.address || "-";
//     };

//     /* =========================================================
//        SELECTED OBJECTS
//     ========================================================= */

//     const selectedRental = useMemo(() => {
//         if (!formData.rental_name) return null;
//         return (
//             rentals.find(
//                 (r) => String(r.id) === String(formData.rental_name)
//             ) || null
//         );
//     }, [rentals, formData.rental_name]);

//     const selectedUnit = useMemo(() => {
//         if (!formData.unit_name) return null;
//         return (
//             units.find(
//                 (u) => String(u.id) === String(formData.unit_name)
//             ) || null
//         );
//     }, [units, formData.unit_name]);

//     /* =========================================================
//        FILTERED LISTS
//     ========================================================= */

//     const filteredRentals = useMemo(() => {
//         const s = rentalSearch.trim().toLowerCase();
//         if (!s) return rentals;

//         return rentals.filter((r) => {
//             return (
//                 String(getRentalName(r)).toLowerCase().includes(s) ||
//                 String(getRentalNationality(r)).toLowerCase().includes(s) ||
//                 String(getRentalPhone(r)).toLowerCase().includes(s) ||
//                 String(getRentalEmail(r)).toLowerCase().includes(s)
//             );
//         });
//     }, [rentals, rentalSearch]);

//     const filteredUnits = useMemo(() => {
//         const s = unitSearch.trim().toLowerCase();
//         if (!s) return units;

//         return units.filter((u) => {
//             return (
//                 String(getUnitName(u)).toLowerCase().includes(s) ||
//                 String(getBuildingName(u)).toLowerCase().includes(s) ||
//                 String(getBuildingLocation(u)).toLowerCase().includes(s)
//             );
//         });
//     }, [units, unitSearch]);

//     /* =========================================================
//        CHANGE HANDLERS
//     ========================================================= */

//     const handleChange = (e) => {
//         const { name, value } = e.target;

//         // When the unit changes, auto-fill installment_no with the unit price
//         if (name === "unit_name") {
//             const unit = units.find(
//                 (u) => String(u.id) === String(value)
//             );

//             setFormData((prev) => ({
//                 ...prev,
//                 unit_name: value,
//                 installment_no:
//                     unit?.price ?? prev.installment_no ?? "",
//             }));

//             setErrors((prev) => ({ ...prev, unit_name: "", installment_no: "" }));
//             return;
//         }

//         setFormData((prev) => ({ ...prev, [name]: value }));
//         setErrors((prev) => ({ ...prev, [name]: "" }));
//     };

//     const handleSelectRental = (rental) => {
//         setFormData((prev) => ({
//             ...prev,
//             rental_name: rental.id,
//         }));
//         setErrors((prev) => ({ ...prev, rental_name: "" }));
//     };

//     const handleSelectUnit = (unit) => {
//         setFormData((prev) => ({
//             ...prev,
//             unit_name: unit.id,
//             installment_no:
//                 unit?.price ?? prev.installment_no ?? "",
//         }));
//         setErrors((prev) => ({
//             ...prev,
//             unit_name: "",
//             installment_no: "",
//         }));
//     };

//     const handleClearRental = () => {
//         setFormData((prev) => ({ ...prev, rental_name: "" }));
//     };

//     const handleClearUnit = () => {
//         setFormData((prev) => ({
//             ...prev,
//             unit_name: "",
//             installment_no: "",
//         }));
//     };

//     /* =========================================================
//        VALIDATION
//     ========================================================= */

//     const validateForm = () => {
//         const newErrors = {};

//         if (!formData.rental_name) {
//             newErrors.rental_name = "يرجى اختيار المستأجر.";
//         }

//         if (!formData.unit_name) {
//             newErrors.unit_name = "يرجى اختيار الوحدة.";
//         }

//         if (!formData.start_date) {
//             newErrors.start_date = "تاريخ البداية مطلوب.";
//         }

//         if (!formData.end_date) {
//             newErrors.end_date = "تاريخ النهاية مطلوب.";
//         }

//         if (
//             formData.start_date &&
//             formData.end_date &&
//             formData.end_date < formData.start_date
//         ) {
//             newErrors.end_date =
//                 "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.";
//         }

//         if (
//             formData.installment_no !== "" &&
//             Number(formData.installment_no) < 0
//         ) {
//             newErrors.installment_no =
//                 "قيمة القسط لا يمكن أن تكون سالبة.";
//         }

//         setErrors(newErrors);

//         if (Object.keys(newErrors).length > 0) {
//             toast.error("يرجى مراجعة البيانات المدخلة.");
//             return false;
//         }

//         return true;
//     };

//     /* =========================================================
//        SUBMIT
//     ========================================================= */

//     const handleSubmit = async (e) => {
//         e.preventDefault();

//         if (!validateForm()) return;

//         setLoading(true);

//         try {
//             const token = localStorage.getItem("access_token");

//             const url = isEditMode
//                 ? `${BASE}/api/rents/${rent.id}/update/`
//                 : `${BASE}/api/rents/create/`;

//             const method = isEditMode ? "PATCH" : "POST";

//             const response = await fetch(url, {
//                 method,
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`,
//                 },
//                 body: JSON.stringify(formData),
//             });

//             let responseData = {};
//             try {
//                 responseData = await response.json();
//             } catch {
//                 responseData = {};
//             }

//             if (!response.ok) {
//                 console.error("Save rent error:", responseData);

//                 const backendErrors = responseData?.errors;
//                 if (backendErrors && typeof backendErrors === "object") {
//                     const formatted = {};
//                     Object.entries(backendErrors).forEach(([k, v]) => {
//                         formatted[k] = Array.isArray(v)
//                             ? v.join(" ")
//                             : String(v);
//                     });
//                     setErrors(formatted);
//                 }

//                 throw new Error(
//                     responseData?.message || "فشل حفظ العقد."
//                 );
//             }

//             toast.success(
//                 responseData?.message ||
//                     (isEditMode
//                         ? "تم تحديث العقد بنجاح."
//                         : "تم إنشاء العقد بنجاح.")
//             );

//             if (onSuccess) onSuccess(responseData?.rent || responseData);
//             if (onClose) onClose();
//         } catch (err) {
//             console.error("Save rent failed:", err);
//             toast.error(err.message || "حدث خطأ أثناء حفظ العقد.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     /* =========================================================
//        STYLE HELPERS
//     ========================================================= */

//     const inputClass = (fieldName) => {
//         const hasError = Boolean(errors[fieldName]);
//         return `
//             w-full rounded-lg border border-gray-200 border-r-4
//             ${hasError ? "border-r-red-500" : "border-r-[#a47d52]"}
//             bg-white px-4 py-3 outline-none transition-all duration-200
//             focus:border-[#a47d52] focus:ring-2 focus:ring-[#a47d52]/10
//         `;
//     };

//     /* =========================================================
//        RENDER
//     ========================================================= */

//     return (
//         <div
//             dir="rtl"
//             className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
//         >
//             <div className="w-full max-w-5xl max-h-[95vh] bg-[#f8f7f5] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
//                 {/* HEADER */}
//                 <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
//                     <div className="flex items-center gap-3">
//                         <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
//                             <FaBuilding size={22} />
//                         </div>
//                         <div>
//                             <h2 className="text-xl font-extrabold text-gray-800">
//                                 {isEditMode
//                                     ? "تعديل عقد الإيجار"
//                                     : "إضافة عقد إيجار جديد"}
//                             </h2>
//                             <p className="text-sm text-gray-500 mt-1">
//                                 بيانات المستأجر والوحدة وتفاصيل العقد
//                             </p>
//                         </div>
//                     </div>
//                     <button
//                         type="button"
//                         onClick={onClose}
//                         disabled={loading}
//                         className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
//                     >
//                         <MdClose size={24} />
//                     </button>
//                 </div>

//                 {/* FORM */}
//                 <form
//                     onSubmit={handleSubmit}
//                     className="flex flex-col flex-1 min-h-0"
//                 >
//                     <div className="overflow-y-auto p-6 flex-1 space-y-6">
//                         {/* ============ RENTAL SECTION ============ */}
//                         <section className="bg-white border border-gray-200 rounded-xl p-5">
//                             <div className="flex items-center gap-3 mb-4">
//                                 <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
//                                     <FaUserTie size={16} />
//                                 </div>
//                                 <h3 className="font-extrabold text-gray-800">
//                                     المستأجر
//                                 </h3>
//                             </div>

//                             {selectedRental ? (
//                                 <div className="rounded-lg bg-[#a47d52]/10 border border-[#a47d52]/30 p-4">
//                                     <div className="flex items-start justify-between gap-4">
//                                         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
//                                             <InfoRow
//                                                 icon={<FaUser />}
//                                                 label="الاسم"
//                                                 value={getRentalName(
//                                                     selectedRental
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 icon={<FaMapMarkerAlt />}
//                                                 label="الجنسية"
//                                                 value={getRentalNationality(
//                                                     selectedRental
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 icon={<FaPhone />}
//                                                 label="الهاتف"
//                                                 value={getRentalPhone(
//                                                     selectedRental
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 icon={<FaEnvelope />}
//                                                 label="البريد"
//                                                 value={getRentalEmail(
//                                                     selectedRental
//                                                 )}
//                                             />
//                                         </div>

//                                         <button
//                                             type="button"
//                                             onClick={handleClearRental}
//                                             disabled={loading}
//                                             className="text-red-500 hover:text-red-700 cursor-pointer font-bold text-xs"
//                                         >
//                                             تغيير
//                                         </button>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <RentalPicker
//                                     search={rentalSearch}
//                                     setSearch={setRentalSearch}
//                                     loading={loadingRentals}
//                                     list={filteredRentals}
//                                     onSelect={handleSelectRental}
//                                     getName={getRentalName}
//                                     getNat={getRentalNationality}
//                                     getPhone={getRentalPhone}
//                                     getEmail={getRentalEmail}
//                                 />
//                             )}

//                             {errors.rental_name && (
//                                 <p className="text-red-500 text-xs mt-2">
//                                     {errors.rental_name}
//                                 </p>
//                             )}
//                         </section>

//                         {/* ============ UNIT SECTION ============ */}
//                         <section className="bg-white border border-gray-200 rounded-xl p-5">
//                             <div className="flex items-center gap-3 mb-4">
//                                 <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
//                                     <FaBuilding size={16} />
//                                 </div>
//                                 <h3 className="font-extrabold text-gray-800">
//                                     الوحدة
//                                 </h3>
//                             </div>

//                             {selectedUnit ? (
//                                 <div className="space-y-4">
//                                     {/* Unit info */}
//                                     <div className="rounded-lg bg-[#a47d52]/10 border border-[#a47d52]/30 p-4">
//                                         <div className="flex items-start justify-between gap-4">
//                                             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
//                                                 <InfoRow
//                                                     label="اسم الوحدة"
//                                                     value={getUnitName(
//                                                         selectedUnit
//                                                     )}
//                                                 />
//                                                 <InfoRow
//                                                     label="السعر"
//                                                     value={
//                                                         getUnitPrice(
//                                                             selectedUnit
//                                                         ) ?? "-"
//                                                     }
//                                                 />
//                                                 <InfoRow
//                                                     label="مبلغ التأمين"
//                                                     value={
//                                                         getUnitSecurityDeposit(
//                                                             selectedUnit
//                                                         ) ?? "-"
//                                                     }
//                                                 />
//                                                 <InfoRow
//                                                     label="الحالة"
//                                                     value={
//                                                         selectedUnit.status ||
//                                                         "-"
//                                                     }
//                                                 />
//                                             </div>

//                                             <button
//                                                 type="button"
//                                                 onClick={handleClearUnit}
//                                                 disabled={loading}
//                                                 className="text-red-500 hover:text-red-700 cursor-pointer font-bold text-xs"
//                                             >
//                                                 تغيير
//                                             </button>
//                                         </div>
//                                     </div>

//                                     {/* Building / Owner info (read-only) */}
//                                     <div className="rounded-lg border border-gray-200 p-4">
//                                         <h4 className="font-extrabold text-gray-700 mb-3 text-sm">
//                                             بيانات البناية والمالك
//                                         </h4>
//                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                                             <InfoRow
//                                                 label="البناية"
//                                                 value={getBuildingName(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="النوع"
//                                                 value={getBuildingType(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="التصنيف"
//                                                 value={getBuildingStatus(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="الموقع"
//                                                 value={getBuildingLocation(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="المنطقة"
//                                                 value={getBuildingArea(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="المالك"
//                                                 value={getOwnerName(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="هاتف المالك"
//                                                 value={getOwnerPhone(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="عنوان المالك"
//                                                 value={getOwnerAddress(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                         </div>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <UnitPicker
//                                     search={unitSearch}
//                                     setSearch={setUnitSearch}
//                                     loading={loadingUnits}
//                                     list={filteredUnits}
//                                     onSelect={handleSelectUnit}
//                                     getName={getUnitName}
//                                     getPrice={getUnitPrice}
//                                     getBuilding={getBuildingName}
//                                     getLocation={getBuildingLocation}
//                                 />
//                             )}

//                             {errors.unit_name && (
//                                 <p className="text-red-500 text-xs mt-2">
//                                     {errors.unit_name}
//                                 </p>
//                             )}
//                         </section>

//                         {/* ============ CONTRACT DETAILS ============ */}
//                         <section className="bg-white border border-gray-200 rounded-xl p-5">
//                             <div className="flex items-center gap-3 mb-4">
//                                 <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
//                                     <FaCalendarAlt size={16} />
//                                 </div>
//                                 <h3 className="font-extrabold text-gray-800">
//                                     تفاصيل العقد
//                                 </h3>
//                             </div>

//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//                                 <div>
//                                     <label className="block mb-2 font-bold text-gray-700">
//                                         تاريخ البداية
//                                     </label>
//                                     <input
//                                         type="date"
//                                         name="start_date"
//                                         value={formData.start_date}
//                                         onChange={handleChange}
//                                         disabled={loading}
//                                         className={inputClass("start_date")}
//                                     />
//                                     {errors.start_date && (
//                                         <p className="text-red-500 text-xs mt-1">
//                                             {errors.start_date}
//                                         </p>
//                                     )}
//                                 </div>

//                                 <div>
//                                     <label className="block mb-2 font-bold text-gray-700">
//                                         تاريخ النهاية
//                                     </label>
//                                     <input
//                                         type="date"
//                                         name="end_date"
//                                         value={formData.end_date}
//                                         onChange={handleChange}
//                                         disabled={loading}
//                                         className={inputClass("end_date")}
//                                     />
//                                     {errors.end_date && (
//                                         <p className="text-red-500 text-xs mt-1">
//                                             {errors.end_date}
//                                         </p>
//                                     )}
//                                 </div>

//                                 <div className="md:col-span-2">
//                                     <label className="block mb-2 font-bold text-gray-700">
//                                         قيمة القسط (Installment)
//                                     </label>
//                                     <div className="relative">
//                                         <FaMoneyBillWave className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47d52]" />
//                                         <input
//                                             type="number"
//                                             min="0"
//                                             step="0.01"
//                                             name="installment_no"
//                                             value={formData.installment_no}
//                                             onChange={handleChange}
//                                             disabled={loading}
//                                             placeholder="0.00"
//                                             className={`${inputClass(
//                                                 "installment_no"
//                                             )} pr-12`}
//                                         />
//                                     </div>
//                                     {errors.installment_no && (
//                                         <p className="text-red-500 text-xs mt-1">
//                                             {errors.installment_no}
//                                         </p>
//                                     )}
//                                     <p className="text-xs text-gray-400 mt-1">
//                                         يتم تعبئتها تلقائياً من سعر الوحدة،
//                                         ويمكنك تعديلها.
//                                     </p>
//                                 </div>
//                             </div>
//                         </section>
//                     </div>

//                     {/* FOOTER */}
//                     <div className="flex flex-col md:flex-row gap-3 border-t border-gray-200 p-6 bg-white shrink-0">
//                         <button
//                             type="submit"
//                             disabled={loading}
//                             className="flex-1 flex items-center justify-center gap-2 cursor-pointer font-extrabold bg-[#a47d52] text-white px-6 py-3 rounded-lg transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
//                         >
//                             <FaSave size={18} />
//                             {loading
//                                 ? "جاري الحفظ..."
//                                 : isEditMode
//                                 ? "حفظ التعديلات"
//                                 : "حفظ العقد"}
//                         </button>

//                         <button
//                             type="button"
//                             onClick={onClose}
//                             disabled={loading}
//                             className="flex-1 cursor-pointer font-extrabold bg-gray-300 text-red-600 px-6 py-3 rounded-lg transition-all duration-300 hover:bg-gray-400 disabled:opacity-50 flex items-center justify-center gap-2"
//                         >
//                             <MdClose size={20} />
//                             إلغاء
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// /* ============================================================
//    SMALL PRESENTATIONAL SUB-COMPONENTS
//    ============================================================ */

// const InfoRow = ({ icon, label, value }) => (
//     <div className="flex items-center gap-2">
//         {icon && <span className="text-[#a47d52]">{icon}</span>}
//         <span className="text-xs text-gray-500 font-bold">{label}:</span>
//         <span className="text-sm text-gray-800 font-bold truncate" dir="auto">
//             {value || "-"}
//         </span>
//     </div>
// );

// const RentalPicker = ({
//     search,
//     setSearch,
//     loading,
//     list,
//     onSelect,
//     getName,
//     getNat,
//     getPhone,
//     getEmail,
// }) => (
//     <>
//         <div className="relative mb-3">
//             <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
//             <input
//                 type="text"
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="بحث بالاسم أو الجنسية أو الهاتف أو البريد..."
//                 disabled={loading}
//                 className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52]"
//             />
//         </div>

//         <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
//             {loading ? (
//                 <p className="text-center py-8 text-gray-500">
//                     جاري التحميل...
//                 </p>
//             ) : list.length === 0 ? (
//                 <p className="text-center py-8 text-gray-500">
//                     لا توجد نتائج
//                 </p>
//             ) : (
//                 <ul>
//                     {list.map((r) => (
//                         <li
//                             key={r.id}
//                             onClick={() => onSelect(r)}
//                             className="cursor-pointer border-t border-gray-100 hover:bg-[#f8f7f5] p-3 flex items-center justify-between gap-3"
//                         >
//                             <div className="flex-1 min-w-0">
//                                 <p className="font-extrabold text-gray-800 truncate">
//                                     {getName(r)}
//                                 </p>
//                                 <p className="text-xs text-gray-500 truncate mt-1">
//                                     {getNat(r)} — {getPhone(r)} — {getEmail(r)}
//                                 </p>
//                             </div>
//                             <FaCheck className="text-[#a47d52]" />
//                         </li>
//                     ))}
//                 </ul>
//             )}
//         </div>
//     </>
// );

// const UnitPicker = ({
//     search,
//     setSearch,
//     loading,
//     list,
//     onSelect,
//     getName,
//     getPrice,
//     getBuilding,
//     getLocation,
// }) => (
//     <>
//         <div className="relative mb-3">
//             <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
//             <input
//                 type="text"
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="بحث باسم الوحدة أو البناية أو الموقع..."
//                 disabled={loading}
//                 className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52]"
//             />
//         </div>

//         <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
//             {loading ? (
//                 <p className="text-center py-8 text-gray-500">
//                     جاري التحميل...
//                 </p>
//             ) : list.length === 0 ? (
//                 <p className="text-center py-8 text-gray-500">
//                     لا توجد نتائج
//                 </p>
//             ) : (
//                 <ul>
//                     {list.map((u) => (
//                         <li
//                             key={u.id}
//                             onClick={() => onSelect(u)}
//                             className="cursor-pointer border-t border-gray-100 hover:bg-[#f8f7f5] p-3 flex items-center justify-between gap-3"
//                         >
//                             <div className="flex-1 min-w-0">
//                                 <p className="font-extrabold text-gray-800 truncate">
//                                     {getName(u)}
//                                 </p>
//                                 <p className="text-xs text-gray-500 truncate mt-1">
//                                     {getBuilding(u)} — {getLocation(u)}
//                                 </p>
//                             </div>
//                             <div className="flex items-center gap-3">
//                                 <span
//                                     className="text-xs font-bold text-green-700"
//                                     dir="ltr"
//                                 >
//                                     {getPrice(u) ?? "-"}
//                                 </span>
//                                 <FaCheck className="text-[#a47d52]" />
//                             </div>
//                         </li>
//                     ))}
//                 </ul>
//             )}
//         </div>
//     </>
// );


// export default RentAddEdit;