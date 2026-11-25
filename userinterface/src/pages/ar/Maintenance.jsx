import React, { useState, useEffect, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
    FaTools,
    FaPlus,
    FaSearch,
    FaTrash,
    FaEdit,
    FaTimesCircle,
    FaCalendarAlt,
    FaMapMarkerAlt,
    FaFilePdf,
} from "react-icons/fa";
import { FiX } from "react-icons/fi";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import AddEditMaintenance from "../../components/ar/monitor/AddEditMaintenance";
import logo from '../../assets/images/logogo-removebg-old.png';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// ---------- PDF export helpers ----------
const PDF_PAGE_W = 1123;                                  
const PDF_PAGE_H = Math.round((PDF_PAGE_W * 210) / 297);  
const PDF_PAD = 30;                                       

const PDF_FONT = '"Segoe UI", Tahoma, "Noto Sans Arabic", "Arial Unicode MS", Arial, sans-serif';

// ✅ Custom PDF Template
const MaintenancePdfTemplate = React.forwardRef(({ records }, ref) => {
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
            }}
        >
            {/* Header */}
            <div data-pdf-header style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #1e3a8a", paddingBottom: "16px", marginBottom: "20px" }}>
                <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "60px", objectFit: "contain" }} />
                <div style={{ marginLeft: "20px" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>Maintenance Records Sheet</h1>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: "5px 0 0 0" }}>
                        Generated: {new Date().toLocaleString()} — <span data-pdf-count>{records.length} records</span>
                    </p>
                </div>
            </div>

            {/* Lines Layout */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {records.map((record, index) => (
                    <div 
                        key={record.id} 
                        data-pdf-row
                        style={{ 
                            borderBottom: "1px solid #e5e7eb", 
                            paddingBottom: "16px", 
                            pageBreakInside: "avoid" 
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <h3 style={{ fontSize: "18px", fontWeight: "bold", margin: "0 0 6px 0", color: "#111827" }}>
                                    {index + 1}. {record.location || "Unknown Location"}
                                </h3>
                                <div style={{ fontSize: "14px", color: "#4b5563", display: "flex", gap: "20px" }}>
                                    <span><strong>Date:</strong> {record.date || "—"}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "30px", marginTop: "12px", fontSize: "13px", color: "#374151" }}>
                            <div style={{ flex: 1 }}>
                                <p style={{ margin: "4px 0", whiteSpace: "pre-wrap" }}>
                                    <strong>Notes / Description:</strong> <br/>
                                    {record.notes || "No notes provided."}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});


const Maintenance = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modals
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Search
    const [searchTerm, setSearchTerm] = useState("");
    
    const requestId = useRef(0);

    // Export State
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const pdfRef = useRef(null);

    // =========================================================
    // FETCH DATA
    // =========================================================
    const fetchRecords = async () => {
        const myRequest = ++requestId.current;
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                toast.error("Please login to view Maintenance Records");
                window.location.href = "/login";
                return;
            }

            const params = new URLSearchParams();
            if (searchTerm.trim()) params.append("search", searchTerm.trim());

            const response = await fetch(`${BASE}/api/maintenances/?${params.toString()}`, {
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
                    toast.error("Failed to load maintenance records");
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

            setRecords(list);
        } catch (err) {
            if (myRequest !== requestId.current) return;
            setError("Failed to load Maintenance Records");
            console.error(err);
        } finally {
            if (myRequest === requestId.current) {
                setLoading(false);
            }
        }
    };

    // Debounced Search
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchRecords();
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm]);

    // =========================================================
    // EXPORT PDF LOGIC
    // =========================================================
    const handleExportPDF = async () => {
        if (records.length === 0) return toast.error("No records to export.");
        
        setIsGeneratingPdf(true);
        const toastId = toast.loading("Generating PDF...");

        try {
            const node = pdfRef.current;
            if (document.fonts?.ready) await document.fonts.ready;

            // Measure rows to handle page breaks
            const rootTop = node.getBoundingClientRect().top;
            const headerH = node.querySelector('[data-pdf-header]').getBoundingClientRect().height;
            const rows = Array.from(node.querySelectorAll('[data-pdf-row]')).map((r) => {
                const b = r.getBoundingClientRect();
                return { 
                    top: b.top - rootTop, 
                    bottom: b.bottom - rootTop,
                };
            });

            const pages = [];
            let i = 0;
            while (i < rows.length) {
                const isFirst = pages.length === 0;
                const startRow = i;
                const used = (r) => isFirst
                    ? rows[r].bottom + PDF_PAD                                            
                    : PDF_PAD + headerH + (rows[r].bottom - rows[startRow].top) + PDF_PAD; 
                let end = startRow;
                while (end < rows.length && (end === startRow || used(end) <= PDF_PAGE_H)) end++;
                pages.push({ from: startRow, to: end });
                i = end;
            }

            const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            for (let p = 0; p < pages.length; p++) {
                const { from, to } = pages[p];
                toast.update(toastId, { render: `Generating PDF... (page ${p + 1} of ${pages.length})` });

                const canvas = await html2canvas(node, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    windowWidth: PDF_PAGE_W,
                    onclone: (doc) => {
                        const root = doc.querySelector('[data-pdf-root]');
                        Array.from(root.querySelectorAll('[data-pdf-row]')).forEach((r, idx) => {
                            if (idx < from || idx >= to) r.remove();
                        });
                        if (p > 0) root.querySelector('[data-pdf-header]')?.remove();
                    },
                });

                if (p > 0) pdf.addPage();

                let w = pageW;
                let h = (canvas.height * w) / canvas.width;
                if (h > pageH) { w = (w * pageH) / h; h = pageH; } 

                pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);

                pdf.setFontSize(9);
                pdf.setTextColor(120);
                pdf.text(`Page ${p + 1} of ${pages.length}`, pageW / 2, pageH - 4, { align: "center" });
            }

            // ✅ Determine File Name
            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `Maintenance_Records_${dateStr}.pdf`;

            pdf.save(fileName);
            toast.update(toastId, { render: `✅ PDF downloaded!`, type: "success", isLoading: false, autoClose: 3000 });
        } catch (err) {
            console.error("PDF error:", err);
            toast.update(toastId, { render: "❌ Failed to generate PDF", type: "error", isLoading: false, autoClose: 4000 });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // =========================================================
    // HANDLERS
    // =========================================================
    const handleOpenCreate = () => {
        setSelectedRecord(null);
        setShowAddEditModal(true);
    };

    const handleOpenEdit = (record) => {
        setSelectedRecord(record);
        setShowAddEditModal(true);
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;
        const id = deleteConfirm.id;
        setDeletingId(id);

        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${BASE}/api/maintenances/${id}/delete/`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("✅ Maintenance record deleted successfully");
            setRecords((prev) => prev.filter((r) => r.id !== id));
            setDeleteConfirm(null);
        } catch (err) {
            toast.error("❌ Error deleting maintenance record");
        } finally {
            setDeletingId(null);
        }
    };

    const clearFilters = () => {
        setSearchTerm("");
    };

    // =========================================================
    // RENDER
    // =========================================================
    return (
        <div dir="ltr" className="min-h-screen bg-white py-10 px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans relative pb-24">
            <ToastContainer position="top-right" theme="light" />

            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
                <div className="text-center xl:text-left">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center xl:justify-start gap-3">
                        <FaTools className="text-[#a47d52]" /> Maintenance Records
                    </h2>
                </div>

                <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
                    {/* Export PDF Button */}
                    <button
                        onClick={handleExportPDF}
                        disabled={isGeneratingPdf || records.length === 0}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaFilePdf /> {isGeneratingPdf ? "Generating..." : "Export PDF"}
                    </button>

                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap bg-[#1e3a8a] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5"
                    >
                        <FaPlus /> Add Maintenance
                    </button>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="max-w-full mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 gap-3">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search location or notes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                        />
                    </div>
                </div>

                <div className="mt-3 flex justify-end">
                    <button
                        onClick={clearFilters}
                        disabled={!searchTerm}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <FiX /> Clear Filters
                    </button>
                </div>
            </div>

            <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

            {/* TABLE */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
                {loading && records.length === 0 ? (
                    <div className="flex flex-col justify-center items-center gap-4 p-24">
                        <div className="w-10 h-10 border-4 border-[#f8f7f5] border-t-[#1e3a8a] rounded-full animate-spin"></div>
                        <p className="text-[#1e3a8a] font-bold">Loading records...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col justify-center items-center gap-4 p-16 text-center">
                        <span className="text-6xl text-red-500">⚠️</span>
                        <h3 className="text-2xl font-extrabold text-gray-800">Error Loading Data</h3>
                        <p className="text-gray-500">{error}</p>
                        <button
                            onClick={fetchRecords}
                            className="mt-2 px-6 py-2.5 bg-[#1e3a8a] text-white rounded-lg font-bold hover:bg-[#172554] transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : records.length === 0 ? (
                    <div className="flex flex-col justify-center items-center gap-4 p-16 text-center">
                        <span className="text-6xl">🛠️</span>
                        <h3 className="text-2xl font-extrabold text-gray-800">No Maintenance Records Found</h3>
                        <p className="text-gray-500">Add a new maintenance record or adjust your search filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className="bg-[#f8f7f5] border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-1/2">Notes / Description</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {records.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-2 text-sm font-bold text-gray-800">
                                                <FaCalendarAlt className="text-[#a47d52]" /> 
                                                {record.date || "—"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-2 text-sm text-gray-700">
                                                <FaMapMarkerAlt className="text-gray-400" /> 
                                                {record.location || "—"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-[300px] truncate" title={record.notes}>
                                            {record.notes || "—"}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEdit(record)}
                                                    className="p-2 rounded-lg transition-colors text-gray-400 hover:text-[#1e3a8a] hover:bg-[#1e3a8a]/10"
                                                    title="Edit"
                                                >
                                                    <FaEdit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(record)}
                                                    className="p-2 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                    title="Delete"
                                                >
                                                    <FaTrash size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODALS */}
            {showAddEditModal && (
                <AddEditMaintenance
                    maintenance={selectedRecord}
                    onClose={() => setShowAddEditModal(false)}
                    onSuccess={() => {
                        setShowAddEditModal(false);
                        fetchRecords();
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
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">Delete Record</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete this maintenance record from <span className="font-bold text-gray-800">"{deleteConfirm.date}"</span>? This action cannot be undone.
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

            {/* HIDDEN PDF TEMPLATE */}
            {records.length > 0 && <MaintenancePdfTemplate ref={pdfRef} records={records} />}
        </div>
    );
};




export default Maintenance;