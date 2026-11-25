import React, { useState, useEffect, useRef } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MdDeleteForever, MdModeEdit, MdVisibility, MdClose } from 'react-icons/md';
import { FiUser, FiPhone, FiLock, FiGrid, FiList, FiAlertTriangle, FiUploadCloud, FiCheckSquare, FiCalendar, FiHome, FiDollarSign, FiSearch, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { FaArchive, FaPlus, FaUserShield, FaTrash, FaUserEdit, FaMapMarkerAlt, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

import AddEditLandLord from "../../components/en/listing/AddEditLandLoard";
import LandLoardDetails from "../../components/en/listing/LandLordDetails";
import AddOwnersArchive from "../../components/en/listing/AddOwnersArchive";
import { usePermissions } from "../context/PermissionsContext";

import logo from '../../assets/images/logogo-removebg-old.png';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// ---------- Helpers ----------
const formatPrice = (value) => {
    if (!value || Number(value) === 0) return '—';
    return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const userLabel = (u) => `${u.first_name || u.username || 'User'} ${u.last_name || ''}`.trim();

const UNASSIGN_VALUE = "unassigned";

const INPUT_CLASS = "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]";
const SELECT_CLASS = "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4285F4]";

// Pagination
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 500; // must be <= max_page_size on the backend

const getPageNumbers = (current, total) => {
    const pages = [];
    const delta = 2;
    for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }
    return pages;
};

// ---------- Pagination bar ----------
const Pagination = ({ page, pageSize, totalCount, loading, onPageChange, onPageSizeChange }) => {
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalCount);

    const btn = "min-w-[36px] px-3 py-1.5 text-sm font-bold border rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3 text-sm text-gray-600">
                <span className="font-bold">{from}–{to} of {totalCount}</span>
                <select
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none"
                    disabled={loading}
                >
                    {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
                </select>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <button className={`${btn} bg-white border-gray-300 text-gray-700 hover:bg-gray-100`} disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)} title="Previous page">
                    <FiChevronLeft />
                </button>

                {getPageNumbers(page, totalPages).map((p, idx) =>
                    p === '...' ? (
                        <span key={`dots-${idx}`} className="px-2 text-gray-400">…</span>
                    ) : (
                        <button
                            key={p}
                            disabled={loading}
                            onClick={() => onPageChange(p)}
                            className={`${btn} ${p === page ? "bg-[#4285F4] border-[#4285F4] text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"}`}
                        >
                            {p}
                        </button>
                    )
                )}

                <button className={`${btn} bg-white border-gray-300 text-gray-700 hover:bg-gray-100`} disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)} title="Next page">
                    <FiChevronRight />
                </button>
            </div>
        </div>
    );
};

// ---------- PDF export helpers ----------
const PDF_PAGE_W = 1123;
const PDF_PAGE_H = Math.round((PDF_PAGE_W * 210) / 297);
const PDF_PAD = 30;

const PDF_FONT = '"Segoe UI", Tahoma, "Noto Sans Arabic", "Arial Unicode MS", Arial, sans-serif';

// Only mounted while exporting (see exportOwners state below)
const PdfExportTemplate = React.forwardRef(({ owners }, ref) => {
    const th = {
        padding: "10px 8px",
        border: "1px solid #d1d5db",
        fontSize: "13px",
        fontWeight: "bold",
        textAlign: "left",
        letterSpacing: "normal",
    };

    const td = {
        padding: "8px",
        border: "1px solid #e5e7eb",
        fontSize: "14px",
        lineHeight: 1.5,
        verticalAlign: "top",
        letterSpacing: "normal",
        wordBreak: "break-word",
        unicodeBidi: "plaintext",
    };

    const small = { fontSize: "12px", color: "#6b7280" };

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
            <div data-pdf-header style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #a47d52", paddingBottom: "16px", marginBottom: "20px" }}>
                <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "60px", objectFit: "contain" }} />
                <div style={{ marginLeft: "20px" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>Archive Properties Sheet</h1>
                    <p style={{ fontSize: "14px", color: "#6b7280", margin: "5px 0 0 0" }}>
                        Generated: {new Date().toLocaleString()} — <span data-pdf-count>{owners.length} records</span>
                    </p>
                </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <colgroup>
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "8%" }} />
                </colgroup>
                <thead>
                    <tr style={{ backgroundColor: "#f8f7f5", color: "#374151" }}>
                        <th style={th}>Owner / Phone</th>
                        <th style={th}>Unit No</th>
                        <th style={th}>Plot / Land</th>
                        <th style={th}>Description</th>
                        <th style={th}>Property Cat.</th>
                        <th style={th}>Municipality</th>
                        <th style={th}>Mun. No</th>
                        <th style={th}>Offer</th>
                        <th style={th}>Sale</th>
                        <th style={th}>Rent</th>
                    </tr>
                </thead>
                <tbody>
                    {owners.map((owner) => (
                        <tr key={owner.id}>
                            <td style={td}>
                                <div dir="auto" style={{ fontWeight: "bold" }}>{owner.name || 'Unnamed'}</div>
                                {owner.company && <div dir="auto" style={small}>{owner.company}</div>}
                                <div style={{ fontSize: "12px", color: "#4b5563" }}>{owner.phone || '—'}</div>
                                <div style={{ fontSize: "11px", color: "#4285F4", fontWeight: "bold" }}>{owner.responsibility_name || 'Unassigned'}</div>
                            </td>
                            <td style={td}>
                                <div style={{ fontWeight: "bold" }}>{owner.unit_no || '—'}</div>
                                {owner.refrence_no && <div style={small}>Ref: {owner.refrence_no}</div>}
                            </td>
                            <td style={td}>
                                <div style={{ fontWeight: "bold" }}>Plot: {owner.plot_no || '—'}</div>
                                <div style={small}>Land: {owner.land_no || '—'}</div>
                            </td>
                            <td dir="auto" style={{ ...td, whiteSpace: "pre-wrap" }}>{owner.description || '—'}</td>
                            <td style={{ ...td, textTransform: "capitalize" }}>{owner.property_category || '—'}</td>
                            <td style={td}>
                                <div dir="auto">{owner.municipality || '—'}</div>
                                {owner.zone && <div dir="auto" style={small}>Zone: {owner.zone}</div>}
                            </td>
                            <td style={td}>{owner.municipality_no || '—'}</td>
                            <td style={{ ...td, textTransform: "capitalize" }}>{owner.property_offer || '—'}</td>
                            <td style={{ ...td, fontWeight: "bold", color: "#059669" }}>{formatPrice(owner.sale_price)}</td>
                            <td style={{ ...td, fontWeight: "bold", color: "#2563eb" }}>{formatPrice(owner.rent_price)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
});

// ======================================================================
const OwnersArchive = () => {
    const { permissions } = usePermissions();

    // ---------- Data state ----------
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState("table");

    // ---------- Pagination state ----------
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [totalCount, setTotalCount] = useState(0);

    // ---------- Table horizontal scroll arrows ----------
    const tableScrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollButtons = () => {
        const el = tableScrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 2);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };

    const scrollTableBy = (direction) => {
        tableScrollRef.current?.scrollBy({ left: direction * 500, behavior: 'smooth' });
    };

    useEffect(() => {
        updateScrollButtons();
        window.addEventListener('resize', updateScrollButtons);
        return () => window.removeEventListener('resize', updateScrollButtons);
    }, [owners, viewMode, loading, initialLoading]);

    // ---------- Modal state ----------
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [selectedOwner, setSelectedOwner] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

    // ---------- Bulk actions ----------
    const [selectedIds, setSelectedIds] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState("");
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [chunkSize, setChunkSize] = useState(100);
    // NEW: loading state for the "Select all filtered records" action
    const [isSelectingAll, setIsSelectingAll] = useState(false);

    // ---------- Filters ----------
    const [searchTerm, setSearchTerm] = useState("");
    const [searchArea, setSearchArea] = useState("");
    const [searchCommunity, setSearchCommunity] = useState("");
    const [searchSubCommunity, setSearchSubCommunity] = useState("");
    const [searchResponsibility, setSearchResponsibility] = useState("");
    const [searchDate, setSearchDate] = useState("");
    const [searchCategory, setSearchCategory] = useState("");
    const [searchOffer, setSearchOffer] = useState("");

    // Any filter change goes back to page 1
    const withReset = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    // ---------- Export state ----------
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
    // NEW: loading state for the new "Export Excel Followup" button
    const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
    const [exportOwners, setExportOwners] = useState(null); // PDF template is mounted only while this is set
    const pdfRef = useRef(null);

    // ---------- Request tracking ----------
    const requestId = useRef(0);
    const controllerRef = useRef(null);

    // ---------- Permissions ----------
    const canViewAll = permissions?.view_all_archive_owners === true;
    const canCreate = permissions?.create_bulk_archive_owners === true;
    const canUpdate = permissions?.update_bulk_responsibility_archive_owners === true;
    const canDelete = permissions?.delete_bulk_archive_owners === true;

    const activeFilterCount = [
        searchTerm, searchArea, searchCommunity, searchSubCommunity,
        searchResponsibility, searchDate, searchCategory, searchOffer,
    ].filter(Boolean).length;

    // NEW: true when every record on the CURRENT page is selected
    // (selection can now span several pages, so we can't compare against selectedIds.length anymore)
    const allPageSelected = owners.length > 0 && owners.every((o) => selectedIds.includes(o.id));

    // Builds filters (+ pagination unless overridden)
    const buildParams = (p = page, size = pageSize) => {
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.append('search', searchTerm.trim());
        if (searchArea.trim()) params.append('area', searchArea.trim());
        if (searchCommunity.trim()) params.append('community', searchCommunity.trim());
        if (searchSubCommunity.trim()) params.append('sub_community', searchSubCommunity.trim());
        if (searchResponsibility) params.append('responsibility', searchResponsibility);
        if (searchDate) params.append('last_communication_date', searchDate);
        if (searchCategory) params.append('property_category', searchCategory);
        if (searchOffer) params.append('property_offer', searchOffer);
        params.append('page', p);
        params.append('page_size', size);
        return params;
    };

    const buildQueryString = () => `?${buildParams().toString()}`;

    // ---------- Fetch current page ----------
    const fetchOwners = async (queryString = "") => {
        controllerRef.current?.abort(); // cancel the previous in-flight request
        const controller = new AbortController();
        controllerRef.current = controller;

        const myRequest = ++requestId.current;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                toast.error('Please login to view Archive Owners');
                setLoading(false);
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${BASE}/api/archive-owners/${queryString}`, {
                method: "GET",
                signal: controller.signal,
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
                } else if (response.status === 404) {
                    // Requested page no longer exists (e.g. after deletes) -> go to last valid page
                    setPage((p) => Math.max(1, p - 1));
                    return;
                } else {
                    toast.error('Failed to load Archive Owners');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (myRequest !== requestId.current) return;

            if (Array.isArray(data)) {
                setOwners(data);
                setTotalCount(data.length);
            } else {
                setOwners(Array.isArray(data.results) ? data.results : []);
                setTotalCount(data.count ?? 0);
            }
            // CHANGED: selection is no longer cleared on every fetch, so it survives page changes.
            // It is cleared when the filters change instead (see effect below).
        } catch (err) {
            if (err.name === 'AbortError') return;
            if (myRequest !== requestId.current) return;
            setError('Failed to load Archive Owners');
            console.error('Error fetching archive owners:', err);
        } finally {
            if (myRequest === requestId.current) {
                setLoading(false);
                setInitialLoading(false);
            }
        }
    };

    const refreshOwners = () => fetchOwners(buildQueryString());

    // Debounced fetch on any filter / page / page-size change
    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchOwners(buildQueryString());
        }, 400);
        return () => clearTimeout(timeout);
    }, [page, pageSize, searchTerm, searchArea, searchCommunity, searchSubCommunity, searchResponsibility, searchDate, searchCategory, searchOffer]);

    // NEW: a different filter set means a different result set -> drop the old selection
    useEffect(() => {
        setSelectedIds([]);
    }, [searchTerm, searchArea, searchCommunity, searchSubCommunity, searchResponsibility, searchDate, searchCategory, searchOffer]);

    // Abort any pending request on unmount
    useEffect(() => () => controllerRef.current?.abort(), []);

    const handlePageChange = (newPage) => {
        setPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePageSizeChange = (size) => {
        setPageSize(size);
        setPage(1);
    };

    // After a delete: if the whole page was removed, step back one page
    const refreshAfterRemoval = (removedCount) => {
        if (removedCount >= owners.length && page > 1) {
            setPage((p) => p - 1); // effect refetches
        } else {
            refreshOwners();
        }
    };

    // ---------- Users ----------
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

    // ---------- Selection (current page only) ----------
    const handleSmartSelectAll = () => {
        const totalVisibleRecords = owners.length;
        // CHANGED: deselect only this page's records (selection may include other pages)
        if (allPageSelected && totalVisibleRecords > 0) {
            const pageIds = owners.map((o) => o.id);
            setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
            return;
        }
        if (chunkSize === "All") {
            setSelectedIds(owners.map(o => o.id));
            return;
        }
        const nextChunk = owners
            .filter(o => !selectedIds.includes(o.id))
            .slice(0, chunkSize)
            .map(o => o.id);

        if (nextChunk.length === 0) {
            toast.info("All records on this page are already selected.");
            return;
        }
        setSelectedIds(prev => [...prev, ...nextChunk]);
    };

    const toggleSelectRow = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    // NEW: select ALL records matching the current filters (across every page).
    // Uses the same fetch-all helper as the exports, then stores every id.
    const handleSelectAllFiltered = async () => {
        if (totalCount === 0) return;
        setIsSelectingAll(true);
        try {
            const all = await fetchAllForExport();
            setSelectedIds(all.map((o) => o.id));
            toast.success(`✅ Selected all ${all.length} matching records.`);
        } catch (err) {
            console.error(err);
            toast.error("❌ Failed to select all records.");
        } finally {
            setIsSelectingAll(false);
        }
    };

    // NEW: ids are sent to the backend in chunks so very large selections don't produce a huge request body
    const ID_CHUNK = 1000;
    const chunkIds = (ids) => {
        const out = [];
        for (let i = 0; i < ids.length; i += ID_CHUNK) out.push(ids.slice(i, i + ID_CHUNK));
        return out;
    };

    // ---------- Bulk delete / assign ----------
    const handleBulkDelete = async () => {
        setBulkActionLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            // CHANGED: loop over id chunks (one request per chunk)
            for (const ids of chunkIds(selectedIds)) {
                const response = await fetch(`${BASE}/api/archive-owners/bulk-delete/`, {
                    method: 'DELETE',
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ ids })
                });

                if (!response.ok) throw new Error("Failed to bulk delete");
            }

            const removed = selectedIds.length;
            toast.success(`✅ Successfully deleted ${removed} records.`);
            setBulkDeleteConfirm(false);
            setSelectedIds([]);
            refreshAfterRemoval(removed);
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
            // CHANGED: loop over id chunks (one request per chunk)
            for (const ids of chunkIds(selectedIds)) {
                const response = await fetch(`${BASE}/api/archive-owners/bulk-assign/`, {
                    method: 'PATCH',
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ids,
                        responsibility_id: isUnassign ? null : selectedUser
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to bulk assign");
                }
            }

            const assignedUserObj = isUnassign ? null : users.find(u => u.id.toString() === selectedUser.toString());
            const assignedName = isUnassign ? "Unassigned" : (assignedUserObj ? userLabel(assignedUserObj) : "Assigned User");

            setOwners(prevOwners =>
                prevOwners.map(owner =>
                    selectedIds.includes(owner.id)
                        ? { ...owner, responsibility: isUnassign ? null : selectedUser, responsibility_name: isUnassign ? null : assignedName }
                        : owner
                )
            );

            toast.success(
                isUnassign
                    ? `✅ Responsibility removed from ${selectedIds.length} records.`
                    : `✅ Successfully assigned responsibility for ${selectedIds.length} records.`
            );
            setSelectedIds([]);
            setShowAssignModal(false);
            setSelectedUser("");
            refreshOwners();
        } catch (err) {
            toast.error(`❌ ${err.message}`);
        } finally {
            setBulkActionLoading(false);
        }
    };

    // ---------- Single delete ----------
    const confirmDelete = (owner) => {
        if (!canDelete) return toast.error("You don't have permission to delete archive owners.");
        setDeleteConfirm(owner);
    };

    const handleDeleteOwner = async () => {
        if (!deleteConfirm) return;
        const id = deleteConfirm.id;
        setDeletingId(id);
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE}/api/archive-owners/${id}/delete/`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) {
                toast.error('Failed to delete Archive Owner');
                return;
            }

            toast.success(`✅ Archive Owner deleted successfully!`);
            setSelectedIds((prev) => prev.filter((x) => x !== id)); // NEW: keep selection in sync
            setDeleteConfirm(null);
            refreshAfterRemoval(1);
        } catch (err) {
            toast.error('Server connection error');
        } finally {
            setDeletingId(null);
        }
    };

    // ---------- Modal handlers ----------
    const handleOpenCreate = () => {
        if (!canCreate) return toast.error("You don't have permission to create archive owners.");
        setSelectedOwner(null);
        setShowAddEditModal(true);
    };

    const handleOpenEdit = (owner) => {
        if (!canUpdate) return toast.error("You don't have permission to edit archive owners.");
        setSelectedOwner(owner);
        setShowAddEditModal(true);
    };

    const handleOpenDetails = (owner) => {
        setSelectedOwner(owner);
        setShowDetailsModal(true);
    };

    const handleCloseModals = () => {
        setShowAddEditModal(false);
        setShowDetailsModal(false);
        setShowBulkImportModal(false);
        setShowAssignModal(false);
        setSelectedOwner(null);
        setDeleteConfirm(null);
    };

    const clearFilters = () => {
        setSearchTerm("");
        setSearchArea("");
        setSearchCommunity("");
        setSearchSubCommunity("");
        setSearchResponsibility("");
        setSearchDate("");
        setSearchCategory("");
        setSearchOffer("");
        setPage(1);
    };

    // ---------- Export: fetch ALL records matching the current filters ----------
    const fetchAllForExport = async () => {
        const token = localStorage.getItem('access_token');
        let pageNo = 1;
        let all = [];
        while (true) {
            const params = buildParams(pageNo, EXPORT_PAGE_SIZE);
            const res = await fetch(`${BASE}/api/archive-owners/?${params.toString()}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to fetch records for export');
            const data = await res.json();
            if (Array.isArray(data)) return data; // backend not paginated
            all = all.concat(data.results || []);
            if (!data.next) break;
            pageNo++;
        }
        return all;
    };

    const handleExportPDF = async () => {
        if (totalCount === 0) return toast.error("No records to export.");
        setIsGeneratingPdf(true);
        const toastId = toast.loading("Fetching records...");

        try {
            const allOwners = await fetchAllForExport();
            if (allOwners.length === 0) throw new Error("No records");

            // Mount the hidden template only now, and wait for it to render
            setExportOwners(allOwners);
            await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

            toast.update(toastId, { render: "Generating PDF..." });

            const node = pdfRef.current;
            if (!node) throw new Error("PDF template not mounted");
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

            pdf.save(`Archive_Owners_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.update(toastId, { render: `✅ PDF downloaded! (${allOwners.length} records, ${pages.length} pages)`, type: "success", isLoading: false, autoClose: 3000 });
        } catch (err) {
            console.error("PDF error:", err);
            toast.update(toastId, { render: "❌ Failed to generate PDF", type: "error", isLoading: false, autoClose: 4000 });
        } finally {
            setExportOwners(null); // unmount the hidden template
            setIsGeneratingPdf(false);
        }
    };

    // ---------- Export Excel "New Data" (the original Export Excel, relabeled) ----------
    // CHANGE: a 7th column "Responsibility" was added after "Notes".
    const handleExportExcel = async () => {
        if (totalCount === 0) return toast.error("No records to export.");
        setIsGeneratingExcel(true);
        const toastId = toast.loading("Preparing Excel...");

        try {
            const allOwners = await fetchAllForExport();
            if (allOwners.length === 0) throw new Error("No records");

            const mod = await import('exceljs');
            const ExcelJS = mod.default || mod;

            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Archive Properties', {
                views: [{ rightToLeft: false, state: 'frozen', ySplit: 3 }],
            });

            const FONT = 'Tahoma';
            const border = {
                top:    { style: 'thin', color: { argb: 'FF999999' } },
                left:   { style: 'thin', color: { argb: 'FF999999' } },
                bottom: { style: 'thin', color: { argb: 'FF999999' } },
                right:  { style: 'thin', color: { argb: 'FF999999' } },
            };
            const align = { vertical: 'middle', horizontal: 'left', wrapText: true, readingOrder: 'ltr' };

            ws.columns = [
                { width: 32 },  // A: Name
                { width: 18 },  // B: Phone
                { width: 22 },  // C: Unit No
                { width: 24 },  // D: Community
                { width: 24 },  // E: Sub-community
                { width: 40 },  // F: Notes (blank)
                { width: 22 },  // G: Responsibility (NEW)
            ];

            // Logo
            try {
                const response = await fetch(logo);
                const blob = await response.blob();
                const base64data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                const imageId = workbook.addImage({ base64: base64data, extension: 'png' });
                ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 250, height: 75 } });
            } catch (err) {
                console.error("Failed to load logo for Excel", err);
            }

            // Title (merge widened from A2:F2 to A2:G2 to cover the new column)
            ws.mergeCells('A2:G2');
            const title = ws.getCell('A2');
            title.value = `Archive Properties Sheet — ${new Date().toLocaleDateString()}`;
            title.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1e3a8a' } };
            title.alignment = { vertical: 'middle', horizontal: 'left', readingOrder: 'ltr' };

            ws.getRow(1).height = 110;
            ws.getRow(2).height = 34;
            ws.getRow(3).height = 28;

            // Header (NEW: 'Responsibility' added at the end)
            const headerRow = ws.addRow(['Name', 'Phone', 'Unit No', 'Community', 'Sub-community', 'Notes', 'Responsibility']);
            headerRow.eachCell((cell) => {
                cell.font = { name: FONT, size: 12, bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F7F5' } };
                cell.alignment = align;
                cell.border = border;
            });

            // Data (ALL matching records, not just the current page)
            allOwners.forEach((owner) => {
                const row = ws.addRow([
                    owner.name || owner.company || '—',
                    owner.phone || '—',
                    owner.unit_no || '—',
                    owner.community || '—',
                    owner.sub_community || '—',
                    '',
                    owner.responsibility_name || 'Unassigned', // NEW: Responsibility value
                ]);
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.font = { name: FONT, size: 12 };
                    cell.alignment = align;
                    cell.border = border;
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Archive_Owners_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.update(toastId, { render: `✅ Excel downloaded! (${allOwners.length} records)`, type: "success", isLoading: false, autoClose: 3000 });
        } catch (err) {
            console.error("Excel error:", err);
            toast.update(toastId, { render: "❌ Failed to generate Excel file", type: "error", isLoading: false, autoClose: 4000 });
        } finally {
            setIsGeneratingExcel(false);
        }
    };

    // ---------- NEW: Export Excel "Followup" ----------
    // Columns: Owner / Phone, Last Contact, Unit / Ref, Property Cat., Location (Area, Comm, Sub),
    //          Description, Offer, Sale Price, Rent Price, Responsibility, Notes (blank)
    const handleExportExcelFollowup = async () => {
        if (totalCount === 0) return toast.error("No records to export.");
        setIsGeneratingFollowup(true);
        const toastId = toast.loading("Preparing Followup Excel...");

        try {
            const allOwners = await fetchAllForExport();
            if (allOwners.length === 0) throw new Error("No records");

            const mod = await import('exceljs');
            const ExcelJS = mod.default || mod;

            const workbook = new ExcelJS.Workbook();
            const ws = workbook.addWorksheet('Followup', {
                // ySplit 4 = logo row + title row + spacer row + header row stay frozen
                views: [{ rightToLeft: false, state: 'frozen', ySplit: 4 }],
            });

            const FONT = 'Tahoma';
            const border = {
                top:    { style: 'thin', color: { argb: 'FF999999' } },
                left:   { style: 'thin', color: { argb: 'FF999999' } },
                bottom: { style: 'thin', color: { argb: 'FF999999' } },
                right:  { style: 'thin', color: { argb: 'FF999999' } },
            };
            const align = { vertical: 'middle', horizontal: 'left', wrapText: true, readingOrder: 'ltr' };

            // 11 columns, in the requested order
            ws.columns = [
                { width: 32 },  // A: Owner / Phone
                { width: 16 },  // B: Last Contact
                { width: 22 },  // C: Unit / Ref
                { width: 16 },  // D: Property Cat.
                { width: 36 },  // E: Location (Area, Comm, Sub)
                { width: 40 },  // F: Description
                { width: 12 },  // G: Offer
                { width: 16 },  // H: Sale Price
                { width: 16 },  // I: Rent Price
                { width: 22 },  // J: Responsibility
                { width: 40 },  // K: Notes (blank, to be filled by the agent)
            ];

            // Logo
            try {
                const response = await fetch(logo);
                const blob = await response.blob();
                const base64data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                const imageId = workbook.addImage({ base64: base64data, extension: 'png' });
                ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 250, height: 75 } });
            } catch (err) {
                console.error("Failed to load logo for Followup Excel", err);
            }

            // Title
            ws.mergeCells('A2:K2');
            const title = ws.getCell('A2');
            title.value = `Archive Properties Followup — ${new Date().toLocaleDateString()}`;
            title.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1e3a8a' } };
            title.alignment = { vertical: 'middle', horizontal: 'left', readingOrder: 'ltr' };

            ws.getRow(1).height = 110;
            ws.getRow(2).height = 34;
            ws.getRow(3).height = 28;

            // Header
            const headerRow = ws.addRow([
                'Owner / Phone',
                'Last Contact',
                'Unit / Ref',
                'Property Cat.',
                'Location (Area, Comm, Sub)',
                'Description',
                'Offer',
                'Sale Price',
                'Rent Price',
                'Responsibility',
                'Notes',
            ]);
            headerRow.eachCell((cell) => {
                cell.font = { name: FONT, size: 12, bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F7F5' } };
                cell.alignment = align;
                cell.border = border;
            });

            // Data (ALL matching records, not just the current page)
            allOwners.forEach((owner) => {
                // Owner name on line 1, phone on line 2 (wrapText is enabled)
                const ownerPhone = `${owner.name || owner.company || '—'}\n${owner.phone || '—'}`;

                // Unit on line 1, reference (if any) on line 2
                const unitRef = owner.refrence_no
                    ? `${owner.unit_no || '—'}\nRef: ${owner.refrence_no}`
                    : (owner.unit_no || '—');

                // Area, Community, Sub-community joined (empty parts skipped)
                const location = [owner.area, owner.community, owner.sub_community]
                    .filter(Boolean)
                    .join(', ') || '—';

                const row = ws.addRow([
                    ownerPhone,
                    owner.last_communication_date || '—',
                    unitRef,
                    owner.property_category || '—',
                    location,
                    owner.description || '—',
                    owner.property_offer || '—',
                    formatPrice(owner.sale_price),
                    formatPrice(owner.rent_price),
                    owner.responsibility_name || 'Unassigned',
                    '', // Notes left blank on purpose
                ]);
                row.eachCell({ includeEmpty: true }, (cell) => {
                    cell.font = { name: FONT, size: 12 };
                    cell.alignment = align;
                    cell.border = border;
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Archive_Owners_Followup_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.update(toastId, { render: `✅ Followup Excel downloaded! (${allOwners.length} records)`, type: "success", isLoading: false, autoClose: 3000 });
        } catch (err) {
            console.error("Followup Excel error:", err);
            toast.update(toastId, { render: "❌ Failed to generate Followup Excel file", type: "error", isLoading: false, autoClose: 4000 });
        } finally {
            setIsGeneratingFollowup(false);
        }
    };

    // ---------- Loading / error screens ----------
    if (initialLoading) {
        return (
            <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-5">
                <div className="w-12 h-12 border-4 border-[#f8f7f5] border-t-[#4285F4] rounded-full animate-spin"></div>
                <p className="text-[#4285F4] text-lg font-extrabold">Loading Archive Owners...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-4 p-5 text-center">
                <span className="text-5xl">⚠️</span>
                <p className="text-red-500 text-lg font-extrabold">{error}</p>
                <button className="bg-[#4285F4] text-white px-8 py-3 rounded-lg font-extrabold transition-colors hover:bg-blue-600" onClick={() => refreshOwners()}>
                    Retry
                </button>
            </div>
        );
    }

    const paginationBar = (
        <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            loading={loading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
        />
    );

    return (
        <div dir="ltr" className="min-h-screen bg-white py-10 px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans relative pb-24">
            <ToastContainer position="top-right" theme="light" />

            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
                <div className="text-center xl:text-left">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center xl:justify-start gap-3">
                        <FaArchive className="text-[#4285F4]" /> Archive Properties Sheet
                    </h2>
                    <div className="flex items-center justify-center xl:justify-start gap-2 mt-2">
                        {canViewAll ? (
                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">Viewing: All</span>
                        ) : (
                            <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
                                <FiLock size={10} /> Viewing: Only My
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
                    <div className="flex bg-[#f8f7f5] p-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <button onClick={() => setViewMode("cards")} className={`p-2 rounded-md transition-all ${viewMode === "cards" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiGrid size={18} /></button>
                        <button onClick={() => setViewMode("table")} className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiList size={18} /></button>
                    </div>

                    {/* PDF button — icon is now RED (text-red-600) */}
                    <button
                        onClick={handleExportPDF}
                        disabled={isGeneratingPdf || totalCount === 0}
                        title="Export all records matching the current filters to PDF"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaFilePdf className="text-red-600" /> {isGeneratingPdf ? "Generating..." : "Export PDF"}
                    </button>

                    {/* Original Excel button — label changed to "Export Excel New Data", icon is now GREEN */}
                    <button
                        onClick={handleExportExcel}
                        disabled={isGeneratingExcel || totalCount === 0}
                        title="Export all records matching the current filters to Excel (new data format)"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaFileExcel className="text-green-600" /> {isGeneratingExcel ? "Generating..." : "Export Excel New Data"}
                    </button>

                    {/* NEW button: Export Excel Followup (green icon, same style as the other Excel button) */}
                    <button
                        onClick={handleExportExcelFollowup}
                        disabled={isGeneratingFollowup || totalCount === 0}
                        title="Export all records matching the current filters to Excel (followup format)"
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaFileExcel className="text-green-600" /> {isGeneratingFollowup ? "Generating..." : "Export Excel Followup"}
                    </button>

                    <button className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#1e3a8a] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={() => { if (!canCreate) return toast.error("No permission."); setShowBulkImportModal(true); }}>
                        <FiUploadCloud size={18} /> Import
                    </button>
                    <button className={`flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#a47d52] text-white hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={handleOpenCreate}>
                        <FaPlus /> Add Owner
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
                            placeholder="Search name, phone, unit, reference..."
                            value={searchTerm}
                            onChange={(e) => withReset(setSearchTerm)(e.target.value)}
                            className={INPUT_CLASS}
                        />
                    </div>
                    <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Area"
                            value={searchArea}
                            onChange={(e) => withReset(setSearchArea)(e.target.value)}
                            className={INPUT_CLASS}
                        />
                    </div>
                    <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Community"
                            value={searchCommunity}
                            onChange={(e) => withReset(setSearchCommunity)(e.target.value)}
                            className={INPUT_CLASS}
                        />
                    </div>
                    <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Sub-community"
                            value={searchSubCommunity}
                            onChange={(e) => withReset(setSearchSubCommunity)(e.target.value)}
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
                                onChange={(e) => withReset(setSearchResponsibility)(e.target.value)}
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
                            onChange={(e) => withReset(setSearchDate)(e.target.value)}
                            title="Last communication date"
                            className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
                        />
                    </div>

                    <select value={searchCategory} onChange={(e) => withReset(setSearchCategory)(e.target.value)} className={SELECT_CLASS}>
                        <option value="">Category (All)</option>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                    </select>
                    <select value={searchOffer} onChange={(e) => withReset(setSearchOffer)(e.target.value)} className={SELECT_CLASS}>
                        <option value="">Offer (All)</option>
                        <option value="sale">Sale</option>
                        <option value="rent">Rent</option>
                    </select>

                    <button
                        onClick={clearFilters}
                        disabled={activeFilterCount === 0}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Clear all filters"
                    >
                        <FiX /> Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                    </button>

                    <span className="ml-auto flex items-center gap-2 text-xs font-bold text-gray-500">
                        {loading && <span className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin"></span>}
                        {totalCount} {totalCount === 1 ? "record" : "records"}
                    </span>
                </div>
            </div>

            <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

            {/* EMPTY STATE */}
            {owners.length === 0 ? (
                <div className="flex flex-col justify-center items-center gap-4 p-10 text-center bg-[#f8f7f5] rounded-2xl border border-gray-100 max-w-3xl mx-auto shadow-sm">
                    <span className="text-6xl">🗂️</span>
                    <h3 className="text-2xl font-extrabold text-gray-800">No Archive Owners Found</h3>
                    <p className="text-gray-500">Try adjusting your search filters or import a new list.</p>
                </div>
            ) : viewMode === "cards" ? (

                /* ========== CARD VIEW ========== */
                <div className={`max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
                    <div className="mb-4 flex flex-wrap items-center gap-4 bg-gray-50 w-fit px-4 py-2 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={allPageSelected} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
                            <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next</span>
                        </div>
                        <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={200}>200</option>
                            <option value="All">All ({owners.length})</option>
                        </select>
                        <span className="text-sm font-bold text-[#4285F4]">({selectedIds.length} Selected)</span>
                        {/* NEW: select every record matching the filters, across all pages */}
                        {selectedIds.length < totalCount && (
                            <button onClick={handleSelectAllFiltered} disabled={isSelectingAll} className="text-xs font-bold text-white bg-[#4285F4] hover:bg-blue-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50">
                                {isSelectingAll ? "Selecting..." : `Select all ${totalCount} filtered`}
                            </button>
                        )}
                        {selectedIds.length > 0 && (
                            <button onClick={() => setSelectedIds([])} className="text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors">Clear selection</button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {owners.map((owner) => (
                            <div key={owner.id} className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border relative group ${selectedIds.includes(owner.id) ? 'border-[#4285F4] ring-1 ring-[#4285F4]' : 'border-gray-100'}`}>
                                <div className="absolute top-4 left-4 z-20">
                                    <input type="checkbox" checked={selectedIds.includes(owner.id)} onChange={() => toggleSelectRow(owner.id)} className="w-5 h-5 text-[#4285F4] rounded border-gray-300 focus:ring-[#4285F4] cursor-pointer shadow-sm bg-white" />
                                </div>
                                <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenEdit(owner)} className={`p-2 rounded-full shadow transition-colors ${canUpdate ? "bg-white/90 text-gray-600 hover:bg-[#4285F4] hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
                                    <button onClick={() => confirmDelete(owner)} className={`p-2 rounded-full shadow transition-colors ${canDelete ? "bg-white/90 text-red-500 hover:bg-red-500 hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
                                </div>
                                <div className="p-6 pt-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="relative">
                                            <div className="w-14 h-14 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 group-hover:bg-[#4285F4]/10 transition-colors"><FiUser className="text-[#4285F4]" size={28} /></div>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-1 truncate hover:text-[#4285F4] cursor-pointer transition-colors" title={owner.name || 'Unnamed Owner'} onClick={() => handleOpenDetails(owner)}>{owner.name || 'Unnamed Owner'}</h3>
                                    {owner.company && <p className="text-sm font-medium text-gray-500 mb-2 truncate">{owner.company}</p>}

                                    <div className="mb-4 flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                            <FaUserShield className="text-gray-400" /> {owner.responsibility_name || 'Unassigned'}
                                        </span>
                                        {owner.unit_no && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                                                <FiHome className="text-gray-400" /> {owner.unit_no}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3 mt-auto pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiPhone className="text-[#4285F4]" size={12} /></div>
                                            <span className="truncate font-medium">{owner.phone || 'No phone'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiDollarSign className="text-[#4285F4]" size={12} /></div>
                                            <span className="truncate font-medium">Sale: {formatPrice(owner.sale_price)} | Rent: {formatPrice(owner.rent_price)}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600">
                                            <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiCalendar className="text-[#4285F4]" size={12} /></div>
                                            <span className="truncate font-medium">{owner.last_communication_date || 'No date'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleOpenDetails(owner)} className="mt-6 w-full flex items-center justify-center gap-2 bg-[#f8f7f5] text-[#4285F4] py-2.5 rounded-lg font-bold text-sm transition-all duration-300 hover:bg-[#4285F4] hover:text-white"><MdVisibility size={16} /> View Details</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 rounded-xl border border-gray-100 overflow-hidden">
                        {paginationBar}
                    </div>
                </div>
            ) : (

                /* ========== TABLE VIEW (Default) ========== */
                <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={allPageSelected} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" title="Select Next Chunk" />
                            <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next Chunk</span>
                        </div>
                        <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
                            <option value={50}>50 Records</option>
                            <option value={100}>100 Records</option>
                            <option value={200}>200 Records</option>
                            <option value="All">All on page ({owners.length})</option>
                        </select>
                        {selectedIds.length > 0 && <span className="text-sm font-bold text-[#4285F4] bg-blue-50 px-2 py-1 rounded">{selectedIds.length} Selected</span>}
                        {/* NEW: select every record matching the filters, across all pages */}
                        {selectedIds.length < totalCount && (
                            <button onClick={handleSelectAllFiltered} disabled={isSelectingAll} className="text-xs font-bold text-white bg-[#4285F4] hover:bg-blue-600 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50">
                                {isSelectingAll ? "Selecting..." : `Select all ${totalCount} filtered`}
                            </button>
                        )}
                        {selectedIds.length > 0 && (
                            <button onClick={() => setSelectedIds([])} className="text-xs font-bold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors">Clear selection</button>
                        )}
                    </div>

                    <div className="relative">
                        {/* LEFT ARROW */}
                        <div className="absolute inset-y-0 left-0 w-14 z-20 pointer-events-none">
                            {canScrollLeft && (
                                <button
                                    type="button"
                                    onClick={() => scrollTableBy(-1)}
                                    title="Scroll left"
                                    className="pointer-events-auto sticky top-[45vh] ml-2 flex items-center justify-center w-11 h-11 rounded-full bg-gray-500/70 hover:bg-gray-600/80 shadow-lg backdrop-blur-sm transition-all"
                                >
                                    <FiChevronLeft size={26} color="#f8f7f5" />
                                </button>
                            )}
                        </div>

                        {/* RIGHT ARROW */}
                        <div className="absolute inset-y-0 right-0 w-14 z-20 pointer-events-none">
                            {canScrollRight && (
                                <button
                                    type="button"
                                    onClick={() => scrollTableBy(1)}
                                    title="Scroll right"
                                    className="pointer-events-auto sticky top-[45vh] ml-auto mr-2 flex items-center justify-center w-11 h-11 rounded-full bg-gray-500/70 hover:bg-gray-600/80 shadow-lg backdrop-blur-sm transition-all"
                                >
                                    <FiChevronRight size={26} color="#f8f7f5" />
                                </button>
                            )}
                        </div>

                        <div ref={tableScrollRef} onScroll={updateScrollButtons} className="overflow-x-auto custom-scrollbar pb-2">
                            <table className="w-full text-left border-collapse min-w-max">
                                <thead className="bg-[#f8f7f5] border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-4 w-12 text-center">
                                            <input type="checkbox" checked={allPageSelected} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
                                        </th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Owner / Phone</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit No</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plot / Land</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property Cat.</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Municipality</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mun. No</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Offer</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sale Price</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rent Price</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Responsibility</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {owners.map((owner) => (
                                        <tr key={owner.id} className={`transition-colors ${selectedIds.includes(owner.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                            <td className="px-4 py-4 text-center">
                                                <input type="checkbox" checked={selectedIds.includes(owner.id)} onChange={() => toggleSelectRow(owner.id)} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 shrink-0">
                                                        <FiUser className="text-[#4285F4]" size={18} />
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className="font-bold text-gray-800">{owner.name || 'Unnamed Owner'}</p>
                                                        {owner.company && <p className="text-xs text-gray-500">{owner.company}</p>}
                                                        <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                                            <FiPhone size={10} className="text-gray-400" />
                                                            {owner.phone || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 text-sm text-gray-600">
                                                    {owner.unit_no && <span className="flex items-center gap-2 font-semibold"><FiHome size={12} className="text-gray-400" /> {owner.unit_no}</span>}
                                                    {owner.refrence_no && <span className="flex items-center gap-2 text-xs text-gray-400">Ref: {owner.refrence_no}</span>}
                                                    {!owner.unit_no && !owner.refrence_no && <span>—</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 text-sm text-gray-600">
                                                    {owner.plot_no && <span className="font-semibold">Plot: {owner.plot_no}</span>}
                                                    {owner.land_no && <span className="text-xs text-gray-500">Land: {owner.land_no}</span>}
                                                    {!owner.plot_no && !owner.land_no && <span>—</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={owner.description}>
                                                {owner.description || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 capitalize">{owner.property_category || '—'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 text-sm text-gray-600">
                                                    <span className="font-bold">{owner.municipality || '—'}</span>
                                                    {(owner.zone || owner.area) && (
                                                        <span className="text-xs text-gray-500">
                                                            {[owner.zone, owner.area].filter(Boolean).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
                                                {owner.municipality_no || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 capitalize">{owner.property_offer || '—'}</td>
                                            <td className="px-6 py-4 font-bold text-emerald-600 text-sm">{formatPrice(owner.sale_price)}</td>
                                            <td className="px-6 py-4 font-bold text-blue-600 text-sm">{formatPrice(owner.rent_price)}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md"><FaUserShield className="text-gray-400" /> {owner.responsibility_name || 'Unassigned'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => handleOpenDetails(owner)} className="p-2 text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10 rounded-lg transition-colors"><MdVisibility size={18} /></button>
                                                    <button onClick={() => handleOpenEdit(owner)} className={`p-2 rounded-lg transition-colors ${canUpdate ? "text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10" : "text-gray-300 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
                                                    <button onClick={() => confirmDelete(owner)} className={`p-2 rounded-lg transition-colors ${canDelete ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-300 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {paginationBar}
                </div>
            )}

            {/* FLOATING BULK ACTIONS BAR */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1e3a8a] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-slideUp">
                    <div className="flex items-center gap-2 border-r border-white/20 pr-6">
                        <FiCheckSquare size={20} className="text-blue-300" />
                        <span className="font-bold whitespace-nowrap">{selectedIds.length} Selected</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setShowAssignModal(true); fetchUsers(); }} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold text-sm transition-colors"><FaUserEdit size={16} /> Assign Responsibility</button>
                        <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkActionLoading} className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
                            {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaTrash size={16} />} Delete Selected
                        </button>
                    </div>
                    <button onClick={() => setSelectedIds([])} className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"><MdClose size={20} /></button>
                </div>
            )}

            {/* MODALS */}
            {showAddEditModal && <AddEditLandLord landlord={selectedOwner} onClose={handleCloseModals} onSuccess={() => { handleCloseModals(); refreshOwners(); }} />}
            {showDetailsModal && selectedOwner && <LandLoardDetails landlord={selectedOwner} onClose={handleCloseModals} />}
            {showBulkImportModal && <AddOwnersArchive onClose={handleCloseModals} onSuccess={() => { refreshOwners(); }} />}

            {/* BULK ASSIGN MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white">
                            <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2"><FaUserShield className="text-[#4285F4]" /> Assign Responsibility</h3>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-red-500"><MdClose size={20} /></button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-4">Assign responsibility for <strong>{selectedIds.length}</strong> selected records to:</p>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Select Listing Agent</label>
                            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]" disabled={loadingUsers}>
                                <option value="">-- Select User --</option>
                                <option value={UNASSIGN_VALUE}>Unassigned (remove responsibility)</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.username} {u.last_name || ''} ({u.role === 'listing' ? 'Listing' : 'Listing Sales Rent'})</option>)}
                            </select>
                            {loadingUsers && <p className="text-xs text-blue-500 mt-2">Loading agents...</p>}
                            {!loadingUsers && users.length === 0 && <p className="text-xs text-red-500 mt-2">No eligible users found.</p>}
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowAssignModal(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-white transition-colors">Cancel</button>
                            <button onClick={handleBulkAssign} disabled={!selectedUser || bulkActionLoading} className="px-6 py-2.5 rounded-lg bg-[#4285F4] text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                                {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null} Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK DELETE CONFIRMATION MODAL */}
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

            {/* STANDARD DELETE CONFIRMATION MODAL */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
                        <div className="flex justify-center pt-6 pb-4"><div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100"><FiAlertTriangle className="text-red-500" size={32} /></div></div>
                        <div className="px-6 pb-6">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Delete</h3>
                            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.name || deleteConfirm.company}"</span>? This action cannot be undone.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteConfirm(null)} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                                <button onClick={handleDeleteOwner} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
                                    {deletingId === deleteConfirm.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MdDeleteForever size={18} />} Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HIDDEN PDF TEMPLATE — mounted only while exporting */}
            {exportOwners && <PdfExportTemplate ref={pdfRef} owners={exportOwners} />}
        </div>
    );
};

export default OwnersArchive;



// import React, { useState, useEffect, useRef } from 'react';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import { MdDeleteForever, MdModeEdit, MdVisibility, MdClose } from 'react-icons/md';
// import { FiUser, FiPhone, FiLock, FiGrid, FiList, FiAlertTriangle, FiUploadCloud, FiCheckSquare, FiCalendar, FiHome, FiDollarSign, FiSearch, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
// import { FaArchive, FaPlus, FaUserShield, FaTrash, FaUserEdit, FaMapMarkerAlt, FaFilePdf, FaFileExcel } from 'react-icons/fa';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';

// import AddEditLandLord from "../../components/en/listing/AddEditLandLoard";
// import LandLoardDetails from "../../components/en/listing/LandLordDetails";
// import AddOwnersArchive from "../../components/en/listing/AddOwnersArchive";
// import { usePermissions } from "../context/PermissionsContext";

// import logo from '../../assets/images/logogo-removebg-old.png';

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// // ---------- Helpers ----------
// const formatPrice = (value) => {
//     if (!value || Number(value) === 0) return '—';
//     return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
// };

// const userLabel = (u) => `${u.first_name || u.username || 'User'} ${u.last_name || ''}`.trim();

// const UNASSIGN_VALUE = "unassigned";

// const INPUT_CLASS = "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]";
// const SELECT_CLASS = "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4285F4]";

// // Pagination
// const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
// const DEFAULT_PAGE_SIZE = 50;
// const EXPORT_PAGE_SIZE = 500; // must be <= max_page_size on the backend

// const getPageNumbers = (current, total) => {
//     const pages = [];
//     const delta = 2;
//     for (let i = 1; i <= total; i++) {
//         if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
//             pages.push(i);
//         } else if (pages[pages.length - 1] !== '...') {
//             pages.push('...');
//         }
//     }
//     return pages;
// };

// // ---------- Pagination bar ----------
// const Pagination = ({ page, pageSize, totalCount, loading, onPageChange, onPageSizeChange }) => {
//     const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
//     const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
//     const to = Math.min(page * pageSize, totalCount);

//     const btn = "min-w-[36px] px-3 py-1.5 text-sm font-bold border rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

//     return (
//         <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50">
//             <div className="flex items-center gap-3 text-sm text-gray-600">
//                 <span className="font-bold">{from}–{to} of {totalCount}</span>
//                 <select
//                     value={pageSize}
//                     onChange={(e) => onPageSizeChange(Number(e.target.value))}
//                     className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none"
//                     disabled={loading}
//                 >
//                     {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
//                 </select>
//             </div>

//             <div className="flex items-center gap-1.5 flex-wrap justify-center">
//                 <button className={`${btn} bg-white border-gray-300 text-gray-700 hover:bg-gray-100`} disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)} title="Previous page">
//                     <FiChevronLeft />
//                 </button>

//                 {getPageNumbers(page, totalPages).map((p, idx) =>
//                     p === '...' ? (
//                         <span key={`dots-${idx}`} className="px-2 text-gray-400">…</span>
//                     ) : (
//                         <button
//                             key={p}
//                             disabled={loading}
//                             onClick={() => onPageChange(p)}
//                             className={`${btn} ${p === page ? "bg-[#4285F4] border-[#4285F4] text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"}`}
//                         >
//                             {p}
//                         </button>
//                     )
//                 )}

//                 <button className={`${btn} bg-white border-gray-300 text-gray-700 hover:bg-gray-100`} disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)} title="Next page">
//                     <FiChevronRight />
//                 </button>
//             </div>
//         </div>
//     );
// };

// // ---------- PDF export helpers ----------
// const PDF_PAGE_W = 1123;
// const PDF_PAGE_H = Math.round((PDF_PAGE_W * 210) / 297);
// const PDF_PAD = 30;

// const PDF_FONT = '"Segoe UI", Tahoma, "Noto Sans Arabic", "Arial Unicode MS", Arial, sans-serif';

// // Only mounted while exporting (see exportOwners state below)
// const PdfExportTemplate = React.forwardRef(({ owners }, ref) => {
//     const th = {
//         padding: "10px 8px",
//         border: "1px solid #d1d5db",
//         fontSize: "13px",
//         fontWeight: "bold",
//         textAlign: "left",
//         letterSpacing: "normal",
//     };

//     const td = {
//         padding: "8px",
//         border: "1px solid #e5e7eb",
//         fontSize: "14px",
//         lineHeight: 1.5,
//         verticalAlign: "top",
//         letterSpacing: "normal",
//         wordBreak: "break-word",
//         unicodeBidi: "plaintext",
//     };

//     const small = { fontSize: "12px", color: "#6b7280" };

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
//                 letterSpacing: "normal",
//                 position: "fixed",
//                 left: "-9999px",
//                 top: 0,
//                 zIndex: -1,
//             }}
//         >
//             <div data-pdf-header style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #a47d52", paddingBottom: "16px", marginBottom: "20px" }}>
//                 <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "60px", objectFit: "contain" }} />
//                 <div style={{ marginLeft: "20px" }}>
//                     <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>Archive Properties Sheet</h1>
//                     <p style={{ fontSize: "14px", color: "#6b7280", margin: "5px 0 0 0" }}>
//                         Generated: {new Date().toLocaleString()} — <span data-pdf-count>{owners.length} records</span>
//                     </p>
//                 </div>
//             </div>

//             <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
//                 <colgroup>
//                     <col style={{ width: "14%" }} />
//                     <col style={{ width: "10%" }} />
//                     <col style={{ width: "10%" }} />
//                     <col style={{ width: "16%" }} />
//                     <col style={{ width: "8%" }} />
//                     <col style={{ width: "10%" }} />
//                     <col style={{ width: "8%" }} />
//                     <col style={{ width: "8%" }} />
//                     <col style={{ width: "8%" }} />
//                     <col style={{ width: "8%" }} />
//                 </colgroup>
//                 <thead>
//                     <tr style={{ backgroundColor: "#f8f7f5", color: "#374151" }}>
//                         <th style={th}>Owner / Phone</th>
//                         <th style={th}>Unit No</th>
//                         <th style={th}>Plot / Land</th>
//                         <th style={th}>Description</th>
//                         <th style={th}>Property Cat.</th>
//                         <th style={th}>Municipality</th>
//                         <th style={th}>Mun. No</th>
//                         <th style={th}>Offer</th>
//                         <th style={th}>Sale</th>
//                         <th style={th}>Rent</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     {owners.map((owner) => (
//                         <tr key={owner.id}>
//                             <td style={td}>
//                                 <div dir="auto" style={{ fontWeight: "bold" }}>{owner.name || 'Unnamed'}</div>
//                                 {owner.company && <div dir="auto" style={small}>{owner.company}</div>}
//                                 <div style={{ fontSize: "12px", color: "#4b5563" }}>{owner.phone || '—'}</div>
//                                 <div style={{ fontSize: "11px", color: "#4285F4", fontWeight: "bold" }}>{owner.responsibility_name || 'Unassigned'}</div>
//                             </td>
//                             <td style={td}>
//                                 <div style={{ fontWeight: "bold" }}>{owner.unit_no || '—'}</div>
//                                 {owner.refrence_no && <div style={small}>Ref: {owner.refrence_no}</div>}
//                             </td>
//                             <td style={td}>
//                                 <div style={{ fontWeight: "bold" }}>Plot: {owner.plot_no || '—'}</div>
//                                 <div style={small}>Land: {owner.land_no || '—'}</div>
//                             </td>
//                             <td dir="auto" style={{ ...td, whiteSpace: "pre-wrap" }}>{owner.description || '—'}</td>
//                             <td style={{ ...td, textTransform: "capitalize" }}>{owner.property_category || '—'}</td>
//                             <td style={td}>
//                                 <div dir="auto">{owner.municipality || '—'}</div>
//                                 {owner.zone && <div dir="auto" style={small}>Zone: {owner.zone}</div>}
//                             </td>
//                             <td style={td}>{owner.municipality_no || '—'}</td>
//                             <td style={{ ...td, textTransform: "capitalize" }}>{owner.property_offer || '—'}</td>
//                             <td style={{ ...td, fontWeight: "bold", color: "#059669" }}>{formatPrice(owner.sale_price)}</td>
//                             <td style={{ ...td, fontWeight: "bold", color: "#2563eb" }}>{formatPrice(owner.rent_price)}</td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//     );
// });

// // ======================================================================
// const OwnersArchive = () => {
//     const { permissions } = usePermissions();

//     // ---------- Data state ----------
//     const [owners, setOwners] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [initialLoading, setInitialLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [viewMode, setViewMode] = useState("table");

//     // ---------- Pagination state ----------
//     const [page, setPage] = useState(1);
//     const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
//     const [totalCount, setTotalCount] = useState(0);

//     // ---------- Table horizontal scroll arrows ----------
//     const tableScrollRef = useRef(null);
//     const [canScrollLeft, setCanScrollLeft] = useState(false);
//     const [canScrollRight, setCanScrollRight] = useState(false);

//     const updateScrollButtons = () => {
//         const el = tableScrollRef.current;
//         if (!el) return;
//         setCanScrollLeft(el.scrollLeft > 2);
//         setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
//     };

//     const scrollTableBy = (direction) => {
//         tableScrollRef.current?.scrollBy({ left: direction * 500, behavior: 'smooth' });
//     };

//     useEffect(() => {
//         updateScrollButtons();
//         window.addEventListener('resize', updateScrollButtons);
//         return () => window.removeEventListener('resize', updateScrollButtons);
//     }, [owners, viewMode, loading, initialLoading]);

//     // ---------- Modal state ----------
//     const [showAddEditModal, setShowAddEditModal] = useState(false);
//     const [showDetailsModal, setShowDetailsModal] = useState(false);
//     const [showBulkImportModal, setShowBulkImportModal] = useState(false);
//     const [selectedOwner, setSelectedOwner] = useState(null);
//     const [deletingId, setDeletingId] = useState(null);
//     const [deleteConfirm, setDeleteConfirm] = useState(null);
//     const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

//     // ---------- Bulk actions ----------
//     const [selectedIds, setSelectedIds] = useState([]);
//     const [showAssignModal, setShowAssignModal] = useState(false);
//     const [users, setUsers] = useState([]);
//     const [loadingUsers, setLoadingUsers] = useState(false);
//     const [selectedUser, setSelectedUser] = useState("");
//     const [bulkActionLoading, setBulkActionLoading] = useState(false);
//     const [chunkSize, setChunkSize] = useState(100);

//     // ---------- Filters ----------
//     const [searchTerm, setSearchTerm] = useState("");
//     const [searchArea, setSearchArea] = useState("");
//     const [searchCommunity, setSearchCommunity] = useState("");
//     const [searchSubCommunity, setSearchSubCommunity] = useState("");
//     const [searchResponsibility, setSearchResponsibility] = useState("");
//     const [searchDate, setSearchDate] = useState("");
//     const [searchCategory, setSearchCategory] = useState("");
//     const [searchOffer, setSearchOffer] = useState("");

//     // Any filter change goes back to page 1
//     const withReset = (setter) => (value) => {
//         setter(value);
//         setPage(1);
//     };

//     // ---------- Export state ----------
//     const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
//     const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
//     // NEW: loading state for the new "Export Excel Followup" button
//     const [isGeneratingFollowup, setIsGeneratingFollowup] = useState(false);
//     const [exportOwners, setExportOwners] = useState(null); // PDF template is mounted only while this is set
//     const pdfRef = useRef(null);

//     // ---------- Request tracking ----------
//     const requestId = useRef(0);
//     const controllerRef = useRef(null);

//     // ---------- Permissions ----------
//     const canViewAll = permissions?.view_all_archive_owners === true;
//     const canCreate = permissions?.create_bulk_archive_owners === true;
//     const canUpdate = permissions?.update_bulk_responsibility_archive_owners === true;
//     const canDelete = permissions?.delete_bulk_archive_owners === true;

//     const activeFilterCount = [
//         searchTerm, searchArea, searchCommunity, searchSubCommunity,
//         searchResponsibility, searchDate, searchCategory, searchOffer,
//     ].filter(Boolean).length;

//     // Builds filters (+ pagination unless overridden)
//     const buildParams = (p = page, size = pageSize) => {
//         const params = new URLSearchParams();
//         if (searchTerm.trim()) params.append('search', searchTerm.trim());
//         if (searchArea.trim()) params.append('area', searchArea.trim());
//         if (searchCommunity.trim()) params.append('community', searchCommunity.trim());
//         if (searchSubCommunity.trim()) params.append('sub_community', searchSubCommunity.trim());
//         if (searchResponsibility) params.append('responsibility', searchResponsibility);
//         if (searchDate) params.append('last_communication_date', searchDate);
//         if (searchCategory) params.append('property_category', searchCategory);
//         if (searchOffer) params.append('property_offer', searchOffer);
//         params.append('page', p);
//         params.append('page_size', size);
//         return params;
//     };

//     const buildQueryString = () => `?${buildParams().toString()}`;

//     // ---------- Fetch current page ----------
//     const fetchOwners = async (queryString = "") => {
//         controllerRef.current?.abort(); // cancel the previous in-flight request
//         const controller = new AbortController();
//         controllerRef.current = controller;

//         const myRequest = ++requestId.current;
//         setLoading(true);
//         setError(null);
//         try {
//             const token = localStorage.getItem('access_token');
//             if (!token) {
//                 toast.error('Please login to view Archive Owners');
//                 setLoading(false);
//                 window.location.href = '/login';
//                 return;
//             }

//             const response = await fetch(`${BASE}/api/archive-owners/${queryString}`, {
//                 method: "GET",
//                 signal: controller.signal,
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 }
//             });

//             if (!response.ok) {
//                 if (response.status === 401) {
//                     toast.error('Session expired. Please login again.');
//                     localStorage.removeItem('access_token');
//                     window.location.href = '/login';
//                 } else if (response.status === 404) {
//                     // Requested page no longer exists (e.g. after deletes) -> go to last valid page
//                     setPage((p) => Math.max(1, p - 1));
//                     return;
//                 } else {
//                     toast.error('Failed to load Archive Owners');
//                 }
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const data = await response.json();
//             if (myRequest !== requestId.current) return;

//             if (Array.isArray(data)) {
//                 setOwners(data);
//                 setTotalCount(data.length);
//             } else {
//                 setOwners(Array.isArray(data.results) ? data.results : []);
//                 setTotalCount(data.count ?? 0);
//             }
//             setSelectedIds([]);
//         } catch (err) {
//             if (err.name === 'AbortError') return;
//             if (myRequest !== requestId.current) return;
//             setError('Failed to load Archive Owners');
//             console.error('Error fetching archive owners:', err);
//         } finally {
//             if (myRequest === requestId.current) {
//                 setLoading(false);
//                 setInitialLoading(false);
//             }
//         }
//     };

//     const refreshOwners = () => fetchOwners(buildQueryString());

//     // Debounced fetch on any filter / page / page-size change
//     useEffect(() => {
//         const timeout = setTimeout(() => {
//             fetchOwners(buildQueryString());
//         }, 400);
//         return () => clearTimeout(timeout);
//     }, [page, pageSize, searchTerm, searchArea, searchCommunity, searchSubCommunity, searchResponsibility, searchDate, searchCategory, searchOffer]);

//     // Abort any pending request on unmount
//     useEffect(() => () => controllerRef.current?.abort(), []);

//     const handlePageChange = (newPage) => {
//         setPage(newPage);
//         window.scrollTo({ top: 0, behavior: 'smooth' });
//     };

//     const handlePageSizeChange = (size) => {
//         setPageSize(size);
//         setPage(1);
//     };

//     // After a delete: if the whole page was removed, step back one page
//     const refreshAfterRemoval = (removedCount) => {
//         if (removedCount >= owners.length && page > 1) {
//             setPage((p) => p - 1); // effect refetches
//         } else {
//             refreshOwners();
//         }
//     };

//     // ---------- Users ----------
//     const fetchUsers = async () => {
//         if (users.length > 0 || loadingUsers) return;
//         setLoadingUsers(true);
//         try {
//             const token = localStorage.getItem('access_token');
//             const response = await fetch(`${BASE}/api/users/`, {
//                 headers: { "Authorization": `Bearer ${token}` }
//             });
//             if (response.ok) {
//                 const data = await response.json();
//                 const userList = Array.isArray(data) ? data : (data.results || data.users || []);
//                 setUsers(userList.filter(u => u.role === 'listing' || u.role === 'listing_sales_rent'));
//             }
//         } catch (err) {
//             console.error("Failed to load users", err);
//         } finally {
//             setLoadingUsers(false);
//         }
//     };

//     useEffect(() => {
//         if (canViewAll) fetchUsers();
//     }, [canViewAll]);

//     // ---------- Selection (current page only) ----------
//     const handleSmartSelectAll = () => {
//         const totalVisibleRecords = owners.length;
//         if (selectedIds.length === totalVisibleRecords && totalVisibleRecords > 0) {
//             setSelectedIds([]);
//             return;
//         }
//         if (chunkSize === "All") {
//             setSelectedIds(owners.map(o => o.id));
//             return;
//         }
//         const nextChunk = owners
//             .filter(o => !selectedIds.includes(o.id))
//             .slice(0, chunkSize)
//             .map(o => o.id);

//         if (nextChunk.length === 0) {
//             toast.info("All records on this page are already selected.");
//             return;
//         }
//         setSelectedIds(prev => [...prev, ...nextChunk]);
//     };

//     const toggleSelectRow = (id) => {
//         setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
//     };

//     // ---------- Bulk delete / assign ----------
//     const handleBulkDelete = async () => {
//         setBulkActionLoading(true);
//         try {
//             const token = localStorage.getItem('access_token');
//             const response = await fetch(`${BASE}/api/archive-owners/bulk-delete/`, {
//                 method: 'DELETE',
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ ids: selectedIds })
//             });

//             if (!response.ok) throw new Error("Failed to bulk delete");

//             const removed = selectedIds.length;
//             toast.success(`✅ Successfully deleted ${removed} records.`);
//             setBulkDeleteConfirm(false);
//             setSelectedIds([]);
//             refreshAfterRemoval(removed);
//         } catch (err) {
//             console.error(err);
//             toast.error("❌ Error deleting records.");
//         } finally {
//             setBulkActionLoading(false);
//         }
//     };

//     const handleBulkAssign = async () => {
//         if (!selectedUser) return toast.error("Please select a user to assign.");
//         const isUnassign = selectedUser === UNASSIGN_VALUE;

//         setBulkActionLoading(true);
//         try {
//             const token = localStorage.getItem('access_token');
//             const response = await fetch(`${BASE}/api/archive-owners/bulk-assign/`, {
//                 method: 'PATCH',
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     ids: selectedIds,
//                     responsibility_id: isUnassign ? null : selectedUser
//                 })
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || "Failed to bulk assign");
//             }

//             const assignedUserObj = isUnassign ? null : users.find(u => u.id.toString() === selectedUser.toString());
//             const assignedName = isUnassign ? "Unassigned" : (assignedUserObj ? userLabel(assignedUserObj) : "Assigned User");

//             setOwners(prevOwners =>
//                 prevOwners.map(owner =>
//                     selectedIds.includes(owner.id)
//                         ? { ...owner, responsibility: isUnassign ? null : selectedUser, responsibility_name: isUnassign ? null : assignedName }
//                         : owner
//                 )
//             );

//             toast.success(
//                 isUnassign
//                     ? `✅ Responsibility removed from ${selectedIds.length} records.`
//                     : `✅ Successfully assigned responsibility for ${selectedIds.length} records.`
//             );
//             setSelectedIds([]);
//             setShowAssignModal(false);
//             setSelectedUser("");
//             refreshOwners();
//         } catch (err) {
//             toast.error(`❌ ${err.message}`);
//         } finally {
//             setBulkActionLoading(false);
//         }
//     };

//     // ---------- Single delete ----------
//     const confirmDelete = (owner) => {
//         if (!canDelete) return toast.error("You don't have permission to delete archive owners.");
//         setDeleteConfirm(owner);
//     };

//     const handleDeleteOwner = async () => {
//         if (!deleteConfirm) return;
//         const id = deleteConfirm.id;
//         setDeletingId(id);
//         try {
//             const token = localStorage.getItem('access_token');
//             const response = await fetch(`${BASE}/api/archive-owners/${id}/delete/`, {
//                 method: "DELETE",
//                 headers: { "Authorization": `Bearer ${token}` }
//             });

//             if (!response.ok) {
//                 toast.error('Failed to delete Archive Owner');
//                 return;
//             }

//             toast.success(`✅ Archive Owner deleted successfully!`);
//             setDeleteConfirm(null);
//             refreshAfterRemoval(1);
//         } catch (err) {
//             toast.error('Server connection error');
//         } finally {
//             setDeletingId(null);
//         }
//     };

//     // ---------- Modal handlers ----------
//     const handleOpenCreate = () => {
//         if (!canCreate) return toast.error("You don't have permission to create archive owners.");
//         setSelectedOwner(null);
//         setShowAddEditModal(true);
//     };

//     const handleOpenEdit = (owner) => {
//         if (!canUpdate) return toast.error("You don't have permission to edit archive owners.");
//         setSelectedOwner(owner);
//         setShowAddEditModal(true);
//     };

//     const handleOpenDetails = (owner) => {
//         setSelectedOwner(owner);
//         setShowDetailsModal(true);
//     };

//     const handleCloseModals = () => {
//         setShowAddEditModal(false);
//         setShowDetailsModal(false);
//         setShowBulkImportModal(false);
//         setShowAssignModal(false);
//         setSelectedOwner(null);
//         setDeleteConfirm(null);
//     };

//     const clearFilters = () => {
//         setSearchTerm("");
//         setSearchArea("");
//         setSearchCommunity("");
//         setSearchSubCommunity("");
//         setSearchResponsibility("");
//         setSearchDate("");
//         setSearchCategory("");
//         setSearchOffer("");
//         setPage(1);
//     };

//     // ---------- Export: fetch ALL records matching the current filters ----------
//     const fetchAllForExport = async () => {
//         const token = localStorage.getItem('access_token');
//         let pageNo = 1;
//         let all = [];
//         while (true) {
//             const params = buildParams(pageNo, EXPORT_PAGE_SIZE);
//             const res = await fetch(`${BASE}/api/archive-owners/?${params.toString()}`, {
//                 headers: { "Authorization": `Bearer ${token}` }
//             });
//             if (!res.ok) throw new Error('Failed to fetch records for export');
//             const data = await res.json();
//             if (Array.isArray(data)) return data; // backend not paginated
//             all = all.concat(data.results || []);
//             if (!data.next) break;
//             pageNo++;
//         }
//         return all;
//     };

//     const handleExportPDF = async () => {
//         if (totalCount === 0) return toast.error("No records to export.");
//         setIsGeneratingPdf(true);
//         const toastId = toast.loading("Fetching records...");

//         try {
//             const allOwners = await fetchAllForExport();
//             if (allOwners.length === 0) throw new Error("No records");

//             // Mount the hidden template only now, and wait for it to render
//             setExportOwners(allOwners);
//             await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

//             toast.update(toastId, { render: "Generating PDF..." });

//             const node = pdfRef.current;
//             if (!node) throw new Error("PDF template not mounted");
//             if (document.fonts?.ready) await document.fonts.ready;

//             const rootTop = node.getBoundingClientRect().top;
//             const theadH = node.querySelector('thead').getBoundingClientRect().height;
//             const rows = Array.from(node.querySelectorAll('tbody tr')).map((r) => {
//                 const b = r.getBoundingClientRect();
//                 return { top: b.top - rootTop, bottom: b.bottom - rootTop };
//             });

//             const pages = [];
//             let i = 0;
//             while (i < rows.length) {
//                 const isFirst = pages.length === 0;
//                 const startRow = i;
//                 const used = (r) => isFirst
//                     ? rows[r].bottom + PDF_PAD
//                     : PDF_PAD + theadH + (rows[r].bottom - rows[startRow].top) + PDF_PAD;
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
//                     backgroundColor: "#ffffff",
//                     windowWidth: PDF_PAGE_W,
//                     onclone: (doc) => {
//                         const root = doc.querySelector('[data-pdf-root]');
//                         Array.from(root.querySelectorAll('tbody tr')).forEach((r, idx) => {
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

//                 pdf.setFontSize(9);
//                 pdf.setTextColor(120);
//                 pdf.text(`Page ${p + 1} of ${pages.length}`, pageW / 2, pageH - 4, { align: "center" });
//             }

//             pdf.save(`Archive_Owners_${new Date().toISOString().slice(0, 10)}.pdf`);
//             toast.update(toastId, { render: `✅ PDF downloaded! (${allOwners.length} records, ${pages.length} pages)`, type: "success", isLoading: false, autoClose: 3000 });
//         } catch (err) {
//             console.error("PDF error:", err);
//             toast.update(toastId, { render: "❌ Failed to generate PDF", type: "error", isLoading: false, autoClose: 4000 });
//         } finally {
//             setExportOwners(null); // unmount the hidden template
//             setIsGeneratingPdf(false);
//         }
//     };

//     // ---------- Export Excel "New Data" (the original Export Excel, relabeled) ----------
//     // CHANGE: a 7th column "Responsibility" was added after "Notes".
//     const handleExportExcel = async () => {
//         if (totalCount === 0) return toast.error("No records to export.");
//         setIsGeneratingExcel(true);
//         const toastId = toast.loading("Preparing Excel...");

//         try {
//             const allOwners = await fetchAllForExport();
//             if (allOwners.length === 0) throw new Error("No records");

//             const mod = await import('exceljs');
//             const ExcelJS = mod.default || mod;

//             const workbook = new ExcelJS.Workbook();
//             const ws = workbook.addWorksheet('Archive Properties', {
//                 views: [{ rightToLeft: false, state: 'frozen', ySplit: 3 }],
//             });

//             const FONT = 'Tahoma';
//             const border = {
//                 top:    { style: 'thin', color: { argb: 'FF999999' } },
//                 left:   { style: 'thin', color: { argb: 'FF999999' } },
//                 bottom: { style: 'thin', color: { argb: 'FF999999' } },
//                 right:  { style: 'thin', color: { argb: 'FF999999' } },
//             };
//             const align = { vertical: 'middle', horizontal: 'left', wrapText: true, readingOrder: 'ltr' };

//             ws.columns = [
//                 { width: 32 },  // A: Name
//                 { width: 18 },  // B: Phone
//                 { width: 22 },  // C: Unit No
//                 { width: 24 },  // D: Community
//                 { width: 24 },  // E: Sub-community
//                 { width: 40 },  // F: Notes (blank)
//                 { width: 22 },  // G: Responsibility (NEW)
//             ];

//             // Logo
//             try {
//                 const response = await fetch(logo);
//                 const blob = await response.blob();
//                 const base64data = await new Promise((resolve, reject) => {
//                     const reader = new FileReader();
//                     reader.onloadend = () => resolve(reader.result);
//                     reader.onerror = reject;
//                     reader.readAsDataURL(blob);
//                 });
//                 const imageId = workbook.addImage({ base64: base64data, extension: 'png' });
//                 ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 250, height: 75 } });
//             } catch (err) {
//                 console.error("Failed to load logo for Excel", err);
//             }

//             // Title (merge widened from A2:F2 to A2:G2 to cover the new column)
//             ws.mergeCells('A2:G2');
//             const title = ws.getCell('A2');
//             title.value = `Archive Properties Sheet — ${new Date().toLocaleDateString()}`;
//             title.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1e3a8a' } };
//             title.alignment = { vertical: 'middle', horizontal: 'left', readingOrder: 'ltr' };

//             ws.getRow(1).height = 110;
//             ws.getRow(2).height = 34;
//             ws.getRow(3).height = 28;

//             // Header (NEW: 'Responsibility' added at the end)
//             const headerRow = ws.addRow(['Name', 'Phone', 'Unit No', 'Community', 'Sub-community', 'Notes', 'Responsibility']);
//             headerRow.eachCell((cell) => {
//                 cell.font = { name: FONT, size: 12, bold: true };
//                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F7F5' } };
//                 cell.alignment = align;
//                 cell.border = border;
//             });

//             // Data (ALL matching records, not just the current page)
//             allOwners.forEach((owner) => {
//                 const row = ws.addRow([
//                     owner.name || owner.company || '—',
//                     owner.phone || '—',
//                     owner.unit_no || '—',
//                     owner.community || '—',
//                     owner.sub_community || '—',
//                     '',
//                     owner.responsibility_name || 'Unassigned', // NEW: Responsibility value
//                 ]);
//                 row.eachCell({ includeEmpty: true }, (cell) => {
//                     cell.font = { name: FONT, size: 12 };
//                     cell.alignment = align;
//                     cell.border = border;
//                 });
//             });

//             const buffer = await workbook.xlsx.writeBuffer();
//             const blob = new Blob([buffer], {
//                 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//             });
//             const url = URL.createObjectURL(blob);
//             const a = document.createElement('a');
//             a.href = url;
//             a.download = `Archive_Owners_${new Date().toISOString().slice(0, 10)}.xlsx`;
//             document.body.appendChild(a);
//             a.click();
//             document.body.removeChild(a);
//             URL.revokeObjectURL(url);
//             toast.update(toastId, { render: `✅ Excel downloaded! (${allOwners.length} records)`, type: "success", isLoading: false, autoClose: 3000 });
//         } catch (err) {
//             console.error("Excel error:", err);
//             toast.update(toastId, { render: "❌ Failed to generate Excel file", type: "error", isLoading: false, autoClose: 4000 });
//         } finally {
//             setIsGeneratingExcel(false);
//         }
//     };

//     // ---------- NEW: Export Excel "Followup" ----------
//     // Columns: Owner / Phone, Last Contact, Unit / Ref, Property Cat., Location (Area, Comm, Sub),
//     //          Description, Offer, Sale Price, Rent Price, Responsibility, Notes (blank)
//     const handleExportExcelFollowup = async () => {
//         if (totalCount === 0) return toast.error("No records to export.");
//         setIsGeneratingFollowup(true);
//         const toastId = toast.loading("Preparing Followup Excel...");

//         try {
//             const allOwners = await fetchAllForExport();
//             if (allOwners.length === 0) throw new Error("No records");

//             const mod = await import('exceljs');
//             const ExcelJS = mod.default || mod;

//             const workbook = new ExcelJS.Workbook();
//             const ws = workbook.addWorksheet('Followup', {
//                 // ySplit 4 = logo row + title row + spacer row + header row stay frozen
//                 views: [{ rightToLeft: false, state: 'frozen', ySplit: 4 }],
//             });

//             const FONT = 'Tahoma';
//             const border = {
//                 top:    { style: 'thin', color: { argb: 'FF999999' } },
//                 left:   { style: 'thin', color: { argb: 'FF999999' } },
//                 bottom: { style: 'thin', color: { argb: 'FF999999' } },
//                 right:  { style: 'thin', color: { argb: 'FF999999' } },
//             };
//             const align = { vertical: 'middle', horizontal: 'left', wrapText: true, readingOrder: 'ltr' };

//             // 11 columns, in the requested order
//             ws.columns = [
//                 { width: 32 },  // A: Owner / Phone
//                 { width: 16 },  // B: Last Contact
//                 { width: 22 },  // C: Unit / Ref
//                 { width: 16 },  // D: Property Cat.
//                 { width: 36 },  // E: Location (Area, Comm, Sub)
//                 { width: 40 },  // F: Description
//                 { width: 12 },  // G: Offer
//                 { width: 16 },  // H: Sale Price
//                 { width: 16 },  // I: Rent Price
//                 { width: 22 },  // J: Responsibility
//                 { width: 40 },  // K: Notes (blank, to be filled by the agent)
//             ];

//             // Logo
//             try {
//                 const response = await fetch(logo);
//                 const blob = await response.blob();
//                 const base64data = await new Promise((resolve, reject) => {
//                     const reader = new FileReader();
//                     reader.onloadend = () => resolve(reader.result);
//                     reader.onerror = reject;
//                     reader.readAsDataURL(blob);
//                 });
//                 const imageId = workbook.addImage({ base64: base64data, extension: 'png' });
//                 ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 250, height: 75 } });
//             } catch (err) {
//                 console.error("Failed to load logo for Followup Excel", err);
//             }

//             // Title
//             ws.mergeCells('A2:K2');
//             const title = ws.getCell('A2');
//             title.value = `Archive Properties Followup — ${new Date().toLocaleDateString()}`;
//             title.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1e3a8a' } };
//             title.alignment = { vertical: 'middle', horizontal: 'left', readingOrder: 'ltr' };

//             ws.getRow(1).height = 110;
//             ws.getRow(2).height = 34;
//             ws.getRow(3).height = 28;

//             // Header
//             const headerRow = ws.addRow([
//                 'Owner / Phone',
//                 'Last Contact',
//                 'Unit / Ref',
//                 'Property Cat.',
//                 'Location (Area, Comm, Sub)',
//                 'Description',
//                 'Offer',
//                 'Sale Price',
//                 'Rent Price',
//                 'Responsibility',
//                 'Notes',
//             ]);
//             headerRow.eachCell((cell) => {
//                 cell.font = { name: FONT, size: 12, bold: true };
//                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F7F5' } };
//                 cell.alignment = align;
//                 cell.border = border;
//             });

//             // Data (ALL matching records, not just the current page)
//             allOwners.forEach((owner) => {
//                 // Owner name on line 1, phone on line 2 (wrapText is enabled)
//                 const ownerPhone = `${owner.name || owner.company || '—'}\n${owner.phone || '—'}`;

//                 // Unit on line 1, reference (if any) on line 2
//                 const unitRef = owner.refrence_no
//                     ? `${owner.unit_no || '—'}\nRef: ${owner.refrence_no}`
//                     : (owner.unit_no || '—');

//                 // Area, Community, Sub-community joined (empty parts skipped)
//                 const location = [owner.area, owner.community, owner.sub_community]
//                     .filter(Boolean)
//                     .join(', ') || '—';

//                 const row = ws.addRow([
//                     ownerPhone,
//                     owner.last_communication_date || '—',
//                     unitRef,
//                     owner.property_category || '—',
//                     location,
//                     owner.description || '—',
//                     owner.property_offer || '—',
//                     formatPrice(owner.sale_price),
//                     formatPrice(owner.rent_price),
//                     owner.responsibility_name || 'Unassigned',
//                     '', // Notes left blank on purpose
//                 ]);
//                 row.eachCell({ includeEmpty: true }, (cell) => {
//                     cell.font = { name: FONT, size: 12 };
//                     cell.alignment = align;
//                     cell.border = border;
//                 });
//             });

//             const buffer = await workbook.xlsx.writeBuffer();
//             const blob = new Blob([buffer], {
//                 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//             });
//             const url = URL.createObjectURL(blob);
//             const a = document.createElement('a');
//             a.href = url;
//             a.download = `Archive_Owners_Followup_${new Date().toISOString().slice(0, 10)}.xlsx`;
//             document.body.appendChild(a);
//             a.click();
//             document.body.removeChild(a);
//             URL.revokeObjectURL(url);
//             toast.update(toastId, { render: `✅ Followup Excel downloaded! (${allOwners.length} records)`, type: "success", isLoading: false, autoClose: 3000 });
//         } catch (err) {
//             console.error("Followup Excel error:", err);
//             toast.update(toastId, { render: "❌ Failed to generate Followup Excel file", type: "error", isLoading: false, autoClose: 4000 });
//         } finally {
//             setIsGeneratingFollowup(false);
//         }
//     };

//     // ---------- Loading / error screens ----------
//     if (initialLoading) {
//         return (
//             <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-5">
//                 <div className="w-12 h-12 border-4 border-[#f8f7f5] border-t-[#4285F4] rounded-full animate-spin"></div>
//                 <p className="text-[#4285F4] text-lg font-extrabold">Loading Archive Owners...</p>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-4 p-5 text-center">
//                 <span className="text-5xl">⚠️</span>
//                 <p className="text-red-500 text-lg font-extrabold">{error}</p>
//                 <button className="bg-[#4285F4] text-white px-8 py-3 rounded-lg font-extrabold transition-colors hover:bg-blue-600" onClick={() => refreshOwners()}>
//                     Retry
//                 </button>
//             </div>
//         );
//     }

//     const paginationBar = (
//         <Pagination
//             page={page}
//             pageSize={pageSize}
//             totalCount={totalCount}
//             loading={loading}
//             onPageChange={handlePageChange}
//             onPageSizeChange={handlePageSizeChange}
//         />
//     );

//     return (
//         <div dir="ltr" className="min-h-screen bg-white py-10 px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans relative pb-24">
//             <ToastContainer position="top-right" theme="light" />

//             {/* HEADER */}
//             <div className="flex flex-col xl:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
//                 <div className="text-center xl:text-left">
//                     <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center xl:justify-start gap-3">
//                         <FaArchive className="text-[#4285F4]" /> Archive Properties Sheet
//                     </h2>
//                     <div className="flex items-center justify-center xl:justify-start gap-2 mt-2">
//                         {canViewAll ? (
//                             <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">Viewing: All</span>
//                         ) : (
//                             <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
//                                 <FiLock size={10} /> Viewing: Only My
//                             </span>
//                         )}
//                     </div>
//                 </div>

//                 <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
//                     <div className="flex bg-[#f8f7f5] p-1.5 rounded-lg border border-gray-200 shadow-sm">
//                         <button onClick={() => setViewMode("cards")} className={`p-2 rounded-md transition-all ${viewMode === "cards" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiGrid size={18} /></button>
//                         <button onClick={() => setViewMode("table")} className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiList size={18} /></button>
//                     </div>

//                     {/* PDF button — icon is now RED (text-red-600) */}
//                     <button
//                         onClick={handleExportPDF}
//                         disabled={isGeneratingPdf || totalCount === 0}
//                         title="Export all records matching the current filters to PDF"
//                         className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                         <FaFilePdf className="text-red-600" /> {isGeneratingPdf ? "Generating..." : "Export PDF"}
//                     </button>

//                     {/* Original Excel button — label changed to "Export Excel New Data", icon is now GREEN */}
//                     <button
//                         onClick={handleExportExcel}
//                         disabled={isGeneratingExcel || totalCount === 0}
//                         title="Export all records matching the current filters to Excel (new data format)"
//                         className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                         <FaFileExcel className="text-green-600" /> {isGeneratingExcel ? "Generating..." : "Export Excel New Data"}
//                     </button>

//                     {/* NEW button: Export Excel Followup (green icon, same style as the other Excel button) */}
//                     <button
//                         onClick={handleExportExcelFollowup}
//                         disabled={isGeneratingFollowup || totalCount === 0}
//                         title="Export all records matching the current filters to Excel (followup format)"
//                         className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                         <FaFileExcel className="text-green-600" /> {isGeneratingFollowup ? "Generating..." : "Export Excel Followup"}
//                     </button>

//                     <button className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#1e3a8a] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={() => { if (!canCreate) return toast.error("No permission."); setShowBulkImportModal(true); }}>
//                         <FiUploadCloud size={18} /> Import
//                     </button>
//                     <button className={`flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#a47d52] text-white hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={handleOpenCreate}>
//                         <FaPlus /> Add Owner
//                     </button>
//                 </div>
//             </div>

//             {/* SEARCH BAR */}
//             <div className="max-w-full mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
//                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
//                     <div className="relative">
//                         <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Search name, phone, unit, reference..."
//                             value={searchTerm}
//                             onChange={(e) => withReset(setSearchTerm)(e.target.value)}
//                             className={INPUT_CLASS}
//                         />
//                     </div>
//                     <div className="relative">
//                         <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Area"
//                             value={searchArea}
//                             onChange={(e) => withReset(setSearchArea)(e.target.value)}
//                             className={INPUT_CLASS}
//                         />
//                     </div>
//                     <div className="relative">
//                         <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Community"
//                             value={searchCommunity}
//                             onChange={(e) => withReset(setSearchCommunity)(e.target.value)}
//                             className={INPUT_CLASS}
//                         />
//                     </div>
//                     <div className="relative">
//                         <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Sub-community"
//                             value={searchSubCommunity}
//                             onChange={(e) => withReset(setSearchSubCommunity)(e.target.value)}
//                             className={INPUT_CLASS}
//                         />
//                     </div>
//                 </div>

//                 <div className="mt-3 flex flex-wrap items-center gap-3">
//                     {canViewAll && (
//                         <div className="relative">
//                             <FaUserShield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//                             <select
//                                 value={searchResponsibility}
//                                 onChange={(e) => withReset(setSearchResponsibility)(e.target.value)}
//                                 className={`${SELECT_CLASS} pl-9 min-w-[200px]`}
//                                 disabled={loadingUsers}
//                                 title="Filter by responsibility"
//                             >
//                                 <option value="">{loadingUsers ? "Loading users..." : "Responsibility (All)"}</option>
//                                 <option value="unassigned" className="font-bold text-gray-800">-- Unassigned Only --</option>
//                                 {users.map((u) => (
//                                     <option key={u.id} value={u.id}>{userLabel(u)}</option>
//                                 ))}
//                             </select>
//                         </div>
//                     )}

//                     <div className="relative">
//                         <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//                         <input
//                             type="date"
//                             value={searchDate}
//                             onChange={(e) => withReset(setSearchDate)(e.target.value)}
//                             title="Last communication date"
//                             className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
//                         />
//                     </div>

//                     <select value={searchCategory} onChange={(e) => withReset(setSearchCategory)(e.target.value)} className={SELECT_CLASS}>
//                         <option value="">Category (All)</option>
//                         <option value="residential">Residential</option>
//                         <option value="commercial">Commercial</option>
//                     </select>
//                     <select value={searchOffer} onChange={(e) => withReset(setSearchOffer)(e.target.value)} className={SELECT_CLASS}>
//                         <option value="">Offer (All)</option>
//                         <option value="sale">Sale</option>
//                         <option value="rent">Rent</option>
//                     </select>

//                     <button
//                         onClick={clearFilters}
//                         disabled={activeFilterCount === 0}
//                         className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
//                         title="Clear all filters"
//                     >
//                         <FiX /> Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
//                     </button>

//                     <span className="ml-auto flex items-center gap-2 text-xs font-bold text-gray-500">
//                         {loading && <span className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin"></span>}
//                         {totalCount} {totalCount === 1 ? "record" : "records"}
//                     </span>
//                 </div>
//             </div>

//             <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

//             {/* EMPTY STATE */}
//             {owners.length === 0 ? (
//                 <div className="flex flex-col justify-center items-center gap-4 p-10 text-center bg-[#f8f7f5] rounded-2xl border border-gray-100 max-w-3xl mx-auto shadow-sm">
//                     <span className="text-6xl">🗂️</span>
//                     <h3 className="text-2xl font-extrabold text-gray-800">No Archive Owners Found</h3>
//                     <p className="text-gray-500">Try adjusting your search filters or import a new list.</p>
//                 </div>
//             ) : viewMode === "cards" ? (

//                 /* ========== CARD VIEW ========== */
//                 <div className={`max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
//                     <div className="mb-4 flex flex-wrap items-center gap-4 bg-gray-50 w-fit px-4 py-2 rounded-lg border border-gray-200">
//                         <div className="flex items-center gap-2">
//                             <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === owners.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
//                             <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next</span>
//                         </div>
//                         <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
//                             <option value={50}>50</option>
//                             <option value={100}>100</option>
//                             <option value={200}>200</option>
//                             <option value="All">All ({owners.length})</option>
//                         </select>
//                         <span className="text-sm font-bold text-[#4285F4]">({selectedIds.length} Selected)</span>
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//                         {owners.map((owner) => (
//                             <div key={owner.id} className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border relative group ${selectedIds.includes(owner.id) ? 'border-[#4285F4] ring-1 ring-[#4285F4]' : 'border-gray-100'}`}>
//                                 <div className="absolute top-4 left-4 z-20">
//                                     <input type="checkbox" checked={selectedIds.includes(owner.id)} onChange={() => toggleSelectRow(owner.id)} className="w-5 h-5 text-[#4285F4] rounded border-gray-300 focus:ring-[#4285F4] cursor-pointer shadow-sm bg-white" />
//                                 </div>
//                                 <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
//                                     <button onClick={() => handleOpenEdit(owner)} className={`p-2 rounded-full shadow transition-colors ${canUpdate ? "bg-white/90 text-gray-600 hover:bg-[#4285F4] hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
//                                     <button onClick={() => confirmDelete(owner)} className={`p-2 rounded-full shadow transition-colors ${canDelete ? "bg-white/90 text-red-500 hover:bg-red-500 hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
//                                 </div>
//                                 <div className="p-6 pt-10 flex flex-col h-full">
//                                     <div className="flex justify-between items-start mb-4">
//                                         <div className="relative">
//                                             <div className="w-14 h-14 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 group-hover:bg-[#4285F4]/10 transition-colors"><FiUser className="text-[#4285F4]" size={28} /></div>
//                                         </div>
//                                     </div>
//                                     <h3 className="text-xl font-bold text-gray-800 mb-1 truncate hover:text-[#4285F4] cursor-pointer transition-colors" title={owner.name || 'Unnamed Owner'} onClick={() => handleOpenDetails(owner)}>{owner.name || 'Unnamed Owner'}</h3>
//                                     {owner.company && <p className="text-sm font-medium text-gray-500 mb-2 truncate">{owner.company}</p>}

//                                     <div className="mb-4 flex flex-wrap gap-2">
//                                         <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
//                                             <FaUserShield className="text-gray-400" /> {owner.responsibility_name || 'Unassigned'}
//                                         </span>
//                                         {owner.unit_no && (
//                                             <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
//                                                 <FiHome className="text-gray-400" /> {owner.unit_no}
//                                             </span>
//                                         )}
//                                     </div>

//                                     <div className="space-y-3 mt-auto pt-4 border-t border-gray-50">
//                                         <div className="flex items-center gap-3 text-sm text-gray-600">
//                                             <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiPhone className="text-[#4285F4]" size={12} /></div>
//                                             <span className="truncate font-medium">{owner.phone || 'No phone'}</span>
//                                         </div>
//                                         <div className="flex items-center gap-3 text-sm text-gray-600">
//                                             <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiDollarSign className="text-[#4285F4]" size={12} /></div>
//                                             <span className="truncate font-medium">Sale: {formatPrice(owner.sale_price)} | Rent: {formatPrice(owner.rent_price)}</span>
//                                         </div>
//                                         <div className="flex items-center gap-3 text-sm text-gray-600">
//                                             <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiCalendar className="text-[#4285F4]" size={12} /></div>
//                                             <span className="truncate font-medium">{owner.last_communication_date || 'No date'}</span>
//                                         </div>
//                                     </div>
//                                     <button onClick={() => handleOpenDetails(owner)} className="mt-6 w-full flex items-center justify-center gap-2 bg-[#f8f7f5] text-[#4285F4] py-2.5 rounded-lg font-bold text-sm transition-all duration-300 hover:bg-[#4285F4] hover:text-white"><MdVisibility size={16} /> View Details</button>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>

//                     <div className="mt-6 rounded-xl border border-gray-100 overflow-hidden">
//                         {paginationBar}
//                     </div>
//                 </div>
//             ) : (

//                 /* ========== TABLE VIEW (Default) ========== */
//                 <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
//                     <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-4">
//                         <div className="flex items-center gap-2">
//                             <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === owners.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" title="Select Next Chunk" />
//                             <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next Chunk</span>
//                         </div>
//                         <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
//                             <option value={50}>50 Records</option>
//                             <option value={100}>100 Records</option>
//                             <option value={200}>200 Records</option>
//                             <option value="All">All on page ({owners.length})</option>
//                         </select>
//                         {selectedIds.length > 0 && <span className="text-sm font-bold text-[#4285F4] bg-blue-50 px-2 py-1 rounded">{selectedIds.length} Selected</span>}
//                     </div>

//                     <div className="relative">
//                         {/* LEFT ARROW */}
//                         <div className="absolute inset-y-0 left-0 w-14 z-20 pointer-events-none">
//                             {canScrollLeft && (
//                                 <button
//                                     type="button"
//                                     onClick={() => scrollTableBy(-1)}
//                                     title="Scroll left"
//                                     className="pointer-events-auto sticky top-[45vh] ml-2 flex items-center justify-center w-11 h-11 rounded-full bg-gray-500/70 hover:bg-gray-600/80 shadow-lg backdrop-blur-sm transition-all"
//                                 >
//                                     <FiChevronLeft size={26} color="#f8f7f5" />
//                                 </button>
//                             )}
//                         </div>

//                         {/* RIGHT ARROW */}
//                         <div className="absolute inset-y-0 right-0 w-14 z-20 pointer-events-none">
//                             {canScrollRight && (
//                                 <button
//                                     type="button"
//                                     onClick={() => scrollTableBy(1)}
//                                     title="Scroll right"
//                                     className="pointer-events-auto sticky top-[45vh] ml-auto mr-2 flex items-center justify-center w-11 h-11 rounded-full bg-gray-500/70 hover:bg-gray-600/80 shadow-lg backdrop-blur-sm transition-all"
//                                 >
//                                     <FiChevronRight size={26} color="#f8f7f5" />
//                                 </button>
//                             )}
//                         </div>

//                         <div ref={tableScrollRef} onScroll={updateScrollButtons} className="overflow-x-auto custom-scrollbar pb-2">
//                             <table className="w-full text-left border-collapse min-w-max">
//                                 <thead className="bg-[#f8f7f5] border-b border-gray-200">
//                                     <tr>
//                                         <th className="px-4 py-4 w-12 text-center">
//                                             <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === owners.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
//                                         </th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Owner / Phone</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit No</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plot / Land</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property Cat.</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Municipality</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mun. No</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Offer</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sale Price</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rent Price</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Responsibility</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-gray-100">
//                                     {owners.map((owner) => (
//                                         <tr key={owner.id} className={`transition-colors ${selectedIds.includes(owner.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
//                                             <td className="px-4 py-4 text-center">
//                                                 <input type="checkbox" checked={selectedIds.includes(owner.id)} onChange={() => toggleSelectRow(owner.id)} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
//                                             </td>
//                                             <td className="px-6 py-4">
//                                                 <div className="flex items-center gap-3">
//                                                     <div className="w-10 h-10 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 shrink-0">
//                                                         <FiUser className="text-[#4285F4]" size={18} />
//                                                     </div>
//                                                     <div className="flex flex-col gap-0.5">
//                                                         <p className="font-bold text-gray-800">{owner.name || 'Unnamed Owner'}</p>
//                                                         {owner.company && <p className="text-xs text-gray-500">{owner.company}</p>}
//                                                         <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
//                                                             <FiPhone size={10} className="text-gray-400" />
//                                                             {owner.phone || '—'}
//                                                         </p>
//                                                     </div>
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4">
//                                                 <div className="flex flex-col gap-1 text-sm text-gray-600">
//                                                     {owner.unit_no && <span className="flex items-center gap-2 font-semibold"><FiHome size={12} className="text-gray-400" /> {owner.unit_no}</span>}
//                                                     {owner.refrence_no && <span className="flex items-center gap-2 text-xs text-gray-400">Ref: {owner.refrence_no}</span>}
//                                                     {!owner.unit_no && !owner.refrence_no && <span>—</span>}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4">
//                                                 <div className="flex flex-col gap-1 text-sm text-gray-600">
//                                                     {owner.plot_no && <span className="font-semibold">Plot: {owner.plot_no}</span>}
//                                                     {owner.land_no && <span className="text-xs text-gray-500">Land: {owner.land_no}</span>}
//                                                     {!owner.plot_no && !owner.land_no && <span>—</span>}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={owner.description}>
//                                                 {owner.description || '—'}
//                                             </td>
//                                             <td className="px-6 py-4 text-sm text-gray-600 capitalize">{owner.property_category || '—'}</td>
//                                             <td className="px-6 py-4">
//                                                 <div className="flex flex-col gap-1 text-sm text-gray-600">
//                                                     <span className="font-bold">{owner.municipality || '—'}</span>
//                                                     {(owner.zone || owner.area) && (
//                                                         <span className="text-xs text-gray-500">
//                                                             {[owner.zone, owner.area].filter(Boolean).join(', ')}
//                                                         </span>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
//                                                 {owner.municipality_no || '—'}
//                                             </td>
//                                             <td className="px-6 py-4 text-sm text-gray-600 capitalize">{owner.property_offer || '—'}</td>
//                                             <td className="px-6 py-4 font-bold text-emerald-600 text-sm">{formatPrice(owner.sale_price)}</td>
//                                             <td className="px-6 py-4 font-bold text-blue-600 text-sm">{formatPrice(owner.rent_price)}</td>
//                                             <td className="px-6 py-4">
//                                                 <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md"><FaUserShield className="text-gray-400" /> {owner.responsibility_name || 'Unassigned'}</span>
//                                             </td>
//                                             <td className="px-6 py-4 text-right">
//                                                 <div className="flex items-center justify-end gap-2">
//                                                     <button onClick={() => handleOpenDetails(owner)} className="p-2 text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10 rounded-lg transition-colors"><MdVisibility size={18} /></button>
//                                                     <button onClick={() => handleOpenEdit(owner)} className={`p-2 rounded-lg transition-colors ${canUpdate ? "text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10" : "text-gray-300 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
//                                                     <button onClick={() => confirmDelete(owner)} className={`p-2 rounded-lg transition-colors ${canDelete ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-300 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </div>

//                     {paginationBar}
//                 </div>
//             )}

//             {/* FLOATING BULK ACTIONS BAR */}
//             {selectedIds.length > 0 && (
//                 <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1e3a8a] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-slideUp">
//                     <div className="flex items-center gap-2 border-r border-white/20 pr-6">
//                         <FiCheckSquare size={20} className="text-blue-300" />
//                         <span className="font-bold whitespace-nowrap">{selectedIds.length} Selected</span>
//                     </div>
//                     <div className="flex items-center gap-3">
//                         <button onClick={() => { setShowAssignModal(true); fetchUsers(); }} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold text-sm transition-colors"><FaUserEdit size={16} /> Assign Responsibility</button>
//                         <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkActionLoading} className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
//                             {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaTrash size={16} />} Delete Selected
//                         </button>
//                     </div>
//                     <button onClick={() => setSelectedIds([])} className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"><MdClose size={20} /></button>
//                 </div>
//             )}

//             {/* MODALS */}
//             {showAddEditModal && <AddEditLandLord landlord={selectedOwner} onClose={handleCloseModals} onSuccess={() => { handleCloseModals(); refreshOwners(); }} />}
//             {showDetailsModal && selectedOwner && <LandLoardDetails landlord={selectedOwner} onClose={handleCloseModals} />}
//             {showBulkImportModal && <AddOwnersArchive onClose={handleCloseModals} onSuccess={() => { refreshOwners(); }} />}

//             {/* BULK ASSIGN MODAL */}
//             {showAssignModal && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
//                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
//                         <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white">
//                             <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2"><FaUserShield className="text-[#4285F4]" /> Assign Responsibility</h3>
//                             <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-red-500"><MdClose size={20} /></button>
//                         </div>

//                         <div className="p-6">
//                             <p className="text-sm text-gray-600 mb-4">Assign responsibility for <strong>{selectedIds.length}</strong> selected records to:</p>
//                             <label className="block text-sm font-bold text-gray-700 mb-2">Select Listing Agent</label>
//                             <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]" disabled={loadingUsers}>
//                                 <option value="">-- Select User --</option>
//                                 <option value={UNASSIGN_VALUE}>Unassigned (remove responsibility)</option>
//                                 {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.username} {u.last_name || ''} ({u.role === 'listing' ? 'Listing' : 'Listing Sales Rent'})</option>)}
//                             </select>
//                             {loadingUsers && <p className="text-xs text-blue-500 mt-2">Loading agents...</p>}
//                             {!loadingUsers && users.length === 0 && <p className="text-xs text-red-500 mt-2">No eligible users found.</p>}
//                         </div>
//                         <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
//                             <button onClick={() => setShowAssignModal(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-white transition-colors">Cancel</button>
//                             <button onClick={handleBulkAssign} disabled={!selectedUser || bulkActionLoading} className="px-6 py-2.5 rounded-lg bg-[#4285F4] text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2">
//                                 {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null} Assign
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* BULK DELETE CONFIRMATION MODAL */}
//             {bulkDeleteConfirm && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
//                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
//                         <div className="flex justify-center pt-6 pb-4">
//                             <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100"><FiAlertTriangle className="text-red-500" size={32} /></div>
//                         </div>
//                         <div className="px-6 pb-6">
//                             <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Bulk Delete</h3>
//                             <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-red-600">{selectedIds.length}</span> selected records? This action cannot be undone.</p>
//                             <div className="flex gap-3">
//                                 <button onClick={() => setBulkDeleteConfirm(false)} disabled={bulkActionLoading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
//                                 <button onClick={handleBulkDelete} disabled={bulkActionLoading} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
//                                     {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MdDeleteForever size={18} />} Yes, Delete {selectedIds.length} Records
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* STANDARD DELETE CONFIRMATION MODAL */}
//             {deleteConfirm && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
//                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
//                         <div className="flex justify-center pt-6 pb-4"><div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100"><FiAlertTriangle className="text-red-500" size={32} /></div></div>
//                         <div className="px-6 pb-6">
//                             <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Delete</h3>
//                             <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.name || deleteConfirm.company}"</span>? This action cannot be undone.</p>
//                             <div className="flex gap-3">
//                                 <button onClick={() => setDeleteConfirm(null)} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
//                                 <button onClick={handleDeleteOwner} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
//                                     {deletingId === deleteConfirm.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MdDeleteForever size={18} />} Delete
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* HIDDEN PDF TEMPLATE — mounted only while exporting */}
//             {exportOwners && <PdfExportTemplate ref={pdfRef} owners={exportOwners} />}
//         </div>
//     );
// };

// export default OwnersArchive;

// import React, { useState, useEffect, useRef } from 'react';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';
// import { MdDeleteForever, MdModeEdit, MdVisibility, MdClose } from 'react-icons/md';
// import { FiUser, FiPhone, FiLock, FiGrid, FiList, FiAlertTriangle, FiUploadCloud, FiCheckSquare, FiCalendar, FiHome, FiDollarSign, FiSearch, FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
// import { FaArchive, FaPlus, FaUserShield, FaTrash, FaUserEdit, FaMapMarkerAlt, FaFilePdf, FaFileExcel } from 'react-icons/fa';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';

// import AddEditLandLord from "../../components/en/listing/AddEditLandLoard";
// import LandLoardDetails from "../../components/en/listing/LandLordDetails";
// import AddOwnersArchive from "../../components/en/listing/AddOwnersArchive";
// import { usePermissions } from "../context/PermissionsContext";

// import logo from '../../assets/images/logogo-removebg-old.png';

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// // ---------- Helpers ----------
// const formatPrice = (value) => {
//     if (!value || Number(value) === 0) return '—';
//     return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
// };

// const userLabel = (u) => `${u.first_name || u.username || 'User'} ${u.last_name || ''}`.trim();

// const UNASSIGN_VALUE = "unassigned";

// const INPUT_CLASS = "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]";
// const SELECT_CLASS = "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4285F4]";

// // Pagination
// const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
// const DEFAULT_PAGE_SIZE = 50;
// const EXPORT_PAGE_SIZE = 500; // must be <= max_page_size on the backend

// const getPageNumbers = (current, total) => {
//     const pages = [];
//     const delta = 2;
//     for (let i = 1; i <= total; i++) {
//         if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
//             pages.push(i);
//         } else if (pages[pages.length - 1] !== '...') {
//             pages.push('...');
//         }
//     }
//     return pages;
// };

// // ---------- Pagination bar ----------
// const Pagination = ({ page, pageSize, totalCount, loading, onPageChange, onPageSizeChange }) => {
//     const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
//     const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
//     const to = Math.min(page * pageSize, totalCount);

//     const btn = "min-w-[36px] px-3 py-1.5 text-sm font-bold border rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

//     return (
//         <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-4 border-t border-gray-100 bg-gray-50">
//             <div className="flex items-center gap-3 text-sm text-gray-600">
//                 <span className="font-bold">{from}–{to} of {totalCount}</span>
//                 <select
//                     value={pageSize}
//                     onChange={(e) => onPageSizeChange(Number(e.target.value))}
//                     className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none"
//                     disabled={loading}
//                 >
//                     {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
//                 </select>
//             </div>

//             <div className="flex items-center gap-1.5 flex-wrap justify-center">
//                 <button className={`${btn} bg-white border-gray-300 text-gray-700 hover:bg-gray-100`} disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)} title="Previous page">
//                     <FiChevronLeft />
//                 </button>

//                 {getPageNumbers(page, totalPages).map((p, idx) =>
//                     p === '...' ? (
//                         <span key={`dots-${idx}`} className="px-2 text-gray-400">…</span>
//                     ) : (
//                         <button
//                             key={p}
//                             disabled={loading}
//                             onClick={() => onPageChange(p)}
//                             className={`${btn} ${p === page ? "bg-[#4285F4] border-[#4285F4] text-white" : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"}`}
//                         >
//                             {p}
//                         </button>
//                     )
//                 )}

//                 <button className={`${btn} bg-white border-gray-300 text-gray-700 hover:bg-gray-100`} disabled={page >= totalPages || loading} onClick={() => onPageChange(page + 1)} title="Next page">
//                     <FiChevronRight />
//                 </button>
//             </div>
//         </div>
//     );
// };

// // ---------- PDF export helpers ----------
// const PDF_PAGE_W = 1123;
// const PDF_PAGE_H = Math.round((PDF_PAGE_W * 210) / 297);
// const PDF_PAD = 30;

// const PDF_FONT = '"Segoe UI", Tahoma, "Noto Sans Arabic", "Arial Unicode MS", Arial, sans-serif';

// // Only mounted while exporting (see exportOwners state below)
// const PdfExportTemplate = React.forwardRef(({ owners }, ref) => {
//     const th = {
//         padding: "10px 8px",
//         border: "1px solid #d1d5db",
//         fontSize: "13px",
//         fontWeight: "bold",
//         textAlign: "left",
//         letterSpacing: "normal",
//     };

//     const td = {
//         padding: "8px",
//         border: "1px solid #e5e7eb",
//         fontSize: "14px",
//         lineHeight: 1.5,
//         verticalAlign: "top",
//         letterSpacing: "normal",
//         wordBreak: "break-word",
//         unicodeBidi: "plaintext",
//     };

//     const small = { fontSize: "12px", color: "#6b7280" };

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
//                 letterSpacing: "normal",
//                 position: "fixed",
//                 left: "-9999px",
//                 top: 0,
//                 zIndex: -1,
//             }}
//         >
//             <div data-pdf-header style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #a47d52", paddingBottom: "16px", marginBottom: "20px" }}>
//                 <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "60px", objectFit: "contain" }} />
//                 <div style={{ marginLeft: "20px" }}>
//                     <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>Archive Properties Sheet</h1>
//                     <p style={{ fontSize: "14px", color: "#6b7280", margin: "5px 0 0 0" }}>
//                         Generated: {new Date().toLocaleString()} — <span data-pdf-count>{owners.length} records</span>
//                     </p>
//                 </div>
//             </div>

//             <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
//                 <colgroup>
//                     <col style={{ width: "14%" }} />
//                     <col style={{ width: "10%" }} />
//                     <col style={{ width: "10%" }} />
//                     <col style={{ width: "16%" }} />
//                     <col style={{ width: "8%" }} />
//                     <col style={{ width: "10%" }} />
//                     <col style={{ width: "8%" }} />
//                     <col style={{ width: "8%" }} />
//                     <col style={{ width: "8%" }} />
//                     <col style={{ width: "8%" }} />
//                 </colgroup>
//                 <thead>
//                     <tr style={{ backgroundColor: "#f8f7f5", color: "#374151" }}>
//                         <th style={th}>Owner / Phone</th>
//                         <th style={th}>Unit No</th>
//                         <th style={th}>Plot / Land</th>
//                         <th style={th}>Description</th>
//                         <th style={th}>Property Cat.</th>
//                         <th style={th}>Municipality</th>
//                         <th style={th}>Mun. No</th>
//                         <th style={th}>Offer</th>
//                         <th style={th}>Sale</th>
//                         <th style={th}>Rent</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     {owners.map((owner) => (
//                         <tr key={owner.id}>
//                             <td style={td}>
//                                 <div dir="auto" style={{ fontWeight: "bold" }}>{owner.name || 'Unnamed'}</div>
//                                 {owner.company && <div dir="auto" style={small}>{owner.company}</div>}
//                                 <div style={{ fontSize: "12px", color: "#4b5563" }}>{owner.phone || '—'}</div>
//                                 <div style={{ fontSize: "11px", color: "#4285F4", fontWeight: "bold" }}>{owner.responsibility_name || 'Unassigned'}</div>
//                             </td>
//                             <td style={td}>
//                                 <div style={{ fontWeight: "bold" }}>{owner.unit_no || '—'}</div>
//                                 {owner.refrence_no && <div style={small}>Ref: {owner.refrence_no}</div>}
//                             </td>
//                             <td style={td}>
//                                 <div style={{ fontWeight: "bold" }}>Plot: {owner.plot_no || '—'}</div>
//                                 <div style={small}>Land: {owner.land_no || '—'}</div>
//                             </td>
//                             <td dir="auto" style={{ ...td, whiteSpace: "pre-wrap" }}>{owner.description || '—'}</td>
//                             <td style={{ ...td, textTransform: "capitalize" }}>{owner.property_category || '—'}</td>
//                             <td style={td}>
//                                 <div dir="auto">{owner.municipality || '—'}</div>
//                                 {owner.zone && <div dir="auto" style={small}>Zone: {owner.zone}</div>}
//                             </td>
//                             <td style={td}>{owner.municipality_no || '—'}</td>
//                             <td style={{ ...td, textTransform: "capitalize" }}>{owner.property_offer || '—'}</td>
//                             <td style={{ ...td, fontWeight: "bold", color: "#059669" }}>{formatPrice(owner.sale_price)}</td>
//                             <td style={{ ...td, fontWeight: "bold", color: "#2563eb" }}>{formatPrice(owner.rent_price)}</td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>
//         </div>
//     );
// });

// // ======================================================================
// const OwnersArchive = () => {
//     const { permissions } = usePermissions();

//     // ---------- Data state ----------
//     const [owners, setOwners] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [initialLoading, setInitialLoading] = useState(true);
//     const [error, setError] = useState(null);
//     const [viewMode, setViewMode] = useState("table");

//     // ---------- Pagination state ----------
//     const [page, setPage] = useState(1);
//     const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
//     const [totalCount, setTotalCount] = useState(0);

//     // ---------- Table horizontal scroll arrows ----------
//     const tableScrollRef = useRef(null);
//     const [canScrollLeft, setCanScrollLeft] = useState(false);
//     const [canScrollRight, setCanScrollRight] = useState(false);

//     const updateScrollButtons = () => {
//         const el = tableScrollRef.current;
//         if (!el) return;
//         setCanScrollLeft(el.scrollLeft > 2);
//         setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
//     };

//     const scrollTableBy = (direction) => {
//         tableScrollRef.current?.scrollBy({ left: direction * 500, behavior: 'smooth' });
//     };

//     useEffect(() => {
//         updateScrollButtons();
//         window.addEventListener('resize', updateScrollButtons);
//         return () => window.removeEventListener('resize', updateScrollButtons);
//     }, [owners, viewMode, loading, initialLoading]);

//     // ---------- Modal state ----------
//     const [showAddEditModal, setShowAddEditModal] = useState(false);
//     const [showDetailsModal, setShowDetailsModal] = useState(false);
//     const [showBulkImportModal, setShowBulkImportModal] = useState(false);
//     const [selectedOwner, setSelectedOwner] = useState(null);
//     const [deletingId, setDeletingId] = useState(null);
//     const [deleteConfirm, setDeleteConfirm] = useState(null);
//     const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

//     // ---------- Bulk actions ----------
//     const [selectedIds, setSelectedIds] = useState([]);
//     const [showAssignModal, setShowAssignModal] = useState(false);
//     const [users, setUsers] = useState([]);
//     const [loadingUsers, setLoadingUsers] = useState(false);
//     const [selectedUser, setSelectedUser] = useState("");
//     const [bulkActionLoading, setBulkActionLoading] = useState(false);
//     const [chunkSize, setChunkSize] = useState(100);

//     // ---------- Filters ----------
//     const [searchTerm, setSearchTerm] = useState("");
//     const [searchArea, setSearchArea] = useState("");
//     const [searchCommunity, setSearchCommunity] = useState("");
//     const [searchSubCommunity, setSearchSubCommunity] = useState("");
//     const [searchResponsibility, setSearchResponsibility] = useState("");
//     const [searchDate, setSearchDate] = useState("");
//     const [searchCategory, setSearchCategory] = useState("");
//     const [searchOffer, setSearchOffer] = useState("");

//     // Any filter change goes back to page 1
//     const withReset = (setter) => (value) => {
//         setter(value);
//         setPage(1);
//     };

//     // ---------- Export state ----------
//     const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
//     const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);
//     const [exportOwners, setExportOwners] = useState(null); // PDF template is mounted only while this is set
//     const pdfRef = useRef(null);

//     // ---------- Request tracking ----------
//     const requestId = useRef(0);
//     const controllerRef = useRef(null);

//     // ---------- Permissions ----------
//     const canViewAll = permissions?.view_all_archive_owners === true;
//     const canCreate = permissions?.create_bulk_archive_owners === true;
//     const canUpdate = permissions?.update_bulk_responsibility_archive_owners === true;
//     const canDelete = permissions?.delete_bulk_archive_owners === true;

//     const activeFilterCount = [
//         searchTerm, searchArea, searchCommunity, searchSubCommunity,
//         searchResponsibility, searchDate, searchCategory, searchOffer,
//     ].filter(Boolean).length;

//     // Builds filters (+ pagination unless overridden)
//     const buildParams = (p = page, size = pageSize) => {
//         const params = new URLSearchParams();
//         if (searchTerm.trim()) params.append('search', searchTerm.trim());
//         if (searchArea.trim()) params.append('area', searchArea.trim());
//         if (searchCommunity.trim()) params.append('community', searchCommunity.trim());
//         if (searchSubCommunity.trim()) params.append('sub_community', searchSubCommunity.trim());
//         if (searchResponsibility) params.append('responsibility', searchResponsibility);
//         if (searchDate) params.append('last_communication_date', searchDate);
//         if (searchCategory) params.append('property_category', searchCategory);
//         if (searchOffer) params.append('property_offer', searchOffer);
//         params.append('page', p);
//         params.append('page_size', size);
//         return params;
//     };

//     const buildQueryString = () => `?${buildParams().toString()}`;

//     // ---------- Fetch current page ----------
//     const fetchOwners = async (queryString = "") => {
//         controllerRef.current?.abort(); // cancel the previous in-flight request
//         const controller = new AbortController();
//         controllerRef.current = controller;

//         const myRequest = ++requestId.current;
//         setLoading(true);
//         setError(null);
//         try {
//             const token = localStorage.getItem('access_token');
//             if (!token) {
//                 toast.error('Please login to view Archive Owners');
//                 setLoading(false);
//                 window.location.href = '/login';
//                 return;
//             }

//             const response = await fetch(`${BASE}/api/archive-owners/${queryString}`, {
//                 method: "GET",
//                 signal: controller.signal,
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 }
//             });

//             if (!response.ok) {
//                 if (response.status === 401) {
//                     toast.error('Session expired. Please login again.');
//                     localStorage.removeItem('access_token');
//                     window.location.href = '/login';
//                 } else if (response.status === 404) {
//                     // Requested page no longer exists (e.g. after deletes) -> go to last valid page
//                     setPage((p) => Math.max(1, p - 1));
//                     return;
//                 } else {
//                     toast.error('Failed to load Archive Owners');
//                 }
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }

//             const data = await response.json();
//             if (myRequest !== requestId.current) return;

//             if (Array.isArray(data)) {
//                 setOwners(data);
//                 setTotalCount(data.length);
//             } else {
//                 setOwners(Array.isArray(data.results) ? data.results : []);
//                 setTotalCount(data.count ?? 0);
//             }
//             setSelectedIds([]);
//         } catch (err) {
//             if (err.name === 'AbortError') return;
//             if (myRequest !== requestId.current) return;
//             setError('Failed to load Archive Owners');
//             console.error('Error fetching archive owners:', err);
//         } finally {
//             if (myRequest === requestId.current) {
//                 setLoading(false);
//                 setInitialLoading(false);
//             }
//         }
//     };

//     const refreshOwners = () => fetchOwners(buildQueryString());

//     // Debounced fetch on any filter / page / page-size change
//     useEffect(() => {
//         const timeout = setTimeout(() => {
//             fetchOwners(buildQueryString());
//         }, 400);
//         return () => clearTimeout(timeout);
//     }, [page, pageSize, searchTerm, searchArea, searchCommunity, searchSubCommunity, searchResponsibility, searchDate, searchCategory, searchOffer]);

//     // Abort any pending request on unmount
//     useEffect(() => () => controllerRef.current?.abort(), []);

//     const handlePageChange = (newPage) => {
//         setPage(newPage);
//         window.scrollTo({ top: 0, behavior: 'smooth' });
//     };

//     const handlePageSizeChange = (size) => {
//         setPageSize(size);
//         setPage(1);
//     };

//     // After a delete: if the whole page was removed, step back one page
//     const refreshAfterRemoval = (removedCount) => {
//         if (removedCount >= owners.length && page > 1) {
//             setPage((p) => p - 1); // effect refetches
//         } else {
//             refreshOwners();
//         }
//     };

//     // ---------- Users ----------
//     const fetchUsers = async () => {
//         if (users.length > 0 || loadingUsers) return;
//         setLoadingUsers(true);
//         try {
//             const token = localStorage.getItem('access_token');
//             const response = await fetch(`${BASE}/api/users/`, {
//                 headers: { "Authorization": `Bearer ${token}` }
//             });
//             if (response.ok) {
//                 const data = await response.json();
//                 const userList = Array.isArray(data) ? data : (data.results || data.users || []);
//                 setUsers(userList.filter(u => u.role === 'listing' || u.role === 'listing_sales_rent'));
//             }
//         } catch (err) {
//             console.error("Failed to load users", err);
//         } finally {
//             setLoadingUsers(false);
//         }
//     };

//     useEffect(() => {
//         if (canViewAll) fetchUsers();
//     }, [canViewAll]);

//     // ---------- Selection (current page only) ----------
//     const handleSmartSelectAll = () => {
//         const totalVisibleRecords = owners.length;
//         if (selectedIds.length === totalVisibleRecords && totalVisibleRecords > 0) {
//             setSelectedIds([]);
//             return;
//         }
//         if (chunkSize === "All") {
//             setSelectedIds(owners.map(o => o.id));
//             return;
//         }
//         const nextChunk = owners
//             .filter(o => !selectedIds.includes(o.id))
//             .slice(0, chunkSize)
//             .map(o => o.id);

//         if (nextChunk.length === 0) {
//             toast.info("All records on this page are already selected.");
//             return;
//         }
//         setSelectedIds(prev => [...prev, ...nextChunk]);
//     };

//     const toggleSelectRow = (id) => {
//         setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
//     };

//     // ---------- Bulk delete / assign ----------
//     const handleBulkDelete = async () => {
//         setBulkActionLoading(true);
//         try {
//             const token = localStorage.getItem('access_token');
//             const response = await fetch(`${BASE}/api/archive-owners/bulk-delete/`, {
//                 method: 'DELETE',
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ ids: selectedIds })
//             });

//             if (!response.ok) throw new Error("Failed to bulk delete");

//             const removed = selectedIds.length;
//             toast.success(`✅ Successfully deleted ${removed} records.`);
//             setBulkDeleteConfirm(false);
//             setSelectedIds([]);
//             refreshAfterRemoval(removed);
//         } catch (err) {
//             console.error(err);
//             toast.error("❌ Error deleting records.");
//         } finally {
//             setBulkActionLoading(false);
//         }
//     };

//     const handleBulkAssign = async () => {
//         if (!selectedUser) return toast.error("Please select a user to assign.");
//         const isUnassign = selectedUser === UNASSIGN_VALUE;

//         setBulkActionLoading(true);
//         try {
//             const token = localStorage.getItem('access_token');
//             const response = await fetch(`${BASE}/api/archive-owners/bulk-assign/`, {
//                 method: 'PATCH',
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     ids: selectedIds,
//                     responsibility_id: isUnassign ? null : selectedUser
//                 })
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 throw new Error(errorData.error || "Failed to bulk assign");
//             }

//             const assignedUserObj = isUnassign ? null : users.find(u => u.id.toString() === selectedUser.toString());
//             const assignedName = isUnassign ? "Unassigned" : (assignedUserObj ? userLabel(assignedUserObj) : "Assigned User");

//             setOwners(prevOwners =>
//                 prevOwners.map(owner =>
//                     selectedIds.includes(owner.id)
//                         ? { ...owner, responsibility: isUnassign ? null : selectedUser, responsibility_name: isUnassign ? null : assignedName }
//                         : owner
//                 )
//             );

//             toast.success(
//                 isUnassign
//                     ? `✅ Responsibility removed from ${selectedIds.length} records.`
//                     : `✅ Successfully assigned responsibility for ${selectedIds.length} records.`
//             );
//             setSelectedIds([]);
//             setShowAssignModal(false);
//             setSelectedUser("");
//             refreshOwners();
//         } catch (err) {
//             toast.error(`❌ ${err.message}`);
//         } finally {
//             setBulkActionLoading(false);
//         }
//     };

//     // ---------- Single delete ----------
//     const confirmDelete = (owner) => {
//         if (!canDelete) return toast.error("You don't have permission to delete archive owners.");
//         setDeleteConfirm(owner);
//     };

//     const handleDeleteOwner = async () => {
//         if (!deleteConfirm) return;
//         const id = deleteConfirm.id;
//         setDeletingId(id);
//         try {
//             const token = localStorage.getItem('access_token');
//             const response = await fetch(`${BASE}/api/archive-owners/${id}/delete/`, {
//                 method: "DELETE",
//                 headers: { "Authorization": `Bearer ${token}` }
//             });

//             if (!response.ok) {
//                 toast.error('Failed to delete Archive Owner');
//                 return;
//             }

//             toast.success(`✅ Archive Owner deleted successfully!`);
//             setDeleteConfirm(null);
//             refreshAfterRemoval(1);
//         } catch (err) {
//             toast.error('Server connection error');
//         } finally {
//             setDeletingId(null);
//         }
//     };

//     // ---------- Modal handlers ----------
//     const handleOpenCreate = () => {
//         if (!canCreate) return toast.error("You don't have permission to create archive owners.");
//         setSelectedOwner(null);
//         setShowAddEditModal(true);
//     };

//     const handleOpenEdit = (owner) => {
//         if (!canUpdate) return toast.error("You don't have permission to edit archive owners.");
//         setSelectedOwner(owner);
//         setShowAddEditModal(true);
//     };

//     const handleOpenDetails = (owner) => {
//         setSelectedOwner(owner);
//         setShowDetailsModal(true);
//     };

//     const handleCloseModals = () => {
//         setShowAddEditModal(false);
//         setShowDetailsModal(false);
//         setShowBulkImportModal(false);
//         setShowAssignModal(false);
//         setSelectedOwner(null);
//         setDeleteConfirm(null);
//     };

//     const clearFilters = () => {
//         setSearchTerm("");
//         setSearchArea("");
//         setSearchCommunity("");
//         setSearchSubCommunity("");
//         setSearchResponsibility("");
//         setSearchDate("");
//         setSearchCategory("");
//         setSearchOffer("");
//         setPage(1);
//     };

//     // ---------- Export: fetch ALL records matching the current filters ----------
//     const fetchAllForExport = async () => {
//         const token = localStorage.getItem('access_token');
//         let pageNo = 1;
//         let all = [];
//         while (true) {
//             const params = buildParams(pageNo, EXPORT_PAGE_SIZE);
//             const res = await fetch(`${BASE}/api/archive-owners/?${params.toString()}`, {
//                 headers: { "Authorization": `Bearer ${token}` }
//             });
//             if (!res.ok) throw new Error('Failed to fetch records for export');
//             const data = await res.json();
//             if (Array.isArray(data)) return data; // backend not paginated
//             all = all.concat(data.results || []);
//             if (!data.next) break;
//             pageNo++;
//         }
//         return all;
//     };

//     const handleExportPDF = async () => {
//         if (totalCount === 0) return toast.error("No records to export.");
//         setIsGeneratingPdf(true);
//         const toastId = toast.loading("Fetching records...");

//         try {
//             const allOwners = await fetchAllForExport();
//             if (allOwners.length === 0) throw new Error("No records");

//             // Mount the hidden template only now, and wait for it to render
//             setExportOwners(allOwners);
//             await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

//             toast.update(toastId, { render: "Generating PDF..." });

//             const node = pdfRef.current;
//             if (!node) throw new Error("PDF template not mounted");
//             if (document.fonts?.ready) await document.fonts.ready;

//             const rootTop = node.getBoundingClientRect().top;
//             const theadH = node.querySelector('thead').getBoundingClientRect().height;
//             const rows = Array.from(node.querySelectorAll('tbody tr')).map((r) => {
//                 const b = r.getBoundingClientRect();
//                 return { top: b.top - rootTop, bottom: b.bottom - rootTop };
//             });

//             const pages = [];
//             let i = 0;
//             while (i < rows.length) {
//                 const isFirst = pages.length === 0;
//                 const startRow = i;
//                 const used = (r) => isFirst
//                     ? rows[r].bottom + PDF_PAD
//                     : PDF_PAD + theadH + (rows[r].bottom - rows[startRow].top) + PDF_PAD;
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
//                     backgroundColor: "#ffffff",
//                     windowWidth: PDF_PAGE_W,
//                     onclone: (doc) => {
//                         const root = doc.querySelector('[data-pdf-root]');
//                         Array.from(root.querySelectorAll('tbody tr')).forEach((r, idx) => {
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

//                 pdf.setFontSize(9);
//                 pdf.setTextColor(120);
//                 pdf.text(`Page ${p + 1} of ${pages.length}`, pageW / 2, pageH - 4, { align: "center" });
//             }

//             pdf.save(`Archive_Owners_${new Date().toISOString().slice(0, 10)}.pdf`);
//             toast.update(toastId, { render: `✅ PDF downloaded! (${allOwners.length} records, ${pages.length} pages)`, type: "success", isLoading: false, autoClose: 3000 });
//         } catch (err) {
//             console.error("PDF error:", err);
//             toast.update(toastId, { render: "❌ Failed to generate PDF", type: "error", isLoading: false, autoClose: 4000 });
//         } finally {
//             setExportOwners(null); // unmount the hidden template
//             setIsGeneratingPdf(false);
//         }
//     };

//     const handleExportExcel = async () => {
//         if (totalCount === 0) return toast.error("No records to export.");
//         setIsGeneratingExcel(true);
//         const toastId = toast.loading("Preparing Excel...");

//         try {
//             const allOwners = await fetchAllForExport();
//             if (allOwners.length === 0) throw new Error("No records");

//             const mod = await import('exceljs');
//             const ExcelJS = mod.default || mod;

//             const workbook = new ExcelJS.Workbook();
//             const ws = workbook.addWorksheet('Archive Properties', {
//                 views: [{ rightToLeft: false, state: 'frozen', ySplit: 3 }],
//             });

//             const FONT = 'Tahoma';
//             const border = {
//                 top:    { style: 'thin', color: { argb: 'FF999999' } },
//                 left:   { style: 'thin', color: { argb: 'FF999999' } },
//                 bottom: { style: 'thin', color: { argb: 'FF999999' } },
//                 right:  { style: 'thin', color: { argb: 'FF999999' } },
//             };
//             const align = { vertical: 'middle', horizontal: 'left', wrapText: true, readingOrder: 'ltr' };

//             ws.columns = [
//                 { width: 32 },  // A: Name
//                 { width: 18 },  // B: Phone
//                 { width: 22 },  // C: Unit No
//                 { width: 24 },  // D: Community
//                 { width: 24 },  // E: Sub-community
//                 { width: 40 },  // F: Notes (blank)
//                 { width: 18 },  // B: Responsibility

//             ];

//             // Logo
//             try {
//                 const response = await fetch(logo);
//                 const blob = await response.blob();
//                 const base64data = await new Promise((resolve, reject) => {
//                     const reader = new FileReader();
//                     reader.onloadend = () => resolve(reader.result);
//                     reader.onerror = reject;
//                     reader.readAsDataURL(blob);
//                 });
//                 const imageId = workbook.addImage({ base64: base64data, extension: 'png' });
//                 ws.addImage(imageId, { tl: { col: 0, row: 0 }, ext: { width: 250, height: 75 } });
//             } catch (err) {
//                 console.error("Failed to load logo for Excel", err);
//             }

//             // Title
//             ws.mergeCells('A2:F2');
//             const title = ws.getCell('A2');
//             title.value = `Archive Properties Sheet — ${new Date().toLocaleDateString()}`;
//             title.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1e3a8a' } };
//             title.alignment = { vertical: 'middle', horizontal: 'left', readingOrder: 'ltr' };

//             ws.getRow(1).height = 110;
//             ws.getRow(2).height = 34;
//             ws.getRow(3).height = 28;

//             // Header
//             const headerRow = ws.addRow(['Name', 'Phone', 'Unit No', 'Community', 'Sub-community', 'Notes']);
//             headerRow.eachCell((cell) => {
//                 cell.font = { name: FONT, size: 12, bold: true };
//                 cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F7F5' } };
//                 cell.alignment = align;
//                 cell.border = border;
//             });

//             // Data (ALL matching records, not just the current page)
//             allOwners.forEach((owner) => {
//                 const row = ws.addRow([
//                     owner.name || owner.company || '—',
//                     owner.phone || '—',
//                     owner.unit_no || '—',
//                     owner.community || '—',
//                     owner.sub_community || '—',
//                     '',
//                 ]);
//                 row.eachCell((cell) => {
//                     cell.font = { name: FONT, size: 12 };
//                     cell.alignment = align;
//                     cell.border = border;
//                 });
//             });

//             const buffer = await workbook.xlsx.writeBuffer();
//             const blob = new Blob([buffer], {
//                 type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
//             });
//             const url = URL.createObjectURL(blob);
//             const a = document.createElement('a');
//             a.href = url;
//             a.download = `Archive_Owners_${new Date().toISOString().slice(0, 10)}.xlsx`;
//             document.body.appendChild(a);
//             a.click();
//             document.body.removeChild(a);
//             URL.revokeObjectURL(url);
//             toast.update(toastId, { render: `✅ Excel downloaded! (${allOwners.length} records)`, type: "success", isLoading: false, autoClose: 3000 });
//         } catch (err) {
//             console.error("Excel error:", err);
//             toast.update(toastId, { render: "❌ Failed to generate Excel file", type: "error", isLoading: false, autoClose: 4000 });
//         } finally {
//             setIsGeneratingExcel(false);
//         }
//     };

//     // ---------- Loading / error screens ----------
//     if (initialLoading) {
//         return (
//             <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-5">
//                 <div className="w-12 h-12 border-4 border-[#f8f7f5] border-t-[#4285F4] rounded-full animate-spin"></div>
//                 <p className="text-[#4285F4] text-lg font-extrabold">Loading Archive Owners...</p>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-4 p-5 text-center">
//                 <span className="text-5xl">⚠️</span>
//                 <p className="text-red-500 text-lg font-extrabold">{error}</p>
//                 <button className="bg-[#4285F4] text-white px-8 py-3 rounded-lg font-extrabold transition-colors hover:bg-blue-600" onClick={() => refreshOwners()}>
//                     Retry
//                 </button>
//             </div>
//         );
//     }

//     const paginationBar = (
//         <Pagination
//             page={page}
//             pageSize={pageSize}
//             totalCount={totalCount}
//             loading={loading}
//             onPageChange={handlePageChange}
//             onPageSizeChange={handlePageSizeChange}
//         />
//     );

//     return (
//         <div dir="ltr" className="min-h-screen bg-white py-10 px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans relative pb-24">
//             <ToastContainer position="top-right" theme="light" />

//             {/* HEADER */}
//             <div className="flex flex-col xl:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
//                 <div className="text-center xl:text-left">
//                     <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center xl:justify-start gap-3">
//                         <FaArchive className="text-[#4285F4]" /> Archive Properties Sheet
//                     </h2>
//                     <div className="flex items-center justify-center xl:justify-start gap-2 mt-2">
//                         {canViewAll ? (
//                             <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">Viewing: All</span>
//                         ) : (
//                             <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
//                                 <FiLock size={10} /> Viewing: Only My
//                             </span>
//                         )}
//                     </div>
//                 </div>

//                 <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
//                     <div className="flex bg-[#f8f7f5] p-1.5 rounded-lg border border-gray-200 shadow-sm">
//                         <button onClick={() => setViewMode("cards")} className={`p-2 rounded-md transition-all ${viewMode === "cards" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiGrid size={18} /></button>
//                         <button onClick={() => setViewMode("table")} className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiList size={18} /></button>
//                     </div>

//                     <button
//                         onClick={handleExportPDF}
//                         disabled={isGeneratingPdf || totalCount === 0}
//                         title="Export all records matching the current filters to PDF"
//                         className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                         <FaFilePdf /> {isGeneratingPdf ? "Generating..." : "Export PDF"}
//                     </button>
//                     <button
//                         onClick={handleExportExcel}
//                         disabled={isGeneratingExcel || totalCount === 0}
//                         title="Export all records matching the current filters to Excel"
//                         className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                         <FaFileExcel /> {isGeneratingExcel ? "Generating..." : "Export Excel"}
//                     </button>

//                     <button className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#1e3a8a] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={() => { if (!canCreate) return toast.error("No permission."); setShowBulkImportModal(true); }}>
//                         <FiUploadCloud size={18} /> Import
//                     </button>
//                     <button className={`flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#a47d52] text-white hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={handleOpenCreate}>
//                         <FaPlus /> Add Owner
//                     </button>
//                 </div>
//             </div>

//             {/* SEARCH BAR */}
//             <div className="max-w-full mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
//                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
//                     <div className="relative">
//                         <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Search name, phone, unit, reference..."
//                             value={searchTerm}
//                             onChange={(e) => withReset(setSearchTerm)(e.target.value)}
//                             className={INPUT_CLASS}
//                         />
//                     </div>
//                     <div className="relative">
//                         <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Area"
//                             value={searchArea}
//                             onChange={(e) => withReset(setSearchArea)(e.target.value)}
//                             className={INPUT_CLASS}
//                         />
//                     </div>
//                     <div className="relative">
//                         <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Community"
//                             value={searchCommunity}
//                             onChange={(e) => withReset(setSearchCommunity)(e.target.value)}
//                             className={INPUT_CLASS}
//                         />
//                     </div>
//                     <div className="relative">
//                         <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
//                         <input
//                             type="text"
//                             placeholder="Sub-community"
//                             value={searchSubCommunity}
//                             onChange={(e) => withReset(setSearchSubCommunity)(e.target.value)}
//                             className={INPUT_CLASS}
//                         />
//                     </div>
//                 </div>

//                 <div className="mt-3 flex flex-wrap items-center gap-3">
//                     {canViewAll && (
//                         <div className="relative">
//                             <FaUserShield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//                             <select
//                                 value={searchResponsibility}
//                                 onChange={(e) => withReset(setSearchResponsibility)(e.target.value)}
//                                 className={`${SELECT_CLASS} pl-9 min-w-[200px]`}
//                                 disabled={loadingUsers}
//                                 title="Filter by responsibility"
//                             >
//                                 <option value="">{loadingUsers ? "Loading users..." : "Responsibility (All)"}</option>
//                                 <option value="unassigned" className="font-bold text-gray-800">-- Unassigned Only --</option>
//                                 {users.map((u) => (
//                                     <option key={u.id} value={u.id}>{userLabel(u)}</option>
//                                 ))}
//                             </select>
//                         </div>
//                     )}

//                     <div className="relative">
//                         <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//                         <input
//                             type="date"
//                             value={searchDate}
//                             onChange={(e) => withReset(setSearchDate)(e.target.value)}
//                             title="Last communication date"
//                             className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
//                         />
//                     </div>

//                     <select value={searchCategory} onChange={(e) => withReset(setSearchCategory)(e.target.value)} className={SELECT_CLASS}>
//                         <option value="">Category (All)</option>
//                         <option value="residential">Residential</option>
//                         <option value="commercial">Commercial</option>
//                     </select>
//                     <select value={searchOffer} onChange={(e) => withReset(setSearchOffer)(e.target.value)} className={SELECT_CLASS}>
//                         <option value="">Offer (All)</option>
//                         <option value="sale">Sale</option>
//                         <option value="rent">Rent</option>
//                     </select>

//                     <button
//                         onClick={clearFilters}
//                         disabled={activeFilterCount === 0}
//                         className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
//                         title="Clear all filters"
//                     >
//                         <FiX /> Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
//                     </button>

//                     <span className="ml-auto flex items-center gap-2 text-xs font-bold text-gray-500">
//                         {loading && <span className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin"></span>}
//                         {totalCount} {totalCount === 1 ? "record" : "records"}
//                     </span>
//                 </div>
//             </div>

//             <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

//             {/* EMPTY STATE */}
//             {owners.length === 0 ? (
//                 <div className="flex flex-col justify-center items-center gap-4 p-10 text-center bg-[#f8f7f5] rounded-2xl border border-gray-100 max-w-3xl mx-auto shadow-sm">
//                     <span className="text-6xl">🗂️</span>
//                     <h3 className="text-2xl font-extrabold text-gray-800">No Archive Owners Found</h3>
//                     <p className="text-gray-500">Try adjusting your search filters or import a new list.</p>
//                 </div>
//             ) : viewMode === "cards" ? (

//                 /* ========== CARD VIEW ========== */
//                 <div className={`max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
//                     <div className="mb-4 flex flex-wrap items-center gap-4 bg-gray-50 w-fit px-4 py-2 rounded-lg border border-gray-200">
//                         <div className="flex items-center gap-2">
//                             <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === owners.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
//                             <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next</span>
//                         </div>
//                         <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
//                             <option value={50}>50</option>
//                             <option value={100}>100</option>
//                             <option value={200}>200</option>
//                             <option value="All">All ({owners.length})</option>
//                         </select>
//                         <span className="text-sm font-bold text-[#4285F4]">({selectedIds.length} Selected)</span>
//                     </div>

//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//                         {owners.map((owner) => (
//                             <div key={owner.id} className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border relative group ${selectedIds.includes(owner.id) ? 'border-[#4285F4] ring-1 ring-[#4285F4]' : 'border-gray-100'}`}>
//                                 <div className="absolute top-4 left-4 z-20">
//                                     <input type="checkbox" checked={selectedIds.includes(owner.id)} onChange={() => toggleSelectRow(owner.id)} className="w-5 h-5 text-[#4285F4] rounded border-gray-300 focus:ring-[#4285F4] cursor-pointer shadow-sm bg-white" />
//                                 </div>
//                                 <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
//                                     <button onClick={() => handleOpenEdit(owner)} className={`p-2 rounded-full shadow transition-colors ${canUpdate ? "bg-white/90 text-gray-600 hover:bg-[#4285F4] hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
//                                     <button onClick={() => confirmDelete(owner)} className={`p-2 rounded-full shadow transition-colors ${canDelete ? "bg-white/90 text-red-500 hover:bg-red-500 hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
//                                 </div>
//                                 <div className="p-6 pt-10 flex flex-col h-full">
//                                     <div className="flex justify-between items-start mb-4">
//                                         <div className="relative">
//                                             <div className="w-14 h-14 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 group-hover:bg-[#4285F4]/10 transition-colors"><FiUser className="text-[#4285F4]" size={28} /></div>
//                                         </div>
//                                     </div>
//                                     <h3 className="text-xl font-bold text-gray-800 mb-1 truncate hover:text-[#4285F4] cursor-pointer transition-colors" title={owner.name || 'Unnamed Owner'} onClick={() => handleOpenDetails(owner)}>{owner.name || 'Unnamed Owner'}</h3>
//                                     {owner.company && <p className="text-sm font-medium text-gray-500 mb-2 truncate">{owner.company}</p>}

//                                     <div className="mb-4 flex flex-wrap gap-2">
//                                         <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
//                                             <FaUserShield className="text-gray-400" /> {owner.responsibility_name || 'Unassigned'}
//                                         </span>
//                                         {owner.unit_no && (
//                                             <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
//                                                 <FiHome className="text-gray-400" /> {owner.unit_no}
//                                             </span>
//                                         )}
//                                     </div>

//                                     <div className="space-y-3 mt-auto pt-4 border-t border-gray-50">
//                                         <div className="flex items-center gap-3 text-sm text-gray-600">
//                                             <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiPhone className="text-[#4285F4]" size={12} /></div>
//                                             <span className="truncate font-medium">{owner.phone || 'No phone'}</span>
//                                         </div>
//                                         <div className="flex items-center gap-3 text-sm text-gray-600">
//                                             <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiDollarSign className="text-[#4285F4]" size={12} /></div>
//                                             <span className="truncate font-medium">Sale: {formatPrice(owner.sale_price)} | Rent: {formatPrice(owner.rent_price)}</span>
//                                         </div>
//                                         <div className="flex items-center gap-3 text-sm text-gray-600">
//                                             <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiCalendar className="text-[#4285F4]" size={12} /></div>
//                                             <span className="truncate font-medium">{owner.last_communication_date || 'No date'}</span>
//                                         </div>
//                                     </div>
//                                     <button onClick={() => handleOpenDetails(owner)} className="mt-6 w-full flex items-center justify-center gap-2 bg-[#f8f7f5] text-[#4285F4] py-2.5 rounded-lg font-bold text-sm transition-all duration-300 hover:bg-[#4285F4] hover:text-white"><MdVisibility size={16} /> View Details</button>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>

//                     <div className="mt-6 rounded-xl border border-gray-100 overflow-hidden">
//                         {paginationBar}
//                     </div>
//                 </div>
//             ) : (

//                 /* ========== TABLE VIEW (Default) ========== */
//                 <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
//                     <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-4">
//                         <div className="flex items-center gap-2">
//                             <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === owners.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" title="Select Next Chunk" />
//                             <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next Chunk</span>
//                         </div>
//                         <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
//                             <option value={50}>50 Records</option>
//                             <option value={100}>100 Records</option>
//                             <option value={200}>200 Records</option>
//                             <option value="All">All on page ({owners.length})</option>
//                         </select>
//                         {selectedIds.length > 0 && <span className="text-sm font-bold text-[#4285F4] bg-blue-50 px-2 py-1 rounded">{selectedIds.length} Selected</span>}
//                     </div>

//                     <div className="relative">
//                         {/* LEFT ARROW */}
//                         <div className="absolute inset-y-0 left-0 w-14 z-20 pointer-events-none">
//                             {canScrollLeft && (
//                                 <button
//                                     type="button"
//                                     onClick={() => scrollTableBy(-1)}
//                                     title="Scroll left"
//                                     className="pointer-events-auto sticky top-[45vh] ml-2 flex items-center justify-center w-11 h-11 rounded-full bg-gray-500/70 hover:bg-gray-600/80 shadow-lg backdrop-blur-sm transition-all"
//                                 >
//                                     <FiChevronLeft size={26} color="#f8f7f5" />
//                                 </button>
//                             )}
//                         </div>

//                         {/* RIGHT ARROW */}
//                         <div className="absolute inset-y-0 right-0 w-14 z-20 pointer-events-none">
//                             {canScrollRight && (
//                                 <button
//                                     type="button"
//                                     onClick={() => scrollTableBy(1)}
//                                     title="Scroll right"
//                                     className="pointer-events-auto sticky top-[45vh] ml-auto mr-2 flex items-center justify-center w-11 h-11 rounded-full bg-gray-500/70 hover:bg-gray-600/80 shadow-lg backdrop-blur-sm transition-all"
//                                 >
//                                     <FiChevronRight size={26} color="#f8f7f5" />
//                                 </button>
//                             )}
//                         </div>

//                         <div ref={tableScrollRef} onScroll={updateScrollButtons} className="overflow-x-auto custom-scrollbar pb-2">
//                             <table className="w-full text-left border-collapse min-w-max">
//                                 <thead className="bg-[#f8f7f5] border-b border-gray-200">
//                                     <tr>
//                                         <th className="px-4 py-4 w-12 text-center">
//                                             <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === owners.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
//                                         </th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Owner / Phone</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit No</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plot / Land</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property Cat.</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Municipality</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mun. No</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Offer</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sale Price</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rent Price</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Responsibility</th>
//                                         <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-gray-100">
//                                     {owners.map((owner) => (
//                                         <tr key={owner.id} className={`transition-colors ${selectedIds.includes(owner.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
//                                             <td className="px-4 py-4 text-center">
//                                                 <input type="checkbox" checked={selectedIds.includes(owner.id)} onChange={() => toggleSelectRow(owner.id)} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
//                                             </td>
//                                             <td className="px-6 py-4">
//                                                 <div className="flex items-center gap-3">
//                                                     <div className="w-10 h-10 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 shrink-0">
//                                                         <FiUser className="text-[#4285F4]" size={18} />
//                                                     </div>
//                                                     <div className="flex flex-col gap-0.5">
//                                                         <p className="font-bold text-gray-800">{owner.name || 'Unnamed Owner'}</p>
//                                                         {owner.company && <p className="text-xs text-gray-500">{owner.company}</p>}
//                                                         <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
//                                                             <FiPhone size={10} className="text-gray-400" />
//                                                             {owner.phone || '—'}
//                                                         </p>
//                                                     </div>
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4">
//                                                 <div className="flex flex-col gap-1 text-sm text-gray-600">
//                                                     {owner.unit_no && <span className="flex items-center gap-2 font-semibold"><FiHome size={12} className="text-gray-400" /> {owner.unit_no}</span>}
//                                                     {owner.refrence_no && <span className="flex items-center gap-2 text-xs text-gray-400">Ref: {owner.refrence_no}</span>}
//                                                     {!owner.unit_no && !owner.refrence_no && <span>—</span>}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4">
//                                                 <div className="flex flex-col gap-1 text-sm text-gray-600">
//                                                     {owner.plot_no && <span className="font-semibold">Plot: {owner.plot_no}</span>}
//                                                     {owner.land_no && <span className="text-xs text-gray-500">Land: {owner.land_no}</span>}
//                                                     {!owner.plot_no && !owner.land_no && <span>—</span>}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={owner.description}>
//                                                 {owner.description || '—'}
//                                             </td>
//                                             <td className="px-6 py-4 text-sm text-gray-600 capitalize">{owner.property_category || '—'}</td>
//                                             <td className="px-6 py-4">
//                                                 <div className="flex flex-col gap-1 text-sm text-gray-600">
//                                                     <span className="font-bold">{owner.municipality || '—'}</span>
//                                                     {(owner.zone || owner.area) && (
//                                                         <span className="text-xs text-gray-500">
//                                                             {[owner.zone, owner.area].filter(Boolean).join(', ')}
//                                                         </span>
//                                                     )}
//                                                 </div>
//                                             </td>
//                                             <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
//                                                 {owner.municipality_no || '—'}
//                                             </td>
//                                             <td className="px-6 py-4 text-sm text-gray-600 capitalize">{owner.property_offer || '—'}</td>
//                                             <td className="px-6 py-4 font-bold text-emerald-600 text-sm">{formatPrice(owner.sale_price)}</td>
//                                             <td className="px-6 py-4 font-bold text-blue-600 text-sm">{formatPrice(owner.rent_price)}</td>
//                                             <td className="px-6 py-4">
//                                                 <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md"><FaUserShield className="text-gray-400" /> {owner.responsibility_name || 'Unassigned'}</span>
//                                             </td>
//                                             <td className="px-6 py-4 text-right">
//                                                 <div className="flex items-center justify-end gap-2">
//                                                     <button onClick={() => handleOpenDetails(owner)} className="p-2 text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10 rounded-lg transition-colors"><MdVisibility size={18} /></button>
//                                                     <button onClick={() => handleOpenEdit(owner)} className={`p-2 rounded-lg transition-colors ${canUpdate ? "text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10" : "text-gray-300 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
//                                                     <button onClick={() => confirmDelete(owner)} className={`p-2 rounded-lg transition-colors ${canDelete ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-300 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     </div>

//                     {paginationBar}
//                 </div>
//             )}

//             {/* FLOATING BULK ACTIONS BAR */}
//             {selectedIds.length > 0 && (
//                 <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1e3a8a] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-slideUp">
//                     <div className="flex items-center gap-2 border-r border-white/20 pr-6">
//                         <FiCheckSquare size={20} className="text-blue-300" />
//                         <span className="font-bold whitespace-nowrap">{selectedIds.length} Selected</span>
//                     </div>
//                     <div className="flex items-center gap-3">
//                         <button onClick={() => { setShowAssignModal(true); fetchUsers(); }} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold text-sm transition-colors"><FaUserEdit size={16} /> Assign Responsibility</button>
//                         <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkActionLoading} className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
//                             {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FaTrash size={16} />} Delete Selected
//                         </button>
//                     </div>
//                     <button onClick={() => setSelectedIds([])} className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"><MdClose size={20} /></button>
//                 </div>
//             )}

//             {/* MODALS */}
//             {showAddEditModal && <AddEditLandLord landlord={selectedOwner} onClose={handleCloseModals} onSuccess={() => { handleCloseModals(); refreshOwners(); }} />}
//             {showDetailsModal && selectedOwner && <LandLoardDetails landlord={selectedOwner} onClose={handleCloseModals} />}
//             {showBulkImportModal && <AddOwnersArchive onClose={handleCloseModals} onSuccess={() => { refreshOwners(); }} />}

//             {/* BULK ASSIGN MODAL */}
//             {showAssignModal && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
//                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
//                         <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white">
//                             <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2"><FaUserShield className="text-[#4285F4]" /> Assign Responsibility</h3>
//                             <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-red-500"><MdClose size={20} /></button>
//                         </div>

//                         <div className="p-6">
//                             <p className="text-sm text-gray-600 mb-4">Assign responsibility for <strong>{selectedIds.length}</strong> selected records to:</p>
//                             <label className="block text-sm font-bold text-gray-700 mb-2">Select Listing Agent</label>
//                             <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]" disabled={loadingUsers}>
//                                 <option value="">-- Select User --</option>
//                                 <option value={UNASSIGN_VALUE}>Unassigned (remove responsibility)</option>
//                                 {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.username} {u.last_name || ''} ({u.role === 'listing' ? 'Listing' : 'Listing Sales Rent'})</option>)}
//                             </select>
//                             {loadingUsers && <p className="text-xs text-blue-500 mt-2">Loading agents...</p>}
//                             {!loadingUsers && users.length === 0 && <p className="text-xs text-red-500 mt-2">No eligible users found.</p>}
//                         </div>
//                         <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
//                             <button onClick={() => setShowAssignModal(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-white transition-colors">Cancel</button>
//                             <button onClick={handleBulkAssign} disabled={!selectedUser || bulkActionLoading} className="px-6 py-2.5 rounded-lg bg-[#4285F4] text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2">
//                                 {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null} Assign
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* BULK DELETE CONFIRMATION MODAL */}
//             {bulkDeleteConfirm && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
//                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
//                         <div className="flex justify-center pt-6 pb-4">
//                             <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100"><FiAlertTriangle className="text-red-500" size={32} /></div>
//                         </div>
//                         <div className="px-6 pb-6">
//                             <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Bulk Delete</h3>
//                             <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-red-600">{selectedIds.length}</span> selected records? This action cannot be undone.</p>
//                             <div className="flex gap-3">
//                                 <button onClick={() => setBulkDeleteConfirm(false)} disabled={bulkActionLoading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
//                                 <button onClick={handleBulkDelete} disabled={bulkActionLoading} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
//                                     {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MdDeleteForever size={18} />} Yes, Delete {selectedIds.length} Records
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* STANDARD DELETE CONFIRMATION MODAL */}
//             {deleteConfirm && (
//                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
//                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
//                         <div className="flex justify-center pt-6 pb-4"><div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100"><FiAlertTriangle className="text-red-500" size={32} /></div></div>
//                         <div className="px-6 pb-6">
//                             <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Delete</h3>
//                             <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.name || deleteConfirm.company}"</span>? This action cannot be undone.</p>
//                             <div className="flex gap-3">
//                                 <button onClick={() => setDeleteConfirm(null)} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
//                                 <button onClick={handleDeleteOwner} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
//                                     {deletingId === deleteConfirm.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MdDeleteForever size={18} />} Delete
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* HIDDEN PDF TEMPLATE — mounted only while exporting */}
//             {exportOwners && <PdfExportTemplate ref={pdfRef} owners={exportOwners} />}
//         </div>
//     );
// };

// export default OwnersArchive;


// import React, { useState, useEffect, useRef } from 'react';
    // import { toast, ToastContainer } from 'react-toastify';
    // import 'react-toastify/dist/ReactToastify.css';
    // import { MdDeleteForever, MdModeEdit, MdVisibility, MdClose } from 'react-icons/md';
    // import { FiUser, FiPhone, FiLock, FiGrid, FiList, FiAlertTriangle, FiUploadCloud, FiCheckSquare, FiCalendar, FiHome, FiDollarSign, FiSearch, FiX, FiDownload, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
    // import { FaArchive, FaPlus, FaUserShield, FaTrash, FaUserEdit, FaMapMarkerAlt, FaFilePdf, FaFileExcel } from 'react-icons/fa';
    // import html2canvas from 'html2canvas';
    // import jsPDF from 'jspdf';

    // import AddEditLandLord from "../../components/en/listing/AddEditLandLoard";
    // import LandLoardDetails from "../../components/en/listing/LandLordDetails";
    // import AddOwnersArchive from "../../components/en/listing/AddOwnersArchive";
    // import { usePermissions } from "../context/PermissionsContext"; 



    // // ✅ Import Logo
    // import logo from '../../assets/images/logogo-removebg-old.png';

    // const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

    // // Format numbers with commas
    // const formatPrice = (value) => {
    //     if (!value || Number(value) === 0) return '—';
    //     return Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    // };

    // // Display name of a user in dropdowns
    // const userLabel = (u) => `${u.first_name || u.username || 'User'} ${u.last_name || ''}`.trim();

    // const UNASSIGN_VALUE = "unassigned"; 

    // // Shared classes for the search bar controls
    // const INPUT_CLASS = "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]";
    // const SELECT_CLASS = "px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4285F4]";

    // // ---------- PDF export helpers ----------
    // const PDF_PAGE_W = 1123;                                  
    // const PDF_PAGE_H = Math.round((PDF_PAGE_W * 210) / 297);  
    // const PDF_PAD = 30;                                       

    // const escapeHtml = (v) =>
    //     String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // const PDF_FONT = '"Segoe UI", Tahoma, "Noto Sans Arabic", "Arial Unicode MS", Arial, sans-serif';

    // // ---------- Hidden PDF Template for Export ----------
    // const PdfExportTemplate = React.forwardRef(({ owners }, ref) => {
    //     const th = {
    //         padding: "10px 8px",
    //         border: "1px solid #d1d5db",
    //         fontSize: "13px",
    //         fontWeight: "bold",
    //         textAlign: "left",
    //         letterSpacing: "normal",
    //     };

    //     const td = {
    //         padding: "8px",
    //         border: "1px solid #e5e7eb",
    //         fontSize: "14px",
    //         lineHeight: 1.5,
    //         verticalAlign: "top",
    //         letterSpacing: "normal",
    //         wordBreak: "break-word",
    //         unicodeBidi: "plaintext",
    //     };

    //     const small = { fontSize: "12px", color: "#6b7280" };

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
    //                 letterSpacing: "normal",
    //                 position: "fixed",
    //                 left: "-9999px",
    //                 top: 0,
    //                 zIndex: -1,
    //             }}
    //         >
    //             <div data-pdf-header style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #a47d52", paddingBottom: "16px", marginBottom: "20px" }}>
    //                 <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "60px", objectFit: "contain" }} />
    //                 <div style={{ marginLeft: "20px" }}>
    //                     <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a", margin: 0 }}>Archive Properties Sheet</h1>
    //                     <p style={{ fontSize: "14px", color: "#6b7280", margin: "5px 0 0 0" }}>
    //                         Generated: {new Date().toLocaleString()} — <span data-pdf-count>{owners.length} records</span>
    //                     </p>
    //                 </div>
    //             </div>

    //             <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
    //                 <colgroup>
    //                     <col style={{ width: "14%" }} /> {/* Owner / Phone */}
    //                     <col style={{ width: "10%" }} /> {/* Unit No */}
    //                     <col style={{ width: "10%" }} /> {/* Plot / Land */}
    //                     <col style={{ width: "16%" }} /> {/* Description */}
    //                     <col style={{ width: "8%" }} />  {/* Property Cat. */}
    //                     <col style={{ width: "10%" }} /> {/* Municipality */}
    //                     <col style={{ width: "8%" }} />  {/* Municipality No */}
    //                     <col style={{ width: "8%" }} />  {/* Offer */}
    //                     <col style={{ width: "8%" }} />  {/* Sale Price */}
    //                     <col style={{ width: "8%" }} />  {/* Rent Price */}
    //                 </colgroup>
    //                 <thead>
    //                     <tr style={{ backgroundColor: "#f8f7f5", color: "#374151" }}>
    //                         <th style={th}>Owner / Phone</th>
    //                         <th style={th}>Unit No</th>
    //                         <th style={th}>Plot / Land</th>
    //                         <th style={th}>Description</th>
    //                         <th style={th}>Property Cat.</th>
    //                         <th style={th}>Municipality</th>
    //                         <th style={th}>Mun. No</th>
    //                         <th style={th}>Offer</th>
    //                         <th style={th}>Sale</th>
    //                         <th style={th}>Rent</th>
    //                     </tr>
    //                 </thead>
    //                 <tbody>
    //                     {owners.map((owner) => (
    //                         <tr key={owner.id}>
    //                             <td style={td}>
    //                                 <div dir="auto" style={{ fontWeight: "bold" }}>{owner.name || 'Unnamed'}</div>
    //                                 {owner.company && <div dir="auto" style={small}>{owner.company}</div>}
    //                                 <div style={{ fontSize: "12px", color: "#4b5563" }}>{owner.phone || '—'}</div>
    //                                 <div style={{ fontSize: "11px", color: "#4285F4", fontWeight: "bold" }}>{owner.responsibility_name || 'Unassigned'}</div>
    //                             </td>
    //                             <td style={td}>
    //                                 <div style={{ fontWeight: "bold" }}>{owner.unit_no || '—'}</div>
    //                                 {owner.refrence_no && <div style={small}>Ref: {owner.refrence_no}</div>}
    //                             </td>
    //                             <td style={td}>
    //                                 <div style={{ fontWeight: "bold" }}>Plot: {owner.plot_no || '—'}</div>
    //                                 <div style={small}>Land: {owner.land_no || '—'}</div>
    //                             </td>
    //                             <td dir="auto" style={{ ...td, whiteSpace: "pre-wrap" }}>{owner.description || '—'}</td>
    //                             <td style={{ ...td, textTransform: "capitalize" }}>{owner.property_category || '—'}</td>
    //                             <td style={td}>
    //                                 <div dir="auto">{owner.municipality || '—'}</div>
    //                                 {owner.zone && <div dir="auto" style={small}>Zone: {owner.zone}</div>}
    //                             </td>
    //                             <td style={td}>{owner.municipality_no || '—'}</td>
    //                             <td style={{ ...td, textTransform: "capitalize" }}>{owner.property_offer || '—'}</td>
    //                             <td style={{ ...td, fontWeight: "bold", color: "#059669" }}>{formatPrice(owner.sale_price)}</td>
    //                             <td style={{ ...td, fontWeight: "bold", color: "#2563eb" }}>{formatPrice(owner.rent_price)}</td>
    //                         </tr>
    //                     ))}
    //                 </tbody>
    //             </table>
    //         </div>
    //     );
    // });

    // // End PDF /////////////////////////////////////

    // const OwnersArchive = () => {
        
    //     const { permissions } = usePermissions(); 
        
    //     // 1) ALL your useState / useRef declarations first
    //     const [owners, setOwners] = useState([]);
    //     const [loading, setLoading] = useState(true);            
    //     const [initialLoading, setInitialLoading] = useState(true); 
    //     const [error, setError] = useState(null);
    //     // View Mode State
    //     const [viewMode, setViewMode] = useState("table"); 
        
    //     // Add the ref, state and scroll helpers
    //     // 2) THEN the scroll arrows block
    //     const tableScrollRef = useRef(null);
    //     const [canScrollLeft, setCanScrollLeft] = useState(false);
    //     const [canScrollRight, setCanScrollRight] = useState(false);

    //     const updateScrollButtons = () => {
    //         const el = tableScrollRef.current;
    //         if (!el) return;
    //         setCanScrollLeft(el.scrollLeft > 2);
    //         setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    //     };

    //     const scrollTableBy = (direction) => {
    //         tableScrollRef.current?.scrollBy({ left: direction * 500, behavior: 'smooth' });
    //     };

    //     useEffect(() => {
    //         updateScrollButtons();
    //         window.addEventListener('resize', updateScrollButtons);
    //         return () => window.removeEventListener('resize', updateScrollButtons);
    //     }, [owners, viewMode, loading, initialLoading]);

        
    //     // Modal State
    //     const [showAddEditModal, setShowAddEditModal] = useState(false);
    //     const [showDetailsModal, setShowDetailsModal] = useState(false);
    //     const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    //     const [selectedOwner, setSelectedOwner] = useState(null);
    //     const [deletingId, setDeletingId] = useState(null);

    //     // Delete Confirmation States
    //     const [deleteConfirm, setDeleteConfirm] = useState(null);
    //     const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

        

    //     // Bulk Actions State
    //     const [selectedIds, setSelectedIds] = useState([]);
    //     const [showAssignModal, setShowAssignModal] = useState(false);
    //     const [users, setUsers] = useState([]);
    //     const [loadingUsers, setLoadingUsers] = useState(false);
    //     const [selectedUser, setSelectedUser] = useState("");
    //     const [bulkActionLoading, setBulkActionLoading] = useState(false);

    //     // Chunk Selection State
    //     const [chunkSize, setChunkSize] = useState(100); 

    //     // Search / filter state
    //     const [searchTerm, setSearchTerm] = useState("");                 
    //     const [searchArea, setSearchArea] = useState("");                 
    //     const [searchCommunity, setSearchCommunity] = useState("");       
    //     const [searchSubCommunity, setSearchSubCommunity] = useState(""); 
    //     const [searchResponsibility, setSearchResponsibility] = useState(""); 
    //     const [searchDate, setSearchDate] = useState("");                 
    //     const [searchCategory, setSearchCategory] = useState("");         
    //     const [searchOffer, setSearchOffer] = useState("");               

    //     // Export State
    //     const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    //     const pdfRef = useRef(null);

    //     const requestId = useRef(0);

    //     // Permissions
    //     const canViewAll = permissions?.view_all_archive_owners === true;
    //     const canCreate = permissions?.create_bulk_archive_owners === true; 
    //     const canUpdate = permissions?.update_bulk_responsibility_archive_owners === true;
    //     const canDelete = permissions?.delete_bulk_archive_owners === true;

    //     const activeFilterCount = [
    //         searchTerm, searchArea, searchCommunity, searchSubCommunity,
    //         searchResponsibility, searchDate, searchCategory, searchOffer,
    //     ].filter(Boolean).length;

    //     const buildQueryString = () => {
    //         const params = new URLSearchParams();
    //         if (searchTerm.trim()) params.append('search', searchTerm.trim());
    //         if (searchArea.trim()) params.append('area', searchArea.trim());
    //         if (searchCommunity.trim()) params.append('community', searchCommunity.trim());
    //         if (searchSubCommunity.trim()) params.append('sub_community', searchSubCommunity.trim());
    //         if (searchResponsibility) params.append('responsibility', searchResponsibility);
    //         if (searchDate) params.append('last_communication_date', searchDate);
    //         if (searchCategory) params.append('property_category', searchCategory);
    //         if (searchOffer) params.append('property_offer', searchOffer);
    //         const queryString = params.toString();
    //         return queryString ? `?${queryString}` : "";
    //     };

    //     const fetchOwners = async (queryString = "") => {
    //         const myRequest = ++requestId.current;
    //         setLoading(true);
    //         setError(null);
    //         try {
    //             const token = localStorage.getItem('access_token');
    //             if (!token) {
    //                 toast.error('Please login to view Archive Owners');
    //                 setLoading(false);
    //                 window.location.href = '/login';
    //                 return;
    //             }

    //             const response = await fetch(`${BASE}/api/archive-owners/${queryString}`, {
    //                 method: "GET",
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                     "Authorization": `Bearer ${token}`
    //                 }
    //             });

    //             if (!response.ok) {
    //                 if (response.status === 401) {
    //                     toast.error('Session expired. Please login again.');
    //                     localStorage.removeItem('access_token');
    //                     window.location.href = '/login';
    //                 } else {
    //                     toast.error('Failed to load Archive Owners');
    //                 }
    //                 throw new Error(`HTTP error! status: ${response.status}`);
    //             }

    //             const data = await response.json();
    //             if (myRequest !== requestId.current) return;
                
    //             let ownersData = [];
    //             if (Array.isArray(data)) {
    //                 ownersData = data;
    //             } else if (data.results && Array.isArray(data.results)) {
    //                 ownersData = data.results;
    //             }

    //             setOwners(ownersData);
    //             setSelectedIds([]); 
    //         } catch (err) {
    //             if (myRequest !== requestId.current) return;
    //             setError('Failed to load Archive Owners');
    //             console.error('Error fetching archive owners:', err);
    //         } finally {
    //             if (myRequest === requestId.current) {
    //                 setLoading(false);
    //                 setInitialLoading(false);
    //             }
    //         }
    //     };

    //     const refreshOwners = () => fetchOwners(buildQueryString());

    //     useEffect(() => {
    //         const timeout = setTimeout(() => {
    //             fetchOwners(buildQueryString());
    //         }, 500);
    //         return () => clearTimeout(timeout);
    //     }, [searchTerm, searchArea, searchCommunity, searchSubCommunity, searchResponsibility, searchDate, searchCategory, searchOffer]);

    //     const fetchUsers = async () => {
    //         if (users.length > 0 || loadingUsers) return; 
    //         setLoadingUsers(true);
    //         try {
    //             const token = localStorage.getItem('access_token');
    //             const response = await fetch(`${BASE}/api/users/`, {
    //                 headers: { "Authorization": `Bearer ${token}` }
    //             });
    //             if (response.ok) {
    //                 const data = await response.json();
    //                 const userList = Array.isArray(data) ? data : (data.results || data.users || []);
    //                 const filteredUsers = userList.filter(u => u.role === 'listing' || u.role === 'listing_sales_rent');
    //                 setUsers(filteredUsers);
    //             }
    //         } catch (err) {
    //             console.error("Failed to load users", err);
    //         } finally {
    //             setLoadingUsers(false);
    //         }
    //     };

    //     useEffect(() => {
    //         if (canViewAll) fetchUsers();
    //     }, [canViewAll]);

    //     const handleSmartSelectAll = () => {
    //         const totalVisibleRecords = owners.length;
    //         if (selectedIds.length === totalVisibleRecords && totalVisibleRecords > 0) {
    //             setSelectedIds([]);
    //             return;
    //         }
    //         if (chunkSize === "All") {
    //             setSelectedIds(owners.map(o => o.id));
    //             return;
    //         }
    //         const nextChunk = owners
    //             .filter(o => !selectedIds.includes(o.id))
    //             .slice(0, chunkSize)
    //             .map(o => o.id);

    //         if (nextChunk.length === 0) {
    //             toast.info("All visible records are already selected.");
    //             return;
    //         }
    //         setSelectedIds(prev => [...prev, ...nextChunk]);
    //     };

    //     const toggleSelectRow = (id) => {
    //         setSelectedIds(prev => 
    //             prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    //         );
    //     };

    //     const handleBulkDelete = async () => {
    //         setBulkActionLoading(true);
    //         try {
    //             const token = localStorage.getItem('access_token');
    //             const response = await fetch(`${BASE}/api/archive-owners/bulk-delete/`, {
    //                 method: 'DELETE',
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                     "Authorization": `Bearer ${token}`
    //                 },
    //                 body: JSON.stringify({ ids: selectedIds })
    //             });

    //             if (!response.ok) throw new Error("Failed to bulk delete");

    //             toast.success(`✅ Successfully deleted ${selectedIds.length} records.`);
    //             setBulkDeleteConfirm(false);
    //             setSelectedIds([]); 
    //             refreshOwners(); 
    //         } catch (err) {
    //             console.error(err);
    //             toast.error("❌ Error deleting records.");
    //         } finally {
    //             setBulkActionLoading(false);
    //         }
    //     };

    //     const handleBulkAssign = async () => {
    //         if (!selectedUser) return toast.error("Please select a user to assign.");
    //         const isUnassign = selectedUser === UNASSIGN_VALUE;

    //         setBulkActionLoading(true);
    //         try {
    //             const token = localStorage.getItem('access_token');
    //             const response = await fetch(`${BASE}/api/archive-owners/bulk-assign/`, {
    //                 method: 'PATCH',
    //                 headers: {
    //                     "Content-Type": "application/json",
    //                     "Authorization": `Bearer ${token}`
    //                 },
    //                 body: JSON.stringify({ 
    //                     ids: selectedIds, 
    //                     responsibility_id: isUnassign ? null : selectedUser 
    //                 })
    //             });

    //             if (!response.ok) {
    //                 const errorData = await response.json();
    //                 throw new Error(errorData.error || "Failed to bulk assign");
    //             }

    //             const assignedUserObj = isUnassign ? null : users.find(u => u.id.toString() === selectedUser.toString());
    //             const assignedName = isUnassign ? "Unassigned" : (assignedUserObj ? userLabel(assignedUserObj) : "Assigned User");

    //             setOwners(prevOwners => 
    //                 prevOwners.map(owner => 
    //                     selectedIds.includes(owner.id) 
    //                         ? { ...owner, responsibility: isUnassign ? null : selectedUser, responsibility_name: isUnassign ? null : assignedName } 
    //                         : owner
    //                 )
    //             );

    //             toast.success(
    //                 isUnassign ? `✅ Responsibility removed from ${selectedIds.length} records.` : `✅ Successfully assigned responsibility for ${selectedIds.length} records.`
    //             );
    //             setSelectedIds([]);
    //             setShowAssignModal(false);
    //             setSelectedUser("");
    //             refreshOwners(); 
    //         } catch (err) {
    //             toast.error(`❌ ${err.message}`);
    //         } finally {
    //             setBulkActionLoading(false);
    //         }
    //     };

    //     const confirmDelete = (owner) => {
    //         if (!canDelete) return toast.error("You don't have permission to delete archive owners.");
    //         setDeleteConfirm(owner);
    //     };

    //     const handleDeleteOwner = async () => {
    //         if (!deleteConfirm) return;
    //         const id = deleteConfirm.id;
    //         setDeletingId(id);
    //         try {
    //             const token = localStorage.getItem('access_token');
    //             const response = await fetch(`${BASE}/api/archive-owners/${id}/delete/`, {
    //                 method: "DELETE",
    //                 headers: { "Authorization": `Bearer ${token}` }
    //             });

    //             if (!response.ok) {
    //                 toast.error('Failed to delete Archive Owner');
    //                 return;
    //             }

    //             setOwners(prev => prev.filter(item => item.id !== id));
    //             toast.success(`✅ Archive Owner deleted successfully!`);
    //             setDeleteConfirm(null); 
    //         } catch (err) {
    //             toast.error('Server connection error');
    //         } finally {
    //             setDeletingId(null);
    //         }
    //     };

    //     const handleOpenCreate = () => {
    //         if (!canCreate) return toast.error("You don't have permission to create archive owners.");
    //         setSelectedOwner(null);
    //         setShowAddEditModal(true);
    //     };

    //     const handleOpenEdit = (owner) => {
    //         if (!canUpdate) return toast.error("You don't have permission to edit archive owners.");
    //         setSelectedOwner(owner);
    //         setShowAddEditModal(true);
    //     };

    //     const handleOpenDetails = (owner) => {
    //         setSelectedOwner(owner);
    //         setShowDetailsModal(true);
    //     };

    //     const handleCloseModals = () => {
    //         setShowAddEditModal(false);
    //         setShowDetailsModal(false);
    //         setShowBulkImportModal(false);
    //         setShowAssignModal(false);
    //         setSelectedOwner(null);
    //         setDeleteConfirm(null);
    //     };

    //     const clearFilters = () => {
    //         setSearchTerm("");
    //         setSearchArea("");
    //         setSearchCommunity("");
    //         setSearchSubCommunity("");
    //         setSearchResponsibility("");
    //         setSearchDate("");
    //         setSearchCategory("");
    //         setSearchOffer("");
    //     };

    //     const handleExportPDF = async () => {
    //         if (owners.length === 0) return toast.error("No records to export.");
    //         setIsGeneratingPdf(true);
    //         const toastId = toast.loading("Generating PDF...");

    //         try {
    //             const node = pdfRef.current;
    //             if (document.fonts?.ready) await document.fonts.ready;

    //             const rootTop = node.getBoundingClientRect().top;
    //             const theadH = node.querySelector('thead').getBoundingClientRect().height;
    //             const rows = Array.from(node.querySelectorAll('tbody tr')).map((r) => {
    //                 const b = r.getBoundingClientRect();
    //                 return { top: b.top - rootTop, bottom: b.bottom - rootTop };
    //             });

    //             const pages = [];
    //             let i = 0;
    //             while (i < rows.length) {
    //                 const isFirst = pages.length === 0;
    //                 const startRow = i;
    //                 const used = (r) => isFirst
    //                     ? rows[r].bottom + PDF_PAD                                            
    //                     : PDF_PAD + theadH + (rows[r].bottom - rows[startRow].top) + PDF_PAD; 
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
    //                     backgroundColor: "#ffffff",
    //                     windowWidth: PDF_PAGE_W,
    //                     onclone: (doc) => {
    //                         const root = doc.querySelector('[data-pdf-root]');
    //                         Array.from(root.querySelectorAll('tbody tr')).forEach((r, idx) => {
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

    //                 pdf.setFontSize(9);
    //                 pdf.setTextColor(120);
    //                 pdf.text(`Page ${p + 1} of ${pages.length}`, pageW / 2, pageH - 4, { align: "center" });
    //             }

    //             pdf.save(`Archive_Owners_${new Date().toISOString().slice(0, 10)}.pdf`);
    //             toast.update(toastId, { render: `✅ PDF downloaded! (${owners.length} records, ${pages.length} pages)`, type: "success", isLoading: false, autoClose: 3000 });
    //         } catch (err) {
    //             console.error("PDF error:", err);
    //             toast.update(toastId, { render: "❌ Failed to generate PDF", type: "error", isLoading: false, autoClose: 4000 });
    //         } finally {
    //             setIsGeneratingPdf(false);
    //         }
    //     };

        
        
    //     const handleExportExcel = async () => {
    //     if (owners.length === 0) return toast.error("No records to export.");

    //     try {
    //         const mod = await import('exceljs');
    //         const ExcelJS = mod.default || mod;

    //         const workbook = new ExcelJS.Workbook();
    //         const ws = workbook.addWorksheet('Archive Properties', {
    //             views: [{ rightToLeft: false, state: 'frozen', ySplit: 3 }],
    //         });

    //         const FONT = 'Tahoma';
    //         const border = {
    //             top:    { style: 'thin', color: { argb: 'FF999999' } },
    //             left:   { style: 'thin', color: { argb: 'FF999999' } },
    //             bottom: { style: 'thin', color: { argb: 'FF999999' } },
    //             right:  { style: 'thin', color: { argb: 'FF999999' } },
    //         };
    //         const align = { vertical: 'middle', horizontal: 'left', wrapText: true, readingOrder: 'ltr' };

    //         // ⬇️ REQUESTED COLUMN ORDER: name, phone, unit_no, community, sub_community + Notes
    //         ws.columns = [
    //             { width: 32 },  // A: Name
    //             { width: 18 },  // B: Phone
    //             { width: 22 },  // C: Unit No
    //             { width: 24 },  // D: Community
    //             { width: 24 },  // E: Sub-community
    //             { width: 40 },  // F: Notes (blank)
    //         ];

    //         // ---- LOGO (larger, clearer) ----
    //         try {
    //             const response = await fetch(logo);
    //             const blob = await response.blob();
    //             const base64data = await new Promise((resolve, reject) => {
    //                 const reader = new FileReader();
    //                 reader.onloadend = () => resolve(reader.result);
    //                 reader.onerror = reject;
    //                 reader.readAsDataURL(blob);
    //             });
    //             const imageId = workbook.addImage({ base64: base64data, extension: 'png' });

    //             // ✅ Much larger logo, spans a taller header
    //             ws.addImage(imageId, {
    //                 tl: { col: 0, row: 0 },
    //                 ext: { width: 300, height: 110 },
    //             });
    //         } catch (err) {
    //             console.error("Failed to load logo for Excel", err);
    //         }

    //         // ---- TITLE ----
    //         ws.mergeCells('A2:F2');
    //         const title = ws.getCell('A2');
    //         title.value = `Archive Properties Sheet — ${new Date().toLocaleDateString()}`;
    //         title.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1e3a8a' } };
    //         title.alignment = { vertical: 'middle', horizontal: 'left', readingOrder: 'ltr' };

    //         // Row heights must accommodate the 110px‑tall logo
    //         ws.getRow(1).height = 110;
    //         ws.getRow(2).height = 34;
    //         ws.getRow(3).height = 28;

    //         // ---- HEADER ----
    //         const headerRow = ws.addRow([
    //             'Name', 'Phone', 'Unit No', 'Community', 'Sub-community', 'Notes',
    //         ]);
    //         headerRow.eachCell((cell) => {
    //             cell.font = { name: FONT, size: 12, bold: true };
    //             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F7F5' } };
    //             cell.alignment = align;
    //             cell.border = border;
    //         });

    //         // ---- DATA ----
    //         owners.forEach((owner) => {
    //             const row = ws.addRow([
    //                 owner.name || owner.company || '—',
    //                 owner.phone || '—',
    //                 owner.unit_no || '—',
    //                 owner.community || '—',
    //                 owner.sub_community || '—',
    //                 '', // Notes: intentionally blank
    //             ]);
    //             row.eachCell((cell) => {
    //                 cell.font = { name: FONT, size: 12 };
    //                 cell.alignment = align;
    //                 cell.border = border;
    //             });
    //         });

    //         const buffer = await workbook.xlsx.writeBuffer();
    //         const blob = new Blob([buffer], {
    //             type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    //         });
    //         const url = URL.createObjectURL(blob);
    //         const a = document.createElement('a');
    //         a.href = url;
    //         a.download = `Archive_Owners_${new Date().toISOString().slice(0, 10)}.xlsx`;
    //         document.body.appendChild(a);
    //         a.click();
    //         document.body.removeChild(a);
    //         URL.revokeObjectURL(url);
    //         toast.success("✅ Excel downloaded!");
    //     } catch (err) {
    //         console.error("Excel error:", err);
    //         toast.error("❌ Failed to generate Excel file");
    //     }
    // };



    //     // const handleExportExcel = async () => {
    //     //     if (owners.length === 0) return toast.error("No records to export.");

    //     //     try {
    //     //         const mod = await import('exceljs');
    //     //         const ExcelJS = mod.default || mod;

    //     //         const workbook = new ExcelJS.Workbook();
    //     //         const ws = workbook.addWorksheet('Archive Properties', {
    //     //             views: [{ rightToLeft: false, state: 'frozen', ySplit: 3 }], 
    //     //         });

    //     //         const FONT = 'Tahoma';
    //     //         const border = {
    //     //             top: { style: 'thin', color: { argb: 'FF999999' } },
    //     //             left: { style: 'thin', color: { argb: 'FF999999' } },
    //     //             bottom: { style: 'thin', color: { argb: 'FF999999' } },
    //     //             right: { style: 'thin', color: { argb: 'FF999999' } },
    //     //         };
    //     //         const align = { vertical: 'top', horizontal: 'left', wrapText: true, readingOrder: 'ltr' };

    //     //         ws.columns = [
    //     //             { width: 34 },  // Owner / Phone
    //     //             { width: 16 },  // Unit / Ref
    //     //             { width: 20 },  // Plot / Land
    //     //             { width: 40 },  // Description
    //     //             { width: 16 },  // Property Cat.
    //     //             { width: 20 },  // Municipality
    //     //             { width: 16 },  // Municipality No
    //     //             { width: 12 },  // Offer
    //     //             { width: 16 },  // Sale Price
    //     //             { width: 16 },  // Rent Price
    //     //             { width: 26 },  // Responsibility
    //     //         ];

    //     //         // ✅ LOGO IN EXCEL HEADER
    //     //         try {
    //     //             const response = await fetch(logo);
    //     //             const blob = await response.blob();
    //     //             const base64data = await new Promise((resolve, reject) => {
    //     //                 const reader = new FileReader();
    //     //                 reader.onloadend = () => resolve(reader.result);
    //     //                 reader.onerror = reject;
    //     //                 reader.readAsDataURL(blob);
    //     //             });

    //     //             const imageId = workbook.addImage({
    //     //                 base64: base64data,
    //     //                 extension: 'png',
    //     //             });

    //     //             // Add image to row 1, spanning columns A to C
    //     //             ws.addImage(imageId, {
    //     //                 tl: { col: 0, row: 0 },
    //     //                 ext: { width: 150, height: 50 }
    //     //             });
    //     //         } catch (err) {
    //     //             console.error("Failed to load logo for Excel", err);
    //     //         }

    //     //         // Title row (Row 2)
    //     //         ws.mergeCells('A2:K2');
    //     //         const title = ws.getCell('A2');
    //     //         title.value = `Archive Properties Sheet - ${new Date().toLocaleDateString()}`;
    //     //         title.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF1e3a8a' } };
    //     //         title.alignment = { vertical: 'middle', horizontal: 'left', readingOrder: 'ltr' };
    //     //         ws.getRow(1).height = 55; // Space for logo
    //     //         ws.getRow(2).height = 32;

    //     //         // Header row (Row 3)
    //     //         const headerRow = ws.addRow([
    //     //             'Owner / Phone', 'Unit / Ref', 'Plot / Land', 'Description', 
    //     //             'Property Cat.', 'Municipality', 'Municipality No', 'Offer', 
    //     //             'Sale Price', 'Rent Price', 'Responsibility',
    //     //         ]);
    //     //         headerRow.eachCell((cell) => {
    //     //             cell.font = { name: FONT, size: 12, bold: true };
    //     //             cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F7F5' } };
    //     //             cell.alignment = align;
    //     //             cell.border = border;
    //     //         });

    //     //         owners.forEach((owner) => {
    //     //             const ownerParts = [{ font: { name: FONT, size: 12, bold: true }, text: owner.name || 'Unnamed' }];
    //     //             if (owner.company) ownerParts.push({ font: { name: FONT, size: 12 }, text: `\n${owner.company}` });
    //     //             ownerParts.push({ font: { name: FONT, size: 12 }, text: `\n${owner.phone || '—'}` });

    //     //             const plotLand = [owner.plot_no ? `Plot: ${owner.plot_no}` : null, owner.land_no ? `Land: ${owner.land_no}` : null].filter(Boolean).join('\n');
    //     //             const unitRef = [owner.unit_no || '—', owner.refrence_no || ''].filter(Boolean).join('\n');

    //     //             const sale = Number(owner.sale_price) > 0 ? Number(owner.sale_price) : '—';
    //     //             const rent = Number(owner.rent_price) > 0 ? Number(owner.rent_price) : '—';

    //     //             const row = ws.addRow([
    //     //                 { richText: ownerParts },
    //     //                 unitRef,
    //     //                 plotLand || '—',
    //     //                 owner.description || '—',
    //     //                 owner.property_category || '—',
    //     //                 owner.municipality || '—',
    //     //                 owner.municipality_no || '—',
    //     //                 owner.property_offer || '—',
    //     //                 sale,
    //     //                 rent,
    //     //                 owner.responsibility_name || 'Unassigned',
    //     //             ]);

    //     //             row.eachCell((cell, colNumber) => {
    //     //                 if (colNumber !== 1) cell.font = { name: FONT, size: 12 };
    //     //                 cell.alignment = align;
    //     //                 cell.border = border;
    //     //             });

    //     //             [9, 10].forEach((c) => {
    //     //                 const cell = row.getCell(c);
    //     //                 if (typeof cell.value === 'number') {
    //     //                     cell.numFmt = Number.isInteger(cell.value) ? '#,##0' : '#,##0.00';
    //     //                 }
    //     //             });
    //     //         });

    //     //         const buffer = await workbook.xlsx.writeBuffer();
    //     //         const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    //     //         const url = URL.createObjectURL(blob);
    //     //         const a = document.createElement("a");
    //     //         a.href = url;
    //     //         a.download = `Archive_Owners_${new Date().toISOString().slice(0, 10)}.xlsx`;
    //     //         document.body.appendChild(a);
    //     //         a.click();
    //     //         document.body.removeChild(a);
    //     //         URL.revokeObjectURL(url);
    //     //         toast.success("✅ Excel downloaded!");
    //     //     } catch (err) {
    //     //         console.error("Excel error:", err);
    //     //         toast.error("❌ Failed to generate Excel file");
    //     //     }
    //     // };

        

    //     if (initialLoading) {
    //         return (
    //             <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-5">
    //                 <div className="w-12 h-12 border-4 border-[#f8f7f5] border-t-[#4285F4] rounded-full animate-spin"></div>
    //                 <p className="text-[#4285F4] text-lg font-extrabold">Loading Archive Owners...</p>
    //             </div>
    //         );
    //     }

    //     if (error) {
    //         return (
    //             <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-4 p-5 text-center">
    //                 <span className="text-5xl">⚠️</span>
    //                 <p className="text-red-500 text-lg font-extrabold">{error}</p>
    //                 <button className="bg-[#4285F4] text-white px-8 py-3 rounded-lg font-extrabold transition-colors hover:bg-blue-600" onClick={() => refreshOwners()}>
    //                     Retry
    //                 </button>
    //             </div>
    //         );
    //     }

    //     return (
    //         <div dir="ltr" className="min-h-screen bg-white py-10 px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans relative pb-24">
    //             <ToastContainer position="top-right" theme="light" />
                
    //             {/* HEADER */}
    //             <div className="flex flex-col xl:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
    //                 <div className="text-center xl:text-left">
    //                     <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center xl:justify-start gap-3">
    //                         <FaArchive className="text-[#4285F4]" /> Archive Properties Sheet
    //                     </h2>
    //                     <div className="flex items-center justify-center xl:justify-start gap-2 mt-2">
    //                         {canViewAll ? (
    //                             <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">Viewing: All</span>
    //                         ) : (
    //                             <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
    //                                 <FiLock size={10} /> Viewing: Only My
    //                             </span>
    //                         )}
    //                     </div>
    //                 </div>
                    
    //                 <div className="flex flex-wrap items-center justify-center xl:justify-end gap-3 w-full xl:w-auto">
    //                     <div className="flex bg-[#f8f7f5] p-1.5 rounded-lg border border-gray-200 shadow-sm">
    //                         <button onClick={() => setViewMode("cards")} className={`p-2 rounded-md transition-all ${viewMode === "cards" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiGrid size={18} /></button>
    //                         <button onClick={() => setViewMode("table")} className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}><FiList size={18} /></button>
    //                     </div>

    //                     <button
    //                         onClick={handleExportPDF}
    //                         disabled={isGeneratingPdf || owners.length === 0}
    //                         title="Export the records currently shown to PDF"
    //                         className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
    //                     >
    //                         <FaFilePdf /> {isGeneratingPdf ? "Generating..." : "Export PDF"}
    //                     </button>
    //                     <button
    //                         onClick={handleExportExcel}
    //                         disabled={owners.length === 0}
    //                         title="Export the records currently shown to Excel"
    //                         className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-bold text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
    //                     >
    //                         <FaFileExcel /> Export Excel
    //                     </button>

    //                     <button className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#1e3a8a] text-white hover:bg-[#172554] hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={() => { if (!canCreate) return toast.error("No permission."); setShowBulkImportModal(true); }}>
    //                         <FiUploadCloud size={18} /> Import
    //                     </button>
    //                     <button className={`flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap ${canCreate ? "bg-[#a47d52] text-white hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`} onClick={handleOpenCreate}>
    //                         <FaPlus /> Add Owner
    //                     </button>
    //                 </div>
    //             </div>

    //             {/* SEARCH BAR */}
    //             <div className="max-w-full mx-auto mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
    //                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
    //                     <div className="relative">
    //                         <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    //                         <input 
    //                             type="text" 
    //                             placeholder="Search name, phone, unit, reference..." 
    //                             value={searchTerm}
    //                             onChange={(e) => setSearchTerm(e.target.value)}
    //                             className={INPUT_CLASS}
    //                         />
    //                     </div>
    //                     <div className="relative">
    //                         <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    //                         <input 
    //                             type="text" 
    //                             placeholder="Area" 
    //                             value={searchArea}
    //                             onChange={(e) => setSearchArea(e.target.value)}
    //                             className={INPUT_CLASS}
    //                         />
    //                     </div>
    //                     <div className="relative">
    //                         <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    //                         <input 
    //                             type="text" 
    //                             placeholder="Community" 
    //                             value={searchCommunity}
    //                             onChange={(e) => setSearchCommunity(e.target.value)}
    //                             className={INPUT_CLASS}
    //                         />
    //                     </div>
    //                     <div className="relative">
    //                         <FaMapMarkerAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    //                         <input 
    //                             type="text" 
    //                             placeholder="Sub-community" 
    //                             value={searchSubCommunity}
    //                             onChange={(e) => setSearchSubCommunity(e.target.value)}
    //                             className={INPUT_CLASS}
    //                         />
    //                     </div>
    //                 </div>

    //                 <div className="mt-3 flex flex-wrap items-center gap-3">
    //                     {canViewAll && (
    //                         <div className="relative">
    //                             <FaUserShield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    //                             <select
    //                                 value={searchResponsibility}
    //                                 onChange={(e) => setSearchResponsibility(e.target.value)}
    //                                 className={`${SELECT_CLASS} pl-9 min-w-[200px]`}
    //                                 disabled={loadingUsers}
    //                                 title="Filter by responsibility"
    //                             >
    //                                 <option value="">{loadingUsers ? "Loading users..." : "Responsibility (All)"}</option>
    //                                 <option value="unassigned" className="font-bold text-gray-800">-- Unassigned Only --</option>
    //                                 {users.map((u) => (
    //                                     <option key={u.id} value={u.id}>{userLabel(u)}</option>
    //                                 ))}
    //                             </select>
    //                         </div>
    //                     )} 

    //                     <div className="relative">
    //                         <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    //                         <input 
    //                             type="date" 
    //                             value={searchDate}
    //                             onChange={(e) => setSearchDate(e.target.value)}
    //                             title="Last communication date"
    //                             className="pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4285F4]"
    //                         />
    //                     </div>

    //                     <select value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)} className={SELECT_CLASS}>
    //                         <option value="">Category (All)</option>
    //                         <option value="residential">Residential</option>
    //                         <option value="commercial">Commercial</option>
    //                     </select>
    //                     <select value={searchOffer} onChange={(e) => setSearchOffer(e.target.value)} className={SELECT_CLASS}>
    //                         <option value="">Offer (All)</option>
    //                         <option value="sale">Sale</option>
    //                         <option value="rent">Rent</option>
    //                     </select>

    //                     <button
    //                         onClick={clearFilters}
    //                         disabled={activeFilterCount === 0}
    //                         className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    //                         title="Clear all filters"
    //                     >
    //                         <FiX /> Clear{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
    //                     </button>

    //                     <span className="ml-auto flex items-center gap-2 text-xs font-bold text-gray-500">
    //                         {loading && <span className="w-4 h-4 border-2 border-[#4285F4] border-t-transparent rounded-full animate-spin"></span>}
    //                         {owners.length} {owners.length === 1 ? "record" : "records"}
    //                     </span>
    //                 </div>
    //             </div>

    //             <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

    //             {/* EMPTY STATE */}
    //             {owners.length === 0 ? (
    //                 <div className="flex flex-col justify-center items-center gap-4 p-10 text-center bg-[#f8f7f5] rounded-2xl border border-gray-100 max-w-3xl mx-auto shadow-sm">
    //                     <span className="text-6xl">🗂️</span>
    //                     <h3 className="text-2xl font-extrabold text-gray-800">No Archive Owners Found</h3>
    //                     <p className="text-gray-500">Try adjusting your search filters or import a new list.</p>
    //                 </div>
    //             ) : viewMode === "cards" ? (
                    
    //                 /* =========================================
    //                 CARD VIEW
    //                 ========================================= */
    //                 <div className={`max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
    //                     <div className="mb-4 flex flex-wrap items-center gap-4 bg-gray-50 w-fit px-4 py-2 rounded-lg border border-gray-200">
    //                         <div className="flex items-center gap-2">
    //                             <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === owners.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
    //                             <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next</span>
    //                         </div>
    //                         <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
    //                             <option value={50}>50</option>
    //                             <option value={100}>100</option>
    //                             <option value={200}>200</option>
    //                             <option value="All">All ({owners.length})</option>
    //                         </select>
    //                         <span className="text-sm font-bold text-[#4285F4]">({selectedIds.length} Selected)</span>
    //                     </div>

    //                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    //                         {owners.map((owner) => (
    //                             <div key={owner.id} className={`bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border relative group ${selectedIds.includes(owner.id) ? 'border-[#4285F4] ring-1 ring-[#4285F4]' : 'border-gray-100'}`}>
    //                                 <div className="absolute top-4 left-4 z-20">
    //                                     <input type="checkbox" checked={selectedIds.includes(owner.id)} onChange={() => toggleSelectRow(owner.id)} className="w-5 h-5 text-[#4285F4] rounded border-gray-300 focus:ring-[#4285F4] cursor-pointer shadow-sm bg-white" />
    //                                 </div>
    //                                 <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
    //                                     <button onClick={() => handleOpenEdit(owner)} className={`p-2 rounded-full shadow transition-colors ${canUpdate ? "bg-white/90 text-gray-600 hover:bg-[#4285F4] hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
    //                                     <button onClick={() => confirmDelete(owner)} className={`p-2 rounded-full shadow transition-colors ${canDelete ? "bg-white/90 text-red-500 hover:bg-red-500 hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
    //                                 </div>
    //                                 <div className="p-6 pt-10 flex flex-col h-full">
    //                                     <div className="flex justify-between items-start mb-4">
    //                                         <div className="relative">
    //                                             <div className="w-14 h-14 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 group-hover:bg-[#4285F4]/10 transition-colors"><FiUser className="text-[#4285F4]" size={28} /></div>
    //                                         </div>
    //                                     </div>
    //                                     <h3 className="text-xl font-bold text-gray-800 mb-1 truncate hover:text-[#4285F4] cursor-pointer transition-colors" title={owner.name || 'Unnamed Owner'} onClick={() => handleOpenDetails(owner)}>{owner.name || 'Unnamed Owner'}</h3>
    //                                     {owner.company && <p className="text-sm font-medium text-gray-500 mb-2 truncate">{owner.company}</p>}
                                        
    //                                     <div className="mb-4 flex flex-wrap gap-2">
    //                                         <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
    //                                             <FaUserShield className="text-gray-400" /> {owner.responsibility_name || 'Unassigned'}
    //                                         </span>
    //                                         {owner.unit_no && (
    //                                             <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
    //                                                 <FiHome className="text-gray-400" /> {owner.unit_no}
    //                                             </span>
    //                                         )}
    //                                     </div>

    //                                     <div className="space-y-3 mt-auto pt-4 border-t border-gray-50">
    //                                         <div className="flex items-center gap-3 text-sm text-gray-600">
    //                                             <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiPhone className="text-[#4285F4]" size={12} /></div>
    //                                             <span className="truncate font-medium">{owner.phone || 'No phone'}</span>
    //                                         </div>
    //                                         <div className="flex items-center gap-3 text-sm text-gray-600">
    //                                             <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiDollarSign className="text-[#4285F4]" size={12} /></div>
    //                                             <span className="truncate font-medium">Sale: {formatPrice(owner.sale_price)} | Rent: {formatPrice(owner.rent_price)}</span>
    //                                         </div>
    //                                         <div className="flex items-center gap-3 text-sm text-gray-600">
    //                                             <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0"><FiCalendar className="text-[#4285F4]" size={12} /></div>
    //                                             <span className="truncate font-medium">{owner.last_communication_date || 'No date'}</span>
    //                                         </div>
    //                                     </div>
    //                                     <button onClick={() => handleOpenDetails(owner)} className="mt-6 w-full flex items-center justify-center gap-2 bg-[#f8f7f5] text-[#4285F4] py-2.5 rounded-lg font-bold text-sm transition-all duration-300 hover:bg-[#4285F4] hover:text-white"><MdVisibility size={16} /> View Details</button>
    //                                 </div>
    //                             </div>
    //                         ))}
    //                     </div>
    //                 </div>
    //             ) : (

    //                 /* =========================================
    //                 TABLE VIEW (Default)
    //                 ========================================= */
    //                 <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn transition-opacity ${loading ? "opacity-60" : ""}`}>
    //                     <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-4">
    //                         <div className="flex items-center gap-2">
    //                             <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === owners.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" title="Select Next Chunk" />
    //                             <span className="text-sm font-bold text-gray-700 cursor-pointer" onClick={handleSmartSelectAll}>Select Next Chunk</span>
    //                         </div>
    //                         <select value={chunkSize} onChange={(e) => setChunkSize(e.target.value === 'All' ? 'All' : Number(e.target.value))} className="text-xs border border-gray-300 rounded-md px-2 py-1 bg-white cursor-pointer outline-none">
    //                             <option value={50}>50 Records</option>
    //                             <option value={100}>100 Records</option>
    //                             <option value={200}>200 Records</option>
    //                             <option value="All">All Records ({owners.length})</option>
    //                         </select>
    //                         {selectedIds.length > 0 && <span className="text-sm font-bold text-[#4285F4] bg-blue-50 px-2 py-1 rounded">{selectedIds.length} Selected</span>}
    //                     </div>

                        
    //                     {/* Main table */}
    //                     <div className="relative">
    //     {/* LEFT ARROW */}
    //     <div className="absolute inset-y-0 left-0 w-14 z-20 pointer-events-none">
    //         {canScrollLeft && (
    //             <button
    //                 type="button"
    //                 onClick={() => scrollTableBy(-1)}
    //                 title="Scroll left"
    //                 className="pointer-events-auto sticky top-[45vh] ml-2 flex items-center justify-center w-11 h-11 rounded-full bg-gray-500/70 hover:bg-gray-600/80 shadow-lg backdrop-blur-sm transition-all"
    //             >
    //                 <FiChevronLeft size={26} color="#f8f7f5" />
    //             </button>
    //         )}
    //     </div>

    //     {/* RIGHT ARROW */}
    //     <div className="absolute inset-y-0 right-0 w-14 z-20 pointer-events-none">
    //         {canScrollRight && (
    //             <button
    //                 type="button"
    //                 onClick={() => scrollTableBy(1)}
    //                 title="Scroll right"
    //                 className="pointer-events-auto sticky top-[45vh] ml-auto mr-2 flex items-center justify-center w-11 h-11 rounded-full bg-gray-500/70 hover:bg-gray-600/80 shadow-lg backdrop-blur-sm transition-all"
    //             >
    //                 <FiChevronRight size={26} color="#f8f7f5" />
    //             </button>
    //         )}
    //     </div>

    //                                 <div ref={tableScrollRef} onScroll={updateScrollButtons} className="overflow-x-auto custom-scrollbar pb-2">
    //                                     <table className="w-full text-left border-collapse min-w-max">
    //                                         <thead className="bg-[#f8f7f5] border-b border-gray-200">
    //                                             <tr>
    //                                                 <th className="px-4 py-4 w-12 text-center">
    //                                                     <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === owners.length} onChange={handleSmartSelectAll} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
    //                                                 </th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Owner / Phone</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Unit No</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plot / Land</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property Cat.</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Municipality</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Mun. No</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Offer</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Sale Price</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rent Price</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Responsibility</th>
    //                                                 <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
    //                                             </tr>
    //                                         </thead>
    //                                         <tbody className="divide-y divide-gray-100">
    //                                             {owners.map((owner) => (
    //                                                 <tr key={owner.id} className={`transition-colors ${selectedIds.includes(owner.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
    //                                                     <td className="px-4 py-4 text-center">
    //                                                         <input type="checkbox" checked={selectedIds.includes(owner.id)} onChange={() => toggleSelectRow(owner.id)} className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer" />
    //                                                     </td>
    //                                                     {/* 1. Owner / Phone */}
    //                                                     <td className="px-6 py-4">
    //                                                         <div className="flex items-center gap-3">
    //                                                             <div className="w-10 h-10 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 shrink-0">
    //                                                                 <FiUser className="text-[#4285F4]" size={18} />
    //                                                             </div>
    //                                                             <div className="flex flex-col gap-0.5">
    //                                                                 <p className="font-bold text-gray-800">{owner.name || 'Unnamed Owner'}</p>
    //                                                                 {owner.company && <p className="text-xs text-gray-500">{owner.company}</p>}
    //                                                                 <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
    //                                                                     <FiPhone size={10} className="text-gray-400" />
    //                                                                     {owner.phone || '—'}
    //                                                                 </p>
    //                                                             </div>
    //                                                         </div>
    //                                                     </td>
    //                                                     {/* 2. Unit No */}
    //                                                     <td className="px-6 py-4">
    //                                                         <div className="flex flex-col gap-1 text-sm text-gray-600">
    //                                                             {owner.unit_no && <span className="flex items-center gap-2 font-semibold"><FiHome size={12} className="text-gray-400" /> {owner.unit_no}</span>}
    //                                                             {owner.refrence_no && <span className="flex items-center gap-2 text-xs text-gray-400">Ref: {owner.refrence_no}</span>}
    //                                                             {!owner.unit_no && !owner.refrence_no && <span>—</span>}
    //                                                         </div>
    //                                                     </td>
    //                                                     {/* 3. Plot / Land */}
    //                                                     <td className="px-6 py-4">
    //                                                         <div className="flex flex-col gap-1 text-sm text-gray-600">
    //                                                             {owner.plot_no && <span className="font-semibold">Plot: {owner.plot_no}</span>}
    //                                                             {owner.land_no && <span className="text-xs text-gray-500">Land: {owner.land_no}</span>}
    //                                                             {!owner.plot_no && !owner.land_no && <span>—</span>}
    //                                                         </div>
    //                                                     </td>
    //                                                     {/* 4. Description */}
    //                                                     <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={owner.description}>
    //                                                         {owner.description || '—'}
    //                                                     </td>
    //                                                     {/* 5. Property Cat. */}
    //                                                     <td className="px-6 py-4 text-sm text-gray-600 capitalize">{owner.property_category || '—'}</td>
    //                                                     {/* 6. Municipality */}
    //                                                     <td className="px-6 py-4">
    //                                                         <div className="flex flex-col gap-1 text-sm text-gray-600">
    //                                                             <span className="font-bold">{owner.municipality || '—'}</span>
    //                                                             {(owner.zone || owner.area) && (
    //                                                                 <span className="text-xs text-gray-500">
    //                                                                     {[owner.zone, owner.area].filter(Boolean).join(', ')}
    //                                                                 </span>
    //                                                             )}
    //                                                         </div>
    //                                                     </td>
    //                                                     {/* 7. Municipality No */}
    //                                                     <td className="px-6 py-4 text-sm text-gray-600 font-semibold">
    //                                                         {owner.municipality_no || '—'}
    //                                                     </td>
    //                                                     {/* 8. Offer */}
    //                                                     <td className="px-6 py-4 text-sm text-gray-600 capitalize">{owner.property_offer || '—'}</td>
    //                                                     {/* 9. Sale Price */}
    //                                                     <td className="px-6 py-4 font-bold text-emerald-600 text-sm">{formatPrice(owner.sale_price)}</td>
    //                                                     {/* 10. Rent Price */}
    //                                                     <td className="px-6 py-4 font-bold text-blue-600 text-sm">{formatPrice(owner.rent_price)}</td>
    //                                                     {/* 11. Responsibility */}
    //                                                     <td className="px-6 py-4">
    //                                                         <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md"><FaUserShield className="text-gray-400" /> {owner.responsibility_name || 'Unassigned'}</span>
    //                                                     </td>
    //                                                     {/* Actions */}
    //                                                     <td className="px-6 py-4 text-right">
    //                                                         <div className="flex items-center justify-end gap-2">
    //                                                             <button onClick={() => handleOpenDetails(owner)} className="p-2 text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10 rounded-lg transition-colors"><MdVisibility size={18} /></button>
    //                                                             <button onClick={() => handleOpenEdit(owner)} className={`p-2 rounded-lg transition-colors ${canUpdate ? "text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10" : "text-gray-300 cursor-not-allowed"}`}><MdModeEdit size={18} /></button>
    //                                                             <button onClick={() => confirmDelete(owner)} className={`p-2 rounded-lg transition-colors ${canDelete ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-300 cursor-not-allowed"}`}><MdDeleteForever size={18} /></button>
    //                                                         </div>
    //                                                     </td>
    //                                                 </tr>
    //                                             ))}
    //                                         </tbody>
    //                                     </table>
    //                                 </div>
    //                             </div>
                        
    //                 </div>
    //             )}

    //             {/* FLOATING BULK ACTIONS BAR */}
    //             {selectedIds.length > 0 && (
    //                 <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1e3a8a] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-6 animate-slideUp">
    //                     <div className="flex items-center gap-2 border-r border-white/20 pr-6">
    //                         <FiCheckSquare size={20} className="text-blue-300" />
    //                         <span className="font-bold whitespace-nowrap">{selectedIds.length} Selected</span>
    //                     </div>
    //                     <div className="flex items-center gap-3">
    //                         <button onClick={() => { setShowAssignModal(true); fetchUsers(); }} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg font-bold text-sm transition-colors"><FaUserEdit size={16} /> Assign Responsibility</button>
    //                         <button onClick={() => setBulkDeleteConfirm(true)} disabled={bulkActionLoading} className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-500 rounded-lg font-bold text-sm transition-colors disabled:opacity-50">
    //                             {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <FaTrash size={16} />} Delete Selected
    //                         </button>
    //                     </div>
    //                     <button onClick={() => setSelectedIds([])} className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors text-gray-300 hover:text-white"><MdClose size={20} /></button>
    //                 </div>
    //             )}

    //             {/* MODALS */}
    //             {showAddEditModal && <AddEditLandLord landlord={selectedOwner} onClose={handleCloseModals} onSuccess={() => { handleCloseModals(); refreshOwners(); }} />}
    //             {showDetailsModal && selectedOwner && <LandLoardDetails landlord={selectedOwner} onClose={handleCloseModals} />}
    //             {showBulkImportModal && <AddOwnersArchive onClose={handleCloseModals} onSuccess={() => { refreshOwners(); }} />}

    //             {/* BULK ASSIGN MODAL */}
    //             {showAssignModal && (
    //                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
    //                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
    //                         <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white">
    //                             <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2"><FaUserShield className="text-[#4285F4]" /> Assign Responsibility</h3>
    //                             <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-red-500"><MdClose size={20} /></button>
    //                         </div>
                            
    //                         <div className="p-6">
    //                             <p className="text-sm text-gray-600 mb-4">Assign responsibility for <strong>{selectedIds.length}</strong> selected records to:</p>
    //                             <label className="block text-sm font-bold text-gray-700 mb-2">Select Listing Agent</label>
    //                             <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4]" disabled={loadingUsers}>
    //                                 <option value="">-- Select User --</option>
    //                                 <option value={UNASSIGN_VALUE}>Unassigned (remove responsibility)</option>
    //                                 {users.map(u => <option key={u.id} value={u.id}>{u.first_name || u.username} {u.last_name || ''} ({u.role === 'listing' ? 'Listing' : 'Listing Sales Rent'})</option>)}
    //                             </select>
    //                             {loadingUsers && <p className="text-xs text-blue-500 mt-2">Loading agents...</p>}
    //                             {!loadingUsers && users.length === 0 && <p className="text-xs text-red-500 mt-2">No eligible users found.</p>}
    //                         </div>
    //                         <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
    //                             <button onClick={() => setShowAssignModal(false)} className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-white transition-colors">Cancel</button>
    //                             <button onClick={handleBulkAssign} disabled={!selectedUser || bulkActionLoading} className="px-6 py-2.5 rounded-lg bg-[#4285F4] text-white font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2">
    //                                 {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : null} Assign
    //                             </button>
    //                         </div>
    //                     </div>
    //                 </div>
    //             )}

    //             {/* BULK DELETE CONFIRMATION MODAL */}
    //             {bulkDeleteConfirm && (
    //                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
    //                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
    //                         <div className="flex justify-center pt-6 pb-4">
    //                             <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100"><FiAlertTriangle className="text-red-500" size={32} /></div>
    //                         </div>
    //                         <div className="px-6 pb-6">
    //                             <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Bulk Delete</h3>
    //                             <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-red-600">{selectedIds.length}</span> selected records? This action cannot be undone.</p>
    //                             <div className="flex gap-3">
    //                                 <button onClick={() => setBulkDeleteConfirm(false)} disabled={bulkActionLoading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
    //                                 <button onClick={handleBulkDelete} disabled={bulkActionLoading} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
    //                                     {bulkActionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MdDeleteForever size={18} />} Yes, Delete {selectedIds.length} Records
    //                                 </button>
    //                             </div>
    //                         </div>
    //                     </div>
    //                 </div>
    //             )}

    //             {/* STANDARD DELETE CONFIRMATION MODAL */}
    //             {deleteConfirm && (
    //                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
    //                     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
    //                         <div className="flex justify-center pt-6 pb-4"><div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100"><FiAlertTriangle className="text-red-500" size={32} /></div></div>
    //                         <div className="px-6 pb-6">
    //                             <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Delete</h3>
    //                             <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <span className="font-bold text-gray-800">"{deleteConfirm.name || deleteConfirm.company}"</span>? This action cannot be undone.</p>
    //                             <div className="flex gap-3">
    //                                 <button onClick={() => setDeleteConfirm(null)} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
    //                                 <button onClick={handleDeleteOwner} disabled={deletingId === deleteConfirm.id} className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2">
    //                                     {deletingId === deleteConfirm.id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <MdDeleteForever size={18} />} Delete
    //                                 </button>
    //                             </div>
    //                         </div>
    //                     </div>
    //                 </div>
    //             )}

    //             {/* HIDDEN PDF TEMPLATE FOR EXPORT */}
    //             {owners.length > 0 && <PdfExportTemplate ref={pdfRef} owners={owners} />}

    //         </div>
    //     );
    // };

    // export default OwnersArchive;

