import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    FaChevronLeft,
    FaChevronRight,
    FaChevronDown,
    FaUsers,
} from "react-icons/fa";
import { MdError } from "react-icons/md";

import DailyReportModal from "../../components/ar/attendance/DailyReportModal";
import { fetchAttendanceGrid } from "../../utils/reportApi";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDurationCell = (seconds) => {
    if (!seconds || seconds < 0) return "0h 00m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
};

const formatDayHeader = (isoDate) => {
    const d = new Date(isoDate + "T00:00:00");
    const wd = WEEKDAY_SHORT[d.getDay()];
    const day = String(d.getDate()).padStart(2, "0");
    return { wd, day };
};

/* --------------------------------------------------
   Component
-------------------------------------------------- */
const AttendanceReport = () => {
    const today = useMemo(() => new Date(), []);
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth() + 1);

    const [grid, setGrid] = useState(null);
    const [loading, setLoading] = useState(true);

    // ✅ NEW: forbidden state
    const [forbidden, setForbidden] = useState(false);

    // Modal
    const [selected, setSelected] = useState(null); // { userId, dateStr }

    // Pagination (front-end slicing for now)
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);

    /* --------------------------------------------------
       Fetch grid
    -------------------------------------------------- */
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoading(true);
            setForbidden(false);

            try {
                const data = await fetchAttendanceGrid(year, month);
                if (cancelled) return;
                setGrid(data);
            } catch (err) {
                if (cancelled) return;

                // ✅ 403 → not allowed
                if (err?.code === 403) {
                    setForbidden(true);
                    setGrid(null);
                    toast.error(
                        "ليس لديك صلاحية للوصول لهذا القسم",
                        { id: "attendance-forbidden" }
                    );
                } else {
                    console.error(err);
                    toast.error("فشل تحميل تقرير الحضور");
                    setGrid(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [year, month]);

    /* --------------------------------------------------
       Month navigation
    -------------------------------------------------- */
    const goPrevMonth = () => {
        if (month === 1) {
            setMonth(12);
            setYear((y) => y - 1);
        } else {
            setMonth((m) => m - 1);
        }
        setPage(1);
    };

    const goNextMonth = () => {
        if (month === 12) {
            setMonth(1);
            setYear((y) => y + 1);
        } else {
            setMonth((m) => m + 1);
        }
        setPage(1);
    };

    const goToday = () => {
        setYear(today.getFullYear());
        setMonth(today.getMonth() + 1);
        setPage(1);
    };

    const monthLabel = `${MONTH_NAMES[month - 1]} 1 - ${MONTH_NAMES[month - 1]} ${
        grid?.days?.length || 30
    }`;

    /* --------------------------------------------------
       Pagination
    -------------------------------------------------- */
    const rows = grid?.rows || [];
    const totalRows = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / perPage));
    const visibleRows = rows.slice((page - 1) * perPage, page * perPage);

    /* --------------------------------------------------
       Cell click
    -------------------------------------------------- */
    const handleCellClick = (userId, dateStr, cell) => {
        if (!cell) return;
        setSelected({ userId, dateStr });
    };

    /* --------------------------------------------------
       Render
    -------------------------------------------------- */
    return (
        <div dir="rtl" className="min-h-screen bg-[#f8f7f5] p-3 sm:p-5 md:p-6">
            {/* ============ Header ============ */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center shrink-0">
                        <FaUsers size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800">
                            تقرير الحضور
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                            ساعات العمل اليومية لكل موظف
                        </p>
                    </div>
                </div>

                {/* Month nav — hidden when forbidden */}
                {!forbidden && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={goPrevMonth}
                            className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-[#a47d52] hover:border-[#a47d52]/40 flex items-center justify-center transition-all cursor-pointer"
                            title="الشهر السابق"
                        >
                            <FaChevronRight size={12} />
                        </button>

                        <span className="font-extrabold text-gray-700 text-sm sm:text-base whitespace-nowrap min-w-[160px] sm:min-w-[220px] text-center">
                            {monthLabel}
                        </span>

                        <button
                            onClick={goNextMonth}
                            className="w-9 h-9 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-[#a47d52] hover:border-[#a47d52]/40 flex items-center justify-center transition-all cursor-pointer"
                            title="الشهر التالي"
                        >
                            <FaChevronLeft size={12} />
                        </button>

                        <button
                            onClick={goToday}
                            className="ml-2 bg-[#a47d52] text-white font-extrabold text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-lg transition-all hover:bg-[#8a6a44] cursor-pointer whitespace-nowrap"
                        >
                            Today
                        </button>
                    </div>
                )}
            </div>

            {/* ============ Grid ============ */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex flex-col items-center py-20 gap-3">
                        <div className="w-12 h-12 border-4 border-[#f0ebe5] border-t-[#a47d52] rounded-full animate-spin" />
                        <p className="text-[#a47d52] font-extrabold text-sm">
                            جاري تحميل التقرير...
                        </p>
                    </div>
                ) : forbidden ? (
                    /* ✅ Permission denied screen */
                    <div className="flex flex-col items-center py-20 gap-3 text-center px-4">
                        <span className="text-5xl">🔒</span>
                        <p className="text-gray-800 font-extrabold text-lg">
                            ليس لديك صلاحية للوصول لهذا القسم
                        </p>
                        <p className="text-gray-500 text-sm max-w-md">
                            يرجى التواصل مع المسؤول لمنحك صلاحية سجل العمل
                            (ListWorkLog).
                        </p>
                    </div>
                ) : !grid || visibleRows.length === 0 ? (
                    <div className="flex flex-col items-center py-20 gap-3 text-center px-4">
                        <span className="text-5xl">📊</span>
                        <p className="text-gray-600 font-bold">
                            لا توجد بيانات لهذا الشهر
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-right">
                            <thead>
                                <tr className="bg-[#f4f7f9] text-gray-600 text-xs sm:text-sm">
                                    <th className="sticky right-0 bg-[#f4f7f9] z-10 p-3 text-right font-extrabold min-w-[220px] border-b border-gray-200">
                                        Employees and departments
                                    </th>
                                    {grid.days.map((d) => {
                                        const { wd, day } = formatDayHeader(d);
                                        return (
                                            <th
                                                key={d}
                                                className="p-2 sm:p-3 text-center font-extrabold min-w-[85px] border-b border-l border-gray-200"
                                            >
                                                <div className="text-[10px] sm:text-xs text-gray-500">
                                                    {wd} {day}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>

                            <tbody>
                                {visibleRows.map((row, idx) => (
                                    <tr
                                        key={row.user_id}
                                        className={
                                            idx % 2 === 0 ? "bg-white" : "bg-[#fafafa]"
                                        }
                                    >
                                        {/* User cell */}
                                        <td className="sticky right-0 bg-inherit z-10 p-3 border-b border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar
                                                    url={row.user_image}
                                                    name={row.username}
                                                />
                                                <div className="min-w-0">
                                                    <p className="font-extrabold text-gray-800 text-sm truncate">
                                                        {row.username}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 truncate">
                                                        {row.role_display}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Day cells */}
                                        {grid.days.map((d) => {
                                            const cell = row.days[d];
                                            if (!cell) {
                                                return (
                                                    <td
                                                        key={d}
                                                        className="p-2 border-b border-l border-gray-100 text-center text-gray-300 text-xs"
                                                    >
                                                        —
                                                    </td>
                                                );
                                            }
                                            return (
                                                <td
                                                    key={d}
                                                    className="p-2 border-b border-l border-gray-100 text-center"
                                                >
                                                    <button
                                                        onClick={() =>
                                                            handleCellClick(
                                                                row.user_id,
                                                                d,
                                                                cell
                                                            )
                                                        }
                                                        className="
                                                            inline-flex items-center gap-1
                                                            text-xs sm:text-sm font-bold
                                                            text-gray-700 hover:text-[#a47d52]
                                                            transition-colors cursor-pointer
                                                        "
                                                    >
                                                        {formatDurationCell(
                                                            cell.total_work_seconds
                                                        )}
                                                        {cell.has_error && (
                                                            <MdError
                                                                className="text-red-500"
                                                                size={13}
                                                            />
                                                        )}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ============ Footer ============ */}
                {!loading &&
                    !forbidden &&
                    grid &&
                    visibleRows.length > 0 && (
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-[#f8f7f5] border-t border-gray-200 text-xs sm:text-sm">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-gray-600">
                                    TOTAL:{" "}
                                    <span className="text-gray-800">
                                        {totalRows}
                                    </span>
                                </span>
                                <span className="font-bold text-gray-600">
                                    PAGES:{" "}
                                    <span className="text-gray-800">
                                        {totalPages}
                                    </span>
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-3">
                                <button
                                    disabled={page === 1}
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    className="
                                        flex items-center gap-1 font-extrabold
                                        text-gray-600 hover:text-[#a47d52]
                                        disabled:opacity-40 disabled:cursor-not-allowed
                                        cursor-pointer
                                    "
                                >
                                    <FaChevronRight size={11} />
                                    PREVIOUS
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1)
                                        )
                                    }
                                    className="
                                        flex items-center gap-1 font-extrabold
                                        text-gray-600 hover:text-[#a47d52]
                                        disabled:opacity-40 disabled:cursor-not-allowed
                                        cursor-pointer
                                    "
                                >
                                    NEXT
                                    <FaChevronLeft size={11} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 justify-center sm:justify-end">
                                <span className="font-bold text-gray-600">
                                    RECORDS:
                                </span>
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="
                                        bg-white border border-gray-200 rounded-md
                                        px-2 py-1 font-bold text-gray-700
                                        cursor-pointer outline-none
                                        focus:border-[#a47d52]
                                    "
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>
                        </div>
                    )}
            </div>

            {/* ============ Modal ============ */}
            {selected && !forbidden && (
                <DailyReportModal
                    userId={selected.userId}
                    dateStr={selected.dateStr}
                    onClose={() => setSelected(null)}
                    onDateChange={(newDate) =>
                        setSelected((prev) =>
                            prev ? { ...prev, dateStr: newDate } : prev
                        )
                    }
                />
            )}
        </div>
    );
};

/* --------------------------------------------------
   Small components
-------------------------------------------------- */
const UserAvatar = ({ url, name }) => {
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
                className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
            />
        );
    }
    return (
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a47d52] to-[#8a6a44] flex items-center justify-center text-white text-xs font-extrabold shadow-sm shrink-0">
            {name?.charAt(0)?.toUpperCase() || "?"}
        </div>
    );
};

export default AttendanceReport;