import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { saveTokens } from "../../utils/auth";
import logo from '../../assets/images/white-logo.png';
import background from "../../assets/images/background1.jpeg";
import { FaEye, FaEyeSlash, FaBuilding, FaShieldAlt, FaUserTie, FaBalanceScale, FaChartLine, FaUsers, FaTasks, FaEnvelope, FaUser } from "react-icons/fa";
import { FaLanguage } from "react-icons/fa6";
import { IoMegaphoneOutline, IoShield, IoSparkles, IoBusiness, IoPeople } from 'react-icons/io5';
import { GiCrown } from 'react-icons/gi';
import { MdOutlineRealEstateAgent } from 'react-icons/md';

import { usePermissions } from "../../pages/context/PermissionsContext";

function Login() {
    const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

    const [view, setView] = useState("login"); // "login" | "signup"

    const [form, setForm] = useState({ email: "", password: "" });
    const [loginMode, setLoginMode] = useState(null);
    const [msg, setMsg] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const navigate = useNavigate();

    const { refresh: refreshPermissions } = usePermissions();

    const [showPassword, setShowPassword] = useState(false);
    const passwordRef = useRef(null);
    const loginTimeoutRef = useRef(null);
    const isLoggingInRef = useRef(false);
    const userInteractedRef = useRef(false);

    // Signup state
    const [signupForm, setSignupForm] = useState({
        username: "",
        email: "",
        password: "",
        password2: "",
        role: "user", // ✅ Changed from "prospect" to "user"
    });
    const [signupMsg, setSignupMsg] = useState("");
    const [isSigningUp, setIsSigningUp] = useState(false);
    const [showSignupPassword, setShowSignupPassword] = useState(false);

    useEffect(() => {
        isLoggingInRef.current = isLoggingIn;
    }, [isLoggingIn]);

    useEffect(() => {
        if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
        }
        if (
            userInteractedRef.current &&
            form.email &&
            form.password &&
            form.password.length >= 4 &&
            !isLoggingIn
        ) {
            loginTimeoutRef.current = setTimeout(() => {
                if (!isLoggingInRef.current) {
                    handleSubmit();
                }
            }, 600);
        }
        return () => {
            if (loginTimeoutRef.current) {
                clearTimeout(loginTimeoutRef.current);
                loginTimeoutRef.current = null;
            }
        };
    }, [form.password, form.email, loginMode, isLoggingIn]);

    const handleChange = (e) => {
        userInteractedRef.current = true;
        setForm({ ...form, [e.target.name]: e.target.value });
        if (msg) setMsg("");
    };

    const handleUserLogin = (email) => {
        if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
        }
        userInteractedRef.current = true;
        setLoginMode(email);
        setForm({ email: email, password: "" });
        setMsg("");
        setIsLoggingIn(false);
        setTimeout(() => { passwordRef.current?.focus(); }, 100);
    };

    const handleNormalLogin = () => {
        if (loginTimeoutRef.current) {
            clearTimeout(loginTimeoutRef.current);
            loginTimeoutRef.current = null;
        }
        userInteractedRef.current = false;
        setLoginMode(null);
        setForm({ email: "", password: "" });
        setMsg("");
        setIsLoggingIn(false);
    };

    const handleSubmit = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        if (isLoggingInRef.current) return;

        if (!form.email) {
            setMsg("Please enter your email.");
            return;
        }

        if (form.password.length < 4) {
            setMsg("Password must be at least 4 characters long.");
            passwordRef.current?.focus();
            return;
        }

        setMsg("");
        isLoggingInRef.current = true;
        setIsLoggingIn(true);

        try {
            const response = await fetch(`${BASE}/api/login/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                }),
            });

            let data = {};
            try { data = await response.json(); } catch (jsonError) {
                console.error("Failed to parse login response:", jsonError);
            }

            if (response.ok) {
                saveTokens(data);
                const savedAccessToken = localStorage.getItem("access_token");
                const savedRefreshToken = localStorage.getItem("refresh_token");

                if (!savedAccessToken || !savedRefreshToken) {
                    setMsg("⚠️ Login succeeded but tokens could not be saved.");
                    isLoggingInRef.current = false;
                    setIsLoggingIn(false);
                    return;
                }

                if (data.user) {
                    localStorage.setItem("user", JSON.stringify(data.user));
                }

                try {
                    await refreshPermissions();
                } catch (err) {
                    console.error("Failed to refresh permissions after login:", err);
                }

                setMsg("✅ Login successful! Redirecting...");
                setTimeout(() => { navigate("/en/dashboard"); }, 600);
            } else {
                setMsg(data.detail || "❌ Login failed. Please try again.");
                isLoggingInRef.current = false;
                setIsLoggingIn(false);
                passwordRef.current?.focus();
                passwordRef.current?.select();
            }
        } catch (error) {
            console.error("Login error:", error);
            setMsg("⚠️ An error occurred during login. Please try again.");
            isLoggingInRef.current = false;
            setIsLoggingIn(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && form.password && !isLoggingIn) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const handleSignupChange = (e) => {
        setSignupForm({ ...signupForm, [e.target.name]: e.target.value });
        if (signupMsg) setSignupMsg("");
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (signupForm.password !== signupForm.password2) {
            setSignupMsg("⚠️ Passwords do not match.");
            return;
        }
        if (signupForm.password.length < 8) {
            setSignupMsg("⚠️ Password must be at least 8 characters long.");
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
            try { data = await res.json(); } catch {}

            if (res.ok) {
                setSignupMsg("✅ Account created successfully! You can now log in.");
                setSignupForm({
                    username: "",
                    email: "",
                    password: "",
                    password2: "",
                    role: "user",
                });
                setTimeout(() => {
                    setView("login");
                    setSignupMsg("");
                }, 1500);
            } else {
                const errs = data?.errors || data;
                let firstError = "❌ Failed to create account.";
                if (typeof errs === "object" && errs !== null) {
                    const k = Object.keys(errs)[0];
                    const v = errs[k];
                    firstError = Array.isArray(v) ? v[0] : String(v);
                }
                setSignupMsg(firstError);
            }
        } catch (err) {
            console.error("Signup error:", err);
            setSignupMsg("⚠️ An error occurred during account creation.");
        } finally {
            setIsSigningUp(false);
        }
    };

    // User role configurations
    const userRoles = {
        manager: {
            title: 'General Manager',
            icon: IoShield,
            color: 'from-white/20 to-white/5',
            bgColor: 'bg-white/10',
            borderColor: 'border-[#a47d52]',
            badgeColor: 'bg-white/15 text-white',
            glowColor: 'shadow-white/20',
            gradient: 'from-white/15 via-white/5 to-transparent',
            emoji: '👑',
            subtitle: 'Executive Management',
            email: 'manager@example.com'
        },
        muhsin: {
            title: 'Administrative Manager',
            icon: FaUserTie,
            color: 'from-white/20 to-white/5',
            bgColor: 'bg-white/10',
            borderColor: 'border-[#8a6a44]',
            badgeColor: 'bg-white/15 text-white',
            glowColor: 'shadow-white/20',
            gradient: 'from-white/15 via-white/5 to-transparent',
            emoji: '📋',
            subtitle: 'Operations Management',
            email: 'muhsin@brokercity.com'
        },
        ghada: {
            title: 'HR Manager',
            icon: FaUsers,
            color: 'from-white/20 to-white/5',
            bgColor: 'bg-white/10',
            borderColor: 'border-[#8a6a44]',
            badgeColor: 'bg-white/15 text-white',
            glowColor: 'shadow-white/20',
            gradient: 'from-white/15 via-white/5 to-transparent',
            emoji: '👥',
            subtitle: 'Human Resources',
            email: 'ghada@brokercity.com'
        },
        muhammed: {
            title: 'Marketing Manager',
            icon: FaChartLine,
            color: 'from-white/20 to-white/5',
            bgColor: 'bg-white/10',
            borderColor: 'border-[#a47d52]',
            badgeColor: 'bg-white/15 text-white',
            glowColor: 'shadow-white/20',
            gradient: 'from-white/15 via-white/5 to-transparent',
            emoji: '📈',
            subtitle: 'Marketing Strategy',
            email: 'muhammed@brokercity.com'
        },
        pro: {
            title: 'PRO',
            icon: IoMegaphoneOutline,
            color: 'from-white/20 to-white/5',
            bgColor: 'bg-white/10',
            borderColor: 'border-[#8a6a44]',
            badgeColor: 'bg-white/15 text-white',
            glowColor: 'shadow-white/20',
            gradient: 'from-white/15 via-white/5 to-transparent',
            emoji: '📢',
            subtitle: 'Public Relations Officer',
            email: 'brokercity71@gmail.com'
        },
        abubakr: {
            title: 'Legal Advisor',
            icon: FaBalanceScale,
            color: 'from-white/20 to-white/5',
            bgColor: 'bg-white/10',
            borderColor: 'border-[#8a6a44]',
            badgeColor: 'bg-white/15 text-white',
            glowColor: 'shadow-white/20',
            gradient: 'from-white/15 via-white/5 to-transparent',
            emoji: '⚖️',
            subtitle: 'Legal Affairs',
            email: 'abubakr@brokercity.com'
        },
        
    };

    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        size: Math.random() * 4 + 2,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: Math.random() * 20 + 10,
        delay: Math.random() * 10,
        opacity: Math.random() * 0.3 + 0.1,
    }));

    const sharedInputClass = "w-full rounded-2xl border-b-2 border-[#a47d52] bg-white/10 backdrop-blur-md px-4 md:px-5 py-2.5 md:py-3 outline-none focus:ring-4 focus:ring-white/25 focus:border-white/60 text-white placeholder:text-white/45 transition-all duration-300 text-left text-sm md:text-base";

    const renderRoleCard = (key, role, isManager = false) => {
        const Icon = role.icon;

        if (isManager) {
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => handleUserLogin(role.email)}
                    className="
                        relative w-full h-20 md:h-18
                        bg-gradient-to-r from-white/25 via-white/15 to-white/25
                        bg-[length:200%_100%] hover:bg-[length:100%_100%]
                        py-2 px-3 md:px-4 rounded-2xl
                        transition-all duration-500 cursor-pointer
                        shadow-lg hover:shadow-2xl hover:scale-[1.02]
                        group overflow-hidden border-b-4 border-[#a47d52]
                        hover:border-white/70 animate-gradient-x
                        backdrop-blur-md
                    "
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
                    <div className="absolute -inset-1 bg-white/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                    <div className="flex items-center gap-2 justify-between relative z-10 pointer-events-none">
                        <div className="flex items-center gap-2 md:gap-2.5">
                            <div className="relative">
                                <div className="absolute -inset-1 bg-white/30 rounded-full blur-sm animate-pulse"></div>
                                <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/25 border border-white/40 flex items-center justify-center relative">
                                    <GiCrown className="text-white text-base md:text-lg animate-pulse" />
                                </div>
                            </div>
                            <div className="text-left">
                                <span className="font-bold text-xs md:text-sm text-white block drop-shadow">
                                    {role.title}
                                </span>
                                <span className="text-[8px] md:text-[10px] text-white/70">
                                    {role.subtitle}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="px-2 md:px-2.5 py-0.5 md:py-1 rounded-full bg-white/20 text-[8px] md:text-[10px] font-bold text-white border border-white/40 backdrop-blur-sm">
                                👑 
                            </div>
                        </div>
                    </div>
                </button>
            );
        }

        return (
            <button
                key={key}
                type="button"
                onClick={() => handleUserLogin(role.email)}
                className={`
                    relative w-full h-20 md:h-[73px]
                    bg-gradient-to-r ${role.color}
                    bg-[length:200%_100%] hover:bg-[length:100%_100%]
                    py-1 px-2 md:px-3 rounded-2xl
                    transition-all duration-500 cursor-pointer
                    shadow-lg hover:shadow-2xl hover:scale-[1.02]
                    group overflow-hidden
                    border-b-3 border-[#a47d52]
                    hover:border-white/60
                    backdrop-blur-md
                    animate-gradient-x
                `}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
                <div className="absolute -inset-1 bg-white/15 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                <div className="flex items-center gap-2 justify-between relative z-10 pointer-events-none">
                    <div className="flex items-center gap-2 md:gap-2">
                        <div
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${role.badgeColor} border border-white/30 flex items-center justify-center backdrop-blur-sm flex-shrink-0`}
                        >
                            <Icon className="text-white text-xs md:text-sm" />
                        </div>
                        <div className="text-left flex flex-col gap-0">
                            <span className="font-bold text-[10px] md:text-xs text-white block drop-shadow leading-tight">
                                {role.title}
                            </span>
                            <span className="text-[7px] md:text-[9px] text-white/70 leading-tight">
                                {role.subtitle}
                            </span>
                        </div>
                    </div>
                    <div className="text-white text-xs md:text-base flex-shrink-0">
                        {role.emoji}
                    </div>
                </div>
            </button>
        );
    };

    const LogoSection = () => (
        <div className="flex flex-col items-center justify-center mb-5 md:mb-6 relative flex-shrink-0">
            <div className='flex flex-col justify-center md:flex md:flex-row md:justify-between items-center w-full gap-3 mt-8 sm:mt-[400px] md:mt-[100px] lg:mt-16 xl:mt-[60px] 2xl:mt-0'>
                <div className="relative group order-2 md:order-1 md:ml-11">
                    <img
                        src={logo}
                        alt="Broker City Logo"
                        className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-2xl mb-2 md:mb-0 relative z-10 shadow-2xl group-hover:ring-white/60 transition-all duration-500 group-hover:scale-105 scale-250 md:ml-4"
                    />
                </div>
                <div className="text-center md:text-left relative order-1 md:order-2">
                    <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold text-white mb-1 drop-shadow-lg tracking-wide">
                        Broker City Properties
                    </h1>
                    <div className="flex items-center justify-center md:justify-start gap-2">
                        <div className="w-12 md:w-16 h-0.5 bg-gradient-to-r from-transparent to-white/80"></div>
                        <MdOutlineRealEstateAgent className="text-white/80 text-base md:text-lg" />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between w-full mt-4 md:mt-5">
                <div className="flex items-center gap-2">
                    <p className="text-white/85 text-xs md:text-sm font-light">Integrated Real Estate Platform</p>
                    <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}></span>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    className="flex flex-row items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-500 cursor-pointer border border-white/30 hover:border-white/60 hover:shadow-lg hover:scale-105 group relative overflow-hidden backdrop-blur-md" 
                    onClick={() => navigate('/ar/login')}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <span className="text-white/80 text-xs relative z-10">←</span>
                    <FaLanguage className="text-white w-3.5 h-3.5 relative z-10" />
                    <p className="text-white text-xs md:text-sm font-medium m-0 p-0 relative z-10">AR</p>
                </button>
            </div>
        </div>
    );

    return (
        <div
            dir="ltr"
            className="min-h-screen h-screen max-h-screen flex items-center justify-center p-2 md:p-4 lg:p-8 bg-cover bg-center bg-no-repeat relative overflow-hidden"
            style={{ backgroundImage: `url(${background})` }}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/30 to-black/75"></div>

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {particles.map((p) => (
                    <div
                        key={p.id}
                        className="absolute rounded-full bg-white/20"
                        style={{
                            width: p.size, height: p.size,
                            left: `${p.x}%`, top: `${p.y}%`,
                            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
                            opacity: p.opacity,
                        }}
                    />
                ))}
            </div>

            <div className="absolute top-10 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse-slow hidden 2xl:block"></div>
            <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-slow delay-1500 hidden 2xl:block"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-pulse-slow delay-750 hidden 2xl:block"></div>

            <div className="absolute top-1/4 right-1/4 animate-float-slow opacity-20 text-8xl hidden 2xl:block">💎</div>
            <div className="absolute bottom-1/4 right-1/4 animate-float-slow-delay opacity-20 text-8xl hidden 2xl:block">✨</div>

            <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 2xl:gap-20 h-full max-h-full overflow-hidden">
                <div className="relative w-full max-w-lg lg:max-w-xl xl:max-w-2xl flex flex-col rounded-3xl overflow-hidden bg-transparent backdrop-blur-2xl backdrop-saturate-150 border border-white/30 shadow-[0_30px_80px_rgba(0,0,0,0.4)] transition-all duration-500 hover:shadow-[0_40px_100px_rgba(255,255,255,0.15)] animate-scale-in lg:order-1 max-h-[95vh] lg:max-h-[92vh] no-scrollbar">
                    <div className="h-1.5 bg-gradient-to-r from-[#d4a574] via-white to-[#b88d63] relative overflow-hidden flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#8a6a44] via-white/60 to-transparent animate-shimmer"></div>
                    </div>

                    <div className="w-full bg-transparent px-5 md:px-8 lg:px-10 pt-8 md:pt-50 lg:pt-10 pb-5 md:pb-7 lg:pb-8 flex flex-col justify-center relative overflow-y-auto no-scrollbar flex-1">
                        <div className="absolute top-0 left-0 w-32 h-32 overflow-hidden opacity-10 pointer-events-none">
                            <div className="w-full h-full bg-gradient-to-br from-white to-transparent transform rotate-45 -translate-x-8 -translate-y-8"></div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-32 h-32 overflow-hidden opacity-10 pointer-events-none">
                            <div className="w-full h-full bg-gradient-to-tl from-white to-transparent transform rotate-45 translate-x-8 translate-y-8"></div>
                        </div>

                        <LogoSection />

                        {view === "login" && (
                            <>
                                {!loginMode && (
                                    <div className="mb-3 md:mb-4 flex-shrink-0">
                                        <div className="flex items-center gap-3 mb-2.5 md:mb-3">
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/80"></div>
                                            <div className="flex items-center gap-2">
                                                <IoSparkles className="text-white/90 text-xs md:text-sm" />
                                                <span className="text-[10px] md:text-xs text-white font-medium tracking-wider">Management</span>
                                                <IoSparkles className="text-white/90 text-xs md:text-sm" />
                                            </div>
                                            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/80"></div>
                                        </div>

                                        <div className="flex flex-col gap-2 md:gap-2.5">
                                            {/* ROW 1 */}
                                            <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                                                {renderRoleCard('manager', userRoles.manager, true)}
                                                {renderRoleCard('muhsin', userRoles.muhsin)}
                                            </div>
                                            {/* ROW 2+ */}
                                            <div className="grid grid-cols-2 gap-2 md:gap-2.5">
                                                {Object.entries(userRoles)
                                                    .filter(([key]) => !['manager', 'muhsin'].includes(key))
                                                    .map(([key, role]) => renderRoleCard(key, role))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {loginMode && (
                                    <div className="mb-3 md:mb-4 rounded-2xl bg-white/10 border border-white/30 px-4 md:px-5 py-2.5 md:py-3.5 text-center relative overflow-hidden shadow-inner flex-shrink-0 backdrop-blur-md">
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5"></div>
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-center gap-2 md:gap-3">
                                                <div className="flex items-center gap-1 md:gap-2">
                                                    <span className="text-[10px] md:text-xs text-white/75">User:</span>
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                                </div>
                                                <span className="text-xs md:text-sm font-bold text-white">{loginMode}</span>
                                                <div className="w-px h-3 md:h-4 bg-white/30"></div>
                                                <div className="flex items-center gap-1">
                                                    <IoSparkles className="text-white/80 text-[10px] md:text-xs" />
                                                    <span className="text-[8px] md:text-[10px] text-green-400">Online</span>
                                                </div>
                                            </div>
                                            {isLoggingIn && (
                                                <div className="flex items-center justify-center gap-2 mt-1">
                                                    <svg className="animate-spin h-3 w-3 md:h-3.5 md:w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <p className="text-[10px] md:text-xs text-white font-medium">Signing in...</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 flex-1">
                                    {!loginMode && (
                                        <div className="flex-shrink-0">
                                            <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                                <span className="flex items-center gap-2">
                                                    <FaEnvelope className="text-white/80 text-[10px] md:text-xs" />
                                                    Email Address
                                                </span>
                                            </label>
                                            <div className="relative group">
                                                <input
                                                    name="email"
                                                    type="email"
                                                    value={form.email}
                                                    onChange={handleChange}
                                                    placeholder="Enter your email"
                                                    required
                                                    autoComplete="off"
                                                    className={sharedInputClass + " pr-11 md:pr-12 group-hover:border-white/50"}
                                                />
                                                <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors duration-300 pointer-events-none">
                                                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex-shrink-0">
                                        <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                            <span className="flex items-center gap-2">
                                                <FaShieldAlt className="text-white/80 text-[10px] md:text-xs" />
                                                Password
                                                {loginMode && (
                                                    <span className="text-[9px] md:text-xs text-white/90 ml-2 font-normal bg-white/15 border border-white/25 px-2 py-0.5 rounded-full">
                                                        Auto-login
                                                    </span>
                                                )}
                                            </span>
                                        </label>
                                        <div className="relative group">
                                            <input
                                                ref={passwordRef}
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                value={form.password}
                                                onChange={handleChange}
                                                onKeyDown={handleKeyDown}
                                                onFocus={() => setIsFocused(true)}
                                                onBlur={() => setIsFocused(false)}
                                                placeholder="Enter your password"
                                                required
                                                disabled={isLoggingIn}
                                                className={`
                                                    w-full rounded-2xl border-b-2
                                                    ${form.password.length >= 4 && !isLoggingIn
                                                        ? 'border-emerald-300/60 bg-emerald-500/10'
                                                        : form.password.length > 0 && form.password.length < 4
                                                        ? 'border-yellow-300/60 bg-yellow-500/10'
                                                        : 'border-[#a47d52] bg-white/10'}
                                                    backdrop-blur-md px-4 md:px-5 py-2.5 md:py-3 pr-11 md:pr-12
                                                    outline-none focus:ring-4 focus:ring-white/25 focus:border-white/60
                                                    transition-all duration-300 text-white placeholder:text-white/45
                                                    disabled:opacity-60 disabled:cursor-not-allowed
                                                    group-hover:border-white/50 text-left text-sm md:text-base
                                                `}
                                            />
                                            {form.password.length > 0 && (
                                                <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2">
                                                    <div className={`w-2 h-2 rounded-full ${form.password.length >= 4 ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white cursor-pointer transition-all duration-300 p-2 rounded-xl hover:bg-white/10 hover:scale-110"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                                disabled={isLoggingIn}
                                            >
                                                {showPassword ? <FaEyeSlash size={14} className="md:w-[18px] md:h-[18px]" /> : <FaEye size={14} className="md:w-[18px] md:h-[18px]" />}
                                            </button>
                                            {isFocused && (
                                                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl blur-sm -z-10 animate-pulse"></div>
                                            )}
                                        </div>
                                        {loginMode && form.password.length === 0 && (
                                            <p className="text-[10px] md:text-xs text-white/60 mt-2 flex items-center gap-1.5">
                                                <span className="text-base md:text-lg">🔑</span>
                                                Enter your password for auto-login
                                            </p>
                                        )}
                                        {loginMode && form.password.length > 0 && form.password.length < 4 && (
                                            <p className="text-[10px] md:text-xs text-yellow-200 mt-2 flex items-center gap-1.5">
                                                <span className="text-base md:text-lg">⚠️</span>
                                                Password is too short (minimum 4 characters)
                                            </p>
                                        )}
                                        {loginMode && form.password.length >= 4 && (
                                            <p className="text-[10px] md:text-xs text-emerald-200 mt-2 flex items-center gap-1.5 animate-pulse">
                                                <span className="text-base md:text-lg">✅</span>
                                                Password ready — auto-login enabled
                                            </p>
                                        )}
                                    </div>

                                    <button type="submit" disabled={isLoggingIn} className="sr-only" aria-hidden="true" tabIndex={-1}>
                                        Sign In
                                    </button>

                                    {isLoggingIn && (
                                        <div className="relative mt-2 w-full rounded-2xl overflow-hidden bg-white/10 border border-white/30 px-5 md:px-6 py-3 md:py-3.5 animate-slide-down flex-shrink-0 backdrop-blur-md">
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-shimmer"></div>
                                            <div className="relative z-10 flex items-center justify-center gap-3">
                                                <div className="relative">
                                                    <div className="absolute -inset-1.5 bg-white/25 rounded-full blur-md animate-pulse"></div>
                                                    <svg className="relative animate-spin h-5 w-5 md:h-6 md:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-xs md:text-sm font-bold text-white">Login successful</span>
                                                    <span className="text-[9px] md:text-[10px] text-white/60">Please wait a moment</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    {[0, 1, 2].map((i) => (
                                                        <span key={i} className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </form>

                                {loginMode && (
                                    <button
                                        type="button"
                                        onClick={handleNormalLogin}
                                        disabled={isLoggingIn}
                                        className="w-full mt-3 md:mt-4 text-xs md:text-sm text-white/90 hover:text-white transition-all duration-300 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed py-2 md:py-2.5 rounded-xl hover:bg-white/10 hover:scale-[1.02] border border-white/20 hover:border-white/40 flex items-center justify-center gap-2 flex-shrink-0"
                                    >
                                        <span>←</span>
                                        Back to normal login
                                    </button>
                                )}

                                {msg && (
                                    <div className={`
                                        mt-3 md:mt-4 rounded-2xl px-5 md:px-6 py-3 md:py-3.5 text-center border-2
                                        animate-slide-down backdrop-blur-md
                                        ${msg.includes('✅') ? 'bg-emerald-500/15 border-emerald-300/50 text-emerald-100' : 'bg-amber-500/15 border-amber-300/50 text-amber-100'}
                                        flex items-center gap-2 justify-center flex-shrink-0
                                    `}>
                                        <p className="text-xs md:text-sm font-medium">{msg}</p>
                                    </div>
                                )}

                                {!loginMode && (
                                    <div className="mt-3 md:mt-4 text-center text-xs md:text-sm flex-shrink-0">
                                        <span className="text-white/70">Don't have an account?</span>
                                        {/* ✅ FIXED: Changed to Button navigating to signup */}
                                        <button 
                                            type="button"
                                            onClick={() => { setView("signup"); setMsg(""); setSignupMsg(""); }}
                                            className="ml-2 font-semibold text-white hover:text-white/80 transition-all duration-300 underline-offset-4 hover:underline hover:scale-105 inline-block bg-transparent border-none p-0 cursor-pointer"
                                        >
                                            <span className="mr-1">✨</span>
                                            Create new account
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {view === "signup" && (
                            <>
                                <div className="mb-4 text-center flex-shrink-0">
                                    <h2 className="text-lg md:text-2xl font-extrabold text-white mb-1">
                                        Create New Account
                                    </h2>
                                    <p className="text-xs md:text-sm text-white/70">
                                        Enter your details to join the platform
                                    </p>
                                </div>

                                <form onSubmit={handleSignupSubmit} className="space-y-3 md:space-y-4 flex-1">
                                    <div>
                                        <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                            <span className="flex items-center gap-2">
                                                <FaUser className="text-white/80 text-[10px] md:text-xs" />
                                                Username
                                            </span>
                                        </label>
                                        <input
                                            name="username"
                                            type="text"
                                            value={signupForm.username}
                                            onChange={handleSignupChange}
                                            placeholder="Enter username"
                                            required
                                            disabled={isSigningUp}
                                            autoComplete="off"
                                            className={sharedInputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                            <span className="flex items-center gap-2">
                                                <FaEnvelope className="text-white/80 text-[10px] md:text-xs" />
                                                Email Address
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
                                            autoComplete="off"
                                            className={sharedInputClass}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                            <span className="flex items-center gap-2">
                                                <FaShieldAlt className="text-white/80 text-[10px] md:text-xs" />
                                                Password
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                name="password"
                                                type={showSignupPassword ? "text" : "password"}
                                                value={signupForm.password}
                                                onChange={handleSignupChange}
                                                placeholder="At least 8 characters"
                                                required
                                                minLength={8}
                                                disabled={isSigningUp}
                                                autoComplete="new-password"
                                                className={sharedInputClass + " pr-11 md:pr-12"}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowSignupPassword((p) => !p)}
                                                className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white cursor-pointer transition-all duration-300 p-2 rounded-xl hover:bg-white/10"
                                                aria-label="Show/Hide password"
                                                disabled={isSigningUp}
                                            >
                                                {showSignupPassword ? <FaEyeSlash size={14} className="md:w-[18px] md:h-[18px]" /> : <FaEye size={14} className="md:w-[18px] md:h-[18px]" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
                                            <span className="flex items-center gap-2">
                                                <FaShieldAlt className="text-white/80 text-[10px] md:text-xs" />
                                                Confirm Password
                                            </span>
                                        </label>
                                        <input
                                            name="password2"
                                            type="password"
                                            value={signupForm.password2}
                                            onChange={handleSignupChange}
                                            placeholder="Re-enter password"
                                            required
                                            minLength={8}
                                            disabled={isSigningUp}
                                            autoComplete="new-password"
                                            className={sharedInputClass}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSigningUp}
                                        className="w-full mt-2 py-3 rounded-2xl bg-gradient-to-r from-[#a47d52] to-[#8a6a44] hover:from-[#b88d63] hover:to-[#a47d52] text-white font-extrabold text-sm md:text-base transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        {isSigningUp ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Creating account...
                                            </>
                                        ) : (
                                            <>
                                                <span>✨</span>
                                                Create Account
                                            </>
                                        )}
                                    </button>

                                    {signupMsg && (
                                        <div className={`mt-3 rounded-2xl px-4 py-3 text-center border-2 backdrop-blur-md text-xs md:text-sm animate-slide-down ${signupMsg.includes("✅") ? "bg-emerald-500/15 border-emerald-300/50 text-emerald-100" : "bg-amber-500/15 border-amber-300/50 text-amber-100"}`}>
                                            {signupMsg}
                                        </div>
                                    )}
                                </form>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setView("login");
                                        setSignupMsg("");
                                    }}
                                    disabled={isSigningUp}
                                    className="w-full mt-3 text-xs md:text-sm text-white/90 hover:text-white transition-all duration-300 cursor-pointer font-medium py-2 md:py-2.5 rounded-xl hover:bg-white/10 hover:scale-[1.02] border border-white/20 hover:border-white/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>←</span>
                                    Back to Login
                                </button>
                            </>
                        )}
                    </div>

                    <div className="h-1.5 bg-gradient-to-r from-[#d4a574] via-white to-[#b88d63] relative overflow-hidden flex-shrink-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#8a6a44] via-white/60 to-transparent animate-shimmer"></div>
                    </div>
                </div>

                <div
                    dir="ltr"
                    className="hidden lg:flex flex-col items-center justify-center text-white px-6 xl:px-10 2xl:px-14 lg:order-2 flex-shrink-0"
                    style={{ animation: "fadeInUp 0.8s ease-out both", animationDelay: "50ms" }}
                >
                    <div className="relative">
                        <div className="absolute -inset-6 bg-white/5 rounded-full blur-3xl animate-pulse-slow"></div>
                        <img src={logo} alt="Broker City" className="relative scale-220 w-32 xl:w-40 2xl:w-48 h-auto mb-6 xl:mb-8 2xl:mb-10 drop-shadow-2xl transition-transform duration-500 hover:scale-105 rounded-2xl" />
                    </div>
                    <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-center mb-3 xl:mb-4 drop-shadow-lg tracking-wide">Broker City Properties</h1>
                    <div className="w-24 h-0.5 bg-gradient-to-r from-[#b88d63] via-white/80 to-[#b88d63] mb-4 xl:mb-5"></div>
                    <p className="text-base xl:text-lg 2xl:text-xl text-center text-white/85 leading-relaxed max-w-md">Your integrated digital real estate platform</p>

                    <div className="mt-8 xl:mt-10 2xl:mt-12 grid grid-cols-3 gap-5 xl:gap-6 2xl:gap-8 w-full max-w-md xl:max-w-lg">
                        {[
                            { Icon: IoBusiness, label: "Properties" },
                            { Icon: IoPeople, label: "Clients" },
                            { Icon: FaTasks, label: "Management" },
                        ].map(({ Icon, label }, i) => (
                            <div
                                key={label}
                                style={{ animation: "fadeInUp 0.6s ease-out both", animationDelay: `${300 + i * 120}ms` }}
                                className="bg-white/10 backdrop-blur-md rounded-sm p-5 xl:p-7 2xl:p-8 text-center border border-white/25 transition-all duration-500 hover:bg-white/20 hover:border-white/50 hover:-translate-y-1.5 hover:shadow-[0_15px_40px_-10px_rgba(255,255,255,0.35)] cursor-default group border-b-5"
                            >
                                <Icon className="text-2xl xl:text-3xl 2xl:text-4xl mx-auto mb-2 xl:mb-3 text-white/95 transition-all duration-300 group-hover:scale-110 group-hover:text-white" />
                                <span className="text-xs xl:text-sm text-white/90 font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="absolute bottom-3 md:bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 md:gap-1.5">
                <p className="text-white/30 text-[9px] md:text-xs tracking-wider">© {new Date().getFullYear()} Broker City Real Estate</p>
                <div className="flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                </div>
            </div>

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
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-30px) rotate(-5deg); }
                }
                @keyframes float-slow-delay {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-25px) rotate(5deg); }
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
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-float-slow { animation: float-slow 20s ease-in-out infinite; }
                .animate-float-slow-delay { animation: float-slow-delay 25s ease-in-out infinite; }
                .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
                .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }
                .animate-scale-in { animation: scale-in 0.6s ease-out; }
                .animate-slide-down { animation: slide-down 0.4s ease-out; }
                .animate-gradient-x { background-size: 200% 100%; animation: gradient-x 3s ease-in-out infinite; }
                .delay-1500 { animation-delay: 1.5s; }
                .delay-750 { animation-delay: 0.75s; }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @media (min-width: 768px) {
                    .no-scrollbar { overflow-y: hidden !important; }
                }
            `}</style>
        </div>
    );
}

export default Login;


// import { useState, useRef, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { saveTokens } from "../../utils/auth";
// import logo from '../../assets/images/white-logo.png';
// import background from "../../assets/images/background1.jpeg";
// import { FaEye, FaEyeSlash, FaBuilding, FaShieldAlt, FaUserTie, FaBalanceScale, FaChartLine, FaUsers, FaTasks } from "react-icons/fa";
// import { FaLanguage } from "react-icons/fa6";
// import { IoMegaphoneOutline, IoShield, IoSparkles, IoBusiness, IoPeople } from 'react-icons/io5';
// import { LuUsers } from 'react-icons/lu';
// import { GiCrown } from 'react-icons/gi';
// import { MdOutlineRealEstateAgent } from 'react-icons/md';

// import { usePermissions } from "../../pages/context/PermissionsContext";

// function Login() {
//     const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

//     const [form, setForm] = useState({ username: "", password: "" });
//     const [loginMode, setLoginMode] = useState(null);
//     const [msg, setMsg] = useState("");
//     const [isLoggingIn, setIsLoggingIn] = useState(false);
//     const [isFocused, setIsFocused] = useState(false);
//     const navigate = useNavigate();

//     const { refresh: refreshPermissions } = usePermissions();

//     const [showPassword, setShowPassword] = useState(false);
//     const passwordRef = useRef(null);
//     const loginTimeoutRef = useRef(null);
//     const isLoggingInRef = useRef(false);

//     useEffect(() => {
//         isLoggingInRef.current = isLoggingIn;
//     }, [isLoggingIn]);

//     useEffect(() => {
//         if (loginTimeoutRef.current) {
//             clearTimeout(loginTimeoutRef.current);
//             loginTimeoutRef.current = null;
//         }
//         if (
//             loginMode &&
//             form.username &&
//             form.password &&
//             form.password.length >= 4 &&
//             !isLoggingIn
//         ) {
//             loginTimeoutRef.current = setTimeout(() => {
//                 if (!isLoggingInRef.current) {
//                     handleSubmit();
//                 }
//             }, 600);
//         }
//         return () => {
//             if (loginTimeoutRef.current) {
//                 clearTimeout(loginTimeoutRef.current);
//                 loginTimeoutRef.current = null;
//             }
//         };
//     }, [form.password, form.username, loginMode, isLoggingIn]);

//     const handleChange = (e) => {
//         setForm({ ...form, [e.target.name]: e.target.value });
//         if (msg) setMsg("");
//     };

//     const handleUserLogin = (username) => {
//         if (loginTimeoutRef.current) {
//             clearTimeout(loginTimeoutRef.current);
//             loginTimeoutRef.current = null;
//         }
//         setLoginMode(username);
//         setForm({ username: username, password: "" });
//         setMsg("");
//         setIsLoggingIn(false);
//         setTimeout(() => { passwordRef.current?.focus(); }, 100);
//     };

//     const handleNormalLogin = () => {
//         if (loginTimeoutRef.current) {
//             clearTimeout(loginTimeoutRef.current);
//             loginTimeoutRef.current = null;
//         }
//         setLoginMode(null);
//         setForm({ username: "", password: "" });
//         setMsg("");
//         setIsLoggingIn(false);
//     };

//     const handleSubmit = async (e) => {
//         if (e?.preventDefault) e.preventDefault();
//         if (isLoggingInRef.current) return;

//         if (form.password.length < 4) {
//             setMsg("Password must be at least 4 characters long.");
//             passwordRef.current?.focus();
//             return;
//         }

//         setMsg("");
//         isLoggingInRef.current = true;
//         setIsLoggingIn(true);

//         try {
//             const response = await fetch(`${BASE}/api/token/`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(form),
//             });

//             let data = {};
//             try { data = await response.json(); } catch (jsonError) {
//                 console.error("Failed to parse login response:", jsonError);
//             }

//             console.log("Login response status:", response.status);

//             if (response.ok) {
//                 saveTokens(data);
//                 const savedAccessToken = localStorage.getItem("access_token");
//                 const savedRefreshToken = localStorage.getItem("refresh_token");

//                 if (!savedAccessToken || !savedRefreshToken) {
//                     console.error("Tokens were returned but were not saved.");
//                     setMsg("⚠️ Login succeeded but tokens could not be saved.");
//                     isLoggingInRef.current = false;
//                     setIsLoggingIn(false);
//                     return;
//                 }

//                 console.log("JWT tokens saved successfully.");

//                 if (data.user) {
//                     localStorage.setItem("user", JSON.stringify(data.user));
//                 }

//                 try {
//                     await refreshPermissions();
//                 } catch (err) {
//                     console.error("Failed to refresh permissions after login:", err);
//                 }

//                 setMsg("✅ Login successful! Redirecting...");
//                 setTimeout(() => { navigate("/en/dashboard"); }, 600);
//             } else {
//                 setMsg(data.detail || "❌ Login failed. Please try again.");
//                 isLoggingInRef.current = false;
//                 setIsLoggingIn(false);
//                 passwordRef.current?.focus();
//                 passwordRef.current?.select();
//             }
//         } catch (error) {
//             console.error("Login error:", error);
//             setMsg("⚠️ An error occurred during login. Please try again.");
//             isLoggingInRef.current = false;
//             setIsLoggingIn(false);
//         }
//     };

//     const handleKeyDown = (e) => {
//         if (e.key === "Enter" && form.password && !isLoggingIn) {
//             e.preventDefault();
//             handleSubmit(e);
//         }
//     };

//     // User role configurations — PRO role added
//     const userRoles = {
//         manager: {
//             title: 'General Manager',
//             icon: IoShield,
//             color: 'from-white/20 to-white/5',
//             bgColor: 'bg-white/10',
//             borderColor: 'border-[#a47d52]',
//             badgeColor: 'bg-white/15 text-white',
//             glowColor: 'shadow-white/20',
//             gradient: 'from-white/15 via-white/5 to-transparent',
//             emoji: '👑',
//             subtitle: 'Executive Management'
//         },
//         muhsin: {
//             title: 'Administrative Manager',
//             icon: FaUserTie,
//             color: 'from-white/20 to-white/5',
//             bgColor: 'bg-white/10',
//             borderColor: 'border-[#8a6a44]',
//             badgeColor: 'bg-white/15 text-white',
//             glowColor: 'shadow-white/20',
//             gradient: 'from-white/15 via-white/5 to-transparent',
//             emoji: '📋',
//             subtitle: 'Operations Management'
//         },
//         ghada: {
//             title: 'HR Manager',
//             icon: FaUsers,
//             color: 'from-white/20 to-white/5',
//             bgColor: 'bg-white/10',
//             borderColor: 'border-[#8a6a44]',
//             badgeColor: 'bg-white/15 text-white',
//             glowColor: 'shadow-white/20',
//             gradient: 'from-white/15 via-white/5 to-transparent',
//             emoji: '👥',
//             subtitle: 'Human Resources'
//         },
//         muhammed: {
//             title: 'Marketing Manager',
//             icon: FaChartLine,
//             color: 'from-white/20 to-white/5',
//             bgColor: 'bg-white/10',
//             borderColor: 'border-[#a47d52]',
//             badgeColor: 'bg-white/15 text-white',
//             glowColor: 'shadow-white/20',
//             gradient: 'from-white/15 via-white/5 to-transparent',
//             emoji: '📈',
//             subtitle: 'Marketing Strategy'
//         },
//         abubakr: {
//             title: 'Legal Advisor',
//             icon: FaBalanceScale,
//             color: 'from-white/20 to-white/5',
//             bgColor: 'bg-white/10',
//             borderColor: 'border-[#8a6a44]',
//             badgeColor: 'bg-white/15 text-white',
//             glowColor: 'shadow-white/20',
//             gradient: 'from-white/15 via-white/5 to-transparent',
//             emoji: '⚖️',
//             subtitle: 'Legal Affairs'
//         },
//         // ✅ NEW ROLE — PRO
//         pro: {
//             title: 'PRO',
//             icon: IoMegaphoneOutline,
//             color: 'from-white/20 to-white/5',
//             bgColor: 'bg-white/10',
//             borderColor: 'border-[#8a6a44]',
//             badgeColor: 'bg-white/15 text-white',
//             glowColor: 'shadow-white/20',
//             gradient: 'from-white/15 via-white/5 to-transparent',
//             emoji: '📢',
//             subtitle: 'Public Relations Officer'
//         }
//     };

//     const particles = Array.from({ length: 20 }, (_, i) => ({
//         id: i,
//         size: Math.random() * 4 + 2,
//         x: Math.random() * 100,
//         y: Math.random() * 100,
//         duration: Math.random() * 20 + 10,
//         delay: Math.random() * 10,
//         opacity: Math.random() * 0.3 + 0.1,
//     }));

//     // Shared renderer for a role card (used by both GM and other buttons)
//     const renderRoleCard = (key, role, extraClasses = "") => {
//         const Icon = role.icon;
//         return (
//             <button
//                 key={key}
//                 type="button"
//                 onClick={() => handleUserLogin(key)}
//                 className={`
//                     relative
//                     w-full
//                     h-20 md:h-[75px]
//                     bg-gradient-to-r ${role.color}
//                     bg-[length:200%_100%]
//                     hover:bg-[length:100%_100%]
//                     py-1
//                     px-2 md:px-3
//                     rounded-2xl
//                     transition-all
//                     duration-500
//                     cursor-pointer
//                     shadow-lg
//                     hover:shadow-2xl
//                     hover:scale-[1.02]
//                     group
//                     overflow-hidden
//                     border-b-4 ${role.borderColor}
//                     hover:border-white/60
//                     backdrop-blur-md
//                     animate-gradient-x
//                     ${extraClasses}
//                 `}
//             >
//                 <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
//                 <div className="absolute -inset-1 bg-white/15 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

//                 <div className='flex items-center gap-2 justify-between relative z-10'>
//                     <div className="flex items-center gap-2 md:gap-2">
//                         <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${role.badgeColor} border border-white/30 flex items-center justify-center backdrop-blur-sm flex-shrink-0`}>
//                             <Icon className='text-white text-xs md:text-sm' />
//                         </div>
//                         <div className="text-left flex flex-col gap-0">
//                             <span className='font-bold text-[10px] md:text-xs text-white block drop-shadow leading-tight'>
//                                 {role.title}
//                             </span>
//                             <span className='text-[7px] md:text-[9px] text-white/70 leading-tight'>
//                                 {role.subtitle}
//                             </span>
//                         </div>
//                     </div>
//                 </div>
//             </button>
//         );
//     };

//     return (
//         <div
//             dir="ltr"
//             className="min-h-screen h-screen max-h-screen flex items-center justify-center p-2 md:p-4 lg:p-8 bg-cover bg-center bg-no-repeat relative overflow-hidden"
//             style={{ backgroundImage: `url(${background})` }}
//         >
//             {/* Animated Gradient Overlay */}
//             <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/30 to-black/75"></div>

//             {/* Animated Background Particles */}
//             <div className="absolute inset-0 overflow-hidden pointer-events-none">
//                 {particles.map((p) => (
//                     <div
//                         key={p.id}
//                         className="absolute rounded-full bg-white/20"
//                         style={{
//                             width: p.size, height: p.size,
//                             left: `${p.x}%`, top: `${p.y}%`,
//                             animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
//                             opacity: p.opacity,
//                         }}
//                     />
//                 ))}
//             </div>

//             {/* Decorative Orbs */}
//             <div className="absolute top-10 right-10 w-72 h-72 bg-white/5 rounded-full blur-3xl animate-pulse-slow hidden 2xl:block"></div>
//             <div className="absolute bottom-10 left-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse-slow delay-1500 hidden 2xl:block"></div>
//             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-pulse-slow delay-750 hidden 2xl:block"></div>

//             <div className="absolute top-1/4 right-1/4 animate-float-slow opacity-20 text-8xl hidden 2xl:block">💎</div>
//             <div className="absolute bottom-1/4 right-1/4 animate-float-slow-delay opacity-20 text-8xl hidden 2xl:block">✨</div>

//             {/* Content row */}
//             <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 2xl:gap-20 h-full max-h-full overflow-hidden">

//                 {/* LEFT SIDE — Login Form */}
//                 <div className="relative w-full max-w-lg lg:max-w-xl xl:max-w-2xl flex flex-col rounded-3xl overflow-hidden bg-transparent backdrop-blur-2xl backdrop-saturate-150 border border-white/30 shadow-[0_30px_80px_rgba(0,0,0,0.4)] transition-all duration-500 hover:shadow-[0_40px_100px_rgba(255,255,255,0.15)] animate-scale-in lg:order-1 max-h-[95vh] lg:max-h-[92vh] no-scrollbar">
//                     <div className="h-1.5 bg-gradient-to-r from-[#d4a574] via-white to-[#b88d63] relative overflow-hidden flex-shrink-0">
//                         <div className="absolute inset-0 bg-gradient-to-r from-[#8a6a44] via-white/60 to-transparent animate-shimmer"></div>
//                     </div>

//                     <div className="w-full bg-transparent px-5 md:px-8 lg:px-10 pt-8 md:pt-50 lg:pt-10 pb-5 md:pb-7 lg:pb-8 flex flex-col justify-center relative overflow-y-auto no-scrollbar flex-1">
//                         <div className="absolute top-0 left-0 w-32 h-32 overflow-hidden opacity-10 pointer-events-none">
//                             <div className="w-full h-full bg-gradient-to-br from-white to-transparent transform rotate-45 -translate-x-8 -translate-y-8"></div>
//                         </div>
//                         <div className="absolute bottom-0 right-0 w-32 h-32 overflow-hidden opacity-10 pointer-events-none">
//                             <div className="w-full h-full bg-gradient-to-tl from-white to-transparent transform rotate-45 translate-x-8 translate-y-8"></div>
//                         </div>

//                         {/* Logo Section */}
//                         <div className="flex flex-col items-center justify-center mb-5 md:mb-6 relative flex-shrink-0">
//                             <div className='flex flex-col justify-center md:flex md:flex-row md:justify-between items-center w-full gap-3 md:mt-20 lg:mt-16 xl:mt-10 2xl:mt-0'>
//                                 <div className="relative group order-2 md:order-1 md:ml-11">
//                                     <img
//                                         src={logo}
//                                         alt="Broker City Logo"
//                                         className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-2xl mb-2 md:mb-0 relative z-10 shadow-2xl group-hover:ring-white/60 transition-all duration-500 group-hover:scale-105 scale-250 md:ml-4"
//                                     />
//                                 </div>
//                                 <div className="text-center md:text-left relative order-1 md:order-2">
//                                     <h1 className="text-xl md:text-3xl lg:text-4xl font-extrabold text-white mb-1 drop-shadow-lg tracking-wide">
//                                         Broker City Properties
//                                     </h1>
//                                     <div className="flex items-center justify-center md:justify-start gap-2">
//                                         <div className="w-12 md:w-16 h-0.5 bg-gradient-to-r from-transparent to-white/80"></div>
//                                         <MdOutlineRealEstateAgent className="text-white/80 text-base md:text-lg" />
//                                     </div>
//                                 </div>
//                             </div>

//                             <div className="flex items-center justify-between w-full mt-4 md:mt-5">
//                                 <div className="flex items-center gap-2">
//                                     <p className="text-white/85 text-xs md:text-sm font-light">Integrated Real Estate Platform</p>
//                                     <div className="flex gap-1">
//                                         {[...Array(3)].map((_, i) => (
//                                             <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}></span>
//                                         ))}
//                                     </div>
//                                 </div>

//                                 <div className="flex flex-row items-center gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-500 cursor-pointer border border-white/30 hover:border-white/60 hover:shadow-lg hover:scale-105 group relative overflow-hidden backdrop-blur-md" onClick={() => navigate('/ar/login')}>
//                                     <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
//                                     <span className="text-white/80 text-xs relative z-10">←</span>
//                                     <FaLanguage className="text-white w-3.5 h-3.5 relative z-10" />
//                                     <p className="text-white text-xs md:text-sm font-medium m-0 p-0 relative z-10">AR</p>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* Quick Login Buttons */}
//                         {!loginMode && (
//                             <div className="mb-3 md:mb-4 flex-shrink-0">
//                                 <div className="flex items-center gap-3 mb-2.5 md:mb-3">
//                                     <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/80"></div>
//                                     <div className="flex items-center gap-2">
//                                         <IoSparkles className="text-white/90 text-xs md:text-sm" />
//                                         <span className="text-[10px] md:text-xs text-[#f8f7f5] font-medium tracking-wider">Management</span>
//                                         <IoSparkles className="text-white/90 text-xs md:text-sm" />
//                                     </div>
//                                     <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/80"></div>
//                                 </div>

//                                 <div className="flex flex-col gap-2 md:gap-2.5">

//                                     {/* ✅ ROW 1: General Manager + Administrative Manager in one line */}
//                                     <div className="grid grid-cols-2 gap-2 md:gap-2.5">
//                                         {renderRoleCard('manager', userRoles.manager)}
//                                         {renderRoleCard('muhsin', userRoles.muhsin)}
//                                     </div>

//                                     {/* ✅ ROW 2+: remaining roles (HR, Marketing, Legal, PRO) in 2-column grid */}
//                                     <div className="grid grid-cols-2 gap-2 md:gap-2.5">
//                                         {Object.entries(userRoles)
//                                             .filter(([key]) => !['manager', 'muhsin'].includes(key))
//                                             .map(([key, role]) => renderRoleCard(key, role))}
//                                     </div>
//                                 </div>
//                             </div>
//                         )}

//                         {/* Selected User Header */}
//                         {loginMode && (
//                             <div className="mb-3 md:mb-4 rounded-2xl bg-white/10 border border-white/30 px-4 md:px-5 py-2.5 md:py-3.5 text-center relative overflow-hidden shadow-inner flex-shrink-0 backdrop-blur-md">
//                                 <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5"></div>
//                                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
//                                 <div className="relative z-10">
//                                     <div className="flex items-center justify-center gap-2 md:gap-3">
//                                         <div className="flex items-center gap-1 md:gap-2">
//                                             <span className="text-[10px] md:text-xs text-white/75">User:</span>
//                                             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
//                                         </div>
//                                         <span className="text-xs md:text-sm font-bold text-white">{loginMode}</span>
//                                         <div className="w-px h-3 md:h-4 bg-white/30"></div>
//                                         <div className="flex items-center gap-1">
//                                             <IoSparkles className="text-white/80 text-[10px] md:text-xs" />
//                                             <span className="text-[8px] md:text-[10px] text-green-400">Online</span>
//                                         </div>
//                                     </div>
//                                     {isLoggingIn && (
//                                         <div className="flex items-center justify-center gap-2 mt-1">
//                                             <svg className="animate-spin h-3 w-3 md:h-3.5 md:w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                             </svg>
//                                             <p className="text-[10px] md:text-xs text-white font-medium">Signing in...</p>
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>
//                         )}

//                         {/* Login Form */}
//                         <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4 flex-1">
//                             {!loginMode && (
//                                 <div className="flex-shrink-0">
//                                     <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
//                                         <span className="flex items-center gap-2">
//                                             <FaBuilding className="text-white/80 text-[10px] md:text-xs" />
//                                             Username
//                                         </span>
//                                     </label>
//                                     <div className="relative group">
//                                         <input
//                                             name="username"
//                                             value={form.username}
//                                             onChange={handleChange}
//                                             placeholder="Enter your username"
//                                             required
//                                             className="w-full rounded-2xl border-b-2 border-[#a47d52] bg-white/10 backdrop-blur-md px-4 md:px-5 py-2.5 md:py-3 pr-11 md:pr-12 outline-none focus:ring-4 focus:ring-white/25 focus:border-white/60 text-white placeholder:text-white/45 transition-all duration-300 group-hover:border-white/50 text-left text-sm md:text-base"
//                                         />
//                                         <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors duration-300">
//                                             <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                                             </svg>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}

//                             <div className="flex-shrink-0">
//                                 <label className="block text-xs md:text-sm font-medium text-white/90 mb-2">
//                                     <span className="flex items-center gap-2">
//                                         <FaShieldAlt className="text-white/80 text-[10px] md:text-xs" />
//                                         Password
//                                         {loginMode && (
//                                             <span className="text-[9px] md:text-xs text-white/90 ml-2 font-normal bg-white/15 border border-white/25 px-2 py-0.5 rounded-full">
//                                                 Auto-login
//                                             </span>
//                                         )}
//                                     </span>
//                                 </label>
//                                 <div className="relative group">
//                                     <input
//                                         ref={passwordRef}
//                                         name="password"
//                                         type={showPassword ? "text" : "password"}
//                                         value={form.password}
//                                         onChange={handleChange}
//                                         onKeyDown={handleKeyDown}
//                                         onFocus={() => setIsFocused(true)}
//                                         onBlur={() => setIsFocused(false)}
//                                         placeholder="Enter your password"
//                                         required
//                                         disabled={isLoggingIn}
//                                         className={`
//                                             w-full rounded-2xl border-b-2
//                                             ${form.password.length >= 4 && !isLoggingIn
//                                                 ? 'border-emerald-300/60 bg-emerald-500/10'
//                                                 : form.password.length > 0 && form.password.length < 4
//                                                 ? 'border-yellow-300/60 bg-yellow-500/10'
//                                                 : 'border-[#a47d52] bg-white/10'}
//                                             backdrop-blur-md px-4 md:px-5 py-2.5 md:py-3 pr-11 md:pr-12
//                                             outline-none focus:ring-4 focus:ring-white/25 focus:border-white/60
//                                             transition-all duration-300 text-white placeholder:text-white/45
//                                             disabled:opacity-60 disabled:cursor-not-allowed
//                                             group-hover:border-white/50 text-left text-sm md:text-base
//                                         `}
//                                     />
//                                     {form.password.length > 0 && (
//                                         <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2">
//                                             <div className={`w-2 h-2 rounded-full ${form.password.length >= 4 ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`}></div>
//                                         </div>
//                                     )}
//                                     <button
//                                         type="button"
//                                         onClick={() => setShowPassword((prev) => !prev)}
//                                         className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white cursor-pointer transition-all duration-300 p-2 rounded-xl hover:bg-white/10 hover:scale-110"
//                                         aria-label={showPassword ? "Hide password" : "Show password"}
//                                         disabled={isLoggingIn}
//                                     >
//                                         {showPassword ? <FaEyeSlash size={14} className="md:w-[18px] md:h-[18px]" /> : <FaEye size={14} className="md:w-[18px] md:h-[18px]" />}
//                                     </button>
//                                     {isFocused && (
//                                         <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl blur-sm -z-10 animate-pulse"></div>
//                                     )}
//                                 </div>
//                                 {loginMode && form.password.length === 0 && (
//                                     <p className="text-[10px] md:text-xs text-white/60 mt-2 flex items-center gap-1.5">
//                                         <span className="text-base md:text-lg">🔑</span>
//                                         Enter your password for auto-login
//                                     </p>
//                                 )}
//                                 {loginMode && form.password.length > 0 && form.password.length < 4 && (
//                                     <p className="text-[10px] md:text-xs text-yellow-200 mt-2 flex items-center gap-1.5">
//                                         <span className="text-base md:text-lg">⚠️</span>
//                                         Password is too short (minimum 4 characters)
//                                     </p>
//                                 )}
//                                 {loginMode && form.password.length >= 4 && (
//                                     <p className="text-[10px] md:text-xs text-emerald-200 mt-2 flex items-center gap-1.5 animate-pulse">
//                                         <span className="text-base md:text-lg">✅</span>
//                                         Password ready — auto-login enabled
//                                     </p>
//                                 )}
//                             </div>

//                             <button type="submit" disabled={isLoggingIn} className="sr-only" aria-hidden="true" tabIndex={-1}>
//                                 Sign In
//                             </button>

//                             {isLoggingIn && (
//                                 <div className="relative mt-2 w-full rounded-2xl overflow-hidden bg-white/10 border border-white/30 px-5 md:px-6 py-3 md:py-3.5 animate-slide-down flex-shrink-0 backdrop-blur-md">
//                                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-shimmer"></div>
//                                     <div className="relative z-10 flex items-center justify-center gap-3">
//                                         <div className="relative">
//                                             <div className="absolute -inset-1.5 bg-white/25 rounded-full blur-md animate-pulse"></div>
//                                             <svg className="relative animate-spin h-5 w-5 md:h-6 md:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                                                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                                                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                                             </svg>
//                                         </div>
//                                         <div className="flex flex-col text-left">
//                                             <span className="text-xs md:text-sm font-bold text-white">Login successful</span>
//                                             <span className="text-[9px] md:text-[10px] text-white/60">Please wait a moment</span>
//                                         </div>
//                                         <div className="flex gap-1">
//                                             {[0, 1, 2].map((i) => (
//                                                 <span key={i} className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></span>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}
//                         </form>

//                         {loginMode && (
//                             <button
//                                 type="button"
//                                 onClick={handleNormalLogin}
//                                 disabled={isLoggingIn}
//                                 className="w-full mt-3 md:mt-4 text-xs md:text-sm text-white/90 hover:text-white transition-all duration-300 cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed py-2 md:py-2.5 rounded-xl hover:bg-white/10 hover:scale-[1.02] border border-white/20 hover:border-white/40 flex items-center justify-center gap-2 flex-shrink-0"
//                             >
//                                 <span>←</span>
//                                 Back to normal login
//                             </button>
//                         )}

//                         {msg && (
//                             <div className={`
//                                 mt-3 md:mt-4 rounded-2xl px-5 md:px-6 py-3 md:py-3.5 text-center border-2
//                                 animate-slide-down backdrop-blur-md
//                                 ${msg.includes('✅') ? 'bg-emerald-500/15 border-emerald-300/50 text-emerald-100' : 'bg-amber-500/15 border-amber-300/50 text-amber-100'}
//                                 flex items-center gap-2 justify-center flex-shrink-0
//                             `}>
//                                 <p className="text-xs md:text-sm font-medium">{msg}</p>
//                             </div>
//                         )}

//                         {!loginMode && (
//                             <div className="mt-3 md:mt-4 text-center text-xs md:text-sm flex-shrink-0">
//                                 <span className="text-white/70">Don't have an account?</span>
//                                 <a href="" className="ml-2 font-semibold text-white hover:text-white/80 transition-all duration-300 underline-offset-4 hover:underline hover:scale-105 inline-block">
//                                     <span className="mr-1">✨</span>
//                                     Create new account
//                                 </a>
//                             </div>
//                         )}
//                     </div>

//                     <div className="h-1.5 bg-gradient-to-r from-[#d4a574] via-white to-[#b88d63] relative overflow-hidden flex-shrink-0">
//                         <div className="absolute inset-0 bg-gradient-to-r from-[#8a6a44] via-white/60 to-transparent animate-shimmer"></div>
//                     </div>
//                 </div>

//                 {/* RIGHT SIDE — INFORMATION PANEL */}
//                 <div
//                     dir="ltr"
//                     className="hidden lg:flex flex-col items-center justify-center text-white px-6 xl:px-10 2xl:px-14 lg:order-2 flex-shrink-0"
//                     style={{ animation: "fadeInUp 0.8s ease-out both", animationDelay: "50ms" }}
//                 >
//                     <div className="relative">
//                         <div className="absolute -inset-6 bg-white/5 rounded-full blur-3xl animate-pulse-slow"></div>
//                         <img src={logo} alt="Broker City" className="relative scale-220 w-32 xl:w-40 2xl:w-48 h-auto mb-6 xl:mb-8 2xl:mb-10 drop-shadow-2xl transition-transform duration-500 hover:scale-105 rounded-2xl" />
//                     </div>
//                     <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold text-center mb-3 xl:mb-4 drop-shadow-lg tracking-wide">Broker City Properties</h1>
//                     <div className="w-24 h-0.5 bg-gradient-to-r from-[#b88d63] via-white/80 to-[#b88d63] mb-4 xl:mb-5"></div>
//                     <p className="text-base xl:text-lg 2xl:text-xl text-center text-white/85 leading-relaxed max-w-md">Your integrated digital real estate platform</p>

//                     <div className="mt-8 xl:mt-10 2xl:mt-12 grid grid-cols-3 gap-5 xl:gap-6 2xl:gap-8 w-full max-w-md xl:max-w-lg">
//                         {[
//                             { Icon: IoBusiness, label: "Properties" },
//                             { Icon: IoPeople, label: "Clients" },
//                             { Icon: FaTasks, label: "Management" },
//                         ].map(({ Icon, label }, i) => (
//                             <div
//                                 key={label}
//                                 style={{ animation: "fadeInUp 0.6s ease-out both", animationDelay: `${300 + i * 120}ms` }}
//                                 className="bg-white/10 backdrop-blur-md rounded-sm p-5 xl:p-7 2xl:p-8 text-center border border-white/25 transition-all duration-500 hover:bg-white/20 hover:border-white/50 hover:-translate-y-1.5 hover:shadow-[0_15px_40px_-10px_rgba(255,255,255,0.35)] cursor-default group border-b-5"
//                             >
//                                 <Icon className="text-2xl xl:text-3xl 2xl:text-4xl mx-auto mb-2 xl:mb-3 text-white/95 transition-all duration-300 group-hover:scale-110 group-hover:text-white" />
//                                 <span className="text-xs xl:text-sm text-white/90 font-medium">{label}</span>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             </div>

//             {/* Footer */}
//             <div className="absolute bottom-3 md:bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 md:gap-1.5">
//                 <p className="text-white/30 text-[9px] md:text-xs tracking-wider">© {new Date().getFullYear()} Broker City Real Estate</p>
//                 <div className="flex gap-1">
//                     <span className="w-1 h-1 rounded-full bg-white/20"></span>
//                     <span className="w-1 h-1 rounded-full bg-white/20"></span>
//                     <span className="w-1 h-1 rounded-full bg-white/20"></span>
//                 </div>
//             </div>

//             {/* Custom Animations */}
//             <style>{`
//                 @keyframes fadeInUp {
//                     from { opacity: 0; transform: translateY(16px); }
//                     to   { opacity: 1; transform: translateY(0); }
//                 }
//                 @keyframes float {
//                     0%, 100% { transform: translateY(0px) translateX(0px); }
//                     25% { transform: translateY(-20px) translateX(-10px); }
//                     50% { transform: translateY(-10px) translateX(10px); }
//                     75% { transform: translateY(-30px) translateX(-5px); }
//                 }
//                 @keyframes float-slow {
//                     0%, 100% { transform: translateY(0px) rotate(0deg); }
//                     50% { transform: translateY(-30px) rotate(-5deg); }
//                 }
//                 @keyframes float-slow-delay {
//                     0%, 100% { transform: translateY(0px) rotate(0deg); }
//                     50% { transform: translateY(-25px) rotate(5deg); }
//                 }
//                 @keyframes pulse-slow {
//                     0%, 100% { opacity: 0.3; transform: scale(1); }
//                     50% { opacity: 0.6; transform: scale(1.1); }
//                 }
//                 @keyframes shimmer {
//                     0% { transform: translateX(-100%); }
//                     100% { transform: translateX(100%); }
//                 }
//                 @keyframes scale-in {
//                     from { opacity: 0; transform: scale(0.95) translateY(20px); }
//                     to   { opacity: 1; transform: scale(1) translateY(0); }
//                 }
//                 @keyframes slide-down {
//                     from { opacity: 0; transform: translateY(-10px); }
//                     to   { opacity: 1; transform: translateY(0); }
//                 }
//                 @keyframes gradient-x {
//                     0% { background-position: 0% 50%; }
//                     50% { background-position: 100% 50%; }
//                     100% { background-position: 0% 50%; }
//                 }
//                 .animate-float-slow { animation: float-slow 20s ease-in-out infinite; }
//                 .animate-float-slow-delay { animation: float-slow-delay 25s ease-in-out infinite; }
//                 .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
//                 .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }
//                 .animate-scale-in { animation: scale-in 0.6s ease-out; }
//                 .animate-slide-down { animation: slide-down 0.4s ease-out; }
//                 .animate-gradient-x { background-size: 200% 100%; animation: gradient-x 3s ease-in-out infinite; }
//                 .delay-1500 { animation-delay: 1.5s; }
//                 .delay-750 { animation-delay: 0.75s; }
//                 .no-scrollbar {
//                     -ms-overflow-style: none;
//                     scrollbar-width: none;
//                 }
//                 .no-scrollbar::-webkit-scrollbar { display: none; }
//                 @media (min-width: 768px) {
//                     .no-scrollbar { overflow-y: hidden !important; }
//                 }
//             `}</style>
//         </div>
//     );
// }

// export default Login;


