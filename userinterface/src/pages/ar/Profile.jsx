import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import {
    FaUser,
    FaEnvelope,
    FaCamera,
    FaSave,
    FaLock,
    FaClock,
    FaCircle,
    FaEye,
    FaEyeSlash,
    FaTimes,
    FaCheck,
} from "react-icons/fa";

import { authFetch } from "../../utils/auth";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

/* ============================================================
   STATUS CONFIG
============================================================ */
const STATUS_CONFIG = {
    online: { label: "متصل", color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
    logged_in: { label: "مسجل الدخول", color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    pause: { label: "متوقف مؤقتاً", color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    offline: { label: "غير متصل", color: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200" },
    logged_out: { label: "خرج", color: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

const getStatusConfig = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.offline;

const ROLE_LABELS = {
    user: "مستخدم",
    listing: "ليستنق",
    agent: "وكيل",
    manager: "مدير",
};

/* ============================================================
   PROFILE
============================================================ */
const Profile = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        username: "",
        email: "",
        current_password: "",
        new_password: "",
        confirm_new_password: "",
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    const [errors, setErrors] = useState({});
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const fileInputRef = useRef(null);

    /* =========================================================
       FETCH ME
    ========================================================= */
    const fetchMe = async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${BASE}/api/me/`);
            if (!res.ok) throw new Error("فشل تحميل الملف الشخصي");

            const data = await res.json();
            setUser(data);
            setForm((prev) => ({
                ...prev,
                username: data.username || "",
                email: data.email || "",
            }));
        } catch (err) {
            console.error("Fetch me error:", err);
            toast.error("فشل تحميل الملف الشخصي");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMe();
    }, []);

    /* =========================================================
       HANDLERS
    ========================================================= */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleImagePick = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("الملف يجب أن يكون صورة");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("حجم الصورة يجب أن يكون أقل من 5 ميغابايت");
            return;
        }

        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    /* =========================================================
       SAVE
    ========================================================= */
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        try {
            const fd = new FormData();
            fd.append("username", form.username);
            fd.append("email", form.email);

            // Only send password fields when the user actually typed
            // a new password. This avoids triggering serializer
            // validation with empty/partial values.
            if (form.new_password) {
                fd.append("current_password", form.current_password);
                fd.append("new_password", form.new_password);
                fd.append("confirm_new_password", form.confirm_new_password);
            }

            if (imageFile) {
                fd.append("image", imageFile);
            }

            const res = await authFetch(`${BASE}/api/users/me/update/`, {
                method: "PATCH",
                body: fd,
            });

            let data = {};
            try {
                data = await res.json();
            } catch {}

            if (!res.ok) {
                // 🔍 FULL DEBUG OUTPUT — will show every field error clearly
                console.error("❌ Update failed — status:", res.status);
                console.error("❌ Full response:", JSON.stringify(data, null, 2));

                if (data?.errors) {
                    console.error("❌ serializer.errors:", data.errors);
                    // Log each field individually for super clear output
                    Object.entries(data.errors).forEach(([field, msgs]) => {
                        console.error(`   → ${field}:`, msgs);
                    });
                    setErrors(data.errors);

                    // Show the FIRST error as a toast so user sees it immediately
                    const firstField = Object.keys(data.errors)[0];
                    const firstMsg = Array.isArray(data.errors[firstField])
                        ? data.errors[firstField][0]
                        : String(data.errors[firstField]);
                    toast.error(`${firstField}: ${firstMsg}`);
                } else {
                    toast.error(data?.message || "فشل تحديث الملف الشخصي");
                }

                throw new Error(data?.message || "فشل تحديث الملف الشخصي");
            }

            // ✅ Success toast
            toast.success("تم تعديل بياناتك الشخصية بنجاح");

            setForm((prev) => ({
                ...prev,
                current_password: "",
                new_password: "",
                confirm_new_password: "",
            }));
            setImageFile(null);
            setImagePreview(null);

            fetchMe();
        } catch (err) {
            console.error("Save profile error:", err);
            // don't toast again — already toasted above
        } finally {
            setSaving(false);
        }
    };

    /* =========================================================
       ERROR HELPER
    ========================================================= */
    const fieldError = (field) => {
        const e = errors[field];
        if (!e) return null;
        return Array.isArray(e) ? e[0] : String(e);
    };

    /* =========================================================
       CLOSE PAGE
    ========================================================= */
    const handleClose = () => {
        navigate(-1); // go back
    };

    /* =========================================================
       LOADING
    ========================================================= */
    if (loading) {
        return (
            <div dir="rtl" className="min-h-screen bg-[#f8f7f5] p-4 md:p-6">
                <div className="bg-white border border-gray-200 rounded-xl">
                    <p className="text-center py-16 text-gray-500">
                        جاري التحميل...
                    </p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div dir="rtl" className="min-h-screen bg-[#f8f7f5] p-4 md:p-6">
                <div className="bg-white border border-gray-200 rounded-xl">
                    <p className="text-center py-16 text-gray-500">
                        لم يتم العثور على الملف الشخصي.
                    </p>
                </div>
            </div>
        );
    }

    const sc = getStatusConfig(user.status);
    const avatarSrc =
        imagePreview || (user.image ? `${BASE}${user.image}` : null);

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <div dir="rtl" className="min-h-screen bg-[#f8f7f5] p-4 md:p-6">
            {/* ===================== HEADER ===================== */}
            <div className="mb-6 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                        <FaUser size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-800">
                            الملف الشخصي
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            إدارة بياناتك الشخصية وكلمة المرور
                        </p>
                    </div>
                </div>

                {/* Close (X) button */}
                <button
                    type="button"
                    onClick={handleClose}
                    title="إغلاق"
                    className="
                        w-11 h-11 rounded-full
                        bg-white border border-gray-200
                        text-gray-500
                        hover:bg-red-50 hover:text-red-500 hover:border-red-200
                        flex items-center justify-center
                        shadow-sm hover:shadow-md
                        transition-all duration-200
                        cursor-pointer
                    "
                >
                    <FaTimes size={18} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ===================== LEFT — CARD ===================== */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex flex-col items-center text-center">
                            <div className="relative group">
                                {avatarSrc ? (
                                    <img
                                        src={avatarSrc}
                                        alt={user.username}
                                        className="
                                            w-28 h-28 rounded-full object-cover
                                            border-4 border-white shadow-lg
                                        "
                                    />
                                ) : (
                                    <div className="
                                        w-28 h-28 rounded-full
                                        bg-gradient-to-br from-[#a47d52] to-[#8a6a44]
                                        flex items-center justify-center
                                        border-4 border-white shadow-lg
                                        text-white font-extrabold text-4xl
                                    ">
                                        {user.username?.charAt(0)?.toUpperCase() || "?"}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="
                                        absolute inset-0 rounded-full
                                        bg-black/40 opacity-0
                                        group-hover:opacity-100
                                        flex items-center justify-center
                                        text-white
                                        transition-opacity duration-300
                                        cursor-pointer
                                    "
                                    title="تغيير الصورة"
                                >
                                    <FaCamera size={26} />
                                </button>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImagePick}
                                    className="hidden"
                                />

                                <span
                                    className={`
                                        absolute bottom-2 left-2
                                        w-5 h-5 rounded-full
                                        ${sc.color}
                                        border-4 border-white
                                        shadow-lg
                                    `}
                                    title={sc.label}
                                />
                            </div>

                            <h2 className="font-extrabold text-gray-800 text-lg mt-4 truncate max-w-full">
                                {user.username}
                            </h2>
                            <p className="text-sm text-gray-500 truncate max-w-full" dir="ltr">
                                {user.email}
                            </p>

                            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                                <span className="
                                    inline-block px-3 py-1 rounded-full
                                    text-xs font-extrabold
                                    bg-[#a47d52]/10 text-[#7a5220]
                                    border border-[#a47d52]/20
                                ">
                                    {ROLE_LABELS[user.role] || user.role || "-"}
                                </span>

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
                            </div>

                            {imagePreview && (
                                <button
                                    type="button"
                                    onClick={handleRemoveImage}
                                    className="
                                        mt-4 text-xs font-bold text-red-500
                                        hover:text-red-700 transition
                                        flex items-center gap-1 cursor-pointer
                                    "
                                >
                                    <FaTimes size={11} />
                                    إلغاء تغيير الصورة
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <StatCard
                                label="وقت الاتصال"
                                value={`${user.total_online_days ?? 0} يوم`}
                                color="emerald"
                                icon={<FaClock size={12} />}
                            />
                            <StatCard
                                label="وقت التوقف"
                                value={`${user.total_pause_days ?? 0} يوم`}
                                color="amber"
                                icon={<FaClock size={12} />}
                            />
                            <StatCard
                                label="آخر ظهور"
                                value={
                                    user.last_seen_at
                                        ? new Date(user.last_seen_at).toLocaleDateString("ar-EG")
                                        : "-"
                                }
                                color="gray"
                                icon={<FaCircle size={8} />}
                            />
                            <StatCard
                                label="آخر دخول"
                                value={
                                    user.last_login_at
                                        ? new Date(user.last_login_at).toLocaleDateString("ar-EG")
                                        : "-"
                                }
                                color="blue"
                                icon={<FaCircle size={8} />}
                            />
                        </div>
                    </div>
                </div>

                {/* ===================== RIGHT — FORM ===================== */}
                <div className="lg:col-span-2">
                    <form
                        onSubmit={handleSave}
                        noValidate 
                        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                        <div className="h-1.5 bg-gradient-to-r from-[#a47d52] via-[#d4a574] to-[#a47d52]"></div>

                        {/* Section 1 */}
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-extrabold text-gray-800 flex items-center gap-2 mb-5">
                                <FaUser className="text-[#a47d52]" size={16} />
                                المعلومات الأساسية
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        اسم المستخدم
                                    </label>
                                    <div className="relative">
                                        <FaUser className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47d52]" />
                                        
                                        <input
    name="username"
    type="text"
    value={form.username}
    onChange={handleChange}
    disabled={saving}
    autoComplete="username"
    maxLength={150}
    // 🔄 ADDED: disable browser-native validation
    noValidate
    spellCheck={false}
    // 🔄 ADDED: explicitly no pattern
    // (don't add `pattern` attr — that's what triggers "Enter a valid..." style hints)
    className="
        w-full bg-white border border-gray-200
        border-r-4 border-r-[#a47d52]
        rounded-lg py-3 pr-11 pl-4 outline-none
        focus:ring-2 focus:ring-[#a47d52]/10
        focus:border-[#a47d52]
        text-sm disabled:opacity-60
    "
/>
                                    </div>
                                    {fieldError("username") && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {fieldError("username")}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        البريد الإلكتروني
                                    </label>
                                    <div className="relative">
                                        <FaEnvelope className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47d52]" />
                                        <input
                                            name="email"
                                            type="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            disabled={saving}
                                            autoComplete="email"
                                            className="
                                                w-full bg-white border border-gray-200
                                                border-r-4 border-r-[#a47d52]
                                                rounded-lg py-3 pr-11 pl-4 outline-none
                                                focus:ring-2 focus:ring-[#a47d52]/10
                                                focus:border-[#a47d52]
                                                text-sm disabled:opacity-60
                                            "
                                        />
                                    </div>
                                    {fieldError("email") && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {fieldError("email")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Section 2 — Password */}
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="font-extrabold text-gray-800 flex items-center gap-2 mb-5">
                                <FaLock className="text-[#a47d52]" size={14} />
                                تغيير كلمة المرور
                                <span className="text-xs font-normal text-gray-400">
                                    (اتركه فارغاً إذا لا ترغب في التغيير)
                                </span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        كلمة المرور الحالية
                                    </label>
                                    <PasswordInput
                                        name="current_password"
                                        value={form.current_password}
                                        onChange={handleChange}
                                        show={showCurrentPassword}
                                        onToggle={() => setShowCurrentPassword((p) => !p)}
                                        disabled={saving}
                                        autoComplete="current-password"
                                    />
                                    {fieldError("current_password") && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {fieldError("current_password")}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        كلمة المرور الجديدة
                                    </label>
                                    <PasswordInput
                                        name="new_password"
                                        value={form.new_password}
                                        onChange={handleChange}
                                        show={showNewPassword}
                                        onToggle={() => setShowNewPassword((p) => !p)}
                                        disabled={saving}
                                        placeholder="5 أحرف على الأقل"
                                        autoComplete="new-password"
                                    />
                                    {fieldError("new_password") && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {fieldError("new_password")}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        تأكيد كلمة المرور
                                    </label>
                                    <PasswordInput
                                        name="confirm_new_password"
                                        value={form.confirm_new_password}
                                        onChange={handleChange}
                                        show={showConfirmPassword}
                                        onToggle={() => setShowConfirmPassword((p) => !p)}
                                        disabled={saving}
                                        autoComplete="new-password"
                                    />
                                    {fieldError("confirm_new_password") && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {fieldError("confirm_new_password")}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-[#f8f7f5] flex flex-col md:flex-row gap-3">
                            <button
                                type="submit"
                                disabled={saving}
                                title="حفظ التعديلات"
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
                                    <svg
                                        className="animate-spin h-5 w-5 text-white"
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
                                ) : (
                                    <FaCheck size={18} />
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setForm((prev) => ({
                                        ...prev,
                                        username: user.username || "",
                                        email: user.email || "",
                                        current_password: "",
                                        new_password: "",
                                        confirm_new_password: "",
                                    }));
                                    setErrors({});
                                    setImageFile(null);
                                    setImagePreview(null);
                                }}
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
                                <FaTimes size={14} />
                                إعادة تعيين
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   PASSWORD INPUT
============================================================ */
const PasswordInput = ({
    name,
    value,
    onChange,
    show,
    onToggle,
    disabled,
    placeholder = "••••••••",
    autoComplete = "new-password",
}) => (
    <div className="relative">
        <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47d52]" />
        <input
            name={name}
            type={show ? "text" : "password"}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            autoComplete={autoComplete}
            className="
                w-full bg-white border border-gray-200
                border-r-4 border-r-[#a47d52]
                rounded-lg py-3 pr-11 pl-12 outline-none
                focus:ring-2 focus:ring-[#a47d52]/10
                focus:border-[#a47d52]
                text-sm disabled:opacity-60
            "
        />
        <button
            type="button"
            onClick={onToggle}
            disabled={disabled}
            tabIndex={-1}
            className="
                absolute left-3 top-1/2 -translate-y-1/2
                text-gray-400 hover:text-[#a47d52]
                p-1.5 rounded-lg hover:bg-[#a47d52]/10
                transition-all cursor-pointer
                disabled:opacity-50
            "
        >
            {show ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
        </button>
    </div>
);

/* ============================================================
   STAT CARD
============================================================ */
const StatCard = ({ label, value, color = "gray", icon }) => {
    const colors = {
        emerald: "bg-emerald-50 border-emerald-100 text-emerald-700",
        amber: "bg-amber-50 border-amber-100 text-amber-700",
        blue: "bg-blue-50 border-blue-100 text-blue-700",
        gray: "bg-gray-50 border-gray-200 text-gray-700",
    };
    const cls = colors[color] || colors.gray;

    return (
        <div className={`rounded-lg border p-3 text-center ${cls}`}>
            <p className="text-[10px] font-bold mb-1 flex items-center justify-center gap-1">
                {icon}
                {label}
            </p>
            <p className="text-sm font-extrabold truncate">{value}</p>
        </div>
    );
};

export default Profile;