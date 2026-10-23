import { useState } from "react";
import { toast } from "react-toastify";
import { FaTimes, FaSave, FaPlus } from "react-icons/fa";
import { getAccessToken } from "../../../utils/auth";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const AddProperty = ({ onClose, onSuccess }) => {
    const [form, setForm] = useState({
        month: "",
        property_no: "",
        live_no: "",
        draft_no: "",
        sale_no: "",
        rent_no: "",
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    /* ---------- Change handler ---------- */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    /* ---------- Field error helper ---------- */
    const fieldError = (field) => {
        const e = errors[field];
        if (!e) return null;
        return Array.isArray(e) ? e[0] : String(e);
    };

    /* ---------- Submit ---------- */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        try {
            const token = getAccessToken();
            if (!token) {
                toast.error("يجب تسجيل الدخول أولاً");
                setSaving(false);
                return;
            }

            // Convert empty strings → null for integer fields
            const payload = {
                month: form.month || null,
                property_no: form.property_no !== "" ? Number(form.property_no) : null,
                live_no: form.live_no !== "" ? Number(form.live_no) : null,
                draft_no: form.draft_no !== "" ? Number(form.draft_no) : null,
                sale_no: form.sale_no !== "" ? Number(form.sale_no) : null,
                rent_no: form.rent_no !== "" ? Number(form.rent_no) : null,
            };

            const res = await fetch(`${BASE}/api/properties/create/`, {
                method: "POST",
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
                if (data?.errors) setErrors(data.errors);
                const firstField = data?.errors
                    ? Object.keys(data.errors)[0]
                    : null;
                const firstMsg = firstField
                    ? Array.isArray(data.errors[firstField])
                        ? data.errors[firstField][0]
                        : String(data.errors[firstField])
                    : null;
                throw new Error(
                    firstMsg || data?.message || "فشل إضافة العقار"
                );
            }

            toast.success(data?.message || "✅ تم إضافة العقار بنجاح");

            setForm({
                month: "",
                property_no: "",
                live_no: "",
                draft_no: "",
                sale_no: "",
                rent_no: "",
            });

            if (typeof onSuccess === "function") onSuccess(data?.property);
            else if (typeof onClose === "function") onClose();
        } catch (err) {
            console.error("Add property error:", err);
            toast.error(err.message || "❌ حدث خطأ أثناء الإضافة");
        } finally {
            setSaving(false);
        }
    };

    /* ---------- Shared input class ---------- */
    const inputClass =
        "w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 px-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52] text-sm font-bold text-gray-700 disabled:opacity-60";

    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !saving && onClose) onClose();
            }}
        >
            <div
                className="w-full max-w-lg bg-white rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.3)] overflow-hidden"
                style={{ animation: "modalIn 0.25s ease-out" }}
            >
                {/* Top bar */}
                <div className="h-1.5 bg-gradient-to-r from-[#a47d52] via-[#d4a574] to-[#a47d52]" />

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-[#f8f7f5] border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#a47d52]/10 text-[#a47d52] flex items-center justify-center">
                            <FaPlus size={14} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-800 text-lg">
                                إضافة عقار جديد
                            </h3>
                            <p className="text-xs text-gray-500">
                                أدخل بيانات العقار
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="w-9 h-9 rounded-full bg-white hover:bg-red-50 text-gray-500 hover:text-red-500 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Body */}
                <form
                    onSubmit={handleSubmit}
                    className="p-6 space-y-4 max-h-[65vh] overflow-y-auto"
                >
                    {/* Month */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            الشهر
                        </label>
                        <input
                            name="month"
                            type="text"
                            value={form.month}
                            onChange={handleChange}
                            disabled={saving}
                            placeholder="مثال: October"
                            className={inputClass}
                        />
                        {fieldError("month") && (
                            <p className="text-red-500 text-xs mt-1">
                                {fieldError("month")}
                            </p>
                        )}
                    </div>

                    {/* Grid for the rest */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                رقم العقار
                            </label>
                            <input
                                name="property_no"
                                type="number"
                                value={form.property_no}
                                onChange={handleChange}
                                disabled={saving}
                                placeholder="0"
                                className={inputClass}
                            />
                            {fieldError("property_no") && (
                                <p className="text-red-500 text-xs mt-1">
                                    {fieldError("property_no")}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                رقم Live
                            </label>
                            <input
                                name="live_no"
                                type="number"
                                value={form.live_no}
                                onChange={handleChange}
                                disabled={saving}
                                placeholder="0"
                                className={inputClass}
                            />
                            {fieldError("live_no") && (
                                <p className="text-red-500 text-xs mt-1">
                                    {fieldError("live_no")}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                رقم Draft
                            </label>
                            <input
                                name="draft_no"
                                type="number"
                                value={form.draft_no}
                                onChange={handleChange}
                                disabled={saving}
                                placeholder="0"
                                className={inputClass}
                            />
                            {fieldError("draft_no") && (
                                <p className="text-red-500 text-xs mt-1">
                                    {fieldError("draft_no")}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                رقم Sale
                            </label>
                            <input
                                name="sale_no"
                                type="number"
                                value={form.sale_no}
                                onChange={handleChange}
                                disabled={saving}
                                placeholder="0"
                                className={inputClass}
                            />
                            {fieldError("sale_no") && (
                                <p className="text-red-500 text-xs mt-1">
                                    {fieldError("sale_no")}
                                </p>
                            )}
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                رقم Rent
                            </label>
                            <input
                                name="rent_no"
                                type="number"
                                value={form.rent_no}
                                onChange={handleChange}
                                disabled={saving}
                                placeholder="0"
                                className={inputClass}
                            />
                            {fieldError("rent_no") && (
                                <p className="text-red-500 text-xs mt-1">
                                    {fieldError("rent_no")}
                                </p>
                            )}
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex flex-col md:flex-row gap-3 p-6 bg-[#f8f7f5] border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#a47d52] text-white font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
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
                                حفظ العقار
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                    >
                        إلغاء
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(15px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AddProperty;