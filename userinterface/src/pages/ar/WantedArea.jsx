import { useEffect, useRef, useState, forwardRef } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    FaSync,
    FaPlus,
    FaTrash,
    FaMapMarkedAlt,
    FaExclamationTriangle,
} from "react-icons/fa";
import { MdPictureAsPdf } from "react-icons/md";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import AddWantedArea from "../../components/ar/property/AddWantedArea";
import { getAccessToken } from "../../utils/auth";
import logo from "../../assets/images/logogo-removebg-old.png";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const COMPANY_NAME_EN = "Broker City Properties";
const COMPANY_NAME_AR = "بروكر سيتي العقارية";

const PRINT_FONT =
    '"Cairo", "Tajawal", "Segoe UI", "Tahoma", "Arial", sans-serif';

/* =============================================================
   HIDDEN PDF RENDER TARGET
   A4 LANDSCAPE = 1123 x 794 px @ 96dpi
============================================================= */
const PdfRenderTarget = forwardRef(
    ({ wantedAreas, totalSale, totalRent, generatedAt }, ref) => {
        return (
            <div
                ref={ref}
                dir="rtl"
                lang="ar"
                data-pdf-root="true"
                style={{
                    width: "1123px",
                    padding: "18px 22px 24px 22px",
                    background: "#ffffff",
                    boxSizing: "border-box",
                    fontFamily: PRINT_FONT,
                    color: "#1f2937",
                    position: "fixed",
                    left: "-10000px",
                    top: 0,
                    zIndex: -1,
                }}
            >
                {/* ================= HEADER ================= */}
                <header
                    data-pdf-block="header"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        textAlign: "center",
                        borderBottom: "2px solid #a47d52",
                        paddingBottom: "10px",
                        marginBottom: "12px",
                    }}
                >
                    {/* Logo */}
                    <img
                        src={logo}
                        alt="Broker City"
                        crossOrigin="anonymous"
                        style={{
                            height: "110px",
                            width: "auto",
                            objectFit: "contain",
                            marginBottom: "10px",
                            display: "block",
                        }}
                    />

                    <h1
                        style={{
                            color: "#a47d52",
                            fontSize: "22px",
                            fontWeight: 800,
                            margin: 0,
                            lineHeight: 1.25,
                            fontFamily: PRINT_FONT,
                        }}
                    >
                        {COMPANY_NAME_EN} — {COMPANY_NAME_AR}
                    </h1>
                    <h2
                        style={{
                            color: "#1f2937",
                            fontSize: "17px",
                            fontWeight: 700,
                            marginTop: "4px",
                            lineHeight: 1.3,
                            fontFamily: PRINT_FONT,
                        }}
                    >
                        Wanted Areas Report
                    </h2>
                    <p
                        style={{
                            color: "#6b7280",
                            fontSize: "12px",
                            marginTop: "6px",
                            fontFamily: PRINT_FONT,
                        }}
                    >
                        Generated: {generatedAt}
                    </p>
                </header>

                {/* ================= TABLE ================= */}
                <main data-pdf-block="body">
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                            fontFamily: PRINT_FONT,
                            direction: "rtl",
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={{...thPdf, width: "10%"}}>#</th>
                                <th style={{...thPdf, width: "50%"}}>الموقع (Location)</th>
                                <th style={{...thPdf, width: "20%"}}>بيع (Sale)</th>
                                <th style={{...thPdf, width: "20%"}}>ايجار (Rent)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {wantedAreas.map((area, index) => {
                                const rowBg = index % 2 === 0 ? "#FFFFFF" : "#FAF7F0";
                                return (
                                    <tr
                                        key={area.id}
                                        data-pdf-row="true"
                                        style={{ background: rowBg }}
                                    >
                                        <td style={tdPdf}>{index + 1}</td>
                                        <td style={tdPdf}>{area.location || "—"}</td>
                                        
                                        {/* Sale Checkmark Column */}
                                        <td style={{...tdPdf, fontSize: 18}}>
                                            {area.sale ? (
                                                <span style={{ color: "#16a34a", fontWeight: "bold" }}>✔</span>
                                            ) : (
                                                <span style={{ color: "#d1d5db" }}>—</span>
                                            )}
                                        </td>
                                        
                                        {/* Rent Checkmark Column */}
                                        <td style={{...tdPdf, fontSize: 18}}>
                                            {area.rent ? (
                                                <span style={{ color: "#16a34a", fontWeight: "bold" }}>✔</span>
                                            ) : (
                                                <span style={{ color: "#d1d5db" }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>

                        {/* ================= FOOTER ================= */}
                        <tfoot>
                            <tr
                                data-pdf-row="true"
                                style={{ background: "#e6d5c0" }}
                            >
                                <td
                                    colSpan={2}
                                    style={{
                                        ...tdFooterPdf,
                                        textAlign: "right",
                                        fontSize: 16,
                                    }}
                                >
                                    اجمالي الطلبات — Total Requests
                                </td>
                                <td
                                    style={{
                                        ...tdFooterPdf,
                                        color: "#a47d52",
                                        fontSize: 16,
                                    }}
                                >
                                    {totalSale}
                                </td>
                                <td
                                    style={{
                                        ...tdFooterPdf,
                                        color: "#a47d52",
                                        fontSize: 16,
                                    }}
                                >
                                    {totalRent}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </main>
            </div>
        );
    }
);
PdfRenderTarget.displayName = "PdfRenderTarget";

/* =============================================================
   PDF CELL STYLES
============================================================= */
const thPdf = {
    border: "1px solid #000",
    padding: "12px 8px",
    fontSize: 14,
    fontWeight: 800,
    color: "#000",
    textAlign: "center",
    background: "#e6d5c0",
    fontFamily: PRINT_FONT,
    whiteSpace: "pre-line",
};

const tdPdf = {
    border: "1px solid #ccc",
    padding: "14px 8px",
    fontSize: 15,
    color: "#000",
    textAlign: "center",
    fontFamily: PRINT_FONT,
    wordBreak: "break-word",
    lineHeight: 1.6,
};

const tdFooterPdf = {
    border: "1px solid #ccc",
    padding: "16px 10px",
    fontSize: 15,
    fontWeight: 800,
    color: "#000",
    textAlign: "center",
    fontFamily: PRINT_FONT,
    wordBreak: "break-word",
    lineHeight: 1.5,
    background: "#e6d5c0",
};

/* =============================================================
   MAIN COMPONENT
============================================================= */
const WantedArea = () => {
    const [wantedAreas, setWantedAreas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfReady, setPdfReady] = useState(false);

    const renderRef = useRef(null);
    const isGeneratingRef = useRef(false);

    /* ---------- Font readiness ---------- */
    useEffect(() => {
        const ensureFonts = async () => {
            if (document.fonts?.ready) {
                try {
                    await document.fonts.load("700 16px Cairo");
                    await document.fonts.load("400 16px Cairo");
                } catch {}
                await document.fonts.ready;
            }
            setPdfReady(true);
        };
        ensureFonts();
    }, []);

    /* ---------- Fetch ---------- */
    const fetchWantedAreas = async (silent = false) => {
        if (silent) setRefreshing(true);
        else setLoading(true);

        try {
            const token = getAccessToken();
            if (!token) {
                toast.error("يجب تسجيل الدخول أولاً");
                return;
            }

            const res = await fetch(`${BASE}/api/wanted-areas/`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error("فشل تحميل المناطق المطلوبة");

            const data = await res.json();
            
            if (Array.isArray(data.results)) {
                setWantedAreas(data.results);
            } else if (Array.isArray(data)) {
                setWantedAreas(data);
            } else {
                setWantedAreas([]);
            }
        } catch (err) {
            console.error("Fetch wanted areas error:", err);
            toast.error("❌ فشل تحميل المناطق المطلوبة");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchWantedAreas();
    }, []);

    /* ---------- Delete ---------- */
    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);

        try {
            const token = getAccessToken();
            const res = await fetch(
                `${BASE}/api/wanted-areas/${confirmDelete.id}/delete/`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            let data = {};
            try {
                data = await res.json();
            } catch {}

            if (!res.ok) {
                throw new Error(data?.message || "فشل حذف المنطقة");
            }

            toast.success(data?.message || "✅ تم حذف المنطقة بنجاح");
            setConfirmDelete(null);
            fetchWantedAreas(true);
        } catch (err) {
            console.error("Delete wanted area error:", err);
            toast.error(err.message || "❌ حدث خطأ أثناء الحذف");
        } finally {
            setDeleting(false);
        }
    };

    /* ---------- Totals ---------- */
    const totalSale = wantedAreas.filter((a) => a.sale).length;
    const totalRent = wantedAreas.filter((a) => a.rent).length;

    const printGeneratedAt = new Date().toLocaleString("ar-EG");

    /* =========================================================
       PDF DOWNLOAD
    ========================================================= */
    const handleDownloadPDF = async () => {
        if (!wantedAreas || wantedAreas.length === 0) {
            toast.warning("لا توجد بيانات لتصديرها");
            return;
        }
        if (isGeneratingRef.current || !renderRef.current) return;

        isGeneratingRef.current = true;
        setIsGeneratingPdf(true);

        try {
            const node = renderRef.current;

            const rootRect = node.getBoundingClientRect();
            const rowEls = node.querySelectorAll('[data-pdf-row="true"]');

            const cssRowRects = Array.from(rowEls).map((el) => {
                const r = el.getBoundingClientRect();
                return {
                    top: r.top - rootRect.top,
                    bottom: r.bottom - rootRect.top,
                };
            });

            const scale = 2.5;
            const canvas = await html2canvas(node, {
                scale,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                windowWidth: node.scrollWidth,
                windowHeight: node.scrollHeight,
            });

            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();

            const FOOTER_RESERVED_MM = 10;
            const usablePageH = pageH - FOOTER_RESERVED_MM;

            const pxToMm = pageW / canvas.width;
            const usablePagePx = usablePageH / pxToMm;

            const candidateBreaks = cssRowRects.map((r) => r.top * scale);
            candidateBreaks.push(canvas.height);

            const pageBreakPx = [];
            let currentStart = 0;
            let lastChosen = 0;

            for (let i = 0; i < candidateBreaks.length; i++) {
                const candidateEnd = candidateBreaks[i];

                if (candidateEnd - currentStart > usablePagePx) {
                    if (lastChosen > currentStart) {
                        pageBreakPx.push(lastChosen);
                        currentStart = lastChosen;
                        i--;
                        lastChosen = currentStart;
                        continue;
                    } else {
                        const forced = currentStart + usablePagePx;
                        pageBreakPx.push(forced);
                        currentStart = forced;
                        lastChosen = currentStart;
                        continue;
                    }
                }

                lastChosen = candidateEnd;
            }

            if (pageBreakPx[pageBreakPx.length - 1] !== canvas.height) {
                if (canvas.height - currentStart > usablePagePx) {
                    pageBreakPx.push(currentStart + usablePagePx);
                }
                pageBreakPx.push(canvas.height);
            }

            const uniqueBreaks = Array.from(new Set(pageBreakPx))
                .filter((v) => v > 0)
                .sort((a, b) => a - b);

            let prevY = 0;
            const pageCanvases = [];

            for (const breakY of uniqueBreaks) {
                const sliceH = Math.round(breakY - prevY);
                if (sliceH <= 0) continue;

                const slice = document.createElement("canvas");
                slice.width = canvas.width;
                slice.height = sliceH;
                const sctx = slice.getContext("2d");
                sctx.fillStyle = "#ffffff";
                sctx.fillRect(0, 0, slice.width, slice.height);
                sctx.drawImage(
                    canvas,
                    0,
                    Math.round(prevY),
                    canvas.width,
                    sliceH,
                    0,
                    0,
                    canvas.width,
                    sliceH
                );

                pageCanvases.push({ canvas: slice });
                prevY = breakY;
            }

            const totalPages = pageCanvases.length;

            for (let page = 0; page < totalPages; page++) {
                if (page > 0) doc.addPage();

                const { canvas: sliceCanvas } = pageCanvases[page];

                const sliceHmm =
                    (sliceCanvas.height * pageW) / sliceCanvas.width;
                const sliceImgData = sliceCanvas.toDataURL("image/jpeg", 0.95);

                doc.addImage(
                    sliceImgData,
                    "JPEG",
                    0,
                    0,
                    pageW,
                    sliceHmm,
                    undefined,
                    "FAST"
                );

                const footerY = pageH - 5;
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.3);
                doc.line(15, footerY - 3, pageW - 15, footerY - 3);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(164, 125, 82);
                doc.text("BROKER CITY PROPERTIES", pageW / 2, footerY, {
                    align: "center",
                });

                doc.setFont("helvetica", "normal");
                doc.setFontSize(6.5);
                doc.setTextColor(140, 140, 140);
                doc.text(
                    `Page ${page + 1} / ${totalPages}`,
                    pageW - 15,
                    footerY,
                    { align: "right" }
                );
            }

            doc.save(
                `Wanted_Areas_Report_${new Date()
                    .toISOString()
                    .slice(0, 10)}.pdf`
            );
            toast.success("✅ تم تحميل ملف PDF");
        } catch (err) {
            console.error("PDF generation error:", err);
            toast.error("❌ تعذر إنشاء ملف PDF");
        } finally {
            isGeneratingRef.current = false;
            setIsGeneratingPdf(false);
        }
    };

    /* =========================================================
       RENDER
    ========================================================= */
    return (
        <div dir="rtl" className="min-h-screen bg-[#f8f7f5] p-4 md:p-6">
            {/* ============ HEADER ============ */}
            <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                        <FaMapMarkedAlt size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-800">
                            المناطق المطلوبة (Wanted Areas)
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            إدارة طلبات العملاء (بيع / إيجار)
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* PDF */}
                    <button
                        onClick={handleDownloadPDF}
                        disabled={
                            isGeneratingPdf ||
                            wantedAreas.length === 0 ||
                            !pdfReady
                        }
                        className="
                            flex items-center gap-2
                            bg-white border-2 border-[#a47d52]
                            text-[#a47d52] font-extrabold
                            px-5 py-2.5 rounded-lg
                            transition-all duration-300
                            hover:bg-[#a47d52] hover:text-white
                            hover:scale-[1.02]
                            disabled:opacity-50 disabled:cursor-not-allowed
                            cursor-pointer
                        "
                    >
                        <MdPictureAsPdf className="text-lg" />
                        {isGeneratingPdf ? "جاري التحميل..." : "تحميل PDF"}
                    </button>

                    <button
                        onClick={() => fetchWantedAreas(true)}
                        disabled={loading || refreshing}
                        className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-[#a47d52]/5 hover:border-[#a47d52]/40 text-gray-700 font-bold px-4 py-2.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <FaSync
                            className={refreshing ? "animate-spin" : ""}
                            size={14}
                        />
                        تحديث
                    </button>

                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center justify-center gap-2 bg-[#a47d52] text-white font-extrabold px-5 py-2.5 rounded-lg transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] cursor-pointer"
                    >
                        <FaPlus />
                        منطقة جديدة
                    </button>
                </div>
            </div>

            {/* ============ CONTENT ============ */}
            {loading ? (
                <div className="bg-white border border-gray-200 rounded-xl">
                    <p className="text-center py-16 text-gray-500">
                        جاري التحميل...
                    </p>
                </div>
            ) : wantedAreas.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
                    <span className="text-5xl">📍</span>
                    <p className="text-gray-600 font-bold mt-3">
                        لا توجد مناطق مطلوبة
                    </p>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="mt-4 bg-[#a47d52] text-white font-extrabold px-6 py-2.5 rounded-lg transition-all hover:bg-[#8a6a44] cursor-pointer"
                    >
                        + إضافة أول منطقة
                    </button>
                </div>
            ) : (
                <div className="no-print bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-[#f8f7f5] text-gray-600 text-sm">
                                <tr>
                                    <th className="p-4 font-extrabold">#</th>
                                    <th className="p-4 font-extrabold">
                                        الموقع (Location)
                                    </th>
                                    <th className="p-4 font-extrabold text-center">
                                        بيع (Sale)
                                    </th>
                                    <th className="p-4 font-extrabold text-center">
                                        إيجار (Rent)
                                    </th>
                                    <th className="p-4 font-extrabold text-center">
                                        إجراءات
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {wantedAreas.map((area) => (
                                    <tr
                                        key={area.id}
                                        className="border-t border-gray-100 hover:bg-[#f8f7f5]/60 transition-colors"
                                    >
                                        <td className="p-4 text-xs text-gray-500">
                                            {area.id}
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">
                                            {area.location || "-"}
                                        </td>
                                        <td className="p-4 text-center">
                                            {area.sale ? (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-bold text-lg">
                                                    ✔
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {area.rent ? (
                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 font-bold text-lg">
                                                    ✔
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">—</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() =>
                                                    setConfirmDelete(area)
                                                }
                                                className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center cursor-pointer hover:bg-red-100 transition-all mx-auto"
                                                title="حذف"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ============ ADD MODAL ============ */}
            {showAdd && (
                <AddWantedArea
                    onClose={() => setShowAdd(false)}
                    onSuccess={() => {
                        setShowAdd(false);
                        fetchWantedAreas(true);
                    }}
                />
            )}

            {/* ============ DELETE CONFIRMATION ============ */}
            {confirmDelete && (
                <div
                    className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !deleting)
                            setConfirmDelete(null);
                    }}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.3)] overflow-hidden"
                        style={{ animation: "modalIn 0.25s ease-out" }}
                    >
                        <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-red-400" />

                        <div className="flex justify-center pt-6">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />
                                <div className="relative w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                                    <FaExclamationTriangle
                                        className="text-red-500"
                                        size={28}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pt-4 pb-6 text-center">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">
                                تأكيد الحذف
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                هل أنت متأكد من حذف هذه المنطقة؟
                                <br />
                                <span className="font-extrabold text-gray-800 mt-1 inline-block">
                                    {confirmDelete.location || "منطقة بدون اسم"}
                                </span>
                            </p>

                            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-4">
                                <p className="text-xs text-red-700 font-bold">
                                    ⚠️ لا يمكن التراجع عن هذا الإجراء
                                </p>
                            </div>

                            <div className="flex flex-col md:flex-row gap-3">
                                <button
                                    onClick={handleConfirmDelete}
                                    disabled={deleting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-red-600 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {deleting ? (
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
                                            جاري الحذف...
                                        </>
                                    ) : (
                                        <>
                                            <FaTrash size={14} />
                                            نعم، احذف
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    disabled={deleting}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ HIDDEN PDF RENDER TARGET ============ */}
            {pdfReady && (
                <PdfRenderTarget
                    ref={renderRef}
                    wantedAreas={wantedAreas}
                    totalSale={totalSale}
                    totalRent={totalRent}
                    generatedAt={printGeneratedAt}
                />
            )}

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(15px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default WantedArea;