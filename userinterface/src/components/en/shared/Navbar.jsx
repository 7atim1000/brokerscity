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
    FaClock,
    FaLanguage,
} from "react-icons/fa";

import { BsCalendar2Date } from "react-icons/bs";
import { FaClockRotateLeft } from "react-icons/fa6";   

/* ============================================================
   STATUS CONFIG (Updated to match new Backend Model)
============================================================ */
const STATUS_CONFIG = {
    online: { label: "Online", color: "bg-emerald-400", animate: true },
    pause: { label: "Paused", color: "bg-amber-400", animate: false },
    offline: { label: "Offline", color: "bg-gray-400", animate: false },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.offline;

/* ============================================================
   LIVE DIGITAL CLOCK — Abu Dhabi time
============================================================ */
const pad = (n) => String(n).padStart(2, "0");

const DigitalClock = () => {
    const [now, setNow] = useState(new Date());
    const [synced, setSynced] = useState(false);
    const offsetRef = useRef(0); 

    useEffect(() => {
        let cancelled = false;
        const fetchTime = async () => {
            try {
                const res = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Dubai");
                if (!res.ok) throw new Error("Time API failed");
                const data = await res.json();
                const serverDate = new Date(data.year, data.month - 1, data.day, data.hour, data.minute, data.seconds);
                if (!cancelled) {
                    offsetRef.current = serverDate.getTime() - Date.now();
                    setNow(serverDate);
                    setSynced(true);
                }
            } catch (err) {
                console.warn("Time sync failed, using local clock:", err);
            }
        };
        fetchTime();
        const syncInterval = setInterval(fetchTime, 10 * 60 * 1000);
        return () => { cancelled = true; clearInterval(syncInterval); };
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            setNow(new Date(Date.now() + offsetRef.current));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    return (
        <div
            dir="ltr"
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-sm bg-white/25 backdrop-blur-sm  shadow-sm select-none"
            title={`Abu Dhabi Time (UTC+4)${synced ? "" : " — local fallback"}`}
        >
            <BsCalendar2Date className="text-white/90 text-[10px] sm:text-xs shrink-0" />
            <span className="font-mono font-black text-white text-xs sm:text-sm tabular-nums tracking-wide leading-none [-webkit-text-stroke:0.3px_white]">
                {dateStr}
            </span>
            <FaClock className="text-[#f8f7f5] text-[10px] sm:text-xs shrink-0" />
            <span className="font-mono font-black text-white text-sm sm:text-base tabular-nums tracking-wider leading-none [-webkit-text-stroke:0.3px_white]">
                {hh}:{mm}:{ss}
            </span>
        </div>
    );
};

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
                if (!response.ok) throw new Error("Failed to get user information");
                const data = await response.json();
                setUser(data);
            } catch (error) {
                console.error("Error fetching user:", error);
                clearTokens();
                navigate("/en/login"); 
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

        const sendHeartbeat = async () => {
            try {
                const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
                const res = await authFetch(`${BASE}/api/profile/heartbeat/`, { method: "POST" });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status) {
                        setUser((prev) => prev ? { ...prev, status: data.status } : prev);
                    }
                }
            } catch (err) {
                /* silent */
            }
        };

        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 30000);

        return () => clearInterval(interval);
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
            } catch (err) {}
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isLoggedIn]);

    /* =========================================================
       CLOSE MENU — outside click + Escape
    ========================================================= */
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
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
            const res = await authFetch(`${BASE}${endpoint}`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                setUser((prev) => prev ? { ...prev, status: data.status || nextStatus } : prev);
            }
        } catch (err) {
            console.error("Status action failed:", err);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePause = async () => { await callStatusEndpoint("/api/profile/pause/", "pause"); setMenuOpen(false); };
    const handleResume = async () => { await callStatusEndpoint("/api/profile/resume/", "online"); setMenuOpen(false); };

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
            navigate("/en/login"); 
        }
    };

    const statusConfig = user ? getStatusConfig(user.status) : null;

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <nav
            dir="ltr" 
            className="fixed top-0 left-0 right-0 h-12 sm:h-9 bg-gradient-to-r from-[#f8f7f5] via-[#a47d52] to-[#a47d52] border-b border-[#a47d52]/30 shadow-[0_4px_20px_rgba(164,125,82,0.25)] z-50 px-3 sm:px-5 transition-all duration-300 bg-gradient-to-r from-[#f8f7f5]/10 via-[#a47d52]/80 to-[#a47d52]/10"
        >
            <div className="relative h-full flex items-center justify-between gap-3 sm:gap-4 bg-white/20">
                
                {/* LEFT SIDE — Bilingual title */}
                <div className="flex flex-col items-start justify-center leading-tight min-w-0 shrink mx-2 sm:mx-4">
                    <span className="text-[#f8f7f5] font-[1000] text-[10px] sm:text-base md:text-base tracking-wide scale-110 whitespace-nowrap drop-shadow-[#f8f7f5] [-webkit-text-stroke:0.5px_#f8f7f5]">
                        Broker City Real Estate
                    </span> 
                    {/* <span className="text-white font-black text-[13px] sm:text-xs tracking-wider whitespace-nowrap scale-110 [-webkit-text-stroke:0.3px_#835802]" style={{ textShadow: "0 1px 2px white" }}>   
                        منصة بروكر سيتي العقارية الرقمية
                    </span> */}
                </div>

                {/* CENTER — Logo (absolutely centered) */}
                <Link
                    to="/en/dashboard"
                    className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center shrink-0 rounded-full p-1 transition-transform duration-300 hover:scale-110"
                >
                    <img
                        src={logo}
                        alt="Broker City"
                        className="h-10 sm:h-12 w-auto object-contain scale-140 contrast-125 saturate-125"
                        style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.25)) contrast(1.2) saturate(1.15)" }}
                    />
                </Link>

                {/* RIGHT SIDE — Clock + AR Button + User Information / Auth buttons */}
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="hidden md:block">
                        <DigitalClock />
                    </div>

                    <Link
                        to="/ar/dashboard"
                        className="hidden sm:flex items-center justify-center gap-1.5 px-1 py-0.5 rounded-sm bg-green-500/10 hover:bg-green-500/20 text-green-200 font-bold text-xs transition-all duration-200 shadow-sm"
                        title="Switch to Arabic"
                    >
                        <FaLanguage size={16} className="text-green-200" />
                        AR
                    </Link>

                    {!isLoggedIn ? (
                        <>
                            <Link to="/en/login" className="px-3 py-1.5 rounded-lg text-[#a47d52] font-bold text-xs sm:text-sm bg-white/70 hover:bg-white shadow-sm hover:shadow-md border border-[#a47d52]/20 transition-all duration-200">
                                Login
                            </Link>
                            <Link to="/en/signup" className="hidden sm:inline-block px-3 py-1.5 rounded-lg text-white font-bold text-xs sm:text-sm bg-gradient-to-r from-[#a47d52] to-[#b88d63] hover:from-[#8a6a44] hover:to-[#a47d52] shadow-md hover:shadow-lg transition-all duration-200">
                                Sign Up
                            </Link>
                        </>
                    ) : (
                        <>
                            {/* ================== USER PILL ================== */}
                            {!loading && user && (
                                <div className="flex items-center gap-2 px-2 sm:px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-sm shadow-sm hover:bg-white/30 transition-all duration-200">
                                    <div className="relative shrink-0">
                                        {user.image ? (
                                            <img src={`${import.meta.env.VITE_DJANGO_BASE_URL}${user.image}`} alt={user.username} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-white shadow-sm" />
                                        ) : (
                                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#a47d52] to-[#8a6a44] flex items-center justify-center border-b-2 border-white shadow-sm">
                                                <SlUserFollow size={18} className="text-white" />
                                            </div>
                                        )}
                                        {statusConfig && (
                                            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusConfig.color} border-2 border-white ${statusConfig.animate ? "animate-pulse" : ""}`} title={statusConfig.label} />
                                        )}
                                    </div>

                                    <div className="hidden sm:flex flex-row items-center gap-1.5 leading-tight max-w-[140px]">
                                        <span className="font-bold text-white text-[9px] truncate">{user.username}</span>
                                        {statusConfig && (
                                            <>
                                                <span className="text-white/50 text-[9px]">·</span>
                                                <span className="text-[9px] text-white/80 truncate">{statusConfig.label}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ================== BURGER MENU ================== */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setMenuOpen((p) => !p)}
                                    className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-[#a47d52] shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
                                    title="Menu"
                                    aria-label="Menu"
                                    aria-expanded={menuOpen}
                                >
                                    {menuOpen ? <FaTimes size={16} /> : <FaBars size={16} />}
                                </button>

                                {/* DROPDOWN */}
                                {menuOpen && (
                                    <div dir="ltr" className="absolute right-0 top-12 w-72 max-w-[90vw] rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-[#a47d52]/20 overflow-hidden z-50" style={{ animation: "slideDown 0.2s ease-out" }}>
                                        {/* Header */}
                                        <div className="px-4 py-3 bg-gradient-to-r from-[#a47d52]/10 to-transparent border-b border-gray-100">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a47d52] to-[#8a6a44] flex items-center justify-center shrink-0">
                                                    <FaUserCircle className="text-white" size={18} />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-extrabold text-gray-800 text-[10px] truncate">{user?.username}</span>
                                                    <span className="text-[9px] text-gray-500 truncate">{user?.email}</span>
                                                </div>
                                            </div>

                                            {statusConfig && (
                                                <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-gray-200 w-fit">
                                                    <span className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.animate ? "animate-pulse" : ""}`} />
                                                    <span className="text-[8px] font-bold text-gray-700">{statusConfig.label}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Options */}
                                        <div className="py-2">
                                            <MenuItem icon={<MdDashboardCustomize />} label="Dashboard" onClick={() => { setMenuOpen(false); navigate("/en/dashboard"); }} />
                                            <MenuItem icon={<FaUser />} label="My Profile" onClick={() => { setMenuOpen(false); navigate("/en/profile"); }} />
                                            <MenuItem icon={<FaClockRotateLeft />} label="Attendance" onClick={() => { setMenuOpen(false); navigate("/en/attendance"); }} color="text-[#a47d52]" />

                                            <div className="my-2 border-t border-gray-100" />

                                            {/* PAUSE / RESUME ONLY (Offline removed) */}
                                            {user?.status === "pause" ? (
                                                <MenuItem icon={<FaPlayCircle />} label="Resume" onClick={handleResume} color="text-emerald-600" disabled={actionLoading} />
                                            ) : (
                                                <MenuItem icon={<FaPauseCircle />} label="Pause" onClick={handlePause} color="text-amber-600" disabled={actionLoading} />
                                            )}

                                            <MenuItem icon={<FaCog />} label="Settings" onClick={() => { setMenuOpen(false); navigate("/en/settings"); }} />

                                            <div className="my-2 border-t border-gray-100" />

                                            <MenuItem icon={<IoMdLogOut />} label="Logout" onClick={handleLogout} color="text-red-600" disabled={actionLoading} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

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
const MenuItem = ({ icon, label, onClick, color = "text-gray-700", disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-bold ${color} hover:bg-[#a47d52]/10 transition-all duration-200 cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed`}
    >
        <span className="text-lg shrink-0">{icon}</span>
        <span className="flex-1">{label}</span>
    </button>
);

export default Navbar;


// import { useState, useEffect, useRef } from "react";
// import { useNavigate, Link } from "react-router-dom";
// import logo from "../../../assets/images/white-logo.png";

// import {
//     clearTokens,
//     getAccessToken,
//     authFetch,
// } from "../../../utils/auth";

// import { SlUserFollow } from "react-icons/sl";
// import { MdDashboardCustomize } from "react-icons/md";
// import { IoMdLogOut } from "react-icons/io";
// import {
//     FaBars,
//     FaTimes,
//     FaUserCircle,
//     FaPauseCircle,
//     FaPlayCircle,
//     FaCog,
//     FaUser,
//     FaPowerOff,
//     FaWifi,
//     FaClock,
//     FaLanguage,
// } from "react-icons/fa";

// import { BsCalendar2Date } from "react-icons/bs";
// import { FaClockRotateLeft } from "react-icons/fa6";   

// const STATUS_CONFIG = {
//     logged_in: { label: "Logged In", color: "bg-blue-400", animate: true },
//     online: { label: "Online", color: "bg-emerald-400", animate: true },
//     pause: { label: "Paused", color: "bg-amber-400", animate: false },
//     offline: { label: "Offline", color: "bg-gray-400", animate: false },
//     logged_out: { label: "Logged Out", color: "bg-red-400", animate: false },
// };

// const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.offline;

// const pad = (n) => String(n).padStart(2, "0");

// const DigitalClock = () => {
//     const [now, setNow] = useState(new Date());
//     const [synced, setSynced] = useState(false);
//     const offsetRef = useRef(0); 

//     useEffect(() => {
//         let cancelled = false;
//         const fetchTime = async () => {
//             try {
//                 const res = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Dubai");
//                 if (!res.ok) throw new Error("Time API failed");
//                 const data = await res.json();
//                 const serverDate = new Date(data.year, data.month - 1, data.day, data.hour, data.minute, data.seconds);
//                 if (!cancelled) {
//                     offsetRef.current = serverDate.getTime() - Date.now();
//                     setNow(serverDate);
//                     setSynced(true);
//                 }
//             } catch (err) {
//                 console.warn("Time sync failed, using local clock:", err);
//             }
//         };
//         fetchTime();
//         const syncInterval = setInterval(fetchTime, 10 * 60 * 1000);
//         return () => { cancelled = true; clearInterval(syncInterval); };
//     }, []);

//     useEffect(() => {
//         const id = setInterval(() => {
//             setNow(new Date(Date.now() + offsetRef.current));
//         }, 1000);
//         return () => clearInterval(id);
//     }, []);

//     const hh = pad(now.getHours());
//     const mm = pad(now.getMinutes());
//     const ss = pad(now.getSeconds());
//     const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

//     return (
//         <div
//             dir="ltr"
//             className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-lg bg-white/25 backdrop-blur-sm border border-white/40 shadow-sm select-none"
//             title={`Abu Dhabi Time (UTC+4)${synced ? "" : " — local fallback"}`}
//         >
//             <BsCalendar2Date className="text-white/90 text-[10px] sm:text-xs shrink-0" />
//             <span className="font-mono font-black text-white text-xs sm:text-sm tabular-nums tracking-wide leading-none [-webkit-text-stroke:0.3px_white]">
//                 {dateStr}
//             </span>
//             <FaClock className="text-[#f8f7f5] text-[10px] sm:text-xs shrink-0" />
//             <span className="font-mono font-black text-white text-sm sm:text-base tabular-nums tracking-wider leading-none [-webkit-text-stroke:0.3px_white]">
//                 {hh}:{mm}:{ss}
//             </span>
//         </div>
//     );
// };

// const Navbar = () => {
//     const navigate = useNavigate();
//     const [user, setUser] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [menuOpen, setMenuOpen] = useState(false);
//     const [actionLoading, setActionLoading] = useState(false);
//     const menuRef = useRef(null);
//     const isLoggedIn = !!getAccessToken();

//     useEffect(() => {
//         if (!isLoggedIn) {
//             setLoading(false);
//             return;
//         }
//         const fetchUser = async () => {
//             try {
//                 const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
//                 const response = await authFetch(`${BASE}/api/me/`);
//                 if (!response.ok) throw new Error("Failed to get user information");
//                 const data = await response.json();
//                 setUser(data);
//             } catch (error) {
//                 console.error("Error fetching user:", error);
//                 clearTokens();
//                 navigate("/en/login"); 
//             } finally {
//                 setLoading(false);
//             }
//         };
//         fetchUser();
//     }, [isLoggedIn, navigate]);

//     // ✅ FIXED HEARTBEAT LOGIC — Now runs immediately on mount regardless of status
//     useEffect(() => {
//         if (!isLoggedIn || !user) return;

//         // ✅ Only block heartbeat if user manually paused
//         if (user.status === "pause") return;

//         const sendHeartbeat = async () => {
//             try {
//                 const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
//                 const res = await authFetch(`${BASE}/api/profile/heartbeat/`, { method: "POST" });
//                 if (res.ok) {
//                     const data = await res.json();
//                     if (data.status) {
//                         setUser((prev) => prev ? { ...prev, status: data.status } : prev);
//                     }
//                 }
//             } catch (err) {
//                 /* silent */
//             }
//         };

//         // ✅ 1. Run IMMEDIATELY on mount to set status to "online"
//         sendHeartbeat();

//         // ✅ 2. Then run every 30 seconds to keep it alive
//         const interval = setInterval(sendHeartbeat, 30000);

//         return () => clearInterval(interval);
//     }, [isLoggedIn, user?.id]); // ✅ Only depend on user ID to prevent infinite loops

//     useEffect(() => {
//         if (!isLoggedIn) return;
//         const handleBeforeUnload = () => {
//             try {
//                 const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
//                 const blob = new Blob([""], { type: "application/json" });
//                 navigator.sendBeacon(`${BASE}/api/profile/offline/`, blob);
//             } catch (err) {}
//         };
//         window.addEventListener("beforeunload", handleBeforeUnload);
//         return () => window.removeEventListener("beforeunload", handleBeforeUnload);
//     }, [isLoggedIn]);

//     useEffect(() => {
//         const handleClickOutside = (e) => {
//             if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
//         };
//         const handleEscape = (e) => {
//             if (e.key === "Escape") setMenuOpen(false);
//         };
//         document.addEventListener("mousedown", handleClickOutside);
//         document.addEventListener("keydown", handleEscape);
//         return () => {
//             document.removeEventListener("mousedown", handleClickOutside);
//             document.removeEventListener("keydown", handleEscape);
//         };
//     }, []);

//     const callStatusEndpoint = async (endpoint, nextStatus) => {
//         setActionLoading(true);
//         try {
//             const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
//             const res = await authFetch(`${BASE}${endpoint}`, { method: "POST" });
//             if (res.ok) {
//                 const data = await res.json();
//                 setUser((prev) => prev ? { ...prev, status: data.status || nextStatus } : prev);
//             }
//         } catch (err) {
//             console.error("Status action failed:", err);
//         } finally {
//             setActionLoading(false);
//         }
//     };

//     const handlePause = async () => { await callStatusEndpoint("/api/profile/pause/", "pause"); setMenuOpen(false); };
//     const handleResume = async () => { await callStatusEndpoint("/api/profile/resume/", "online"); setMenuOpen(false); };
//     const handleOffline = async () => { await callStatusEndpoint("/api/profile/offline/", "offline"); setMenuOpen(false); };
//     const handleOnline = async () => { await callStatusEndpoint("/api/profile/heartbeat/", "online"); setMenuOpen(false); };

//     const handleLogout = async () => {
//         setActionLoading(true);
//         try {
//             const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
//             await authFetch(`${BASE}/api/logout/`, { method: "POST" });
//         } catch (err) {
//             console.error("Logout request failed:", err);
//         } finally {
//             clearTokens();
//             setActionLoading(false);
//             setMenuOpen(false);
//             navigate("/login"); 
//         }
//     };

//     // ✅ OPTIMISTIC UI FIX: Force the "online" status display if currently offline
//     const currentStatus = user?.status === "offline" ? "online" : user?.status;
//     const statusConfig = user ? getStatusConfig(currentStatus) : null;

//     return (
//         <nav
//             dir="ltr" 
//             className="fixed top-0 left-0 right-0 h-12 sm:h-14 bg-gradient-to-r from-[#f8f7f5] via-[#a47d52] to-[#a47d52] border-b border-[#a47d52]/30 shadow-[0_4px_20px_rgba(164,125,82,0.25)] z-50 px-3 sm:px-5 transition-all duration-300 bg-gradient-to-r from-[#f8f7f5]/10 via-[#a47d52]/80 to-[#a47d52]/10"
//         >
//             <div className="relative h-full flex items-center justify-between gap-3 sm:gap-4 bg-white/20">
                
//                 <div className="flex flex-col items-start justify-center leading-tight min-w-0 shrink mx-2 sm:mx-4">
//                     <span className="text-[#f8f7f5] font-[1000] text-[10px] sm:text-base md:text-base tracking-wide scale-110 whitespace-nowrap drop-shadow-[#f8f7f5] [-webkit-text-stroke:0.5px_#f8f7f5]">
//                         Broker City Real Estate
//                     </span> 
//                     <span className="text-white font-black text-[13px] sm:text-xs tracking-wider whitespace-nowrap scale-110 [-webkit-text-stroke:0.3px_#835802]" style={{ textShadow: "0 1px 2px white" }}>   
//                         منصة بروكر سيتي العقارية الرقمية
//                     </span>
//                 </div>

//                 <Link
//                     to="/en/dashboard"
//                     className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center shrink-0 rounded-full p-1 transition-transform duration-300 hover:scale-110"
//                 >
//                     <img
//                         src={logo}
//                         alt="Broker City"
//                         className="h-10 sm:h-14 w-auto object-contain scale-165 contrast-125 saturate-125"
//                         style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.25)) contrast(1.2) saturate(1.15)" }}
//                     />
//                 </Link>

//                 <div className="flex items-center gap-2 sm:gap-4 shrink-0">
//                     <div className="hidden md:block">
//                         <DigitalClock />
//                     </div>

//                     <Link
//                         to="/ar/dashboard"
//                         className="hidden sm:flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/40 text-green-500 font-bold text-xs transition-all duration-200 shadow-sm"
//                         title="Switch to Arabic"
//                     >
//                         <FaLanguage size={16} className="text-green-500" />
//                         AR
//                     </Link>

//                     {!isLoggedIn ? (
//                         <>
//                             <Link to="/en/login" className="px-3 py-1.5 rounded-lg text-[#a47d52] font-bold text-xs sm:text-sm bg-white/70 hover:bg-white shadow-sm hover:shadow-md border border-[#a47d52]/20 transition-all duration-200">
//                                 Login
//                             </Link>
//                             <Link to="/en/signup" className="hidden sm:inline-block px-3 py-1.5 rounded-lg text-white font-bold text-xs sm:text-sm bg-gradient-to-r from-[#a47d52] to-[#b88d63] hover:from-[#8a6a44] hover:to-[#a47d52] shadow-md hover:shadow-lg transition-all duration-200">
//                                 Sign Up
//                             </Link>
//                         </>
//                     ) : (
//                         <>
//                             {!loading && user && (
//                                 <div className="flex items-center gap-2 px-2 sm:px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-sm hover:bg-white/30 transition-all duration-200">
//                                     <div className="relative shrink-0">
//                                         {user.image ? (
//                                             <img src={`${import.meta.env.VITE_DJANGO_BASE_URL}${user.image}`} alt={user.username} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-white shadow-sm" />
//                                         ) : (
//                                             <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#a47d52] to-[#8a6a44] flex items-center justify-center border-b-2 border-white shadow-sm">
//                                                 <SlUserFollow size={18} className="text-white" />
//                                             </div>
//                                         )}
//                                         {statusConfig && (
//                                             <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${statusConfig.color} border-2 border-white ${statusConfig.animate ? "animate-pulse" : ""}`} title={statusConfig.label} />
//                                         )}
//                                     </div>

//                                     <div className="hidden sm:flex flex-row items-center gap-1.5 leading-tight max-w-[140px]">
//                                         <span className="font-bold text-white text-[9px] truncate">{user.username}</span>
//                                         {statusConfig && (
//                                             <>
//                                                 <span className="text-white/50 text-[9px]">·</span>
//                                                 <span className="text-[9px] text-white/80 truncate">{statusConfig.label}</span>
//                                             </>
//                                         )}
//                                     </div>
//                                 </div>
//                             )}

//                             {!loading && user?.role === "vendor" && (
//                                 <Link to="/en/dashboard" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#a47d52] font-bold text-xs sm:text-sm bg-white/60 hover:bg-white border border-[#a47d52]/20 shadow-sm hover:shadow-md transition-all duration-200">
//                                     <MdDashboardCustomize size={18} />
//                                     <span className="hidden sm:block">Dashboard</span>
//                                 </Link>
//                             )}

//                             <div className="relative" ref={menuRef}>
//                                 <button
//                                     onClick={() => setMenuOpen((p) => !p)}
//                                     className="flex items-center justify-center w-9 h-9 rounded-full bg-white text-[#a47d52] shadow-md hover:shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
//                                     title="Menu"
//                                     aria-label="Menu"
//                                     aria-expanded={menuOpen}
//                                 >
//                                     {menuOpen ? <FaTimes size={16} /> : <FaBars size={16} />}
//                                 </button>

//                                 {menuOpen && (
//                                     <div dir="ltr" className="absolute right-0 top-12 w-72 max-w-[90vw] rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-[#a47d52]/20 overflow-hidden z-50" style={{ animation: "slideDown 0.2s ease-out" }}>
//                                         <div className="px-4 py-3 bg-gradient-to-r from-[#a47d52]/10 to-transparent border-b border-gray-100">
//                                             <div className="flex items-center gap-2.5">
//                                                 <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a47d52] to-[#8a6a44] flex items-center justify-center shrink-0">
//                                                     <FaUserCircle className="text-white" size={18} />
//                                                 </div>
//                                                 <div className="flex flex-col min-w-0">
//                                                     <span className="font-extrabold text-gray-800 text-[10px] truncate">{user?.username}</span>
//                                                     <span className="text-[9px] text-gray-500 truncate">{user?.email}</span>
//                                                 </div>
//                                             </div>

//                                             {statusConfig && (
//                                                 <div className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-gray-200 w-fit">
//                                                     <span className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.animate ? "animate-pulse" : ""}`} />
//                                                     <span className="text-[8px] font-bold text-gray-700">{statusConfig.label}</span>
//                                                 </div>
//                                             )}
//                                         </div>

//                                         <div className="py-2">
//                                             <MenuItem icon={<MdDashboardCustomize />} label="Dashboard" onClick={() => { setMenuOpen(false); navigate("/en/dashboard"); }} />
//                                             <MenuItem icon={<FaUser />} label="My Profile" onClick={() => { setMenuOpen(false); navigate("/en/profile"); }} />
//                                             <MenuItem icon={<FaClockRotateLeft />} label="Attendance" onClick={() => { setMenuOpen(false); navigate("/en/attendance"); }} color="text-[#a47d52]" />

//                                             <div className="my-2 border-t border-gray-100" />

//                                             {user?.status === "pause" ? (
//                                                 <MenuItem icon={<FaPlayCircle />} label="Resume" onClick={handleResume} color="text-emerald-600" disabled={actionLoading} />
//                                             ) : (
//                                                 <MenuItem icon={<FaPauseCircle />} label="Pause" onClick={handlePause} color="text-amber-600" disabled={actionLoading} />
//                                             )}

//                                             {user?.status === "offline" ? (
//                                                 <MenuItem icon={<FaWifi />} label="Go Online" onClick={handleOnline} color="text-emerald-600" disabled={actionLoading} />
//                                             ) : (
//                                                 <MenuItem icon={<FaPowerOff />} label="Go Offline" onClick={handleOffline} color="text-gray-600" disabled={actionLoading} />
//                                             )}

//                                             <MenuItem icon={<FaCog />} label="Settings" onClick={() => { setMenuOpen(false); navigate("/en/settings"); }} />

//                                             <div className="my-2 border-t border-gray-100" />

//                                             <MenuItem icon={<IoMdLogOut />} label="Logout" onClick={handleLogout} color="text-red-600" disabled={actionLoading} />
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>
//                         </>
//                     )}
//                 </div>
//             </div>

//             <style>{`
//                 @keyframes slideDown {
//                     from { opacity: 0; transform: translateY(-8px); }
//                     to   { opacity: 1; transform: translateY(0); }
//                 }
//             `}</style>
//         </nav>
//     );
// };

// const MenuItem = ({ icon, label, onClick, color = "text-gray-700", disabled = false }) => (
//     <button
//         onClick={onClick}
//         disabled={disabled}
//         className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-bold ${color} hover:bg-[#a47d52]/10 transition-all duration-200 cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed`}
//     >
//         <span className="text-lg shrink-0">{icon}</span>
//         <span className="flex-1">{label}</span>
//     </button>
// );

// export default Navbar;