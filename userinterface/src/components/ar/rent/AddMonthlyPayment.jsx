import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    FaMobileAlt,
    FaWallet,
} from "react-icons/fa";

import { MdClose } from "react-icons/md";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

/* ============================================================
   PAYMENT METHOD OPTIONS (with logos/icons)
   ============================================================ */
const PAYMENT_METHODS = [
    {
        value: "cash",
        label: "نقداً",
        icon: <FaMoneyBillWave />,
        color: "text-green-700",
        bg: "bg-green-50 border-green-300",
    },
    {
        value: "card",
        label: "بطاقة",
        icon: <FaCreditCard />,
        color: "text-blue-700",
        bg: "bg-blue-50 border-blue-300",
    },
    {
        value: "bank_transfer",
        label: "تحويل بنكي",
        icon: <FaUniversity />,
        color: "text-indigo-700",
        bg: "bg-indigo-50 border-indigo-300",
    },
    {
        value: "cheque",
        label: "شيك",
        icon: <FaMoneyCheckAlt />,
        color: "text-amber-700",
        bg: "bg-amber-50 border-amber-300",
    },
    {
        value: "wallet",
        label: "محفظة إلكترونية",
        icon: <FaWallet />,
        color: "text-purple-700",
        bg: "bg-purple-50 border-purple-300",
    },
];

const AddMonthlyPayment = ({ payment = null, onClose, onSuccess }) => {
    const isEditMode = Boolean(payment?.id);

    /* =========================================================
       STATE
    ========================================================= */
    const [formData, setFormData] = useState({
        rent: payment?.rent?.id ?? payment?.rent ?? "",
        month: payment?.month ?? "",
        amount_due: payment?.amount_due ?? "",
        amount_paid: payment?.amount_paid ?? "",
        security_deposit: payment?.security_deposit ?? "",
        due_date: payment?.due_date ?? "",
        paid_date: payment?.paid_date ?? "",
        status: payment?.status ?? "pending",
        notes: payment?.notes ?? "",
        payment_method: payment?.payment_method ?? "cash",
        // UI-only: "installment" or "deposit"
        payment_type: payment?.payment_type ?? "installment",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const [rents, setRents] = useState([]);
    const [loadingRents, setLoadingRents] = useState(true);
    const [rentSearch, setRentSearch] = useState("");

    /* Refs for Enter-key navigation */
    const formRef = useRef(null);

    /* =========================================================
       FETCH RENTS
    ========================================================= */
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

    /* =========================================================
       HELPERS
    ========================================================= */
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

    /* =========================================================
       CHANGE HANDLERS
    ========================================================= */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleSelectRent = (rent) => {
        setFormData((prev) => ({
            ...prev,
            rent: rent.id,
            amount_due:
                prev.amount_due ||
                rent?.unit_price ||
                rent?.unit_name?.price ||
                "",
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
            // Reset conflicting amounts to prevent stale data
            ...(type === "deposit"
                ? {
                      amount_due: "",
                      amount_paid: "",
                      status: "paid",
                  }
                : {
                      security_deposit: "",
                      status: "pending",
                  }),
        }));
        setErrors({});
    };

    const handleSelectPaymentMethod = (value) => {
        setFormData((prev) => ({ ...prev, payment_method: value }));
    };

    /* =========================================================
       ENTER-KEY NAVIGATION
       Moves focus to the next focusable field inside the form.
       On the last field, submits the form.
    ========================================================= */
    const handleKeyDown = (e) => {
        if (e.key !== "Enter") return;

        // Do not hijack Enter on textarea (allow new lines)
        if (e.target.tagName === "TEXTAREA" && !e.shiftKey) {
            return;
        }

        e.preventDefault();

        const form = formRef.current;
        if (!form) return;

        const focusable = Array.from(
            form.querySelectorAll(
                'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[data-submit="true"]'
            )
        ).filter((el) => el.offsetParent !== null); // visible only

        const index = focusable.indexOf(e.target);
        if (index === -1) return;

        const next = focusable[index + 1];

        if (next && next.tagName !== "BUTTON") {
            next.focus();
            if (next.select) next.select();
        } else {
            // Reached the submit button (or nothing next) → submit
            form.requestSubmit();
        }
    };

    /* =========================================================
       VALIDATION
    ========================================================= */
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

    /* =========================================================
       SUBMIT
    ========================================================= */
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

    /* =========================================================
       STYLES
    ========================================================= */
    const inputClass = (name) => {
        const hasError = Boolean(errors[name]);
        return `w-full rounded-lg border border-gray-200 border-r-4 ${
            hasError ? "border-r-red-500" : "border-r-[#a47d52]"
        } bg-white px-4 py-3 outline-none transition-all duration-200 focus:border-[#a47d52] focus:ring-2 focus:ring-[#a47d52]/10`;
    };

    /* =========================================================
       RENDER
    ========================================================= */
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
                        {/* ============ PAYMENT TYPE SWITCH ============ */}
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
                                            ? "bg-[#a47d52] text-white border-[#a47d52]"
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

                        {/* ============ RENT PICKER ============ */}
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
                                    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
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
                                                        <FaCheck className="text-[#a47d52]" />
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

                        {/* ============ PAYMENT DETAILS ============ */}
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
                                    <input
                                        type="text"
                                        name="month"
                                        value={formData.month}
                                        onChange={handleChange}
                                        disabled={loading}
                                        placeholder="مثال: 2026-01"
                                        className={inputClass("month")}
                                    />
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
                                        <option value="pending">
                                            قيد الانتظار
                                        </option>
                                        <option value="paid">مدفوع</option>
                                        <option value="partial">جزئي</option>
                                        <option value="late">متأخر</option>
                                    </select>
                                </div>

                                {/* ---- INSTALLMENT FIELDS ---- */}
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

                                {/* ---- DEPOSIT FIELD (only in deposit mode) ---- */}
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

                                {/* ---- LIVE PREVIEW (installment only) ---- */}
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

                        {/* ============ PAYMENT METHOD ============ */}
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

                    {/* FOOTER */}
                    <div className="flex flex-col md:flex-row gap-3 border-t border-gray-200 p-6 bg-white shrink-0">
                        <button
                            type="submit"
                            data-submit="true"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 cursor-pointer font-extrabold bg-[#a47d52] text-white px-6 py-3 rounded-lg transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] disabled:opacity-50"
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