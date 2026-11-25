import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MdDeleteForever, MdModeEdit, MdVisibility, MdClose } from 'react-icons/md';
import { FiUser, FiPhone, FiLock, FiGrid, FiList, FiAlertTriangle, FiUploadCloud, FiCheckSquare, FiCalendar, FiHome, FiDollarSign, FiSearch, FiX } from 'react-icons/fi';
import { FaArchive, FaPlus, FaUserShield, FaTrash, FaUserEdit, FaMapMarkerAlt, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import AddEditLandLord from "../../components/en/listing/AddEditLandLoard";
import LandLoardDetails from "../../components/en/listing/LandLordDetails";
import AddDistribution from "../../components/en/listing/AddDistribution";
import { usePermissions } from "../context/PermissionsContext";

// ✅ Import Logo
import logo from '../../assets/images/logogo-removebg-old.png';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// ✅ Same theme as AddDistribution / AddOwnersArchive
const THEME_COLOR = "#a47d52";
const THEME_HOVER = "#172554";

// Format numbers with commas
const formatPrice = (value) => {
    if (!value || Number(value) === 0) return '—';
    return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Display name of a user in dropdowns
const userLabel = (u) => `${u.first_name || u.username || 'User'} ${u.last_name || ''}`.trim();

const UNASSIGN_VALUE = "unassigned";

const INPUT_CLASS = "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a47d52]";
const SELECT_CLASS = "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#a47d52]";

// ---------- PDF export helpers ----------
const PDF_PAGE_W = 1123;
const PDF_PAGE_H = Math.round((PDF_PAGE_W * 210) / 297);
const PDF_PAD = 30;

const escapeHtml = (v) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PDF_FONT = '"Segoe UI", Tahoma, "Noto Sans Arabic", "Arial Unicode MS", Arial, sans-serif';

// ---------- Hidden PDF Template for Export ----------
const PdfExportTemplate = React.forwardRef(({ properties }, ref) => {
    const th = {
        padding: "10px 8px",
        border: "1px solid #d1d5db",
        fontSize: "14px",
        fontWeight: "bold",
        textAlign: "left",
        letterSpacing: "normal",
    };
    const td = {
        padding: "8px",
        border: "1px solid #e5e7eb",
        fontSize: "15px",
        lineHeight: 1.5,
        verticalAlign: "top",
        letterSpacing: "normal",
        wordBreak: "break-word",
        unicodeBidi: "plaintext",
    };
    const small = { fontSize: "13px", color: "#6b7280" };

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
                letterSpacing: "normal",
                position: "fixed",
                left: "-9999px",
                top: 0,
                zIndex: -1,
            }}
        >
            {/* Header with Logo (printed on the first page only) */}
            <div data-pdf-header style={{ display: "flex", alignItems: "center", borderBottom: `2px solid ${THEME_COLOR}`, paddingBottom: "16px", marginBottom: "20px" }}>
                <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "60px", objectFit: "contain" }} />
                <div style={{ marginLeft: "20px" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>Distribution Sheet</h1>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: "5px 0 0 0" }}>
                        Generated: {new Date().toLocaleString()} — <span data-pdf-count>{properties.length} records</span>
                    </p>
                </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "20%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "7%" }} />
                </colgroup>
                <thead>
                    <tr style={{ backgroundColor: "#f8f7f5", color: "#374151" }}>
                        <th style={th}>Owner / Phone</th>
                        <th style={th}>Last Contact</th>
                        <th style={th}>Prop. Type</th>
                        <th style={th}>Location</th>
                        <th style={th}>Description</th>
                        <th style={th}>Plot / Land</th>
                        <th style={th}>Offer</th>
                        <th style={th}>Sale Price</th>
                        <th style={th}>Rent Price</th>
                        <th style={th}>Resp.</th>
                    </tr>
                </thead>
                <tbody>
                    {properties.map((p) => (
                        <tr key={p.id}>
                            <td style={td}>
                                <div dir="auto" style={{ fontWeight: "bold" }}>{p.name || 'Unnamed'}</div>
                                {p.company && <div dir="auto" style={small}>{p.company}</div>}
                                <div style={{ fontSize: "13px", color: "#4b5563" }}>{p.phone || '—'}</div>
                            </td>
                            <td style={td}>{p.last_communication_date || '—'}</td>
                            <td style={{ ...td, textTransform: "capitalize" }}>{p.property_type || '—'}</td>
                            <td style={td}>
                                <div dir="auto">{p.municipality || p.zone || '—'}</div>
                                {(p.sector || p.road_name) && (
                                    <div dir="auto" style={small}>
                                        {[p.sector, p.road_name].filter(Boolean).join(', ')}
                                    </div>
                                )}
                            </td>
                            <td dir="auto" style={{ ...td, whiteSpace: "pre-wrap" }}>{p.description || '—'}</td>
                            <td style={td}>
                                <div>{p.plot_no || '—'}</div>
                                {p.land_no && <div style={small}>{p.land_no}</div>}
                            </td>
                            <td style={{ ...td, textTransform: "capitalize" }}>{p.property_offer || '—'}</td>
                            <td style={{ ...td, fontWeight: "bold", color: "#059669" }}>{formatPrice(p.sale_price)}</td>
                            <td style={{ ...td, fontWeight: "bold", color: "#2563eb" }}>{formatPrice(p.rent_price)}</td>
                            <td dir="auto" style={{ ...td, fontWeight: "bold" }}>{p.responsibility_name || 'Unassigned'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

const Distribution = () => {
    // ✅ 1. Extract permissionsLoading
    const { permissions, loading: permissionsLoading } = usePermissions();

    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modals
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Delete confirms
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

    // View mode
    const [viewMode, setViewMode] = useState("table");

    // Bulk actions
    const [selectedIds, setSelectedIds] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState("");
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Chunk selection
    const [chunkSize, setChunkSize] = useState(100);

    // Search / filters
    const [searchTerm, setSearchTerm] = useState("");
    const [searchMunicipality, setSearchMunicipality] = useState("");
    const [searchZone, setSearchZone] = useState("");
    const [searchSector, setSearchSector] = useState("");
    const [searchResponsibility, setSearchResponsibility] = useState("");
    const [searchDate, setSearchDate] = useState("");
    const [searchCategory, setSearchCategory] = useState("");
    const [searchOffer, setSearchOffer] = useState("");

    // Export
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const pdfRef = useRef(null);

    const requestId = useRef(0);

    // ✅ 2. Permissions logic
    const canViewAll = permissions?.view_all_archive_properties === true;
    const canCreate = permissions?.create_bulk_archive_properties === true;
    const canUpdate = permissions?.update_bulk_responsibility_archive_properties === true;
    const canDelete = permissions?.delete_bulk_archive_properties === true;

    const activeFilterCount = [
        searchTerm, searchMunicipality, searchZone, searchSector,
        searchResponsibility, searchDate, searchCategory, searchOffer,
    ].filter(Boolean).length;

    // =========================================================
    // QUERY STRING
    // =========================================================
    const buildQueryString = () => {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.append('search', searchTerm.trim());
        if (searchMunicipality.trim()) params.append('municipality', searchMunicipality.trim());
        if (searchZone.trim()) params.append('zone', searchZone.trim());
        if (searchSector.trim()) params.append('sector', searchSector.trim());
        if (searchResponsibility) params.append('responsibility', searchResponsibility);
        if (searchDate) params.append('last_communication_date', searchDate);
        if (searchCategory) params.append('property_category', searchCategory);
        if (searchOffer) params.append('property_offer', searchOffer);
        const qs = params.toString();
        return qs ? `?${qs}` : "";
    };

    // =========================================================
    // FETCH
    // =========================================================
    const fetchProperties = async (queryString = "") => {
        const myRequest = ++requestId.current;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                toast.error('Please login to view Distribution');
                setLoading(false);
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${BASE}/api/archive-properties/${queryString}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error('Session expired. Please login again.');
                    localStorage.removeItem('access_token');
                    window.location.href = '/login';
                } else {
                    toast.error('Failed to load Distribution');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (myRequest !== requestId.current) return;

            let list = [];
            if (Array.isArray(data)) list = data;
            else if (data.results && Array.isArray(data.results)) list = data.results;

            setProperties(list);
            setSelectedIds([]);
        } catch (err) {
            if (myRequest !== requestId.current) return;
            setError('Failed to load Distribution');
            console.error('Error fetching archive properties:', err);
        } finally {
            if (myRequest === requestId.current) {
                setLoading(false);
                setInitialLoading(false);
            }
        }
    };

    const refreshProperties = () => fetchProperties(buildQueryString());

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchProperties(buildQueryString());
        }, 500);
        return () => clearTimeout(timeout);
    }, [searchTerm, searchMunicipality, searchZone, searchSector, searchResponsibility, searchDate, searchCategory, searchOffer]);

    const fetchUsers = async () => {
        if (users.length > 0 || loadingUsers) return;
        setLoadingUsers(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE}/api/users/`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const userList = Array.isArray(data) ? data : (data.results || data.users || []);
                setUsers(userList.filter(u => u.role === 'listing' || u.role === 'listing_sales_rent'));
            }
        } catch (err) {
            console.error("Failed to load users", err);
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (canViewAll) fetchUsers();
    }, [canViewAll]);

    // =========================================================
    // SELECTION
    // =========================================================
    const handleSmartSelectAll = () => {
        const totalVisible = properties.length;
        if (selectedIds.length === totalVisible && totalVisible > 0) {
            setSelectedIds([]);
            return;
        }
        if (chunkSize === "All") {
            setSelectedIds(properties.map(p => p.id));
            return;
        }
        const nextChunk = properties
            .filter(p => !selectedIds.includes(p.id))
            .slice(0, chunkSize)
            .map(p => p.id);

        if (nextChunk.length === 0) {
            toast.info("All visible records are already selected.");
            return;
        }
        setSelectedIds(prev => [...prev, ...nextChunk]);
    };

    const toggleSelectRow = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // =========================================================
    // BULK ACTIONS
    // =========================================================
    const handleBulkDelete = async () => {
        setBulkActionLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE}/api/archive-properties/bulk-delete/`, {
                method: 'DELETE',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (!response.ok) throw new Error("Failed to bulk delete");
            toast.success(`✅ Successfully deleted ${selectedIds.length} records.`);
            setBulkDeleteConfirm(false);
            setSelectedIds([]);
            refreshProperties();
        } catch (err) {
            console.error(err);
            toast.error("❌ Error deleting records.");
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedUser) return toast.error("Please select a user to assign.");
        const isUnassign = selectedUser === UNASSIGN_VALUE;
        setBulkActionLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE}/api/archive-properties/bulk-assign/`, {
                method: 'PATCH',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    ids: selectedIds,
                    responsibility_id: isUnassign ? null : selectedUser
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to bulk assign");
            }
            const assignedUserObj = isUnassign ? null : users.find(u => u.id.toString() === selectedUser.toString());
            const assignedName = isUnassign ? "Unassigned" : (assignedUserObj ? userLabel(assignedUserObj) : "Assigned User");

            setProperties(prev =>
                prev.map(p => selectedIds.includes(p.id)
                    ? { ...p, responsibility: isUnassign ? null : selectedUser, responsibility_name: isUnassign ? null : assignedName }
                    : p)
            );

            toast.success(
                isUnassign
                    ? `✅ Responsibility removed from ${selectedIds.length} records.`
                    : `✅ Successfully assigned responsibility for ${selectedIds.length} records.`
            );
            setSelectedIds([]);
            setShowAssignModal(false);
            setSelectedUser("");
            refreshProperties();
        } catch (err) {
            toast.error(`❌ ${err.message}`);
        } finally {
            setBulkActionLoading(false);
        }
    };

    // =========================================================
    // STANDARD HANDLERS
    // =========================================================
    const confirmDelete = (property) => {
        if (!canDelete) return toast.error("You don't have permission to delete archive properties.");
        setDeleteConfirm(property);
    };

    const handleDeleteProperty = async () => {
        if (!deleteConfirm) return;
        const id = deleteConfirm.id;
        setDeletingId(id);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE}/api/archive-properties/${id}/delete/`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!response.ok) {
                toast.error('Failed to delete Distribution record');
                return;
            }
            setProperties(prev => prev.filter(p => p.id !== id));
            toast.success(`✅ Distribution record deleted successfully!`);
            setDeleteConfirm(null);
        } catch (err) {
            toast.error('Server connection error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleOpenCreate = () => {
        if (!canCreate) return toast.error("You don't have permission to create archive properties.");
        setSelectedProperty(null);
        setShowAddEditModal(true);
    };

    const handleOpenEdit = (property) => {
        if (!canUpdate) return toast.error("You don't have permission to edit archive properties.");
        setSelectedProperty(property);
        setShowAddEditModal(true);
    };

    const handleOpenDetails = (property) => {
        setSelectedProperty(property);
        setShowDetailsModal(true);
    };

    const handleCloseModals = () => {
        setShowAddEditModal(false);
        setShowDetailsModal(false);
        setShowBulkImportModal(false);
        setShowAssignModal(false);
        setSelectedProperty(null);
        setDeleteConfirm(null);
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSearchMunicipality("");
        setSearchZone("");
        setSearchSector("");
        setSearchResponsibility("");
        setSearchDate("");
        setSearchCategory("");
        setSearchOffer("");
    };

    // =========================================================
    // EXPORT — PDF
    // =========================================================
    const handleExportPDF = async () => {
        if (properties.length === 0) return toast.error("No records to export.");

        setIsGeneratingPdf(true);
        const toastId = toast.loading("Generating PDF...");

        try {
            const node = pdfRef.current;
            if (document.fonts?.ready) await document.fonts.ready;

            const rootTop = node.getBoundingClientRect().top;
            const theadH = node.querySelector('thead').getBoundingClientRect().height;
            const rows = Array.from(node.querySelectorAll('tbody tr')).map((r) => {
                const b = r.getBoundingClientRect();
                return { top: b.top - rootTop, bottom: b.bottom - rootTop };
            });

            const pages = [];
            let i = 0;
            while (i < rows.length) {
                const isFirst = pages.length === 0;
                const startRow = i;
                const used = (r) => isFirst
                    ? rows[r].bottom + PDF_PAD
                    : PDF_PAD + theadH + (rows[r].bottom - rows[startRow].top) + PDF_PAD;
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
                        Array.from(root.querySelectorAll('tbody tr')).forEach((r, idx) => {
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

            pdf.save(`Distribution_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.update(toastId, { render: `✅ PDF downloaded! (${properties.length} records, ${pages.length} pages)`, type: "success", isLoading: false, autoClose: 3000 });
        } catch (err) {
            console.error("PDF error:", err);
            toast.update(toastId, { render: "❌ Failed to generate PDF", type: "error", isLoading: false, autoClose: 4000 });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // =========================================================
    // EXPORT — EXCEL
    // =========================================================
    const handleExportExcel = async () => {
        if (properties.length === 0) return toast.error("No records to export.");

        try {
            const mod = await import('exceljs');
            const ExcelJS = mod.default || mod;

            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Distribution', {
                views: [{ rightToLeft: false, state: 'frozen', ySplit: 2 }],
            });

            const FONT = 'Tahoma';
            const border = {
                top: { style: 'thin', color: { argb: 'FF999999' } },
                left: { style: 'thin', color: { argb: 'FF999999' } },
                bottom: { style: 'thin', color: { argb: 'FF999999' } },
                right: { style: 'thin', color: { argb: 'FF999999' } },
            };
            const align = { vertical: 'top', horizontal: 'left', wrapText: true, readingOrder: 'ltr' };

            ws.columns = [
                { width: 34 }, { width: 16 }, { width: 16 }, { width: 34 },
                { width: 80 }, { width: 20 }, { width: 12 }, { width: 16 },
                { width: 16 }, { width: 26 },
            ];

            ws.mergeCells('A1:J1');
            const title = ws.getCell('A1');
            title.value = `Distribution Sheet - ${new Date().toLocaleDateString()}`;
            title.font = { name: 'Arial', size: 18, bold: true };
            title.alignment = { vertical: 'middle', horizontal: 'left', readingOrder: 'ltr' };
            ws.getRow(1).height = 32;

            const headerRow = ws.addRow([
                'Owner / Phone', 'Last Contact', 'Property Type', 'Location (Mun., Zone, Sector)',
                'Description', 'Plot / Land', 'Offer', 'Sale Price', 'Rent Price', 'Responsibility',
            ]);
            headerRow.eachCell((cell) => {
                cell.font = { name: FONT, size: 12, bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F7F5' } };
                cell.alignment = align;
                cell.border = border;
            });

            properties.forEach((p) => {
                const ownerParts = [{ font: { name: FONT, size: 12, bold: true }, text: p.name || 'Unnamed' }];
                if (p.company) ownerParts.push({ font: { name: FONT, size: 12 }, text: `\n${p.company}` });
                ownerParts.push({ font: { name: FONT, size: 12 }, text: `\n${p.phone || '—'}` });

                const location = [p.municipality || '—', [p.zone, p.sector].filter(Boolean).join(', ')]
                    .filter(Boolean).join('\n');
                const plotLand = [p.plot_no || '—', p.land_no || ''].filter(Boolean).join('\n');

                const sale = Number(p.sale_price) > 0 ? Number(p.sale_price) : '—';
                const rent = Number(p.rent_price) > 0 ? Number(p.rent_price) : '—';

                const row = ws.addRow([
                    { richText: ownerParts },
                    p.last_communication_date || '—',
                    p.property_type || '—',
                    location,
                    p.description || '—',
                    plotLand,
                    p.property_offer || '—',
                    sale,
                    rent,
                    p.responsibility_name || 'Unassigned',
                ]);

                row.eachCell((cell, colNumber) => {
                    if (colNumber !== 1) cell.font = { name: FONT, size: 12 };
                    cell.alignment = align;
                    cell.border = border;
                });

                [8, 9].forEach((c) => {
                    const cell = row.getCell(c);
                    if (typeof cell.value === 'number') {
                        cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.00';
                    }
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Distribution_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("✅ Excel downloaded!");
        } catch (err) {
            console.error("Excel error:", err);
            toast.error("❌ Failed to generate Excel file");
        }
    };

    // =========================================================
    // LOADING / ERROR
    // =========================================================
    if (initialLoading || permissionsLoading) {
        return (
            <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-5">
                <div className="w-12 h-12 border-4 border-[#f8f7f5] border-t-[#a47d52] rounded-full animate-spin"></div>
                <p className="text-[#a47d52] text-lg font-extrabold">Loading Distribution...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-4 p-5 text-center">
                <span className="text-5xl">⚠️</span>
                <p className="text-red-500 text-lg font-extrabold">{error}</p>
                <button className="bg-[#a47d52] text-white px-8 py-3 rounded-lg font-extrabold transition-colors hover:bg-[#172554]" onClick={() => refreshProperties()}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div dir="ltr" className="min-h-screen bg-white py-10 px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans relative pb-24">
            <ToastContainer position="top-right" theme="light" />

            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
                <div className="text-center xl:text-left">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center xl:justify-start gap-3">
                        <FaArchive className="text-[#a47d52]" /> Distribution Sheet
                    </h2>
                    <div className="flex items-center justify-center xl:justify-start gap-2 mt-2">
                        {canViewAll ? (
                            <span className="bg-[#a47d52]/10 text-[#a47d52] text-xs font-bold px-2 py-1 rounded-md border border-[#a47d52]/20">Viewing: All</span>
                        ) : (
                            <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
                                <FiLock size={10} /> Viewing: Only My
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
                    <div className="flex bg-[#f8f7f5] p-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={() => setViewMode("cards")} className={`p-2 rounded-md transition-all ${viewMode === "cards" ? "bg-white text-[#a47d52] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiGrid size={18} /></button>
                        <button onClick={() => setViewMode("table")} className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white text-[#a47d52] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiList size={18} /></button>
                    </div>

                    <button
                        onClick={handleExportPDF}
                        disabled={isGeneratingPdf || properties.length === 0}
                        title="Export the records currently shown to PDF"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaFilePdf /> {isGeneratingPdf ? "Generating..." : "Export PDF"}
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={properties.length === 0}
                        title="Export the records currently shown to Excel"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaFileExcel /> Export Excel
                    </button>

                    <button className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#a47d52] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={() => { if (!canCreate) return toast.error("No permission."); setShowBulkImportModal(true); }}>
                        <FiUploadCloud size={18} /> Import
                    </button>
                    <button className={`flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#a47d52] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={handleOpenCreate}>
                        <FaPlus /> Add Property
                    </button>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="max-w-full mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, phone, plot, land, description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={INPUT_CLASS}
                        />
                    </div>
                    <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Municipality"
                            value={searchMunicipality}
                            onChange={(e) => setSearchMunicipality(e.target.value)}
                            className={INPUT_CLASS}
                        />
                    </div>
                    <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Zone"
                            value={searchZone}
                            onChange={(e) => setSearchZone(e.target.value)}
                            className={INPUT_CLASS}
                        />
                    </div>
                    <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Sector"
                            value={searchSector}
                            onChange={(e) => setSearchSector(e.target.value)}
                            className={INPUT_CLASS}
                        />
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                    {canViewAll && (
                        <div className="relative">
                            <FaUserShield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <select
                                value={searchResponsibility}
                                onChange={(e) => setSearchResponsibility(e.target.value)}
                                className={`${SELECT_CLASS} pl-9 min-w-[200px]`}
                                disabled={loadingUsers}
                                title="Filter by responsibility"
                            >
                                <option value="">{loadingUsers ? "Loading users..." : "Responsibility (All)"}</option>
                                <option value="unassigned" className="font-bold text-gray-800">-- Unassigned Only --</option>
                                {users.map((u) => (
                                    <option key={u.id} value={u.id}>{userLabel(u)}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="relative">
                        <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="date"
                            value={searchDate}
                            onChange={(e) => setSearchDate(e.target.value)}
                            title="Last communication date"
                            className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a47d52]"
                        />
                    </div>

                    <select value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)} className={SELECT_CLASS}>
                        <option value="">Category (All)</option>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                    </select>
                    <select value={searchOffer} onChange={(e) => setSearchOffer(e.target.value)} className={SELECT_CLASS}>
                        <option value="">Offer (All)</option>
                        <option value="sale">Sale</option>
                        <option value="rent">Rent</option>
                    </select>

                    <button
                        onClick={clearFilters}
                        disabled={activeFilterCount === 0}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#f8f7f5] text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Clear all filters"
                    >
                        <FiX /> Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                    </button>

                    <span className="ml-auto flex items-center gap-2 text-xs font-bold text-gray-500">
                        {loading && <span className="w-4 h-4 border-2 border-[#a47d52] border-t-transparent rounded-full animate-spin"></span>}
                        {properties.length} {properties.length === 1 ? "record" : "records"}
                    </span>
                </div>
            </div>

            <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

            {/* EMPTY */}
            {properties.length === 0 ? (
                <div className="flex flex-col justify-center items-center gap-4 p-10 text-center bg-[#f8f7f5] rounded-2xl border border-gray-100 max-w-3xl mx-auto shadow-sm">
                    <span className="text-6xl">🗂️</span>
                    <h3 className="text-2xl font-extrabold text-gray-800">No Distribution Records Found</h3>
                    <p className="text-gray-500">Try adjusting your search filters or import a new list.</p>
                </div>
            ) : viewMode === "cards" ? (

                /* CARD VIEW */
                <div className={`max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
                    <div className="mb-4 flex flex-wrap items-center gap-4 bg-gray-50 w-fit px-4 py-2 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === properties.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#a47d52] rounded focus:ring-[#a47d52] cursor-pointer" />
                            <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next</span>
                        </div>
                        <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                            <option value="All">All ({properties.length})</option>
                        </select>
                        <span className="text-sm font-bold text-[#a47d52]">({selectedIds.length} Selected)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {properties.map((p) => (
                            <div key={p.id} className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border relative group ${selectedIds.includes(p.id) ? 'border-[#a47d52] ring-1 ring-[#a47d52]' : 'border-gray-100'}`}>
                                <div className="absolute top-4 left-4 z-20">
                                    <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelectRow(p.id)} className="w-5 h-5 text-[#a47d52] rounded border-gray-300 focus:ring-[#a47d52] cursor-pointer shadow-sm bg-white" />
                                </div>
                                <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenEdit(p)} className={`p-2 rounded-full shadow transition-colors ${canUpdate ? "bg-white/90 text-gray-600 hover:bg-[#a47d52] hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
                                    <button onClick={() => confirmDelete(p)} className={`p-2 rounded-full shadow transition-colors ${canDelete ? "bg-white/90 text-red-500 hover:bg-red-500 hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
                                </div>
                                <div className="p-6 pt-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#a47d52]/20 group-hover:bg-[#a47d52]/10 transition-colors"><FiUser className="text-[#a47d52]" size={28} /></div>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1 truncate hover:text-[#a47d52] cursor-pointer transition-colors" title={p.name || 'Unnamed Owner'} onClick={() => handleOpenDetails(p)}>{p.name || 'Unnamed Owner'}</h3>
                                    {p.company && <p className="text-sm font-medium text-gray-500 mb-2 truncate">{p.company}</p>}

                                    <div className="mb-4 flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                            <FaUserShield className="text-gray-400" /> {p.responsibility_name || 'Unassigned'}
                                        </span>
                                        {p.plot_no && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                                <FiHome className="text-gray-400" /> {p.plot_no}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3 mt-auto pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiPhone className="text-[#a47d52]" size={12} /></div>
                                            <span className="truncate font-medium">{p.phone || 'No phone'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiDollarSign className="text-[#a47d52]" size={12} /></div>
                                            <span className="truncate font-medium">Sale: {formatPrice(p.sale_price)} | Rent: {formatPrice(p.rent_price)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiCalendar className="text-[#a47d52]" size={12} /></div>
                                            <span className="truncate font-medium">{p.last_communication_date || 'No date'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleOpenDetails(p)} className="mt-6 w-full flex items-center justify-center gap-2 bg-[#f8f7f5] text-[#a47d52] py-2.5 rounded-lg font-bold text-sm transition-all duration-300 hover:bg-[#a47d52] hover:text-white"><MdVisibility size={16} /> View Details</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (

                /* TABLE VIEW */
                <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === properties.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#a47d52] rounded focus:ring-[#a47d52] cursor-pointer" title="Select Next Chunk" />
                            <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next Chunk</span>
                        </div>
                        <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
                            <option value={50}>50 Records</option>
                            <option value={100}>100 Records</option>
                            <option value={200}>200 Records</option>
                            <option value="All">All Records ({properties.length})</option>
                        </select>
                        {selectedIds.length > 0 && <span className="text-sm font-bold text-[#a47d52] bg-[#a47d52]/10 px-2 py-1 rounded">{selectedIds.length} Selected</span>}
                    </div>

                    <div className="overflow-x-auto custom-scrollbar pb-2">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className="bg-[#f8f7f5] border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-4 w-12 text-center">
                                        <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === properties.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#a47d52] rounded focus:ring-[#a47d52] cursor-pointer" />
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Owner / Phone</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Last Contact</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location (Mun., Zone, Sector)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plot / Land</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Offer</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sale Price</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rent Price</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Responsibility</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {properties.map((p) => (
                                    <tr key={p.id} className={`transition-colors ${selectedIds.includes(p.id) ? 'bg-[#a47d52]/5' : 'hover:bg-gray-50'}`}>
                                        <td className="px-4 py-4 text-center">
                                            <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelectRow(p.id)} className="w-4 h-4 text-[#a47d52] rounded focus:ring-[#a47d52] cursor-pointer" />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#a47d52]/20 shrink-0">
                                                    <FiUser className="text-[#a47d52]" size={18} />
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <p className="font-bold text-gray-800">{p.name || 'Unnamed Owner'}</p>
                                                    {p.company && <p className="text-xs text-gray-500">{p.company}</p>}
                                                    <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                                        <FiPhone size={10} className="text-gray-400" />
                                                        {p.phone || '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-2 text-sm text-gray-600">
                                                <FiCalendar size={12} className="text-gray-400" />
                                                {p.last_communication_date || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{p.property_type || '—'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-sm text-gray-600">
                                                <span>{p.municipality || '—'}</span>
                                                {(p.zone || p.sector) && (
                                                    <span className="text-xs text-gray-400">
                                                        {[p.zone, p.sector].filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={p.description}>
                                            {p.description || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-sm text-gray-600">
                                                {p.plot_no && <span className="flex items-center gap-2"><FiHome size={12} className="text-gray-400" /> {p.plot_no}</span>}
                                                {p.land_no && <span className="flex items-center gap-2 text-xs text-gray-400">Land: {p.land_no}</span>}
                                                {!p.plot_no && !p.land_no && <span>—</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{p.property_offer || '—'}</td>
                                        <td className="px-6 py-4 font-bold text-emerald-600 text-sm">{formatPrice(p.sale_price)}</td>
                                        <td className="px-6 py-4 font-bold text-blue-600 text-sm">{formatPrice(p.rent_price)}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md"><FaUserShield className="text-gray-400" /> {p.responsibility_name || 'Unassigned'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleOpenDetails(p)} className="p-2 text-gray-400 hover:text-[#a47d52] hover:bg-[#a47d52]/10 rounded-lg transition-colors"><MdVisibility size={18} /></button>
                                                <button onClick={() => handleOpenEdit(p)} className={`p-2 rounded-lg transition-colors ${canUpdate ? "text-gray-400 hover:text-[#a47d52] hover:bg-[#a47d52]/10" : "text-gray-300 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
                                                <button onClick={() => confirmDelete(p)} className={`p-2 rounded-lg transition-colors ${canDelete ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-300 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* FLOATING BULK ACTIONS BAR */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#a47d52] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-slideUp">
                    <div className="flex items-center gap-2 border-r border-white/20 pr-6">
                        <FiCheckSquare size={20} className="text-white/70" />
                        <span className="font-bold whitespace-nowrap">{selectedIds.length} Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setShowAssignModal(true); fetchUsers(); }} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold text-sm transition-colors"><FaUserEdit size={16} /> Assign Responsibility</button>
                        <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkActionLoading} className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
                            {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaTrash size={16} />} Delete Selected
                        </button>
                    </div>
                    <button onClick={() => setSelectedIds([])} className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-gray-200 hover:text-white"><MdClose size={20} /></button>
                </div>
            )}

            {/* MODALS */}
            {showAddEditModal && <AddEditLandLord landlord={selectedProperty} onClose={handleCloseModals} onSuccess={() => { handleCloseModals(); refreshProperties(); }} />}
            {showDetailsModal && selectedProperty && <LandLoardDetails landlord={selectedProperty} onClose={handleCloseModals} />}
            {showBulkImportModal && <AddDistribution onClose={handleCloseModals} onSuccess={() => { refreshProperties(); }} />}

            {/* BULK ASSIGN MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white">
                            <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2"><FaUserShield className="text-[#a47d52]" /> Assign Responsibility</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-red-500"><MdClose size={20} /></button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">Assign responsibility for <strong>{selectedIds.length}</strong> selected records to:</p>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Select Listing Agent</label>
                            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a47d52]" disabled={loadingUsers}>
                                <option value="">-- Select User --</option>
                                <option value={UNASSIGN_VALUE}>Unassigned (remove responsibility)</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.username} {u.last_name || ''} ({u.role === 'listing' ? 'Listing' : 'Listing Sales Rent'})</option>)}
                            </select>
                            {loadingUsers && <p className="text-xs text-[#a47d52] mt-2">Loading agents...</p>}
                            {!loadingUsers && users.length === 0 && <p className="text-xs text-red-500 mt-2">No eligible users found.</p>}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowAssignModal(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-white transition-colors">Cancel</button>
                            <button onClick={handleBulkAssign} disabled={!selectedUser || bulkActionLoading} className="px-6 py-2.5 rounded-lg bg-[#a47d52] text-white font-bold hover:bg-[#172554] transition-colors disabled:opacity-50 flex items-center gap-2">
                                {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null} Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK DELETE CONFIRMATION */}
            {bulkDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
                        <div className="flex justify-center pt-6 pb-4">
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100"><FiAlertTriangle className="text-red-500" size={32} /></div>
                        </div>
                        <div className="px-6 pb-6">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Bulk Delete</h3>
                            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-red-600">{selectedIds.length}</span> selected records? This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setBulkDeleteConfirm(false)} disabled={bulkActionLoading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                                <button onClick={handleBulkDelete} disabled={bulkActionLoading} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
                                    {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MdDeleteForever size={18} />} Yes, Delete {selectedIds.length} Records
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STANDARD DELETE CONFIRMATION */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
                        <div className="flex justify-center pt-6 pb-4"><div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100"><FiAlertTriangle className="text-red-500" size={32} /></div></div>
                        <div className="px-6 pb-6">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Delete</h3>
                            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.name || deleteConfirm.company || deleteConfirm.plot_no}"</span>? This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                                <button onClick={handleDeleteProperty} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
                                    {deletingId === deleteConfirm.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MdDeleteForever size={18} />} Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN PDF TEMPLATE */}
            {properties.length > 0 && <PdfExportTemplate ref={pdfRef} properties={properties} />}
        </div>
    );
};


export default Distribution;