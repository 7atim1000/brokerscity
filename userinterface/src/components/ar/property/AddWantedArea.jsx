import { useState } from "react";
import { toast } from "react-toastify";
import { FaTimes, FaSave, FaMapMarkedAlt, FaHome, FaKey } from "react-icons/fa";
import { getAccessToken } from "../../../utils/auth";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const AddWantedArea = ({ onClose, onSuccess }) => {
    const [form, setForm] = useState({
        location: "",
        sale: false,
        rent: false,
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    /* ---------- Change handler ---------- */
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
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
        if (e) e.preventDefault();
        
        // Quick client-side validation
        if (!form.sale && !form.rent) {
            toast.error("يجب اختيار (بيع) أو (إيجار) على الأقل");
            return;
        }

        setSaving(true);
        setErrors({});

        try {
            const token = getAccessToken();
            if (!token) {
                toast.error("يجب تسجيل الدخول أولاً");
                setSaving(false);
                return;
            }

            const payload = {
                location: form.location || null,
                sale: form.sale,
                rent: form.rent,
            };

            const res = await fetch(`${BASE}/api/wanted-areas/`, {
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
                // Handle DRF non_field_errors (like the custom validation we added)
                if (!data?.errors && typeof data === 'object') {
                    setErrors(data);
                }
                
                let firstMsg = null;
                if (data?.non_field_errors) {
                    firstMsg = data.non_field_errors[0];
                } else if (data?.errors) {
                    const firstField = Object.keys(data.errors)[0];
                    firstMsg = Array.isArray(data.errors[firstField])
                        ? data.errors[firstField][0]
                        : String(data.errors[firstField]);
                }

                throw new Error(
                    firstMsg || data?.message || "فشل إضافة المنطقة المطلوبة"
                );
            }

            toast.success(data?.message || "✅ تم إضافة المنطقة المطلوبة بنجاح");

            setForm({
                location: "",
                sale: false,
                rent: false,
            });

            if (typeof onSuccess === "function") onSuccess(data?.data);
            else if (typeof onClose === "function") onClose();
        } catch (err) {
            console.error("Add wanted area error:", err);
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
                            <FaMapMarkedAlt size={16} />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-800 text-lg">
                                إضافة منطقة مطلوبة
                            </h3>
                            <p className="text-xs text-gray-500">
                                حدد الموقع ونوع الطلب (بيع / إيجار)
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
                    className="p-6 space-y-6 max-h-[65vh] overflow-y-auto"
                >
                    {/* Location */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            الموقع / المنطقة (Location)
                        </label>
                        <input
                            name="location"
                            type="text"
                            value={form.location}
                            onChange={handleChange}
                            disabled={saving}
                            placeholder="مثال: Dubai Marina"
                            className={inputClass}
                        />
                        {fieldError("location") && (
                            <p className="text-red-500 text-xs mt-1">
                                {fieldError("location")}
                            </p>
                        )}
                    </div>

                    {/* Type: Sale & Rent Toggles */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-3">
                            نوع الطلب (مطلوب)
                        </label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            
                            {/* Sale Toggle */}
                            <div 
                                onClick={() => !saving && handleChange({ target: { name: 'sale', type: 'checkbox', checked: !form.sale } })}
                                className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                    form.sale ? 'border-[#a47d52] bg-[#a47d52]/5 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${form.sale ? 'bg-[#a47d52] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        <FaHome size={14} />
                                    </div>
                                    <span className={`font-bold text-sm ${form.sale ? 'text-[#a47d52]' : 'text-gray-600'}`}>
                                        للبيع (Sale)
                                    </span>
                                </div>
                                {/* Toggle Switch */}
                                <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${form.sale ? 'bg-[#a47d52]' : 'bg-gray-300'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${form.sale ? 'right-0.5' : 'right-[calc(100%-1.375rem)]'}`}>
                                        {form.sale && <span className="text-[#a47d52] text-[10px] font-bold">✓</span>}
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    name="sale"
                                    checked={form.sale}
                                    onChange={handleChange}
                                    className="sr-only"
                                    disabled={saving}
                                />
                            </div>

                            {/* Rent Toggle */}
                            <div 
                                onClick={() => !saving && handleChange({ target: { name: 'rent', type: 'checkbox', checked: !form.rent } })}
                                className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                    form.rent ? 'border-[#a47d52] bg-[#a47d52]/5 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${form.rent ? 'bg-[#a47d52] text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        <FaKey size={14} />
                                    </div>
                                    <span className={`font-bold text-sm ${form.rent ? 'text-[#a47d52]' : 'text-gray-600'}`}>
                                        للإيجار (Rent)
                                    </span>
                                </div>
                                {/* Toggle Switch */}
                                <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${form.rent ? 'bg-[#a47d52]' : 'bg-gray-300'}`}>
                                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 flex items-center justify-center ${form.rent ? 'right-0.5' : 'right-[calc(100%-1.375rem)]'}`}>
                                        {form.rent && <span className="text-[#a47d52] text-[10px] font-bold">✓</span>}
                                    </span>
                                </div>
                                <input
                                    type="checkbox"
                                    name="rent"
                                    checked={form.rent}
                                    onChange={handleChange}
                                    className="sr-only"
                                    disabled={saving}
                                />
                            </div>

                        </div>
                        {fieldError("non_field_errors") && (
                            <p className="text-red-500 text-xs mt-2 font-bold">
                                {fieldError("non_field_errors")}
                            </p>
                        )}
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
                                حفظ المنطقة
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

export default AddWantedArea;