import React, { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    FaFileAlt,
    FaPlus,
    FaSearch,
    FaTrash,
    FaEdit,
    FaUserShield,
    FaCheckCircle,
    FaTimesCircle,
    FaFilePdf,
    FaRegFileImage,
    FaTag,
    FaMoneyBillWave,
    FaBed,
} from "react-icons/fa";
import { FiX, FiFilter } from "react-icons/fi";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AddEditPermit from "../../components/en/listing/AddEditPermit";

import logo from '../../assets/images/logogo-removebg-old.png';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// ---------- PDF export helpers (A4 PORTRAIT: easy to read on phones) ----------
const PDF_PAGE_W = 794;
const PDF_PAGE_H = Math.round((PDF_PAGE_W * 297) / 210); // 1123
const PDF_PAD = 30;
const PDF_FONT = '"Segoe UI", Tahoma, "Noto Sans Arabic", "Arial Unicode MS", Arial, sans-serif';

const isMobileDevice = () => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

const formatPrice = (val) => {
    if (!val || Number(val) === 0) return "—";
    return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ---------- Title deed -> inline image helpers ----------
const blobToDataURL = (blob) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });





// -------Shrink big photos so the PDF stays light (important on phones)
const downscaleImage = (dataUrl, maxW = 1000) =>
    new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ratio = Math.min(1, maxW / img.width);
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * ratio);
            canvas.height = Math.round(img.height * ratio);
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
    });

// First page of a PDF deed -> image (needs: npm install pdfjs-dist)
const renderPdfFirstPage = async (blob) => {
    const pdfjsLib = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

    const data = await blob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 1000 / base.width });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas.toDataURL("image/jpeg", 0.85);
};

// Returns a data URL or null (null = could not be previewed)
const buildDeedPreview = async (permit) => {
    if (!permit.title_deed_url) return null;
    try {
        const res = await fetch(permit.title_deed_url, { mode: "cors" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const blob = await res.blob();

        const looksPdf = permit.title_deed_is_pdf || blob.type === "application/pdf";
        if (looksPdf) return await renderPdfFirstPage(blob);

        const dataUrl = await blobToDataURL(blob);
        return await downscaleImage(dataUrl);
    } catch (err) {
        console.warn("Title deed preview failed for permit", permit.id, err);
        return null;
    }
};

// ---------- Hidden PDF template ----------
const PermitPdfTemplate = React.forwardRef(({ permits, previews }, ref) => {
    const label = { color: "#6b7280", fontWeight: "bold" };

    return (
        <div
            ref={ref}
            data-pdf-root
            dir="ltr"
            style={{
                width: `${PDF_PAGE_W}px`,
                boxSizing: "border-box",
                padding: `${PDF_PAD}px`,
                backgroundColor: "#ffffff",
                fontFamily: PDF_FONT,
                position: "fixed",
                left: "-9999px",
                top: 0,
                zIndex: -1,
                pointerEvents: "none",
            }}
        >
            {/* Header */}
            <div data-pdf-header style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #1e3a8a", paddingBottom: "14px", marginBottom: "18px" }}>
                <img src={logo} alt="Logo" style={{ height: "56px", objectFit: "contain" }} />
                <div style={{ marginLeft: "16px" }}>
                    <h1 style={{ fontSize: "26px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>Permit Numbers Sheet</h1>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: "4px 0 0 0" }}>
                        Generated: {new Date().toLocaleString()} — {permits.length} records
                    </p>
                </div>
            </div>

            {/* Records */}
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {permits.map((permit, index) => {
                    const preview = previews[permit.id];
                    return (
                        <div key={permit.id} data-pdf-row style={{ borderBottom: "1px solid #d1d5db", paddingBottom: "18px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                                <h3 dir="auto" style={{ fontSize: "20px", fontWeight: "bold", margin: 0, color: "#111827", lineHeight: 1.3 }}>
                                    {index + 1}. {permit.title || "Untitled Permit"}
                                </h3>
                                <span style={{
                                    padding: "4px 10px",
                                    backgroundColor: permit.permit_status ? "#e0e7ff" : "#f3f4f6",
                                    color: permit.permit_status ? "#1e3a8a" : "#6b7280",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    fontWeight: "bold",
                                    whiteSpace: "nowrap",
                                }}>
                                    {permit.permit_status || "No Status"}
                                </span>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 28px", marginTop: "10px", fontSize: "15px", color: "#374151", lineHeight: 1.5 }}>
                                <span><span style={label}>Permit No: </span>{permit.permit_no || "—"}</span>
                                <span><span style={label}>Ref No: </span>{permit.refrence_no || "—"}</span>
                                <span><span style={label}>Bedrooms: </span>{permit.bedrooms || "—"}</span>
                                <span><span style={label}>Offer: </span><span style={{ textTransform: "capitalize" }}>{permit.property_offer || "—"}</span></span>
                                <span><span style={label}>Price: </span>{formatPrice(permit.price)}</span>
                                <span><span style={label}>Managed By: </span>{permit.managed_by_name || "Unassigned"}</span>
                                <span><span style={label}>Created: </span>{permit.created_at ? new Date(permit.created_at).toLocaleDateString() : "—"}</span>
                            </div>

                            {/* Title deed preview (also a clickable link in the PDF) */}
                            <div style={{ marginTop: "12px" }}>
                                <div style={{ ...label, fontSize: "15px", marginBottom: "6px" }}>Title Deed</div>
                                {permit.title_deed_url ? (
                                    <div
                                        data-deed-box
                                        data-url={permit.title_deed_url}
                                        style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "6px", backgroundColor: "#f9fafb", textAlign: "center" }}
                                    >
                                        {preview ? (
                                            <img
                                                src={preview}
                                                alt="Title deed"
                                                style={{ maxWidth: "100%", maxHeight: "430px", objectFit: "contain", display: "block", margin: "0 auto" }}
                                            />
                                        ) : (
                                            <div style={{ padding: "22px 10px", fontSize: "15px", color: "#1e3a8a", fontWeight: "bold" }}>
                                                {permit.title_deed_is_pdf ? "PDF document" : "Image"} — preview unavailable, tap to open file
                                            </div>
                                        )}
                                        <div style={{ fontSize: "12px", color: "#1e3a8a", textDecoration: "underline", marginTop: "4px" }}>
                                            Tap to open the full file
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: "15px", color: "#9ca3af" }}>No file uploaded</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});


const Permit = () => {
    const [permits, setPermits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modals
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [selectedPermit, setSelectedPermit] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Search & Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [searchStatus, setSearchStatus] = useState("");
    const [searchOffer, setSearchOffer] = useState("");

    const requestId = useRef(0);

    // Export State (the hidden template only exists while exporting)
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [exportPreviews, setExportPreviews] = useState(null);
    const pdfRef = useRef(null);

    // =========================================================
    // FETCH DATA
    // =========================================================
    const fetchPermits = async () => {
        const myRequest = ++requestId.current;
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                toast.error("Please login to view Permit Numbers");
                window.location.href = "/login";
                return;
            }

            const params = new URLSearchParams();
            if (searchTerm.trim()) params.append("search", searchTerm.trim());
            if (searchStatus) params.append("permit_status", searchStatus);
            if (searchOffer) params.append("property_offer", searchOffer);

            const response = await fetch(`${BASE}/api/permit-numbers/?${params.toString()}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("Session expired. Please login again.");
                    localStorage.removeItem("access_token");
                    window.location.href = "/login";
                } else {
                    toast.error("Failed to load permits");
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (myRequest !== requestId.current) return;

            let list = [];
            if (Array.isArray(data)) {
                list = data;
            } else if (data.results && Array.isArray(data.results)) {
                list = data.results;
            }

            setPermits(list);
        } catch (err) {
            if (myRequest !== requestId.current) return;
            setError("Failed to load Permit Numbers");
            console.error(err);
        } finally {
            if (myRequest === requestId.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchPermits();
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm, searchStatus, searchOffer]);

    // =========================================================
    // EXPORT PDF
    // =========================================================
    const handleExportPDF = async () => {
        if (permits.length === 0) return toast.error("No records to export.");

        setIsGeneratingPdf(true);
        const toastId = toast.loading("Preparing title deeds...");

        try {
            // 1) Download every title deed and turn it into an inline image (4 at a time)
            const previews = {};
            const withFiles = permits.filter((p) => p.title_deed_url);
            for (let i = 0; i < withFiles.length; i += 4) {
                const batch = withFiles.slice(i, i + 4);
                const results = await Promise.all(batch.map((p) => buildDeedPreview(p)));
                batch.forEach((p, k) => { previews[p.id] = results[k]; });
                toast.update(toastId, { render: `Preparing title deeds... (${Math.min(i + 4, withFiles.length)}/${withFiles.length})` });
            }

            // 2) Mount the hidden template with those previews
            flushSync(() => setExportPreviews(previews));
            const node = pdfRef.current;
            if (document.fonts?.ready) await document.fonts.ready;

            // wait until every image of the template is decoded
            await Promise.all(
                Array.from(node.querySelectorAll("img")).map((img) =>
                    img.complete ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; })
                )
            );

            // 3) Measure rows + deed boxes
            const rootTop = node.getBoundingClientRect().top;
            const headerH = node.querySelector("[data-pdf-header]").getBoundingClientRect().height;
            const rows = Array.from(node.querySelectorAll("[data-pdf-row]")).map((r) => {
                const b = r.getBoundingClientRect();
                const box = r.querySelector("[data-deed-box]");
                const bb = box ? box.getBoundingClientRect() : null;
                return {
                    top: b.top - rootTop,
                    bottom: b.bottom - rootTop,
                    link: bb
                        ? {
                              url: box.getAttribute("data-url"),
                              x: bb.left - node.getBoundingClientRect().left,
                              y: bb.top - rootTop,
                              w: bb.width,
                              h: bb.height,
                          }
                        : null,
                };
            });

            // 4) Split rows into pages (never cut through a record)
            const pages = [];
            let i = 0;
            while (i < rows.length) {
                const isFirst = pages.length === 0;
                const startRow = i;
                const used = (r) => isFirst
                    ? rows[r].bottom + PDF_PAD
                    : PDF_PAD + (rows[r].bottom - rows[startRow].top) + PDF_PAD;
                let end = startRow;
                while (end < rows.length && (end === startRow || used(end) <= PDF_PAGE_H)) end++;
                pages.push({ from: startRow, to: end });
                i = end;
            }

            // 5) Render each page
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const scale = isMobileDevice() ? 1.5 : 2;

            for (let p = 0; p < pages.length; p++) {
                const { from, to } = pages[p];
                toast.update(toastId, { render: `Generating PDF... (page ${p + 1} of ${pages.length})` });

                const canvas = await html2canvas(node, {
                    scale,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    windowWidth: PDF_PAGE_W,
                    scrollX: 0,
                    scrollY: 0,
                    onclone: (doc) => {
                        const root = doc.querySelector("[data-pdf-root]");
                        Array.from(root.querySelectorAll("[data-pdf-row]")).forEach((r, idx) => {
                            if (idx < from || idx >= to) r.remove();
                        });
                        if (p > 0) root.querySelector("[data-pdf-header]")?.remove();
                    },
                });

                if (p > 0) pdf.addPage();

                let w = pageW;
                let h = (canvas.height * w) / canvas.width;
                if (h > pageH) { w = (w * pageH) / h; h = pageH; }

                pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", 0, 0, w, h);

                // clickable area over every title deed preview
                const k = w / PDF_PAGE_W; // px -> mm
                for (let r = from; r < to; r++) {
                    const link = rows[r].link;
                    if (!link) continue;
                    const y = p === 0 ? link.y : PDF_PAD + (link.y - rows[from].top);
                    pdf.link(link.x * k, y * k, link.w * k, link.h * k, { url: link.url });
                }

                pdf.setFontSize(9);
                pdf.setTextColor(120);
                pdf.text(`Page ${p + 1} of ${pages.length}`, pageW / 2, pageH - 4, { align: "center" });
            }

            const managedByName = (permits[0]?.managed_by_name || "Unassigned").replace(/\s+/g, "_");
            const dateStr = new Date().toISOString().slice(0, 10);
            pdf.save(`${managedByName}_PermitNo_${dateStr}.pdf`);

            const failed = withFiles.filter((p) => !previews[p.id]).length;
            toast.update(toastId, {
                render: failed
                    ? `✅ PDF downloaded (${failed} title deed preview(s) unavailable)`
                    : "✅ PDF downloaded!",
                type: failed ? "warning" : "success",
                isLoading: false,
                autoClose: 4000,
            });
        } catch (err) {
            console.error("PDF error:", err);
            toast.update(toastId, { render: "❌ Failed to generate PDF", type: "error", isLoading: false, autoClose: 4000 });
        } finally {
            setExportPreviews(null);
            setIsGeneratingPdf(false);
        }
    };

    // =========================================================
    // HANDLERS
    // =========================================================
    const handleOpenCreate = () => {
        setSelectedPermit(null);
        setShowAddEditModal(true);
    };

    const handleOpenEdit = (permit) => {
        setSelectedPermit(permit);
        setShowAddEditModal(true);
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        const id = deleteConfirm.id;
        setDeletingId(id);

        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${BASE}/api/permit-numbers/${id}/delete/`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("✅ Permit deleted successfully");
            setPermits((prev) => prev.filter((p) => p.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            toast.error("❌ Error deleting permit");
        } finally {
            setDeletingId(null);
        }
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSearchStatus("");
        setSearchOffer("");
    };

    // small shared pieces
    const DeedLink = ({ permit }) =>
        permit.title_deed_url ? (
            <a
                href={permit.title_deed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#a47d52] hover:text-[#8a6a44] hover:underline"
            >
                {permit.title_deed_is_pdf ? <FaFilePdf /> : <FaRegFileImage />}
                View File
            </a>
        ) : (
            <span className="text-xs text-gray-400">No File</span>
        );

    // =========================================================
    // RENDER
    // =========================================================
    return (
        <div dir="ltr" className="min-h-screen bg-white py-6 px-3 sm:py-10 sm:px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans relative pb-24">
            <ToastContainer position="top-right" theme="light" />

            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
                <div className="text-center xl:text-left">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center xl:justify-start gap-3">
                        <FaFileAlt className="text-[#a47d52]" /> Permit Numbers
                    </h2>
                </div>

                <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
                    <button
                        onClick={handleExportPDF}
                        disabled={isGeneratingPdf || permits.length === 0}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaFilePdf /> {isGeneratingPdf ? "Generating..." : "Export PDF"}
                    </button>

                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap bg-[#1e3a8a] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5"
                    >
                        <FaPlus /> Add Permit
                    </button>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="max-w-full mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search permit no, reference, or title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                        />
                    </div>
                    <div className="relative">
                        <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={searchStatus}
                            onChange={(e) => setSearchStatus(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white"
                        >
                            <option value="">All Statuses</option>
                            <option value="Owner's Approval">Owner's Approval</option>
                            <option value="Payment">Payment</option>
                            <option value="Completed">Completed</option>
                        </select>
                    </div>
                    <div className="relative">
                        <FaTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <select
                            value={searchOffer}
                            onChange={(e) => setSearchOffer(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white"
                        >
                            <option value="">All Offers</option>
                            <option value="sale">Sale</option>
                            <option value="rent">Rent</option>
                        </select>
                    </div>
                </div>

                <div className="mt-3 flex justify-end">
                    <button
                        onClick={clearFilters}
                        disabled={!searchTerm && !searchStatus && !searchOffer}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <FiX /> Clear Filters
                    </button>
                </div>
            </div>

            <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

            {/* LIST */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
                {loading && permits.length === 0 ? (
                    <div className="flex flex-col justify-center items-center gap-4 p-24">
                        <div className="w-10 h-10 border-4 border-[#f8f7f5] border-t-[#1e3a8a] rounded-full animate-spin"></div>
                        <p className="text-[#1e3a8a] font-bold">Loading permits...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col justify-center items-center gap-4 p-16 text-center">
                        <span className="text-6xl text-red-500">⚠️</span>
                        <h3 className="text-2xl font-extrabold text-gray-800">Error Loading Data</h3>
                        <p className="text-gray-500">{error}</p>
                        <button
                            onClick={fetchPermits}
                            className="mt-2 px-6 py-2.5 bg-[#1e3a8a] text-white rounded-lg font-bold hover:bg-[#172554] transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : permits.length === 0 ? (
                    <div className="flex flex-col justify-center items-center gap-4 p-16 text-center">
                        <span className="text-6xl">📄</span>
                        <h3 className="text-2xl font-extrabold text-gray-800">No Permits Found</h3>
                        <p className="text-gray-500">Add a new permit or adjust your search filters.</p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE: cards */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {permits.map((permit) => (
                                <div key={permit.id} className="p-4 flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 break-words">{permit.permit_no || "—"}</p>
                                            <p className="text-xs text-gray-500">Ref: {permit.refrence_no || "—"}</p>
                                        </div>
                                        {permit.permit_status && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#1e3a8a]/10 text-[#1e3a8a] shrink-0">
                                                <FaCheckCircle size={10} /> {permit.permit_status}
                                            </span>
                                        )}
                                    </div>

                                    {permit.title && <p dir="auto" className="text-sm text-gray-700 break-words">{permit.title}</p>}

                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                                        <span className="inline-flex items-center gap-1.5 font-semibold"><FaBed className="text-gray-400" /> {permit.bedrooms || "—"}</span>
                                        {permit.property_offer && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#a47d52]/10 text-[#a47d52]">
                                                <FaTag size={8} /> {permit.property_offer}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center gap-1 font-bold text-gray-700"><FaMoneyBillWave className="text-gray-400" size={12} /> {formatPrice(permit.price)}</span>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                                            <FaUserShield className="text-gray-400" /> {permit.managed_by_name || "Unassigned"}
                                        </span>
                                        <DeedLink permit={permit} />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <button onClick={() => handleOpenEdit(permit)} className="p-2 rounded-lg text-gray-400 hover:text-[#1e3a8a] hover:bg-[#1e3a8a]/10" title="Edit"><FaEdit size={18} /></button>
                                        <button onClick={() => setDeleteConfirm(permit)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50" title="Delete"><FaTrash size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* DESKTOP / TABLET: table */}
                        <div className="hidden md:block overflow-x-auto custom-scrollbar pb-2">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead className="bg-[#f8f7f5] border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Permit / Ref No</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Title / Description</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Bedrooms</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Offer / Price</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Title Deed</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Managed By</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {permits.map((permit) => (
                                        <tr key={permit.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="font-bold text-gray-800">{permit.permit_no || "—"}</p>
                                                    <p className="text-xs text-gray-500">Ref: {permit.refrence_no || "—"}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-[250px] truncate" title={permit.title}>
                                                {permit.title || "—"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <FaBed className="text-gray-400" /> {permit.bedrooms || "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {permit.permit_status ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#1e3a8a]/10 text-[#1e3a8a]">
                                                        <FaCheckCircle size={10} /> {permit.permit_status}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {permit.property_offer && (
                                                        <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#a47d52]/10 text-[#a47d52]">
                                                            <FaTag size={8} /> {permit.property_offer}
                                                        </span>
                                                    )}
                                                    <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                                        <FaMoneyBillWave className="text-gray-400" size={12} />
                                                        {formatPrice(permit.price)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><DeedLink permit={permit} /></td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
                                                    <FaUserShield className="text-gray-400" /> {permit.managed_by_name || "Unassigned"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleOpenEdit(permit)} className="p-2 rounded-lg transition-colors text-gray-400 hover:text-[#1e3a8a] hover:bg-[#1e3a8a]/10" title="Edit"><FaEdit size={18} /></button>
                                                    <button onClick={() => setDeleteConfirm(permit)} className="p-2 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50" title="Delete"><FaTrash size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* MODALS */}
            {showAddEditModal && (
                <AddEditPermit
                    permit={selectedPermit}
                    onClose={() => setShowAddEditModal(false)}
                    onSuccess={() => {
                        setShowAddEditModal(false);
                        fetchPermits();
                    }}
                />
            )}

            {/* DELETE CONFIRMATION */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
                        <div className="flex justify-center pt-6 pb-4">
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                                <FaTimesCircle className="text-red-500" size={32} />
                            </div>
                        </div>
                        <div className="px-6 pb-6">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">Delete Permit</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.permit_no || deleteConfirm.refrence_no}"</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={deletingId === deleteConfirm.id}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deletingId === deleteConfirm.id}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {deletingId === deleteConfirm.id ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <FaTrash size={16} />
                                    )}
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN PDF TEMPLATE (mounted only while exporting) */}
            {exportPreviews && <PermitPdfTemplate ref={pdfRef} permits={permits} previews={exportPreviews} />}
        </div>
    );
};

export default Permit;


// import React, { useState, useEffect, useRef } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import {
//     FaFileAlt,
//     FaPlus,
//     FaSearch,
//     FaTrash,
//     FaEdit,
//     FaUserShield,
//     FaCheckCircle,
//     FaTimesCircle,
//     FaFilePdf,
//     FaRegFileImage,
//     FaTag,
//     FaMoneyBillWave,
//     FaBed,
// } from "react-icons/fa";
// import { FiX, FiFilter } from "react-icons/fi";
// import html2canvas from "html2canvas";
// import jsPDF from "jspdf";
// import AddEditPermit from "../../components/en/listing/AddEditPermit";

// import logo from '../../assets/images/logogo-removebg-old.png';

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
// // npm install pdfjs-dist | To solve preview title deed on pdf sheet 
// // ---------- PDF export helpers ----------
// const PDF_PAGE_W = 1123;                                  
// const PDF_PAGE_H = Math.round((PDF_PAGE_W * 210) / 297);  
// const PDF_PAD = 30;                                       

// const PDF_FONT = '"Segoe UI", Tahoma, "Noto Sans Arabic", "Arial Unicode MS", Arial, sans-serif';

// // Format currency
// const formatPrice = (val) => {
//     if (!val || Number(val) === 0) return "—";
//     return Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// };

// // ✅ Custom PDF Template
// const PermitPdfTemplate = React.forwardRef(({ permits }, ref) => {
//     return (
//         <div
//             ref={ref}
//             data-pdf-root
//             dir="ltr"
//             style={{
//                 width: `${PDF_PAGE_W}px`, 
//                 boxSizing: "border-box",
//                 padding: `${PDF_PAD}px`,
//                 backgroundColor: "#ffffff",
//                 fontFamily: PDF_FONT,
//                 position: "fixed",
//                 left: "-9999px",
//                 top: 0,
//                 zIndex: -1,
//             }}
//         >
//             {/* Header */}
//             <div data-pdf-header style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #1e3a8a", paddingBottom: "16px", marginBottom: "20px" }}>
//                 <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "60px", objectFit: "contain" }} />
//                 <div style={{ marginLeft: "20px" }}>
//                     <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>Permit Numbers Sheet</h1>
//                     <p style={{ fontSize: "14px", color: "#6b7280", margin: "5px 0 0 0" }}>
//                         Generated: {new Date().toLocaleString()} — <span data-pdf-count>{permits.length} records</span>
//                     </p>
//                 </div>
//             </div>

//             {/* Lines Layout */}
//             <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
//                 {permits.map((permit, index) => (
//                     <div 
//                         key={permit.id} 
//                         data-pdf-row
//                         data-url={permit.title_deed_url || ""}
//                         style={{ 
//                             borderBottom: "1px solid #e5e7eb", 
//                             paddingBottom: "16px", 
//                             pageBreakInside: "avoid" 
//                         }}
//                     >
//                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
//                             <div>
//                                 <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 6px 0", color: "#111827" }}>
//                                     {index + 1}. {permit.title || "Untitled Permit"}
//                                 </h3>
//                                 <div style={{ fontSize: "14px", color: "#4b5563", display: "flex", gap: "20px" }}>
//                                     <span><strong>Permit No:</strong> {permit.permit_no || "—"}</span>
//                                     <span><strong>Ref No:</strong> {permit.refrence_no || "—"}</span>
//                                     <span><strong>Bedrooms:</strong> {permit.bedrooms || "—"}</span>
//                                 </div>
//                             </div>
//                             <div style={{ textAlign: "right" }}>
//                                 <span style={{ 
//                                     display: "inline-block", 
//                                     padding: "4px 10px", 
//                                     backgroundColor: permit.permit_status ? "#e0e7ff" : "#f3f4f6", 
//                                     color: permit.permit_status ? "#1e3a8a" : "#6b7280", 
//                                     borderRadius: "4px", 
//                                     fontSize: "12px", 
//                                     fontWeight: "bold" 
//                                 }}>
//                                     {permit.permit_status || "No Status"}
//                                 </span>
//                             </div>
//                         </div>

//                         <div style={{ display: "flex", gap: "30px", marginTop: "12px", fontSize: "13px", color: "#374151" }}>
//                             <div style={{ flex: 1 }}>
//                                 <p style={{ margin: "4px 0" }}><strong>Offer:</strong> <span style={{ textTransform: "capitalize" }}>{permit.property_offer || "—"}</span></p>
//                                 <p style={{ margin: "4px 0" }}><strong>Price:</strong> {formatPrice(permit.price)}</p>
//                                 <p style={{ margin: "4px 0" }}><strong>Managed By:</strong> {permit.managed_by_name || "Unassigned"}</p>
//                             </div>
//                             <div style={{ flex: 1 }}>
//                                 <p style={{ margin: "4px 0" }}><strong>Created At:</strong> {new Date(permit.created_at).toLocaleDateString()}</p>
                                
//                                 {/* ✅ TITLE DEED PREVIEW / LINK */}
//                                 <div style={{ margin: "4px 0" }}>
//                                     <strong>Title Deed: </strong>
//                                     {permit.title_deed_url ? (
//                                         permit.title_deed_is_pdf ? (
//                                             <a href={permit.title_deed_url} style={{ color: "#1e3a8a", textDecoration: "underline", fontWeight: "bold" }}>
//                                                 View PDF Document
//                                             </a>
//                                         ) : (
//                                             <div>
//                                                 <img 
//                                                     src={permit.title_deed_url} 
//                                                     alt="Title Deed" 
//                                                     crossOrigin="anonymous"
//                                                     style={{ height: "80px", border: "1px solid #e5e7eb", borderRadius: "4px", marginTop: "4px" }} 
//                                                 />
//                                                 <br />
//                                                 <a href={permit.title_deed_url} style={{ color: "#1e3a8a", textDecoration: "underline", fontSize: "12px", display: "inline-block", marginTop: "4px" }}>
//                                                     Click to open full image
//                                                 </a>
//                                             </div>
//                                         )
//                                     ) : (
//                                         "No File Uploaded"
//                                     )}
//                                 </div>
//                                 {/* Hidden marker for coordinate calculation */}
//                                 <span className="title-deed-text" style={{ display: "none" }}>Link</span>
//                             </div>
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// });


// const Permit = () => {
//     const [permits, setPermits] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     // Modals
//     const [showAddEditModal, setShowAddEditModal] = useState(false);
//     const [selectedPermit, setSelectedPermit] = useState(null);
//     const [deleteConfirm, setDeleteConfirm] = useState(null);
//     const [deletingId, setDeletingId] = useState(null);

//     // Search & Filters
//     const [searchTerm, setSearchTerm] = useState("");
//     const [searchStatus, setSearchStatus] = useState("");
//     const [searchOffer, setSearchOffer] = useState("");
    
//     const requestId = useRef(0);

//     // Export State
//     const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
//     const pdfRef = useRef(null);

//     // =========================================================
//     // FETCH DATA
//     // =========================================================
//     const fetchPermits = async () => {
//         const myRequest = ++requestId.current;
//         setLoading(true);
//         setError(null);

//         try {
//             const token = localStorage.getItem("access_token");
//             if (!token) {
//                 toast.error("Please login to view Permit Numbers");
//                 window.location.href = "/login";
//                 return;
//             }

//             const params = new URLSearchParams();
//             if (searchTerm.trim()) params.append("search", searchTerm.trim());
//             if (searchStatus) params.append("permit_status", searchStatus);
//             if (searchOffer) params.append("property_offer", searchOffer);

//             const response = await fetch(`${BASE}/api/permit-numbers/?${params.toString()}`, {
//                 method: "GET",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             if (!response.ok) {
//                 if (response.status === 401) {
//                     toast.error("Session expired. Please login again.");
//                     localStorage.removeItem("access_token");
//                     window.location.href = "/login";
//                 } else {
//                     toast.error("Failed to load permits");
//                 }
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const data = await response.json();
//             if (myRequest !== requestId.current) return;

//             let list = [];
//             if (Array.isArray(data)) {
//                 list = data;
//             } else if (data.results && Array.isArray(data.results)) {
//                 list = data.results;
//             }

//             setPermits(list);
//         } catch (err) {
//             if (myRequest !== requestId.current) return;
//             setError("Failed to load Permit Numbers");
//             console.error(err);
//         } finally {
//             if (myRequest === requestId.current) {
//                 setLoading(false);
//             }
//         }
//     };

//     useEffect(() => {
//         const timeout = setTimeout(() => {
//             fetchPermits();
//         }, 500);
//         return () => clearTimeout(timeout);
//     }, [searchTerm, searchStatus, searchOffer]);

//     // =========================================================
//     // EXPORT PDF LOGIC
//     // =========================================================
//     const handleExportPDF = async () => {
//         if (permits.length === 0) return toast.error("No records to export.");
        
//         setIsGeneratingPdf(true);
//         const toastId = toast.loading("Generating PDF...");

//         try {
//             const node = pdfRef.current;
//             if (document.fonts?.ready) await document.fonts.ready;

//             // Wait for all images to load before capturing (very important for previews)
//             const images = node.querySelectorAll('img');
//             await Promise.all(Array.from(images).map(img => {
//                 if (img.complete) return Promise.resolve();
//                 return new Promise(resolve => {
//                     img.onload = resolve;
//                     img.onerror = resolve;
//                 });
//             }));

//             const rootTop = node.getBoundingClientRect().top;
//             const headerH = node.querySelector('[data-pdf-header]').getBoundingClientRect().height;
//             const rows = Array.from(node.querySelectorAll('[data-pdf-row]')).map((r) => {
//                 const b = r.getBoundingClientRect();
//                 // Find the hidden marker for fallback link positioning
//                 const linkEl = r.querySelector('.title-deed-text');
//                 const linkBounds = linkEl ? linkEl.getBoundingClientRect() : null;
                
//                 return { 
//                     top: b.top - rootTop, 
//                     bottom: b.bottom - rootTop,
//                     url: r.getAttribute('data-url'),
//                     linkTop: linkBounds ? (linkBounds.top - rootTop) : null,
//                     linkLeft: linkBounds ? (linkBounds.left) : null
//                 };
//             });

//             const pages = [];
//             let i = 0;
//             while (i < rows.length) {
//                 const isFirst = pages.length === 0;
//                 const startRow = i;
//                 const used = (r) => isFirst
//                     ? rows[r].bottom + PDF_PAD                                            
//                     : PDF_PAD + headerH + (rows[r].bottom - rows[startRow].top) + PDF_PAD; 
//                 let end = startRow;
//                 while (end < rows.length && (end === startRow || used(end) <= PDF_PAGE_H)) end++;
//                 pages.push({ from: startRow, to: end });
//                 i = end;
//             }

//             const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
//             const pageW = pdf.internal.pageSize.getWidth();
//             const pageH = pdf.internal.pageSize.getHeight();

//             for (let p = 0; p < pages.length; p++) {
//                 const { from, to } = pages[p];
//                 toast.update(toastId, { render: `Generating PDF... (page ${p + 1} of ${pages.length})` });

//                 const canvas = await html2canvas(node, {
//                     scale: 2,
//                     useCORS: true,
//                     allowTaint: false,
//                     backgroundColor: "#ffffff",
//                     windowWidth: PDF_PAGE_W,
//                     onclone: (doc) => {
//                         const root = doc.querySelector('[data-pdf-root]');
//                         Array.from(root.querySelectorAll('[data-pdf-row]')).forEach((r, idx) => {
//                             if (idx < from || idx >= to) r.remove();
//                         });
//                         if (p > 0) root.querySelector('[data-pdf-header]')?.remove();
//                     },
//                 });

//                 if (p > 0) pdf.addPage();

//                 let w = pageW;
//                 let h = (canvas.height * w) / canvas.width;
//                 if (h > pageH) { w = (w * pageH) / h; h = pageH; } 

//                 pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);

//                 // Add fallback clickable links on top
//                 for (let r = from; r < to; r++) {
//                     const row = rows[r];
//                     if (row.url && row.linkTop !== null) {
//                         const pdfY = (row.linkTop / PDF_PAGE_W) * pageW;
//                         const pdfX = (row.linkLeft / PDF_PAGE_W) * pageW;

//                         pdf.textWithLink('  ', pdfX, pdfY, {
//                             url: row.url,
//                             width: 30,
//                             height: 5
//                         });
//                     }
//                 }

//                 pdf.setFontSize(9);
//                 pdf.setTextColor(120);
//                 pdf.text(`Page ${p + 1} of ${pages.length}`, pageW / 2, pageH - 4, { align: "center" });
//             }

//             let managedByName = permits[0]?.managed_by_name || "Unassigned";
//             managedByName = managedByName.replace(/\s+/g, '_');

//             const dateStr = new Date().toISOString().slice(0, 10);
//             const fileName = `${managedByName}_PermitNo_${dateStr}.pdf`;

//             pdf.save(fileName);
//             toast.update(toastId, { render: `✅ PDF downloaded!`, type: "success", isLoading: false, autoClose: 3000 });
//         } catch (err) {
//             console.error("PDF error:", err);
//             toast.update(toastId, { render: "❌ Failed to generate PDF", type: "error", isLoading: false, autoClose: 4000 });
//         } finally {
//             setIsGeneratingPdf(false);
//         }
//     };

//     // =========================================================
//     // HANDLERS
//     // =========================================================
//     const handleOpenCreate = () => {
//         setSelectedPermit(null);
//         setShowAddEditModal(true);
//     };

//     const handleOpenEdit = (permit) => {
//         setSelectedPermit(permit);
//         setShowAddEditModal(true);
//     };

//     const handleDelete = async () => {
//         if (!deleteConfirm) return;
//         const id = deleteConfirm.id;
//         setDeletingId(id);

//         try {
//             const token = localStorage.getItem("access_token");
//             const res = await fetch(`${BASE}/api/permit-numbers/${id}/delete/`, {
//                 method: "DELETE",
//                 headers: { Authorization: `Bearer ${token}` },
//             });

//             if (!res.ok) throw new Error("Failed to delete");

//             toast.success("✅ Permit deleted successfully");
//             setPermits((prev) => prev.filter((p) => p.id !== id));
//             setDeleteConfirm(null);
//         } catch (err) {
//             toast.error("❌ Error deleting permit");
//         } finally {
//             setDeletingId(null);
//         }
//     };

//     const clearFilters = () => {
//         setSearchTerm("");
//         setSearchStatus("");
//         setSearchOffer("");
//     };

//     // =========================================================
//     // RENDER
//     // =========================================================
//     return (
//         <div dir="ltr" className="min-h-screen bg-white py-10 px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans relative pb-24">
//             <ToastContainer position="top-right" theme="light" />

//             {/* HEADER */}
//             <div className="flex flex-col xl:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
//                 <div className="text-center xl:text-left">
//                     <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center xl:justify-start gap-3">
//                         <FaFileAlt className="text-[#a47d52]" /> Permit Numbers
//                     </h2>
//                 </div>

//                 <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
//                     <button
//                         onClick={handleExportPDF}
//                         disabled={isGeneratingPdf || permits.length === 0}
//                         className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                         <FaFilePdf /> {isGeneratingPdf ? "Generating..." : "Export PDF"}
//                     </button>

//                     <button
//                         onClick={handleOpenCreate}
//                         className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap bg-[#1e3a8a] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5"
//                     >
//                         <FaPlus /> Add Permit
//                     </button>
//                 </div>
//             </div>

//             {/* SEARCH BAR */}
//             <div className="max-w-full mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
//                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                     <div className="relative">
//                         <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Search permit no, reference, or title..."
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
//                         />
//                     </div>
//                     <div className="relative">
//                         <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <select
//                             value={searchStatus}
//                             onChange={(e) => setSearchStatus(e.target.value)}
//                             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white"
//                         >
//                             <option value="">All Statuses</option>
//                             <option value="Owner's Approval">Owner's Approval</option>
//                             <option value="Payment">Payment</option>
//                             <option value="Completed">Completed</option>
//                         </select>
//                     </div>
//                     <div className="relative">
//                         <FaTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <select
//                             value={searchOffer}
//                             onChange={(e) => setSearchOffer(e.target.value)}
//                             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white"
//                         >
//                             <option value="">All Offers</option>
//                             <option value="sale">Sale</option>
//                             <option value="rent">Rent</option>
//                         </select>
//                     </div>
//                 </div>

//                 <div className="mt-3 flex justify-end">
//                     <button
//                         onClick={clearFilters}
//                         disabled={!searchTerm && !searchStatus && !searchOffer}
//                         className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
//                     >
//                         <FiX /> Clear Filters
//                     </button>
//                 </div>
//             </div>

//             <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

//             {/* TABLE */}
//             <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
//                 {loading && permits.length === 0 ? (
//                     <div className="flex flex-col justify-center items-center gap-4 p-24">
//                         <div className="w-10 h-10 border-4 border-[#f8f7f5] border-t-[#1e3a8a] rounded-full animate-spin"></div>
//                         <p className="text-[#1e3a8a] font-bold">Loading permits...</p>
//                     </div>
//                 ) : error ? (
//                     <div className="flex flex-col justify-center items-center gap-4 p-16 text-center">
//                         <span className="text-6xl text-red-500">⚠️</span>
//                         <h3 className="text-2xl font-extrabold text-gray-800">Error Loading Data</h3>
//                         <p className="text-gray-500">{error}</p>
//                         <button
//                             onClick={fetchPermits}
//                             className="mt-2 px-6 py-2.5 bg-[#1e3a8a] text-white rounded-lg font-bold hover:bg-[#172554] transition-colors"
//                         >
//                             Retry
//                         </button>
//                     </div>
//                 ) : permits.length === 0 ? (
//                     <div className="flex flex-col justify-center items-center gap-4 p-16 text-center">
//                         <span className="text-6xl">📄</span>
//                         <h3 className="text-2xl font-extrabold text-gray-800">No Permits Found</h3>
//                         <p className="text-gray-500">Add a new permit or adjust your search filters.</p>
//                     </div>
//                 ) : (
//                     <div className="overflow-x-auto custom-scrollbar pb-2">
//                         <table className="w-full text-left border-collapse min-w-max">
//                             <thead className="bg-[#f8f7f5] border-b border-gray-200">
//                                 <tr>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Permit / Ref No</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Title / Description</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Bedrooms</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Offer / Price</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Title Deed</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Managed By</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
//                                 </tr>
//                             </thead>
//                             <tbody className="divide-y divide-gray-100">
//                                 {permits.map((permit) => (
//                                     <tr key={permit.id} className="hover:bg-gray-50 transition-colors">
//                                         <td className="px-6 py-4">
//                                             <div className="flex flex-col gap-0.5">
//                                                 <p className="font-bold text-gray-800">{permit.permit_no || "—"}</p>
//                                                 <p className="text-xs text-gray-500">Ref: {permit.refrence_no || "—"}</p>
//                                             </div>
//                                         </td>
//                                         <td className="px-6 py-4 text-sm text-gray-600 max-w-[250px] truncate" title={permit.title}>
//                                             {permit.title || "—"}
//                                         </td>
//                                         <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
//                                             <span className="inline-flex items-center gap-1.5">
//                                                 <FaBed className="text-gray-400" /> {permit.bedrooms || "—"}
//                                             </span>
//                                         </td>
//                                         <td className="px-6 py-4">
//                                             {permit.permit_status ? (
//                                                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#1e3a8a]/10 text-[#1e3a8a]">
//                                                     <FaCheckCircle size={10} /> {permit.permit_status}
//                                                 </span>
//                                             ) : (
//                                                 <span className="text-xs text-gray-400">—</span>
//                                             )}
//                                         </td>
//                                         <td className="px-6 py-4">
//                                             <div className="flex flex-col gap-1">
//                                                 {permit.property_offer && (
//                                                     <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#a47d52]/10 text-[#a47d52]">
//                                                         <FaTag size={8} /> {permit.property_offer}
//                                                     </span>
//                                                 )}
//                                                 <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
//                                                     <FaMoneyBillWave className="text-gray-400" size={12} />
//                                                     {formatPrice(permit.price)}
//                                                 </span>
//                                             </div>
//                                         </td>
//                                         <td className="px-6 py-4">
//                                             {permit.title_deed_url ? (
//                                                 <a
//                                                     href={permit.title_deed_url}
//                                                     target="_blank"
//                                                     rel="noopener noreferrer"
//                                                     className="flex items-center gap-2 text-sm font-semibold text-[#a47d52] hover:text-[#8a6a44] hover:underline"
//                                                 >
//                                                     {permit.title_deed_is_pdf ? <FaFilePdf /> : <FaRegFileImage />}
//                                                     View File
//                                                 </a>
//                                             ) : (
//                                                 <span className="text-xs text-gray-400">No File</span>
//                                             )}
//                                         </td>
//                                         <td className="px-6 py-4">
//                                             <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
//                                                 <FaUserShield className="text-gray-400" /> {permit.managed_by_name || "Unassigned"}
//                                             </span>
//                                         </td>
//                                         <td className="px-6 py-4 text-right">
//                                             <div className="flex items-center justify-end gap-2">
//                                                 <button
//                                                     onClick={() => handleOpenEdit(permit)}
//                                                     className="p-2 rounded-lg transition-colors text-gray-400 hover:text-[#1e3a8a] hover:bg-[#1e3a8a]/10"
//                                                     title="Edit"
//                                                 >
//                                                     <FaEdit size={18} />
//                                                 </button>
//                                                 <button
//                                                     onClick={() => setDeleteConfirm(permit)}
//                                                     className="p-2 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50"
//                                                     title="Delete"
//                                                 >
//                                                     <FaTrash size={18} />
//                                                 </button>
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}
//             </div>

//             {/* MODALS */}
//             {showAddEditModal && (
//                 <AddEditPermit
//                     permit={selectedPermit}
//                     onClose={() => setShowAddEditModal(false)}
//                     onSuccess={() => {
//                         setShowAddEditModal(false);
//                         fetchPermits();
//                     }}
//                 />
//             )}

//             {/* DELETE CONFIRMATION */}
//             {deleteConfirm && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
//                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
//                         <div className="flex justify-center pt-6 pb-4">
//                             <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
//                                 <FaTimesCircle className="text-red-500" size={32} />
//                             </div>
//                         </div>
//                         <div className="px-6 pb-6">
//                             <h3 className="text-xl font-extrabold text-gray-800 mb-2">Delete Permit</h3>
//                             <p className="text-sm text-gray-500 mb-6">
//                                 Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.permit_no || deleteConfirm.refrence_no}"</span>? This action cannot be undone.
//                             </p>
//                             <div className="flex gap-3">
//                                 <button
//                                     onClick={() => setDeleteConfirm(null)}
//                                     disabled={deletingId === deleteConfirm.id}
//                                     className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
//                                 >
//                                     Cancel
//                                 </button>
//                                 <button
//                                     onClick={handleDelete}
//                                     disabled={deletingId === deleteConfirm.id}
//                                     className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
//                                 >
//                                     {deletingId === deleteConfirm.id ? (
//                                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                                     ) : (
//                                         <FaTrash size={16} />
//                                     )}
//                                     Delete
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* HIDDEN PDF TEMPLATE */}
//             {permits.length > 0 && <PermitPdfTemplate ref={pdfRef} permits={permits} />}
//         </div>
//     );
// };

// export default Permit;


// Permissions_Version

// import React, { useState, useEffect, useRef } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import {
//     FaFileAlt,
//     FaPlus,
//     FaSearch,
//     FaTrash,
//     FaEdit,
//     FaUserShield,
//     FaCheckCircle,
//     FaTimesCircle,
//     FaFilePdf,
//     FaRegFileImage,
// } from "react-icons/fa";
// import { FiX, FiFilter, FiLock } from "react-icons/fi";
// import AddEditPermit from "../../components/en/listing/AddEditPermit";
// import { usePermissions } from "../context/PermissionsContext";

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// const Permit = () => {
//     const { permissions } = usePermissions();

//     const [permits, setPermits] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     // Modals
//     const [showAddEditModal, setShowAddEditModal] = useState(false);
//     const [selectedPermit, setSelectedPermit] = useState(null);
//     const [deleteConfirm, setDeleteConfirm] = useState(null);
//     const [deletingId, setDeletingId] = useState(null);

//     // Search & Filters
//     const [searchTerm, setSearchTerm] = useState("");
//     const [searchStatus, setSearchStatus] = useState("");
    
//     const requestId = useRef(0);

//     // Permissions
//     const canViewAll = permissions?.view_all_permit_numbers === true;
//     const canCreate = permissions?.create_new_permit_number === true;
//     const canUpdate = permissions?.update_permit_number === true;
//     const canDelete = permissions?.delete_permit_number === true;

//     // =========================================================
//     // FETCH DATA
//     // =========================================================
//     const fetchPermits = async () => {
//         const myRequest = ++requestId.current;
//         setLoading(true);
//         setError(null);

//         try {
//             const token = localStorage.getItem("access_token");
//             if (!token) {
//                 toast.error("Please login to view Permit Numbers");
//                 window.location.href = "/login";
//                 return;
//             }

//             const params = new URLSearchParams();
//             if (searchTerm.trim()) params.append("search", searchTerm.trim());
//             if (searchStatus) params.append("permit_status", searchStatus);

//             const response = await fetch(`${BASE}/api/permit-numbers/?${params.toString()}`, {
//                 method: "GET",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             if (!response.ok) {
//                 if (response.status === 401) {
//                     toast.error("Session expired. Please login again.");
//                     localStorage.removeItem("access_token");
//                     window.location.href = "/login";
//                 } else {
//                     toast.error("Failed to load permits");
//                 }
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const data = await response.json();
//             if (myRequest !== requestId.current) return;

//             let list = [];
//             if (Array.isArray(data)) {
//                 list = data;
//             } else if (data.results && Array.isArray(data.results)) {
//                 list = data.results;
//             }

//             setPermits(list);
//         } catch (err) {
//             if (myRequest !== requestId.current) return;
//             setError("Failed to load Permit Numbers");
//             console.error(err);
//         } finally {
//             if (myRequest === requestId.current) {
//                 setLoading(false);
//             }
//         }
//     };

//     // Debounced Search
//     useEffect(() => {
//         const timeout = setTimeout(() => {
//             fetchPermits();
//         }, 500);
//         return () => clearTimeout(timeout);
//     }, [searchTerm, searchStatus]);

//     // =========================================================
//     // HANDLERS
//     // =========================================================
//     const handleOpenCreate = () => {
//         if (!canCreate) return toast.error("No permission to create permits.");
//         setSelectedPermit(null);
//         setShowAddEditModal(true);
//     };

//     const handleOpenEdit = (permit) => {
//         if (!canUpdate) return toast.error("No permission to edit permits.");
//         setSelectedPermit(permit);
//         setShowAddEditModal(true);
//     };

//     const handleDelete = async () => {
//         if (!deleteConfirm) return;
//         const id = deleteConfirm.id;
//         setDeletingId(id);

//         try {
//             const token = localStorage.getItem("access_token");
//             const res = await fetch(`${BASE}/api/permit-numbers/${id}/delete/`, {
//                 method: "DELETE",
//                 headers: { Authorization: `Bearer ${token}` },
//             });

//             if (!res.ok) throw new Error("Failed to delete");

//             toast.success("✅ Permit deleted successfully");
//             setPermits((prev) => prev.filter((p) => p.id !== id));
//             setDeleteConfirm(null);
//         } catch (err) {
//             toast.error("❌ Error deleting permit");
//         } finally {
//             setDeletingId(null);
//         }
//     };

//     const clearFilters = () => {
//         setSearchTerm("");
//         setSearchStatus("");
//     };

//     // =========================================================
//     // RENDER
//     // =========================================================
//     return (
//         <div dir="ltr" className="min-h-screen bg-white py-10 px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans relative pb-24">
//             <ToastContainer position="top-right" theme="light" />

//             {/* HEADER */}
//             <div className="flex flex-col xl:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
//                 <div className="text-center xl:text-left">
//                     <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center xl:justify-start gap-3">
//                         <FaFileAlt className="text-[#a47d52]" /> Permit Numbers
//                     </h2>
//                     <div className="flex items-center justify-center xl:justify-start gap-2 mt-2">
//                         {canViewAll ? (
//                             <span className="bg-[#1e3a8a]/10 text-[#1e3a8a] text-xs font-bold px-2 py-1 rounded-md border border-[#1e3a8a]/20">Viewing: All</span>
//                         ) : (
//                             <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
//                                 <FiLock size={10} /> Viewing: Only My
//                             </span>
//                         )}
//                     </div>
//                 </div>

//                 <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
//                     <button
//                         onClick={handleOpenCreate}
//                         className={`flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap ${
//                             canCreate
//                                 ? "bg-[#1e3a8a] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5"
//                                 : "bg-gray-300 text-gray-500 cursor-not-allowed"
//                         }`}
//                     >
//                         <FaPlus /> Add Permit
//                     </button>
//                 </div>
//             </div>

//             {/* SEARCH BAR */}
//             <div className="max-w-full mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                     <div className="relative">
//                         <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Search permit no, reference, or title..."
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
//                         />
//                     </div>
//                     <div className="relative">
//                         <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <select
//                             value={searchStatus}
//                             onChange={(e) => setSearchStatus(e.target.value)}
//                             className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] bg-white"
//                         >
//                             <option value="">All Statuses</option>
//                             <option value="Paid">Paid</option>
//                             <option value="Pending">Pending</option>
//                             <option value="Approved">Approved</option>
//                         </select>
//                     </div>
//                 </div>

//                 <div className="mt-3 flex justify-end">
//                     <button
//                         onClick={clearFilters}
//                         disabled={!searchTerm && !searchStatus}
//                         className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
//                     >
//                         <FiX /> Clear Filters
//                     </button>
//                 </div>
//             </div>

//             <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

//             {/* TABLE */}
//             <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
//                 {loading && permits.length === 0 ? (
//                     <div className="flex flex-col justify-center items-center gap-4 p-24">
//                         <div className="w-10 h-10 border-4 border-[#f8f7f5] border-t-[#1e3a8a] rounded-full animate-spin"></div>
//                         <p className="text-[#1e3a8a] font-bold">Loading permits...</p>
//                     </div>
//                 ) : error ? (
//                     <div className="flex flex-col justify-center items-center gap-4 p-16 text-center">
//                         <span className="text-6xl text-red-500">⚠️</span>
//                         <h3 className="text-2xl font-extrabold text-gray-800">Error Loading Data</h3>
//                         <p className="text-gray-500">{error}</p>
//                         <button
//                             onClick={fetchPermits}
//                             className="mt-2 px-6 py-2.5 bg-[#1e3a8a] text-white rounded-lg font-bold hover:bg-[#172554] transition-colors"
//                         >
//                             Retry
//                         </button>
//                     </div>
//                 ) : permits.length === 0 ? (
//                     <div className="flex flex-col justify-center items-center gap-4 p-16 text-center">
//                         <span className="text-6xl">📄</span>
//                         <h3 className="text-2xl font-extrabold text-gray-800">No Permits Found</h3>
//                         <p className="text-gray-500">Add a new permit or adjust your search filters.</p>
//                     </div>
//                 ) : (
//                     <div className="overflow-x-auto custom-scrollbar pb-2">
//                         <table className="w-full text-left border-collapse min-w-max">
//                             <thead className="bg-[#f8f7f5] border-b border-gray-200">
//                                 <tr>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Permit / Ref No</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Title / Description</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Title Deed</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Managed By</th>
//                                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
//                                 </tr>
//                             </thead>
//                             <tbody className="divide-y divide-gray-100">
//                                 {permits.map((permit) => (
//                                     <tr key={permit.id} className="hover:bg-gray-50 transition-colors">
//                                         <td className="px-6 py-4">
//                                             <div className="flex flex-col gap-0.5">
//                                                 <p className="font-bold text-gray-800">{permit.permit_no || "—"}</p>
//                                                 <p className="text-xs text-gray-500">Ref: {permit.refrence_no || "—"}</p>
//                                             </div>
//                                         </td>
//                                         <td className="px-6 py-4 text-sm text-gray-600 max-w-[250px] truncate" title={permit.title}>
//                                             {permit.title || "—"}
//                                         </td>
//                                         <td className="px-6 py-4">
//                                             {permit.permit_status ? (
//                                                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#1e3a8a]/10 text-[#1e3a8a]">
//                                                     <FaCheckCircle size={10} /> {permit.permit_status}
//                                                 </span>
//                                             ) : (
//                                                 <span className="text-xs text-gray-400">—</span>
//                                             )}
//                                         </td>
//                                         <td className="px-6 py-4">
//                                             {permit.title_deed_url ? (
//                                                 <a
//                                                     href={permit.title_deed_url}
//                                                     target="_blank"
//                                                     rel="noopener noreferrer"
//                                                     className="flex items-center gap-2 text-sm font-semibold text-[#a47d52] hover:text-[#8a6a44] hover:underline"
//                                                 >
//                                                     {permit.title_deed_is_pdf ? <FaFilePdf /> : <FaRegFileImage />}
//                                                     View File
//                                                 </a>
//                                             ) : (
//                                                 <span className="text-xs text-gray-400">No File</span>
//                                             )}
//                                         </td>
//                                         <td className="px-6 py-4">
//                                             <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md">
//                                                 <FaUserShield className="text-gray-400" /> {permit.managed_by_name || "Unassigned"}
//                                             </span>
//                                         </td>
//                                         <td className="px-6 py-4 text-right">
//                                             <div className="flex items-center justify-end gap-2">
//                                                 <button
//                                                     onClick={() => handleOpenEdit(permit)}
//                                                     className={`p-2 rounded-lg transition-colors ${
//                                                         canUpdate ? "text-gray-400 hover:text-[#1e3a8a] hover:bg-[#1e3a8a]/10" : "text-gray-300 cursor-not-allowed"
//                                                     }`}
//                                                     title="Edit"
//                                                 >
//                                                     <FaEdit size={18} />
//                                                 </button>
//                                                 <button
//                                                     onClick={() => {
//                                                         if (!canDelete) return toast.error("No permission to delete.");
//                                                         setDeleteConfirm(permit);
//                                                     }}
//                                                     className={`p-2 rounded-lg transition-colors ${
//                                                         canDelete ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-300 cursor-not-allowed"
//                                                     }`}
//                                                     title="Delete"
//                                                 >
//                                                     <FaTrash size={18} />
//                                                 </button>
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 )}
//             </div>

//             {/* MODALS */}
//             {showAddEditModal && (
//                 <AddEditPermit
//                     permit={selectedPermit}
//                     onClose={() => setShowAddEditModal(false)}
//                     onSuccess={() => {
//                         setShowAddEditModal(false);
//                         fetchPermits();
//                     }}
//                 />
//             )}

//             {/* DELETE CONFIRMATION */}
//             {deleteConfirm && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
//                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
//                         <div className="flex justify-center pt-6 pb-4">
//                             <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
//                                 <FaTimesCircle className="text-red-500" size={32} />
//                             </div>
//                         </div>
//                         <div className="px-6 pb-6">
//                             <h3 className="text-xl font-extrabold text-gray-800 mb-2">Delete Permit</h3>
//                             <p className="text-sm text-gray-500 mb-6">
//                                 Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.permit_no || deleteConfirm.refrence_no}"</span>? This action cannot be undone.
//                             </p>
//                             <div className="flex gap-3">
//                                 <button
//                                     onClick={() => setDeleteConfirm(null)}
//                                     disabled={deletingId === deleteConfirm.id}
//                                     className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
//                                 >
//                                     Cancel
//                                 </button>
//                                 <button
//                                     onClick={handleDelete}
//                                     disabled={deletingId === deleteConfirm.id}
//                                     className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
//                                 >
//                                     {deletingId === deleteConfirm.id ? (
//                                         <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                                     ) : (
//                                         <FaTrash size={16} />
//                                     )}
//                                     Delete
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Permit;