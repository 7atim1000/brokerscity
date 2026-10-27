import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../../../assets/images/white-logo.png";

import {
    clearTokens,
    getAccessToken,
    authFetch,
} from "../../../utils/auth";

import { SlUserFollow } from "react-icons/sl";
import { MdDashboardCustomize } from "react-icons/md";
import { IoMdLogOut } from "react-icons/io";
import {
    FaBars,
    FaTimes,
    FaUserCircle,
    FaPauseCircle,
    FaPlayCircle,
    FaCog,
    FaUser,
    FaPowerOff,
    FaWifi,
    FaClock,              // ✅ ADDED — clock icon
} from "react-icons/fa";

import { BsCalendar2Date } from "react-icons/bs";
import { FaClockRotateLeft } from "react-icons/fa6";   // 🔄 ADDED


/* ============================================================
   STATUS CONFIG
============================================================ */
const STATUS_CONFIG = {
    logged_in: {
        label: "مسجل الدخول",
        color: "bg-blue-400",
        animate: true,
    },
    online: {
        label: "متصل",
        color: "bg-emerald-400",
        animate: true,
    },
    pause: {
        label: "متوقف مؤقتاً",
        color: "bg-amber-400",
        animate: false,
    },
    offline: {
        label: "غير متصل",
        color: "bg-gray-400",
        animate: false,
    },
    logged_out: {
        label: "خرج",
        color: "bg-red-400",
        animate: false,
    },
};

const getStatusConfig = (status) =>
    STATUS_CONFIG[status] || STATUS_CONFIG.offline;


/* ============================================================
   LIVE DIGITAL CLOCK — Abu Dhabi time, English date format
   Fetches real time from timeapi.io (free, no API key needed)
   Falls back to local time only if the API fails.
============================================================ */
const pad = (n) => String(n).padStart(2, "0");

const DigitalClock = () => {
    const [now, setNow] = useState(new Date());
    const [synced, setSynced] = useState(false);
    const offsetRef = useRef(0); // difference between server time and local time

    // Fetch real Abu Dhabi time once, then sync locally
    useEffect(() => {
        let cancelled = false;

        const fetchTime = async () => {
            try {
                // timeapi.io returns current time in Asia/Dubai
                const res = await fetch(
                    "https://timeapi.io/api/Time/current/zone?timeZone=Asia/Dubai"
                );
                if (!res.ok) throw new Error("Time API failed");

                const data = await res.json();

                // Build a Date object from the API response (already Dubai local time)
                const serverDate = new Date(
                    data.year,
                    data.month - 1,
                    data.day,
                    data.hour,
                    data.minute,
                    data.seconds
                );

                if (!cancelled) {
                    // Compute offset: server time - local time
                    offsetRef.current = serverDate.getTime() - Date.now();
                    setNow(serverDate);
                    setSynced(true);
                }
            } catch (err) {
                console.warn("Time sync failed, using local clock:", err);
            }
        };

        fetchTime();

        // Re-sync every 10 minutes to stay accurate
        const syncInterval = setInterval(fetchTime, 10 * 60 * 1000);

        return () => {
            cancelled = true;
            clearInterval(syncInterval);
        };
    }, []);

    // Tick every second using the offset
    useEffect(() => {
        const id = setInterval(() => {
            setNow(new Date(Date.now() + offsetRef.current));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());

    // ✅ English date format: DD/MM/YYYY
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    return (
        <div
            dir="ltr"
            className="
                flex items-center gap-1.5 sm:gap-2
                px-2.5 sm:px-3
                py-1
                rounded-lg
                bg-white/25
                backdrop-blur-sm
                border border-white/40
                shadow-sm
                select-none
            "
            title={`Abu Dhabi Time (UTC+4)${synced ? "" : " — local fallback"}`}
        >
            <BsCalendar2Date className="text-white/90 text-[10px] sm:text-xs shrink-0" />

            {/* Date — English DD/MM/YYYY */}
            <span
    className="
        font-mono font-black
        text-white
        text-xs sm:text-sm
        tabular-nums
        tracking-wide
        leading-none
        [-webkit-text-stroke:0.3px_white]
    "
>
    {dateStr}
</span>

            {/* <span className="text-white/50 text-[10px] sm:text-xs leading-none">
                ·
            </span> */}
            <FaClock className="text-[#f8f7f5] text-[10px] sm:text-xs shrink-0" />

            {/* Time — HH:MM:SS */}
            <span
    className="
        font-mono font-black
        text-white
        text-sm sm:text-base
        tabular-nums
        tracking-wider
        leading-none
        [-webkit-text-stroke:0.3px_white]
    "
>
    {hh}:{mm}:{ss}
</span>
        </div>
    );
};
/* ============================================================
   End Live date and time
============================================================ */

/* ============================================================
   NAVBAR
============================================================ */
const Navbar = () => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const menuRef = useRef(null);
    const isLoggedIn = !!getAccessToken();

    /* =========================================================
       GET LOGGED-IN USER
    ========================================================= */
    useEffect(() => {
        if (!isLoggedIn) {
            setLoading(false);
            return;
        }

        const fetchUser = async () => {
            try {
                const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
                const response = await authFetch(`${BASE}/api/me/`);

                if (!response.ok) {
                    throw new Error("Failed to get user information");
                }

                const data = await response.json();
                setUser(data);
            } catch (error) {
                console.error("Error fetching user:", error);
                clearTokens();
                navigate("/login");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [isLoggedIn, navigate]);

    /* =========================================================
       HEARTBEAT — only when status is NOT pause / offline
    ========================================================= */
    useEffect(() => {
        if (!isLoggedIn || !user) return;
        if (user.status === "pause") return;
        if (user.status === "offline") return;
        if (user.status === "logged_out") return;

        const sendHeartbeat = async () => {
            try {
                const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
                const res = await authFetch(`${BASE}/api/profile/heartbeat/`, {
                    method: "POST",
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status) {
                        setUser((prev) =>
                            prev ? { ...prev, status: data.status } : prev
                        );
                    }
                }
            } catch (err) {
                /* silent */
            }
        };

        const initial = setTimeout(sendHeartbeat, 3000);
        const interval = setInterval(sendHeartbeat, 30000);

        return () => {
            clearTimeout(initial);
            clearInterval(interval);
        };
    }, [isLoggedIn, user?.status, user?.id]);

    /* =========================================================
       MARK OFFLINE ON TAB CLOSE
    ========================================================= */
    useEffect(() => {
        if (!isLoggedIn) return;

        const handleBeforeUnload = () => {
            try {
                const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
                const blob = new Blob([""], { type: "application/json" });
                navigator.sendBeacon(`${BASE}/api/profile/offline/`, blob);
            } catch (err) {
                /* silent */
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isLoggedIn]);

    /* =========================================================
       CLOSE MENU — outside click + Escape
    ========================================================= */
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        const handleEscape = (e) => {
            if (e.key === "Escape") setMenuOpen(false);
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    /* =========================================================
       STATUS ACTIONS
    ========================================================= */
    const callStatusEndpoint = async (endpoint, nextStatus) => {
        setActionLoading(true);
        try {
            const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
            const res = await authFetch(`${BASE}${endpoint}`, {
                method: "POST",
            });
            if (res.ok) {
                const data = await res.json();
                setUser((prev) =>
                    prev ? { ...prev, status: data.status || nextStatus } : prev
                );
            }
        } catch (err) {
            console.error("Status action failed:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePause = async () => {
        await callStatusEndpoint("/api/profile/pause/", "pause");
        setMenuOpen(false);
    };

    const handleResume = async () => {
        await callStatusEndpoint("/api/profile/resume/", "online");
        setMenuOpen(false);
    };

    /* =========================================================
       OFFLINE — manual only, no auto-recovery
    ========================================================= */
    const handleOffline = async () => {
        await callStatusEndpoint("/api/profile/offline/", "offline");
        setMenuOpen(false);
    };

    /* =========================================================
       ONLINE — manual only
    ========================================================= */
    const handleOnline = async () => {
        await callStatusEndpoint("/api/profile/heartbeat/", "online");
        setMenuOpen(false);
    };

    /* =========================================================
       LOGOUT
    ========================================================= */
    const handleLogout = async () => {
        setActionLoading(true);
        try {
            const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
            await authFetch(`${BASE}/api/logout/`, { method: "POST" });
        } catch (err) {
            console.error("Logout request failed:", err);
        } finally {
            clearTokens();
            setActionLoading(false);
            setMenuOpen(false);
            navigate("/ar/login");
        }
    };

    const statusConfig = user ? getStatusConfig(user.status) : null;

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <nav
            dir="rtl"
            // ✅ Height reduced: h-12 on mobile, h-14 on desktop
            className="
                fixed top-0 left-0 right-0
                h-12 sm:h-14
                bg-gradient-to-l
                from-[#f8f7f5]
                via-[#a47d52]
                to-[#a47d52]

                border-b
                border-[#a47d52]/30
                shadow-[0_4px_20px_rgba(164,125,82,0.25)]

                z-50
                px-3 sm:px-5
                transition-all
                duration-300
                bg-gradient-to-l from-[#f8f7f5]/10 via-[#a47d52]/80 to-[#a47d52]/10
            "
        >
            {/* 3-column layout: right (title) | center (logo) | left (clock + user actions) */}
            <div className="relative h-full flex items-center justify-between gap-3 sm:gap-4 bg-white/20">
                {/* RIGHT SIDE — Bilingual title */}
                <div className="flex flex-col items-center justify-center leading-tight min-w-0 shrink mx-2 sm:mx-4 ">
                    {/* 
  ✅ FONT WEIGHT INCREASE (TOP TEXT):
  - Replaced `font-black` (900) with `font-[1000]` to force the absolute heaviest weight.
  - Added `[-webkit-text-stroke:0.5px_#203A5A]` to add a tiny stroke around the letters, 
    making them visually thicker without making the font size larger.  
*/}
<span
    className="
        text-[#f8f7f5]
        font-[1000]
        text-[10px]
        sm:text-base
        md:text-base
        tracking-wide
        scale-110
        whitespace-nowrap
        drop-shadow-[#f8f7f5]
        [-webkit-text-stroke:0.5px_#f8f7f5]
    "
>
    منصة بروكر سيتي العقارية الرقمية
</span> 
{/* text-[#203A5A] 
drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]
 [-webkit-text-stroke:0.5px_#203A5A]
*/}

{/* 
  ✅ FONT WEIGHT INCREASE (BOTTOM TEXT):
  - Upgraded from `font-extrabold` (800) to `font-black` (900) to match the Arabic weight.
  - Added the same `[-webkit-text-stroke:0.3px_#203A5A]` for extra thickness.
  - Kept the inline style textShadow for the bright background glow.
*/}
<span
    className="
        text-white
        font-black
        text-[13px]
        sm:text-xs
        tracking-wider
        whitespace-nowrap
        scale-110
        [-webkit-text-stroke:0.3px_#835802]
    "
    // #835802 #203A5A
    style={{ textShadow: "0 1px 2px white" }}
>   
    Broker City Real Estate
</span>
                </div>

                {/* CENTER — Logo (absolutely centered) */}
                <Link
                    to="/ar-dashboard"
                    className="
                        absolute
                        left-1/2
                        -translate-x-1/2
                        flex
                        items-center
                        justify-center
                        shrink-0
                        rounded-full
                        p-1
                        transition-transform
                        duration-300
                        hover:scale-110
                    "
                >
                    <img
                        src={logo}
                        alt="Broker City"
                        // ✅ Logo scaled down to fit shorter navbar
                        className="
                            h-10
                            sm:h-14
                            w-auto
                            object-contain
                            scale-165
                            contrast-125
                            saturate-125
                        "
                        style={{
                            filter:
                                "drop-shadow(0 0 1px rgba(0,0,0,0.25)) contrast(1.2) saturate(1.15)",
                        }}
                    />
                </Link>

                {/* LEFT SIDE — Clock + User Information / Auth buttons */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {/* ✅ LIVE DIGITAL CLOCK — always visible */}
                    <div className="hidden md:block">
                        <DigitalClock />
                    </div>

                    {!isLoggedIn ? (
                        <>
                            <Link
                                to="/login"
                                className="
                                    px-3 py-1.5
                                    rounded-lg
                                    text-[#a47d52]
                                    font-bold text-xs sm:text-sm
                                    bg-white/70
                                    hover:bg-white
                                    shadow-sm
                                    hover:shadow-md
                                    border
                                    border-[#a47d52]/20
                                    transition-all
                                    duration-200
                                "
                            >
                                تسجيل الدخول
                            </Link>

                            <Link
                                to="/signup"
                                className="
                                    hidden
                                    sm:inline-block
                                    px-3 py-1.5
                                    rounded-lg
                                    text-white
                                    font-bold text-xs sm:text-sm
                                    bg-gradient-to-l
                                    from-[#a47d52]
                                    to-[#b88d63]
                                    hover:from-[#8a6a44]
                                    hover:to-[#a47d52]
                                    shadow-md
                                    hover:shadow-lg
                                    transition-all
                                    duration-200
                                "
                            >
                                إنشاء حساب
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* ================== USER PILL ================== */}
                            {!loading && user && (
                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        px-2
                                        sm:px-3
                                        py-0.5
                                        rounded-full
                                        bg-white/20
                                        backdrop-blur-sm
                                        border
                                        border-white/30
                                        shadow-sm
                                        hover:bg-white/30
                                        transition-all
                                        duration-200
                                    "
                                >
                                    {/* User Image + status dot */}
                                    <div className="relative shrink-0">
                                        {user.image ? (
                                            <img
                                                src={`${import.meta.env.VITE_DJANGO_BASE_URL}${user.image}`}
                                                alt={user.username}
                                                className="
                                                    w-8 h-8
                                                    sm:w-9 sm:h-9
                                                    rounded-full
                                                    object-cover
                                                    border-2
                                                    border-white
                                                    shadow-sm
                                                "
                                            />
                                        ) : (
                                            <div
                                                className="
                                                    w-8 h-8
                                                    sm:w-9 sm:h-9
                                                    rounded-full
                                                    bg-gradient-to-br
                                                    from-[#a47d52]
                                                    to-[#8a6a44]
                                                    flex
                                                    items-center
                                                    justify-center
                                                    border-b-2
                                                    border-white
                                                    shadow-sm
                                                "
                                            >
                                                <SlUserFollow
                                                    size={18}
                                                    className="text-white"
                                                />
                                            </div>
                                        )}

                                        {/* Status dot */}
                                        {statusConfig && (
                                            <span
                                                className={`
                                                    absolute -bottom-0.5 -left-0.5
                                                    w-3 h-3 rounded-full
                                                    ${statusConfig.color}
                                                    border-2 border-white
                                                    ${
                                                        statusConfig.animate
                                                            ? "animate-pulse"
                                                            : ""
                                                    }
                                                `}
                                                title={statusConfig.label}
                                            />
                                        )}
                                    </div>

                                    {/* Username + status label */}
                                    <div className="hidden sm:flex flex-row items-center gap-1.5 leading-tight max-w-[140px]">
                                        <span className="font-bold text-white text-[9px] truncate">
                                            {user.username}
                                        </span>
                                        {statusConfig && (
                                            <>
                                                <span className="text-white/50 text-[9px]">
                                                    ·
                                                </span>
                                                <span className="text-[9px] text-white/80 truncate">
                                                    {statusConfig.label}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Vendor Dashboard */}
                            {!loading && user?.role === "vendor" && (
                                <Link
                                    to="/ar-dashboard"
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        px-3
                                        py-1.5
                                        rounded-lg
                                        text-[#a47d52]
                                        font-bold text-xs sm:text-sm
                                        bg-white/60
                                        hover:bg-white
                                        border
                                        border-[#a47d52]/20
                                        shadow-sm
                                        hover:shadow-md
                                        transition-all
                                        duration-200
                                    "
                                >
                                    <MdDashboardCustomize size={18} />
                                    <span className="hidden sm:block">
                                        الرئيسية
                                    </span>
                                </Link>
                            )}

                            {/* ================== BURGER MENU ================== */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setMenuOpen((p) => !p)}
                                    className="
                                        flex
                                        items-center
                                        justify-center
                                        w-9 h-9
                                        rounded-full
                                        bg-white
                                        text-[#a47d52]
                                        shadow-md
                                        hover:shadow-lg
                                        hover:scale-110
                                        active:scale-95
                                        transition-all
                                        duration-200
                                        cursor-pointer
                                    "
                                    title="القائمة"
                                    aria-label="القائمة"
                                    aria-expanded={menuOpen}
                                >
                                    {menuOpen ? (
                                        <FaTimes size={16} />
                                    ) : (
                                        <FaBars size={16} />
                                    )}
                                </button>

                                {/* DROPDOWN */}
                                {menuOpen && (
                                    <div
                                        dir="rtl"
                                        className="
                                            absolute left-0 top-12
                                            w-72 max-w-[90vw]
                                            rounded-2xl
                                            bg-white
                                            shadow-[0_20px_60px_rgba(0,0,0,0.18)]
                                            border border-[#a47d52]/20
                                            overflow-hidden
                                            z-50
                                        "
                                        style={{
                                            animation:
                                                "slideDown 0.2s ease-out",
                                        }}
                                    >
                                        {/* Header */}
                                        <div className="px-4 py-3 bg-gradient-to-l from-[#a47d52]/10 to-transparent border-b border-gray-100">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a47d52] to-[#8a6a44] flex items-center justify-center shrink-0">
                                                    <FaUserCircle
                                                        className="text-white"
                                                        size={18}
                                                    />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-extrabold text-gray-800 text-[10px] truncate">
                                                        {user?.username}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500 truncate">
                                                        {user?.email}
                                                    </span>
                                                </div>
                                            </div>

                                            {statusConfig && (
                                                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-gray-200 w-fit">
                                                    <span
                                                        className={`w-2 h-2 rounded-full ${
                                                            statusConfig.color
                                                        } ${
                                                            statusConfig.animate
                                                                ? "animate-pulse"
                                                                : ""
                                                        }`}
                                                    />
                                                    <span className="text-[8px] font-bold text-gray-700">
                                                        {statusConfig.label}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Options */}
                                        <div className="py-2">
                                            <MenuItem
                                                icon={<MdDashboardCustomize />}
                                                label="الرئيسية"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    navigate("/ar-dashboard");
                                                }}
                                            />
                                            <MenuItem
                                                icon={<FaUser />}
                                                label="الملف الشخصي"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    navigate("/ar-profile");
                                                }}
                                            />

                                            {/* 🔄 ADDED — Attendance Report link */}
                                            <MenuItem
                                                icon={<FaClockRotateLeft />}
                                                label="الحضور والانصراف"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    navigate("/ar/attendance");
                                                }}
                                                color="text-[#a47d52]"
                                            />

                                            <div className="my-2 border-t border-gray-100" />

                                            {/* PAUSE / RESUME */}
                                            {user?.status === "pause" ? (
                                                <MenuItem
                                                    icon={<FaPlayCircle />}
                                                    label="استئناف النشاط"
                                                    onClick={handleResume}
                                                    color="text-emerald-600"
                                                    disabled={actionLoading}
                                                />
                                            ) : (
                                                <MenuItem
                                                    icon={<FaPauseCircle />}
                                                    label="إيقاف مؤقت"
                                                    onClick={handlePause}
                                                    color="text-amber-600"
                                                    disabled={actionLoading}
                                                />
                                            )}

                                            {/* OFFLINE / ONLINE TOGGLE */}
                                            {user?.status === "offline" ? (
                                                <MenuItem
                                                    icon={<FaWifi />}
                                                    label="متصل"
                                                    onClick={handleOnline}
                                                    color="text-emerald-600"
                                                    disabled={actionLoading}
                                                />
                                            ) : (
                                                <MenuItem
                                                    icon={<FaPowerOff />}
                                                    label="غير متصل"
                                                    onClick={handleOffline}
                                                    color="text-gray-600"
                                                    disabled={actionLoading}
                                                />
                                            )}

                                            <MenuItem
                                                icon={<FaCog />}
                                                label="الإعدادات"
                                                onClick={() => {
                                                    setMenuOpen(false);
                                                    navigate("/ar-settings");
                                                }}
                                            />

                                            <div className="my-2 border-t border-gray-100" />

                                            <MenuItem
                                                icon={<IoMdLogOut />}
                                                label="تسجيل الخروج"
                                                onClick={handleLogout}
                                                color="text-red-600"
                                                disabled={actionLoading}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Animation */}
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </nav>
    );
};

/* ============================================================
   MENU ITEM
============================================================ */
const MenuItem = ({
    icon,
    label,
    onClick,
    color = "text-gray-700",
    disabled = false,
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
            w-full flex items-center gap-3
            px-5 py-3
            text-sm font-bold ${color}
            hover:bg-[#a47d52]/10
            transition-all duration-200
            cursor-pointer text-right
            disabled:opacity-50 disabled:cursor-not-allowed
        `}
    >
        <span className="text-lg shrink-0">{icon}</span>
        <span className="flex-1">{label}</span>
    </button>
);

export default Navbar;
