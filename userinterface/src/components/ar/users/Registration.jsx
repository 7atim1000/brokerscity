import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from '../../../assets/images/white-logo.png'
import background from "../../../assets/images/background.jpeg";
import {
    FaEye,
    FaEyeSlash,
    FaShieldAlt,
    FaEnvelope,
    FaUser,
    FaTasks,
} from "react-icons/fa";
import { FaLanguage } from "react-icons/fa6";
import { IoSparkles, IoBusiness, IoPeople } from "react-icons/io5";
import { MdOutlineRealEstateAgent } from "react-icons/md";

// 🔄 CHANGED: accept onSuccess / onClose props from parent (Users.jsx)
function Registration({ onSuccess, onClose }) {
    const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
    const navigate = useNavigate();

    /* =========================================================
       STATE
    ========================================================= */
    const [signupForm, setSignupForm] = useState({
        username: "",
        email: "",
        password: "",
        password2: "",
        role: "user",
    });
    const [signupMsg, setSignupMsg] = useState("");
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);

    /* =========================================================
       HANDLERS
    ========================================================= */
    const handleSignupChange = (e) => {
        setSignupForm({ ...signupForm, [e.target.name]: e.target.value });
        if (signupMsg) setSignupMsg("");
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();

        if (signupForm.password !== signupForm.password2) {
            setSignupMsg("⚠️ كلمتا المرور غير متطابقتين");
            return;
        }
        if (signupForm.password.length < 5) {
            setSignupMsg("⚠️ كلمة المرور يجب أن تكون 5 أحرف على الأقل");
            return;
        }

        setIsSigningUp(true);
        setSignupMsg("");

        try {
            const res = await fetch(`${BASE}/api/register/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(signupForm),
            });

            let data = {};
            try {
                data = await res.json();
            } catch {}

            if (res.ok) {
                setSignupMsg(
                    "✅ تم إنشاء الحساب بنجاح! جاري تحويلك لتسجيل الدخول..."
                );

                setSignupForm({
                    username: "",
                    email: "",
                    password: "",
                    password2: "",
                    role: "user",
                });

                // 🔄 CHANGED: if parent passed onSuccess, stay in parent
                // and let it close the modal + refresh the list.
                // Otherwise fall back to the old behaviour (navigate to login).
                setTimeout(() => {
                    if (typeof onSuccess === "function") {
                        onSuccess();
                    } else {
                        navigate("/ar-login");
                    }
                }, 1800);
            } else {
                const errs = data?.errors || data;
                let firstError = "❌ فشل إنشاء الحساب";

                if (typeof errs === "object" && errs !== null) {
                    const k = Object.keys(errs)[0];
                    const v = errs[k];
                    firstError = Array.isArray(v) ? v[0] : String(v);
                }

                setSignupMsg(firstError);
            }
        } catch (err) {
            console.error("Signup error:", err);
            setSignupMsg("⚠️ حدث خطأ أثناء إنشاء الحساب");
        } finally {
            setIsSigningUp(false);
        }
    };

    /* =========================================================
       SHARED INPUT CLASS
    ========================================================= */
    const sharedInputClass =
        "w-full rounded-2xl border-b-2 border-[#a47d52] bg-white/10 backdrop-blur-md px-4 md:px-5 py-2.5 md:py-3 outline-none focus:ring-4 focus:ring-white/25 focus:border-white/60 text-white placeholder:text-white/45 transition-all duration-300 text-right text-sm md:text-base";

    /* =========================================================
       FLOATING PARTICLES
    ========================================================= */
    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.3 + 0.1,
    }));

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <div
            dir="rtl"
            className="
                w-full min-h-screen h-screen max-h-screen
                flex items-center justify-center
                p-2 md:p-4 lg:p-8
                bg-slate-900 relative overflow-hidden
            "
        >
            {/* Background */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${background})` }}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-br from-black/75 via-black/30 to-black/75"></div>

            {/* Particles */}
            <div className="absolute inset-0 z-[2] overflow-hidden pointer-events-none">
                {particles.map((p) => (
                    <div
                        key={p.id}
                        className="absolute rounded-full bg-white/20"
                        style={{
                            width: p.size,
                            height: p.size,
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
                            opacity: p.opacity,
                        }}
                    />
                ))}
            </div>

            {/* Decorative orbs */}
            <div className="absolute top-10 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse-slow hidden 2xl:block z-[2]"></div>
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-slow delay-1500 hidden 2xl:block z-[2]"></div>

            {/* Content */}
            <div
                className="
                    relative z-10 w-full max-w-7xl
                    flex flex-col lg:flex-row items-center justify-center
                    gap-6 lg:gap-12 2xl:gap-20
                    h-full max-h-full overflow-hidden
                "
            >
                {/* LEFT — Registration Card */}
                <div
                    className="
                        relative w-full max-w-lg lg:max-w-xl xl:max-w-2xl
                        flex flex-col rounded-3xl overflow-hidden
                        bg-transparent backdrop-blur-2xl backdrop-saturate-150
                        border border-white/30 shadow-[0_30px_80px_rgba(0,0,0,0.4)]
                        transition-all duration-500
                        hover:shadow-[0_40px_100px_rgba(255,255,255,0.15)]
                        animate-scale-in
                        lg:order-1 max-h-[95vh] lg:max-h-[92vh] no-scrollbar
                    "
                >
                    {/* Top bar */}
                    <div className="h-1.5 bg-gradient-to-r from-[#a47d52] via-white to-[#8a6a44] relative overflow-hidden flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#d4a574] via-white to-[#b88d63] animate-shimmer"></div>
                    </div>

                    {/* Inner content */}
                    <div className="w-full bg-transparent px-5 md:px-8 lg:px-10 pt-8 md:pt-14 lg:pt-10 pb-5 md:pb-7 lg:pb-8 flex flex-col justify-center relative overflow-y-auto no-scrollbar flex-1">
                        {/* Corner decorations */}
                        <div className="absolute top-0 left-0 w-32 h-32 overflow-hidden opacity-10 pointer-events-none">
                            <div className="w-full h-full bg-gradient-to-br from-white to-transparent transform rotate-45 -translate-x-8 -translate-y-8"></div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-32 h-32 overflow-hidden opacity-10 pointer-events-none">
                            <div className="w-full h-full bg-gradient-to-tl from-white to-transparent transform rotate-45 translate-x-8 translate-y-8"></div>
                        </div>

                        {/* ============================================ */}
                        {/* LOGO SECTION — same as Login                  */}
                        {/* ============================================ */}
                        <div className="flex flex-col items-center justify-center mb-5 md:mb-6 relative flex-shrink-0">
                            <div
                                className="flex flex-col justify-center md:flex md:flex-row md:justify-between items-center w-full gap-3
                                md:mt-10
                                lg:mt-8
                                xl:mt-4
                                2xl:mt-0"
                            >
                                <div className="relative group order-2 md:order-2">
                                    <img
                                        src={logo}
                                        alt="شعار بروكر سيتي"
                                        className="
                                            w-16 h-16 md:w-20 md:h-8
                                            object-contain rounded-2xl
                                            mb-2 md:mb-0 md:ml-14
                                            relative z-10 shadow-2xl
                                            group-hover:ring-white/60
                                            transition-all duration-500
                                            group-hover:scale-105
                                            scale-300
                                        "
                                    />
                                </div>

                                <div className="text-center md:text-right relative order-1 md:order-1">
                                    <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold text-white mb-1 drop-shadow-lg tracking-wide">
                                        بروكر سيتي العقارية
                                    </h1>
                                    <div className="flex items-center justify-center md:justify-end gap-2">
                                        <MdOutlineRealEstateAgent className="text-white/80 text-base md:text-lg" />
                                        <div className="w-12 md:w-16 h-0.5 bg-gradient-to-l from-white/80 to-transparent"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between w-full mt-4 md:mt-5">
                                <div className="flex items-center gap-2">
                                    <p className="text-white/85 text-xs md:text-sm font-light">
                                        منصة عقارية متكاملة
                                    </p>
                                    <div className="flex gap-1">
                                        {[...Array(3)].map((_, i) => (
                                            <span
                                                key={i}
                                                className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse"
                                                style={{
                                                    animationDelay: `${i * 0.3}s`,
                                                }}
                                            ></span>
                                        ))}
                                    </div>
                                </div>

                                <div
                                    className="
                                        flex flex-row items-center gap-1.5
                                        px-2.5 md:px-3 py-1 md:py-1.5
                                        rounded-full bg-white/10
                                        hover:bg-white/20 transition-all
                                        duration-500 cursor-pointer
                                        border border-white/30
                                        hover:border-white/60 hover:shadow-lg
                                        hover:scale-105 group relative
                                        overflow-hidden backdrop-blur-md
                                    "
                                    onClick={() => navigate("/login")}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                                    <FaLanguage className="text-white w-3.5 h-3.5 relative z-10" />
                                    <p className="text-white text-xs md:text-sm font-medium m-0 p-0 relative z-10">
                                        EN
                                    </p>
                                    <span className="text-white/80 text-xs relative z-10">
                                        ←
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* TITLE                                         */}
                        {/* ============================================ */}
                        <div className="mb-4 text-center flex-shrink-0">
                            <h2 className="text-lg md:text-2xl font-extrabold text-white mb-1">
                                إنشاء حساب جديد
                            </h2>
                            <p className="text-xs md:text-sm text-white/70">
                                أدخل بياناتك للانضمام إلى المنصة
                            </p>
                        </div>

                        {/* ============================================ */}
                        {/* FORM                                          */}
                        {/* ============================================ */}
                        <form
                            onSubmit={handleSignupSubmit}
                            className="space-y-3 md:space-y-4 flex-1"
                        >
                            {/* Username */}
                            <div>
                                <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                    <span className="flex items-center gap-2">
                                        <FaUser className="text-white/80 text-[10px] md:text-xs" />
                                        اسم المستخدم
                                    </span>
                                </label>
                                <input
                                    name="username"
                                    type="text"
                                    value={signupForm.username}
                                    onChange={handleSignupChange}
                                    placeholder="أدخل اسم المستخدم"
                                    required
                                    disabled={isSigningUp}
                                    autoComplete="username"
                                    className={sharedInputClass}
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                    <span className="flex items-center gap-2">
                                        <FaEnvelope className="text-white/80 text-[10px] md:text-xs" />
                                        البريد الإلكتروني
                                    </span>
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    value={signupForm.email}
                                    onChange={handleSignupChange}
                                    placeholder="example@brokercity.com"
                                    required
                                    disabled={isSigningUp}
                                    autoComplete="email"
                                    className={sharedInputClass}
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                    <span className="flex items-center gap-2">
                                        <FaShieldAlt className="text-white/80 text-[10px] md:text-xs" />
                                        كلمة المرور
                                    </span>
                                </label>
                                <div className="relative">
                                    <input
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        value={signupForm.password}
                                        onChange={handleSignupChange}
                                        placeholder="5 أحرف على الأقل"
                                        required
                                        minLength={5}
                                        disabled={isSigningUp}
                                        autoComplete="new-password"
                                        className={
                                            sharedInputClass + " pl-11 md:pl-12"
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((p) => !p)
                                        }
                                        className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white cursor-pointer transition-all duration-300 p-2 rounded-xl hover:bg-white/10"
                                        aria-label="إظهار/إخفاء كلمة المرور"
                                        disabled={isSigningUp}
                                    >
                                        {showPassword ? (
                                            <FaEyeSlash
                                                size={14}
                                                className="md:w-[18px] md:h-[18px]"
                                            />
                                        ) : (
                                            <FaEye
                                                size={14}
                                                className="md:w-[18px] md:h-[18px]"
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm password */}
                            <div>
                                <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                    <span className="flex items-center gap-2">
                                        <FaShieldAlt className="text-white/80 text-[10px] md:text-xs" />
                                        تأكيد كلمة المرور
                                    </span>
                                </label>
                                <div className="relative">
                                    <input
                                        name="password2"
                                        type={showPassword2 ? "text" : "password"}
                                        value={signupForm.password2}
                                        onChange={handleSignupChange}
                                        placeholder="أعد كتابة كلمة المرور"
                                        required
                                        minLength={5}
                                        disabled={isSigningUp}
                                        autoComplete="new-password"
                                        className={
                                            sharedInputClass + " pl-11 md:pl-12"
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword2((p) => !p)
                                        }
                                        className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white cursor-pointer transition-all duration-300 p-2 rounded-xl hover:bg-white/10"
                                        aria-label="إظهار/إخفاء كلمة المرور"
                                        disabled={isSigningUp}
                                    >
                                        {showPassword2 ? (
                                            <FaEyeSlash
                                                size={14}
                                                className="md:w-[18px] md:h-[18px]"
                                            />
                                        ) : (
                                            <FaEye
                                                size={14}
                                                className="md:w-[18px] md:h-[18px]"
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={isSigningUp}
                                className="
                                    w-full mt-2 py-3 rounded-2xl
                                    bg-gradient-to-r from-[#a47d52] to-[#8a6a44]
                                    hover:from-[#b88d63] hover:to-[#a47d52]
                                    text-white font-extrabold text-sm md:text-base
                                    transition-all duration-300 hover:scale-[1.02]
                                    disabled:opacity-60 disabled:cursor-not-allowed
                                    flex items-center justify-center gap-2 cursor-pointer
                                "
                            >
                                {isSigningUp ? (
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
                                            ></circle>
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                        </svg>
                                        جاري إنشاء الحساب...
                                    </>
                                ) : (
                                    <>
                                        <span>✨</span>
                                        إنشاء الحساب
                                    </>
                                )}
                            </button>

                            {/* Message */}
                            {signupMsg && (
                                <div
                                    className={`
                                        mt-3 rounded-2xl px-4 py-3 text-center border-2
                                        backdrop-blur-md text-xs md:text-sm
                                        animate-slide-down
                                        ${
                                            signupMsg.includes("✅")
                                                ? "bg-emerald-500/15 border-emerald-300/50 text-emerald-100"
                                                : "bg-amber-500/15 border-amber-300/50 text-amber-100"
                                        }
                                    `}
                                >
                                    {signupMsg}
                                </div>
                            )}
                        </form>

                        {/* 🔄 CHANGED: Back button — if used inside Users.jsx
                            (onClose provided) close the modal instead of
                            navigating to the login page. */}
                        <button
                            type="button"
                            onClick={() => {
                                if (typeof onClose === "function") {
                                    onClose();
                                } else {
                                    navigate("/ar-login");
                                }
                            }}
                            disabled={isSigningUp}
                            className="
                                w-full mt-3 text-xs md:text-sm text-white/90
                                hover:text-white transition-all duration-300
                                cursor-pointer font-medium py-2 md:py-2.5 rounded-xl
                                hover:bg-white/10 hover:scale-[1.02]
                                border border-white/20 hover:border-white/40
                                flex items-center justify-center gap-2
                                disabled:opacity-50 disabled:cursor-not-allowed
                            "
                        >
                            <span>→</span>
                            {typeof onClose === "function"
                                ? "إلغاء والعودة"
                                : "العودة إلى تسجيل الدخول"}
                        </button>
                    </div>

                    {/* Bottom bar */}
                    <div className="h-1.5 bg-gradient-to-r from-[#d4a574] via-white to-[#b88d63] relative overflow-hidden flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#8a6a44] via-white/60 to-transparent animate-shimmer"></div>
                    </div>
                </div>

                {/* RIGHT — Info panel (same as Login) */}
                <div
                    dir="rtl"
                    className="hidden lg:flex flex-col items-center justify-center text-white px-6 xl:px-10 2xl:px-14 lg:order-2 flex-shrink-0"
                    style={{
                        animation: "fadeInUp 0.8s ease-out both",
                        animationDelay: "50ms",
                    }}
                >
                    <div className="relative">
                        <div className="absolute -inset-6 bg-white/5 rounded-full blur-3xl animate-pulse-slow"></div>
                        <img
                            src={logo}
                            alt="بروكر سيتي"
                            className="
                                relative w-32 xl:w-40 2xl:w-48 h-auto
                                mb-6 xl:mb-8 2xl:mb-10
                                drop-shadow-2xl transition-transform duration-500
                                hover:scale-105 scale-220 rounded-2xl
                            "
                        />
                    </div>

                    <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-center mb-3 xl:mb-4 drop-shadow-lg tracking-wide">
                        بروكر سيتي العقارية
                    </h1>

                    <div className="w-24 h-0.5 bg-gradient-to-r from-[#b88d63] via-white/80 to-[#b88d63] mb-4 xl:mb-5"></div>

                    <p className="text-base xl:text-lg 2xl:text-xl text-center text-white/85 leading-relaxed max-w-md">
                        انضم إلى منصتنا العقارية الرقمية المتكاملة
                    </p>

                    <div className="mt-8 xl:mt-10 2xl:mt-12 grid grid-cols-3 gap-5 xl:gap-6 2xl:gap-8 w-full max-w-md xl:max-w-lg">
                        {[
                            { Icon: IoBusiness, label: "العقارات" },
                            { Icon: IoPeople, label: "العملاء" },
                            { Icon: FaTasks, label: "الإدارة" },
                        ].map(({ Icon, label }, i) => (
                            <div
                                key={label}
                                style={{
                                    animation: "fadeInUp 0.6s ease-out both",
                                    animationDelay: `${300 + i * 120}ms`,
                                }}
                                className="
                                    bg-white/10 backdrop-blur-md rounded-sm
                                    p-5 xl:p-7 2xl:p-8 text-center
                                    border border-white/25
                                    transition-all duration-500
                                    hover:bg-white/20 hover:border-white/50
                                    hover:-translate-y-1.5
                                    hover:shadow-[0_15px_40px_-10px_rgba(255,255,255,0.35)]
                                    cursor-default border-b-5 group
                                "
                            >
                                <Icon className="text-2xl xl:text-3xl 2xl:text-4xl mx-auto mb-2 xl:mb-3 text-white/95 transition-all duration-300 group-hover:scale-110 group-hover:text-white" />
                                <span className="text-xs xl:text-sm text-white/90 font-medium">
                                    {label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-3 md:bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 md:gap-1.5 z-10">
                <p className="text-white/30 text-[9px] md:text-xs tracking-wider">
                    © {new Date().getFullYear()} بروكر سيتي العقارية
                </p>
                <div className="flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px) translateX(0px); }
                    25% { transform: translateY(-20px) translateX(-10px); }
                    50% { transform: translateY(-10px) translateX(10px); }
                    75% { transform: translateY(-30px) translateX(-5px); }
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                @keyframes scale-in {
                    from { opacity: 0; transform: scale(0.95) translateY(20px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes slide-down {
                    from { opacity: 0; transform: translateY(-10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
                .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }
                .animate-scale-in { animation: scale-in 0.6s ease-out; }
                .animate-slide-down { animation: slide-down 0.4s ease-out; }
                .delay-1500 { animation-delay: 1.5s; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @media (min-width: 768px) {
                    .no-scrollbar { overflow-y: hidden !important; }
                }
            `}</style>
        </div>
    );
}

export default Registration;