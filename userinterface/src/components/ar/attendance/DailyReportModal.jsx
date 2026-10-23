import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
    FaTimes,
    FaChevronLeft,
    FaChevronRight,
    FaInfoCircle,
    FaUserCircle,
} from "react-icons/fa";
import {
    fetchWorkLogDetail,
    addWorkLogComment,
} from "../../../utils/reportApi";

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
const formatTime = (iso) => {
    if (!iso) return "--:--";
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(
        d.getMinutes()
    ).padStart(2, "0")}`;
};

const formatDuration = (seconds) => {
    if (!seconds || seconds < 0) return "0h 00m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
};

const formatBreak = (seconds) => {
    if (!seconds || seconds < 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const formatDateLong = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });
};

const shiftDate = (dateStr, deltaDays) => {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + deltaDays);
    return d.toISOString().split("T")[0];
};

/* --------------------------------------------------
   Component
-------------------------------------------------- */
const DailyReportModal = ({ userId, dateStr, onClose, onDateChange }) => {
    const [log, setLog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [comment, setComment] = useState("");
    const [posting, setPosting] = useState(false);

    const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

    /* ---------- Fetch detail ---------- */
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setNotFound(false);
            try {
                const data = await fetchWorkLogDetail(userId, dateStr);
                if (cancelled) return;
                if (!data) {
                    setNotFound(true);
                    setLog(null);
                } else {
                    setLog(data.log);
                }
            } catch (err) {
                console.error("Worklog detail error:", err);
                toast.error("فشل تحميل تفاصيل اليوم");
                setNotFound(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [userId, dateStr]);

    /* ---------- Add comment ---------- */
    const handleAddComment = async () => {
        const text = comment.trim();
        if (!text || !log) return;
        setPosting(true);
        try {
            const newComment = await addWorkLogComment(log.id, text);
            setLog((prev) => ({
                ...prev,
                comments: [...(prev.comments || []), newComment],
            }));
            setComment("");
            toast.success("تم إضافة التعليق");
        } catch (err) {
            console.error(err);
            toast.error("فشل إضافة التعليق");
        } finally {
            setPosting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAddComment();
        }
    };

    /* ---------- Navigation ---------- */
    const goPrevDay = () => onDateChange(shiftDate(dateStr, -1));
    const goNextDay = () => onDateChange(shiftDate(dateStr, 1));

    /* ---------- Avatar ---------- */
    const avatarUrl =
        log?.user_image && log.user_image.startsWith("http")
            ? log.user_image
            : log?.user_image
            ? `${BASE}${log.user_image}`
            : null;

    return (
        <div
            dir="rtl"
            className="
                fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm
                flex items-center justify-center p-2 sm:p-4 md:p-6
                overflow-y-auto
            "
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="
                    w-full max-w-3xl bg-white rounded-2xl
                    shadow-[0_25px_80px_rgba(0,0,0,0.35)]
                    overflow-hidden my-auto
                    animate-[modalIn_0.25s_ease-out]
                "
            >
                {/* Top bar */}
                <div className="h-1.5 bg-gradient-to-r from-[#a47d52] via-[#d4a574] to-[#a47d52]" />

                {/* Header */}
                <div
                    className="
                        flex items-center justify-between
                        px-4 sm:px-6 py-4
                        bg-[#f8f7f5] border-b border-gray-200
                    "
                >
                    <h2 className="text-lg sm:text-xl font-extrabold text-gray-800">
                        Daily report
                    </h2>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={goPrevDay}
                            className="
                                w-8 h-8 rounded-full
                                bg-white border border-gray-200
                                text-gray-500 hover:text-[#a47d52]
                                hover:border-[#a47d52]/40
                                flex items-center justify-center
                                transition-all cursor-pointer
                            "
                            title="اليوم السابق"
                        >
                            <FaChevronRight size={12} />
                        </button>

                        <span className="text-sm sm:text-base font-bold text-gray-700 whitespace-nowrap">
                            {formatDateLong(dateStr)}
                        </span>

                        <button
                            onClick={goNextDay}
                            className="
                                w-8 h-8 rounded-full
                                bg-white border border-gray-200
                                text-gray-500 hover:text-[#a47d52]
                                hover:border-[#a47d52]/40
                                flex items-center justify-center
                                transition-all cursor-pointer
                            "
                            title="اليوم التالي"
                        >
                            <FaChevronLeft size={12} />
                        </button>

                        <button
                            onClick={onClose}
                            className="
                                w-8 h-8 rounded-full ml-1
                                bg-white hover:bg-red-50
                                text-gray-500 hover:text-red-500
                                flex items-center justify-center
                                transition-all cursor-pointer
                            "
                            title="إغلاق"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
                    {loading && (
                        <div className="flex flex-col items-center py-12 gap-3">
                            <div className="w-10 h-10 border-4 border-[#f0ebe5] border-t-[#a47d52] rounded-full animate-spin" />
                            <p className="text-[#a47d52] font-bold text-sm">
                                جاري التحميل...
                            </p>
                        </div>
                    )}

                    {!loading && notFound && (
                        <div className="flex flex-col items-center py-16 gap-3 text-center">
                            <span className="text-5xl">📅</span>
                            <p className="text-gray-600 font-bold">
                                لا يوجد سجل لهذا اليوم
                            </p>
                        </div>
                    )}

                    {!loading && log && (
                        <>
                            {/* From / To */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <UserBlock
                                    label="From"
                                    name={log.username}
                                    role={log.role_display}
                                    avatarUrl={avatarUrl}
                                />
                                <UserBlock
                                    label="To"
                                    name={log.username}
                                    role={log.role_display}
                                    avatarUrl={avatarUrl}
                                />
                            </div>

                            {/* Worktime header */}
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-base sm:text-lg font-extrabold text-gray-800">
                                    Worktime
                                </h3>
                                <FaInfoCircle
                                    className="text-gray-400"
                                    size={13}
                                />
                            </div>

                            {/* Tiles */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                <Tile
                                    label="Clocked in"
                                    value={formatTime(log.clock_in)}
                                    variant="blue"
                                />
                                <Tile
                                    label="Break duration"
                                    value={formatBreak(log.break_seconds)}
                                    variant="blue"
                                />
                                <Tile
                                    label="Clocked out"
                                    value={formatTime(log.clock_out)}
                                    sub={log.clock_out ? "" : "Auto"}
                                    variant="yellow"
                                />
                                <Tile
                                    label="Total"
                                    value={formatDuration(
                                        log.total_work_seconds
                                    )}
                                    variant="yellow"
                                />
                            </div>

                            {/* Reason */}
                            <div className="border-t border-gray-200 pt-5 mb-5">
                                <p className="text-sm sm:text-base font-bold text-gray-700 mb-2">
                                    Reason for change (clock-out time)
                                </p>
                                <p className="text-sm text-gray-600">
                                    {log.reason_display || "—"}
                                </p>
                            </div>

                            {/* Comments */}
                            <div className="border-t border-gray-200 pt-5">
                                <p className="text-sm sm:text-base font-bold text-gray-700 mb-4">
                                    Comments
                                </p>

                                {/* Comment list */}
                                {log.comments?.length > 0 && (
                                    <ul className="space-y-3 mb-4">
                                        {log.comments.map((c) => (
                                            <li
                                                key={c.id}
                                                className="
                                                    flex items-start gap-3
                                                    bg-[#f8f7f5] rounded-lg
                                                    p-3 border border-gray-100
                                                "
                                            >
                                                <CommentAvatar
                                                    url={c.author_image}
                                                    name={c.author_username}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-extrabold text-gray-800 text-sm truncate">
                                                            {c.author_username}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {new Date(
                                                                c.created_at
                                                            ).toLocaleString(
                                                                "ar-EG",
                                                                {
                                                                    dateStyle:
                                                                        "short",
                                                                    timeStyle:
                                                                        "short",
                                                                }
                                                            )}
                                                        </p>
                                                    </div>
                                                    <p className="text-sm text-gray-700 break-words">
                                                        {c.text}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {/* Input */}
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#a47d52]/15 flex items-center justify-center text-[#a47d52] shrink-0">
                                        <FaUserCircle size={22} />
                                    </div>
                                    <input
                                        type="text"
                                        value={comment}
                                        onChange={(e) =>
                                            setComment(e.target.value)
                                        }
                                        onKeyDown={handleKeyDown}
                                        placeholder="Add comment"
                                        disabled={posting}
                                        className="
                                            flex-1 bg-white border border-gray-200
                                            rounded-full py-2.5 px-4 outline-none
                                            focus:ring-2 focus:ring-[#a47d52]/10
                                            focus:border-[#a47d52]
                                            text-sm
                                        "
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={posting || !comment.trim()}
                                        className="
                                            hidden sm:flex items-center justify-center
                                            bg-[#a47d52] text-white
                                            font-extrabold text-xs
                                            px-4 py-2.5 rounded-full
                                            transition-all
                                            hover:bg-[#8a6a44]
                                            disabled:opacity-50
                                            disabled:cursor-not-allowed
                                            cursor-pointer whitespace-nowrap
                                        "
                                    >
                                        إرسال
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-[#f8f7f5] border-t border-gray-200 px-4 sm:px-6 py-4">
                    <button
                        onClick={onClose}
                        className="
                            w-full text-center font-extrabold
                            text-gray-700 hover:text-[#a47d52]
                            py-2 tracking-widest text-sm sm:text-base
                            transition-colors cursor-pointer
                        "
                    >
                        CLOSE
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.96) translateY(12px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

/* --------------------------------------------------
   Sub-components
-------------------------------------------------- */
const UserBlock = ({ label, name, role, avatarUrl }) => (
    <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 font-bold w-10 shrink-0">
            {label}
        </span>
        {avatarUrl ? (
            <img
                src={avatarUrl}
                alt={name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
            />
        ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#a47d52] to-[#8a6a44] flex items-center justify-center text-white text-sm font-extrabold shrink-0">
                {name?.charAt(0)?.toUpperCase() || "?"}
            </div>
        )}
        <div className="min-w-0">
            <p className="font-extrabold text-gray-800 text-sm truncate">
                {name}
            </p>
            <p className="text-xs text-gray-500 truncate">{role}</p>
        </div>
    </div>
);

const Tile = ({ label, value, sub, variant = "blue" }) => {
    const styles = {
        blue: {
            bg: "bg-[#e8f2fa]",
            border: "border-[#c7dff0]",
            label: "text-[#1e4f78]",
            value: "text-[#0d2f4a]",
        },
        yellow: {
            bg: "bg-[#fdf5d6]",
            border: "border-[#f0e0a0]",
            label: "text-[#7a5f1e]",
            value: "text-[#4a360a]",
        },
    }[variant];

    return (
        <div
            className={`
                rounded-md border p-3
                ${styles.bg} ${styles.border}
            `}
        >
            <p className={`text-xs font-bold mb-3 ${styles.label}`}>{label}</p>
            <p className={`text-xl sm:text-2xl font-extrabold ${styles.value}`}>
                {value}
            </p>
            {sub && <p className="text-[10px] text-gray-500 mt-1">{sub}</p>}
        </div>
    );
};

const CommentAvatar = ({ url, name }) => {
    const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
    const src = url
        ? url.startsWith("http")
            ? url
            : `${BASE}${url}`
        : null;

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
            />
        );
    }
    return (
        <div className="w-9 h-9 rounded-full bg-[#a47d52]/20 flex items-center justify-center text-[#a47d52] text-xs font-extrabold shrink-0">
            {name?.charAt(0)?.toUpperCase() || "?"}
        </div>
    );
};

export default DailyReportModal;