import React, { useEffect, useState, useRef, forwardRef } from "react";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";

import { CiEdit } from "react-icons/ci";
import { MdDeleteForever, MdPictureAsPdf } from "react-icons/md";
import {
    FiEye,
    FiPlus,
    FiSearch,
    FiRefreshCw,
    FiGrid,
    FiList,
    FiUser,
    FiHome,
    FiDollarSign,
    FiCreditCard,
    FiTag,
    FiBriefcase,
    FiCheckCircle,
    FiClock,
    FiXCircle,
} from "react-icons/fi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logo from "../../assets/images/logogo-removebg-old.png";

import AddMonthlyPayment from "../../components/ar/rent/AddMonthlyPayment";
import DetailRent from "../../components/ar/rent/DetailRent";
import RentAddEdit from "../../components/ar/rent/RentAddEdit";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
const PRINT_FONT = '"Cairo", "Tajawal", "Segoe UI", "Tahoma", "Arial", sans-serif';

/* =============================================================
   HIDDEN PDF RENDER TARGET FOR RENTS LIST
============================================================= */
const PdfRenderTarget = forwardRef(({ rents, generatedAt }, ref) => {
    const formatDate = (d) => d ? d : "—";
    const formatAmount = (a) => Number(a || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div
            ref={ref}
            dir="rtl"
            lang="ar"
            data-pdf-root="true"
            style={{
                width: "1123px", // A4 Landscape
                padding: "25px 30px",
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
            {/* HEADER */}
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #a47d52", paddingBottom: "10px", marginBottom: "15px" }}>
                <div style={{ textAlign: "right" }}>
                    <h1 style={{ color: "#a47d52", fontSize: "22px", fontWeight: 900, margin: 0 }}>تقرير عقود الإيجار</h1>
                    <p style={{ fontSize: "13px", margin: "4px 0 0 0", color: "#6b7280" }}>Rent Contracts Report</p>
                </div>
                <div style={{ textAlign: "center" }}>
                    <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "70px", objectFit: "contain" }} />
                </div>
                <div style={{ textAlign: "left", fontSize: "12px", color: "#6b7280" }}>
                    <p style={{ margin: 0 }}>تاريخ الطباعة: {generatedAt}</p>
                    <p style={{ margin: "4px 0 0 0" }}>إجمالي العقود: {rents.length}</p>
                </div>
            </header>

            {/* TABLE */}
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontFamily: PRINT_FONT, direction: "rtl" }}>
                <thead>
                    <tr>
                        <th style={thPdf}>#</th>
                        <th style={thPdf}>المستأجر</th>
                        <th style={thPdf}>الوحدة</th>
                        <th style={thPdf}>التصنيف</th>
                        <th style={thPdf}>المالك</th>
                        <th style={thPdf}>تاريخ البدء</th>
                        <th style={thPdf}>تاريخ الانتهاء</th>
                        <th style={thPdf}>سعر الوحدة</th>
                        <th style={thPdf}>قيمة القسط</th>
                    </tr>
                </thead>
                <tbody>
                    {rents.map((r, index) => (
                        <tr key={r.id} style={{ background: index % 2 === 0 ? "#FFFFFF" : "#FAF7F0" }}>
                            <td style={tdPdf}>{index + 1}</td>
                            <td style={tdPdf}>{r.tenant_name || "—"}</td>
                            <td style={tdPdf}>{r.unit_display || "—"}</td>
                            <td style={tdPdf}>{r.unit_category || "—"}</td>
                            <td style={tdPdf}>{r.unit_owner || "—"}</td>
                            <td style={tdPdf}>{formatDate(r.start_date)}</td>
                            <td style={tdPdf}>{formatDate(r.end_date)}</td>
                            <td style={tdPdf} dir="ltr">{formatAmount(r.unit_price)}</td>
                            <td style={tdPdf} dir="ltr">{formatAmount(r.installment_amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div style={{ marginTop: "20px", textAlign: "center", fontSize: "10px", color: "#9ca3af" }}>
                BROKER CITY PROPERTIES
            </div>
        </div>
    );
});
PdfRenderTarget.displayName = "PdfRenderTarget";

const thPdf = { border: "1px solid #ccc", padding: "10px 5px", fontSize: 12, fontWeight: 800, color: "#000", textAlign: "center", background: "#e6d5c0" };
const tdPdf = { border: "1px solid #ccc", padding: "8px 5px", fontSize: 12, color: "#000", textAlign: "center", wordBreak: "break-word" };

/* =============================================================
   MAIN COMPONENT
============================================================= */
const RentList = () => {
    const [rents, setRents] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [selectedRent, setSelectedRent] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

    // PDF State
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfReady, setPdfReady] = useState(false);
    const renderRef = useRef(null);
    const isGeneratingRef = useRef(false);

    // ✅ Scroll Ref for Horizontal Arrows
    const scrollContainerRef = useRef(null);

    /* =========================================================
       FETCH RENTS
    ========================================================= */
    const fetchRents = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            if (!token) return toast.error("يرجى تسجيل الدخول");

            const response = await fetch(`${BASE}/api/rents/`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error("فشل تحميل العقود");

            const data = await response.json();
            let rentsData = Array.isArray(data) ? data : (data.results || data.rents || []);
            rentsData.sort((a, b) => a.id - b.id);
            setRents(rentsData);
        } catch (error) {
            toast.error("❌ حدث خطأ أثناء جلب العقود");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRents();
        
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

    /* =========================================================
       DELETE
    ========================================================= */
    const handleDelete = async (id) => {
        if (!window.confirm("هل أنت متأكد من حذف هذا العقد؟")) return;
        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${BASE}/api/rents/${id}/delete/`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("فشل الحذف");
            toast.success("✅ تم حذف العقد");
            fetchRents();
        } catch (error) {
            toast.error("❌ حدث خطأ أثناء الحذف");
        }
    };

    /* =========================================================
       MODAL HANDLERS
    ========================================================= */
    const handleAdd = () => { setSelectedRent(null); setShowAddModal(true); };
    const handleEdit = (rent) => { setSelectedRent(rent); setShowAddModal(true); };
    const handleDetails = (rent) => { setSelectedRent(rent); setShowDetailModal(true); };
    const handleAddPayment = (rent) => { setSelectedRent(rent); setShowAddPaymentModal(true); };
    const handleModalClose = () => {
        setShowAddModal(false);
        setShowAddPaymentModal(false);
        setShowDetailModal(false);
        setSelectedRent(null);
    };
    const handleSuccess = () => fetchRents();

    /* =========================================================
       HELPERS
    ========================================================= */
    const getTenantName = (r) => r?.tenant_name || r?.rental_name?.name || "-";
    const getUnitDisplay = (r) => r?.unit_display || r?.unit_name?.name || "-";
    const getUnitCategory = (r) => r?.unit_category || "-";
    const getUnitOwner = (r) => r?.unit_owner || "-";

    const formatAmount = (a) => Number(a || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatInteger = (a) => Number(a || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const getDaysRemaining = (endDate) => {
        if (!endDate) return 9999;
        const today = new Date();
        const end = new Date(endDate);
        return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    };

    const getStatusLabel = (rent) => {
        const today = new Date();
        const start = rent.start_date ? new Date(rent.start_date) : null;
        const end = rent.end_date ? new Date(rent.end_date) : null;

        if (start && end) {
            if (today < start) return "لم يبدأ";
            else if (today > end) return "منتهي";
            else if (getDaysRemaining(rent.end_date) <= 90) return "قارب على الانتهاء";
            else return "نشط";
        }
        return "غير معروف";
    };

    const getStatusBadge = (rent) => {
        const label = getStatusLabel(rent);
        let className = "bg-gray-100 text-gray-700";
        if (label === "لم يبدأ") className = "bg-yellow-100 text-yellow-700";
        else if (label === "منتهي") className = "bg-red-100 text-red-700";
        else if (label === "نشط") className = "bg-green-100 text-green-700";
        else if (label === "قارب على الانتهاء") className = "bg-yellow-100 text-yellow-700"; 
        return <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${className}`}>{label}</span>;
    };

    const getRowBgColor = (rent) => {
        const today = new Date();
        const end = rent.end_date ? new Date(rent.end_date) : null;
        if (!end) return "bg-white";
        if (today > end) return "bg-red-100 hover:bg-red-200";
        if (getDaysRemaining(rent.end_date) <= 90) return "bg-yellow-50 hover:bg-yellow-100";
        return "bg-white hover:bg-gray-50";
    };

    const getCardBgColor = (rent) => {
        const today = new Date();
        const end = rent.end_date ? new Date(rent.end_date) : null;
        if (!end) return "bg-white border-[#e9e6e1]";
        if (today > end) return "bg-red-50 border-red-200";
        if (getDaysRemaining(rent.end_date) <= 90) return "bg-yellow-50 border-yellow-200";
        return "bg-white border-[#e9e6e1]";
    };

    /* =========================================================
       SCROLL HANDLERS
    ========================================================= */
    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -400, behavior: "smooth" });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 400, behavior: "smooth" });
        }
    };

    /* =========================================================
       FILTER
    ========================================================= */
    const filteredRents = rents.filter((rent) => {
        const search = searchTerm.trim().toLowerCase();
        if (!search) return true;
        const tenant = String(getTenantName(rent)).toLowerCase();
        const unit = String(getUnitDisplay(rent)).toLowerCase();
        const category = String(getUnitCategory(rent)).toLowerCase();
        const owner = String(getUnitOwner(rent)).toLowerCase();
        const start = String(rent.start_date || "").toLowerCase();
        const end = String(rent.end_date || "").toLowerCase();
        const status = String(getStatusLabel(rent)).toLowerCase();

        return (
            tenant.includes(search) || unit.includes(search) ||
            category.includes(search) || owner.includes(search) ||
            start.includes(search) || end.includes(search) ||
            status.includes(search)
        );
    });

    /* =========================================================
       TOTALS FOR DASHBOARD
    ========================================================= */
    const totalRentValue = filteredRents.reduce((sum, rent) => sum + Number(rent.unit_price || 0), 0);
    let activeCount = 0, expiringCount = 0, expiredCount = 0;
    filteredRents.forEach(rent => {
        const status = getStatusLabel(rent);
        if (status === "منتهي") expiredCount++;
        else if (status === "قارب على الانتهاء") expiringCount++;
        else if (status === "نشط") activeCount++;
    });

    /* =========================================================
       PDF DOWNLOAD
    ========================================================= */
    const handleDownloadPDF = async () => {
        if (!filteredRents || filteredRents.length === 0) return toast.warning("لا توجد بيانات لتصديرها");
        if (isGeneratingRef.current || !renderRef.current) return;

        isGeneratingRef.current = true;
        setIsGeneratingPdf(true);

        try {
            const node = renderRef.current;
            const scale = 3.0; 
            
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
            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            const imgHmm = (canvas.height * pageW) / canvas.width;

            doc.addImage(imgData, "JPEG", 0, 0, pageW, imgHmm, undefined, "FAST");
            
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(164, 125, 82);
            doc.text("BROKER CITY PROPERTIES", pageW / 2, pageH - 5, { align: "center" });

            doc.save(`Rents_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success("✅ تم تحميل تقرير العقود");
        } catch (err) {
            console.error("PDF generation error:", err);
            toast.error("❌ تعذر إنشاء ملف PDF");
        } finally {
            isGeneratingRef.current = false;
            setIsGeneratingPdf(false);
        }
    };

    /* =========================================================
       CARD VIEW
    ========================================================= */
    const renderCardsView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 max-w-full sm:max-w-[1550px] mx-auto px-2 md:px-2">
            {filteredRents.map((rent) => {
                const tenant = getTenantName(rent);
                const unit = getUnitDisplay(rent);
                const category = getUnitCategory(rent);
                const owner = getUnitOwner(rent);

                return (
                    <div key={rent.id} className={`border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 relative group ${getCardBgColor(rent)}`}>
                        <button onClick={() => handleDelete(rent.id)} className="absolute top-3 left-3 p-2 rounded-full bg-white/80 hover:bg-red-100 hover:scale-110 z-10 shadow-sm" title="حذف">
                            <MdDeleteForever className="text-red-500 text-2xl" />
                        </button>
                        <button onClick={() => handleEdit(rent)} className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-green-50 hover:scale-110 z-10 shadow-sm" title="تعديل">
                            <CiEdit className="text-green-600 text-2xl" />
                        </button>

                        <div className="p-4 pt-14 flex flex-col items-center text-center">
                            <div className="w-full flex gap-3 items-center mb-4">
                                <div className="w-14 h-14 rounded-full bg-white/60 border border-white flex items-center justify-center shrink-0">
                                    <FiUser className="text-[#a47d52]" size={26} />
                                </div>
                                <div className="flex-1 min-w-0 text-right ">
                                    <h3 className="text-base font-extrabold text-[#7a5c3a] truncate">{tenant}</h3>
                                    <p className="text-xs text-gray-600 mt-1 truncate">{unit}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5 truncate flex items-center gap-1 bg-[#f8f7f5]">
                                        <FiTag /> {category}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5 truncate flex items-center gap-1 bg-[#f8f7f5]">
                                        <FiBriefcase /> {owner}
                                    </p>
                                </div>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
                                    <p className="text-[10px] font-bold text-blue-600 mb-1">من</p>
                                    <p className="text-xs font-extrabold text-blue-800" dir="ltr">{rent.start_date}</p>
                                </div>
                                <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
                                    <p className="text-[10px] font-bold text-indigo-600 mb-1">إلى</p>
                                    <p className="text-xs font-extrabold text-indigo-800" dir="ltr">{rent.end_date}</p>
                                </div>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
                                    <p className="text-[10px] font-bold text-green-600 mb-1">قيمة القسط</p>
                                    <p className="text-sm font-extrabold text-green-700" dir="ltr">{formatAmount(rent.installment_amount)}</p>
                                </div>
                                <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center justify-center">
                                    <p className="text-[10px] font-bold text-gray-500 mb-1">الحالة</p>
                                    {getStatusBadge(rent)}
                                </div>
                            </div>

                            <div className="w-full grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
                                    <p className="text-[10px] font-bold text-gray-500 mb-1">سعر الوحدة</p>
                                    <p className="text-sm font-extrabold text-[#a47d52]" dir="ltr">{formatAmount(rent.unit_price)}</p>
                                </div>
                                <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
                                    <p className="text-[10px] font-bold text-gray-500 mb-1">عدد الأقساط</p>
                                    <p className="text-sm font-extrabold text-gray-800" dir="ltr">{formatInteger(rent.installment_no)}</p>
                                </div>
                            </div>

                            <div className="w-full border-t border-black/5 pt-3 mt-auto flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <button onClick={() => handleDetails(rent)} className="flex-1 bg-white text-[#a47d52] py-2 px-2 rounded-sm font-extrabold text-xs hover:bg-[#f8f7f5] transition flex items-center justify-center gap-1 shadow-sm">
                                        <FiEye size={14} /> التفاصيل
                                    </button>
                                    <button onClick={() => handleEdit(rent)} className="flex-1 bg-green-600 text-white py-2 px-2 rounded-sm font-extrabold text-xs hover:bg-green-700 transition flex items-center justify-center gap-1 shadow-sm">
                                        <CiEdit size={14} /> تعديل
                                    </button>
                                </div>
                                <button onClick={() => handleAddPayment(rent)} className="w-full bg-[#a47d52] text-white py-2 px-2 rounded-sm font-extrabold text-xs hover:bg-[#8a6a44] transition flex items-center justify-center gap-1 shadow-sm">
                                    <FiCreditCard size={14} /> إضافة دفعة شهرية
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    /* =========================================================
       TABLE VIEW
    ========================================================= */
    const renderTableView = () => (
        <div className="max-w-full mx-auto px-2 md:px-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-right whitespace-nowrap">
                        <thead className="bg-[#e9e6e1] text-[#a47d52]">
                            <tr>
                                <th className="px-4 py-4 text-sm font-bold">#</th>
                                <th className="px-4 py-4 text-sm font-bold">المستأجر</th>
                                <th className="px-4 py-4 text-sm font-bold">الوحدة</th>
                                <th className="px-4 py-4 text-sm font-bold">التصنيف</th>
                                <th className="px-4 py-4 text-sm font-bold">المالك</th>
                                <th className="px-4 py-4 text-sm font-bold">من تاريخ</th>
                                <th className="px-4 py-4 text-sm font-bold">إلى تاريخ</th>
                                <th className="px-4 py-4 text-sm font-bold">سعر الوحدة</th>
                                <th className="px-4 py-4 text-sm font-bold">عدد الاقساط</th>
                                <th className="px-4 py-4 text-sm font-bold">قيمة القسط</th>
                                <th className="px-4 py-4 text-sm font-bold">الحالة</th>
                                <th className="px-4 py-4 text-center text-sm font-bold">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRents.map((rent, index) => (
                                <tr key={rent.id} className={`border-b border-gray-200 transition-colors duration-200 ${getRowBgColor(rent)}`}>
                                    <td className="px-4 py-4 text-sm text-gray-700">{index + 1}</td>
                                    <td className="px-4 py-4 text-sm font-bold text-gray-800">{getTenantName(rent)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{getUnitDisplay(rent)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{getUnitCategory(rent)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{getUnitOwner(rent)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700" dir="ltr">{rent.start_date}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700" dir="ltr">{rent.end_date}</td>
                                    <td className="px-4 py-4 text-sm font-bold text-[#a47d52]" dir="ltr">{formatAmount(rent.unit_price)}</td>
                                    <td className="px-4 py-4 text-sm font-bold text-gray-800" dir="ltr">{formatInteger(rent.installment_no)}</td>
                                    <td className="px-4 py-4 text-sm font-bold text-green-700" dir="ltr">{formatAmount(rent.installment_amount)}</td>
                                    <td className="px-4 py-4 text-sm">{getStatusBadge(rent)}</td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => handleDetails(rent)} className="px-2 py-2 bg-white/80 rounded-lg hover:scale-110 transition" title="التفاصيل">
                                                <FiEye className="text-[#a47d52]" size={21} />
                                            </button>
                                            <button onClick={() => handleAddPayment(rent)} className="px-2 py-2 bg-white/80 rounded-lg hover:scale-110 transition" title="إضافة دفعة">
                                                <FiCreditCard className="text-blue-600" size={21} />
                                            </button>
                                            <button onClick={() => handleEdit(rent)} className="px-2 py-2 bg-white/80 rounded-lg hover:scale-110 transition" title="تعديل">
                                                <CiEdit className="text-green-600" size={22} />
                                            </button>
                                            <button onClick={() => handleDelete(rent.id)} className="px-2 py-2 bg-white/80 rounded-lg hover:scale-110 transition" title="حذف">
                                                <MdDeleteForever className="text-red-600" size={22} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8f7f5] py-6 px-2 md:py-8 md:px-3 lg:py-5 lg:px-2 rtl relative" dir="rtl">
            <Toaster position="top-center" reverseOrder={false} />

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-2 md:px-2 mb-6 md:mb-8 lg:mb-10 gap-4 lg:shadow-lg">
                <div className="text-center sm:text-right">
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[#e9e6e1] items-center justify-center">
                            <FiHome className="text-[#a47d52]" size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 tracking-wide">إدارة العقود</h2>
                            <p className="text-base md:text-lg text-gray-600 mt-1">إدارة عقود الإيجار والدفعات الشهرية</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={handleDownloadPDF} disabled={isGeneratingPdf || filteredRents.length === 0 || !pdfReady} className="flex items-center justify-center gap-2 bg-white border-2 border-[#a47d52] text-[#a47d52] px-5 md:px-6 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#a47d52] hover:text-white hover:scale-105 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <MdPictureAsPdf size={20} />
                        {isGeneratingPdf ? "جاري التحميل..." : "تحميل PDF"}
                    </button>

                    <button onClick={handleAdd} className="flex items-center justify-center gap-2 bg-[#a47d52] text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 shadow-sm">
                        <FiPlus size={20} /> إضافة عقد
                    </button>
                    <button onClick={fetchRents} disabled={loading} className="flex items-center justify-center gap-2 bg-[#6c7a89] text-white px-5 py-3 rounded-full font-extrabold transition-all duration-300 hover:bg-[#5a6775] disabled:opacity-50">
                        <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* SEARCH + VIEW TOGGLE */}
            <div className="max-w-full mx-auto px-2 md:px-2 mb-5">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="بحث بالمستأجر أو الوحدة أو التصنيف أو المالك..."
                            className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white text-right"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-auto flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                        <button onClick={() => setViewMode("cards")} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${viewMode === "cards" ? "bg-[#a47d52] text-white shadow-md" : "text-gray-600 hover:bg-[#f8f7f5]"}`}>
                            <FiGrid size={18} /> بطاقات
                        </button>
                        <button onClick={() => setViewMode("table")} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${viewMode === "table" ? "bg-[#a47d52] text-white shadow-md" : "text-gray-600 hover:bg-[#f8f7f5]"}`}>
                            <FiList size={18} /> جدول
                        </button>
                    </div>
                </div>
            </div>

            {/* DASHBOARD SUMMARY CARDS */}
            {!loading && rents.length > 0 && (
                <div className="max-w-full mx-auto px-2 md:px-2 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-[#a47d52]">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs text-gray-500 font-bold">عدد عقود الايجار</p>
                                <FiHome className="text-[#a47d52]" size={18} />
                            </div>
                            <p className="text-2xl font-black text-[#a47d52]">{filteredRents.length}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-green-500">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs text-gray-500 font-bold">ساري (نشط)</p>
                                <FiCheckCircle className="text-green-500" size={18} />
                            </div>
                            <p className="text-2xl font-black text-green-600">{activeCount}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-yellow-500">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs text-gray-500 font-bold">قارب على الانتهاء</p>
                                <FiClock className="text-yellow-500" size={18} />
                            </div>
                            <p className="text-2xl font-black text-yellow-600">{expiringCount}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-red-500">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs text-gray-500 font-bold">منتهي</p>
                                <FiXCircle className="text-red-500" size={18} />
                            </div>
                            <p className="text-2xl font-black text-red-600">{expiredCount}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-blue-500 col-span-2 md:col-span-1">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs text-gray-500 font-bold">إجمالي قيمة العقود</p>
                                <span>AED</span>
                            </div>
                            <p className="text-xl font-black text-blue-700 truncate" dir="ltr">
                                {formatInteger(totalRentValue)}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ ADDED: HORIZONTAL SCROLL ARROWS & CONTENT */}
            <div className="relative group/scroll">
                {/* Left Arrow */}
                <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-[#f8f7f5] shadow-md border border-gray-200 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover/scroll:opacity-100 transition-all duration-300 hover:scale-110"
                    title="Scroll Left"
                >
                    <FaChevronLeft className="text-gray-600 text-lg" />
                </button>

                {/* Right Arrow */}
                <button
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-[#f8f7f5] shadow-md border border-gray-200 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover/scroll:opacity-100 transition-all duration-300 hover:scale-110"
                    title="Scroll Right"
                >
                    <FaChevronRight className="text-gray-600 text-lg" />
                </button>

                {/* SCROLLABLE CONTENT */}
                <div ref={scrollContainerRef} className="overflow-x-auto pb-4 no-scrollbar">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />
                        </div>
                    ) : filteredRents.length === 0 ? (
                        <div className="max-w-full mx-auto px-2 md:px-2">
                            <div className="bg-white rounded-xl shadow-lg text-center py-20">
                                <FiHome className="mx-auto text-gray-300 mb-4" size={50} />
                                <p className="text-gray-500 text-lg">لا توجد عقود</p>
                                <button onClick={handleAdd} className="mt-5 bg-[#a47d52] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8a6a44] transition">+ إضافة عقد</button>
                            </div>
                        </div>
                    ) : viewMode === "cards" ? (
                        renderCardsView()
                    ) : (
                        renderTableView()
                    )}
                </div>
            </div>

            {/* MODALS */}
            {showAddModal && <RentAddEdit rent={selectedRent} onClose={handleModalClose} onSuccess={handleSuccess} />}
            {showAddPaymentModal && selectedRent && <AddMonthlyPayment rent={selectedRent} onClose={handleModalClose} onSuccess={handleSuccess} />}
            {showDetailModal && selectedRent && <DetailRent rentId={selectedRent.id} onClose={handleModalClose} />}

            {/* HIDDEN PDF RENDER TARGET */}
            {pdfReady && filteredRents.length > 0 && (
                <PdfRenderTarget
                    ref={renderRef}
                    rents={filteredRents}
                    generatedAt={new Date().toLocaleString("ar-EG")}
                />
            )}

            <style>{`
                /* ✅ Hide scrollbar for the horizontal scroll area */
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default RentList;

// import React, { useEffect, useState, useRef, forwardRef } from "react";
// import toast from "react-hot-toast";
// import { Toaster } from "react-hot-toast";

// import { CiEdit } from "react-icons/ci";
// import { MdDeleteForever, MdPictureAsPdf } from "react-icons/md";
// import {
//     FiEye,
//     FiPlus,
//     FiSearch,
//     FiRefreshCw,
//     FiGrid,
//     FiList,
//     FiUser,
//     FiHome,
//     FiDollarSign,
//     FiCreditCard,
//     FiTag,
//     FiBriefcase,
//     FiCheckCircle,
//     FiClock,
//     FiXCircle,
// } from "react-icons/fi";
// import { FaBuilding } from "react-icons/fa";

// import html2canvas from "html2canvas";
// import jsPDF from "jspdf";
// import logo from "../../assets/images/logogo-removebg-old.png"; // ✅ Ensure path to logo is correct

// import AddMonthlyPayment from "../../components/ar/rent/AddMonthlyPayment";
// import DetailRent from "../../components/ar/rent/DetailRent";
// import RentAddEdit from "../../components/ar/rent/RentAddEdit";

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;
// const PRINT_FONT = '"Cairo", "Tajawal", "Segoe UI", "Tahoma", "Arial", sans-serif';

// /* =============================================================
//    HIDDEN PDF RENDER TARGET FOR RENTS LIST
// ============================================================= */
// const PdfRenderTarget = forwardRef(({ rents, generatedAt }, ref) => {
//     const formatDate = (d) => d ? d : "—";
//     const formatAmount = (a) => Number(a || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

//     return (
//         <div
//             ref={ref}
//             dir="rtl"
//             lang="ar"
//             data-pdf-root="true"
//             style={{
//                 width: "1123px", // A4 Landscape
//                 padding: "25px 30px",
//                 background: "#ffffff",
//                 boxSizing: "border-box",
//                 fontFamily: PRINT_FONT,
//                 color: "#1f2937",
//                 position: "fixed",
//                 left: "-10000px",
//                 top: 0,
//                 zIndex: -1,
//             }}
//         >
//             {/* HEADER */}
//             <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #a47d52", paddingBottom: "10px", marginBottom: "15px" }}>
//                 <div style={{ textAlign: "right" }}>
//                     <h1 style={{ color: "#a47d52", fontSize: "22px", fontWeight: 900, margin: 0 }}>تقرير عقود الإيجار</h1>
//                     <p style={{ fontSize: "13px", margin: "4px 0 0 0", color: "#6b7280" }}>Rent Contracts Report</p>
//                 </div>
//                 <div style={{ textAlign: "center" }}>
//                     <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "70px", objectFit: "contain" }} />
//                 </div>
//                 <div style={{ textAlign: "left", fontSize: "12px", color: "#6b7280" }}>
//                     <p style={{ margin: 0 }}>تاريخ الطباعة: {generatedAt}</p>
//                     <p style={{ margin: "4px 0 0 0" }}>إجمالي العقود: {rents.length}</p>
//                 </div>
//             </header>

//             {/* TABLE */}
//             <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontFamily: PRINT_FONT, direction: "rtl" }}>
//                 <thead>
//                     <tr>
//                         <th style={thPdf}>#</th>
//                         <th style={thPdf}>المستأجر</th>
//                         <th style={thPdf}>الوحدة</th>
//                         <th style={thPdf}>التصنيف</th>
//                         <th style={thPdf}>المالك</th>
//                         <th style={thPdf}>تاريخ البدء</th>
//                         <th style={thPdf}>تاريخ الانتهاء</th>
//                         <th style={thPdf}>سعر الوحدة</th>
//                         <th style={thPdf}>قيمة القسط</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     {rents.map((r, index) => (
//                         <tr key={r.id} style={{ background: index % 2 === 0 ? "#FFFFFF" : "#FAF7F0" }}>
//                             <td style={tdPdf}>{index + 1}</td>
//                             <td style={tdPdf}>{r.tenant_name || "—"}</td>
//                             <td style={tdPdf}>{r.unit_display || "—"}</td>
//                             <td style={tdPdf}>{r.unit_category || "—"}</td>
//                             <td style={tdPdf}>{r.unit_owner || "—"}</td>
//                             <td style={tdPdf}>{formatDate(r.start_date)}</td>
//                             <td style={tdPdf}>{formatDate(r.end_date)}</td>
//                             <td style={tdPdf} dir="ltr">{formatAmount(r.unit_price)}</td>
//                             <td style={tdPdf} dir="ltr">{formatAmount(r.installment_amount)}</td>
//                         </tr>
//                     ))}
//                 </tbody>
//             </table>

//             {/* FOOTER */}
//             <div style={{ marginTop: "20px", textAlign: "center", fontSize: "10px", color: "#9ca3af" }}>
//                 BROKER CITY PROPERTIES
//             </div>
//         </div>
//     );
// });
// PdfRenderTarget.displayName = "PdfRenderTarget";

// const thPdf = { border: "1px solid #ccc", padding: "10px 5px", fontSize: 12, fontWeight: 800, color: "#000", textAlign: "center", background: "#e6d5c0" };
// const tdPdf = { border: "1px solid #ccc", padding: "8px 5px", fontSize: 12, color: "#000", textAlign: "center", wordBreak: "break-word" };

// /* =============================================================
//    MAIN COMPONENT
// ============================================================= */
// const RentList = () => {
//     const [rents, setRents] = useState([]);
//     const [loading, setLoading] = useState(false);

//     const [showAddModal, setShowAddModal] = useState(false);
//     const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
//     const [showDetailModal, setShowDetailModal] = useState(false);

//     const [selectedRent, setSelectedRent] = useState(null);

//     const [searchTerm, setSearchTerm] = useState("");
//     const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

//     // PDF State
//     const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
//     const [pdfReady, setPdfReady] = useState(false);
//     const renderRef = useRef(null);
//     const isGeneratingRef = useRef(false);

//     /* =========================================================
//        FETCH RENTS
//     ========================================================= */
//     const fetchRents = async () => {
//         setLoading(true);
//         try {
//             const token = localStorage.getItem("access_token");
//             if (!token) return toast.error("يرجى تسجيل الدخول");

//             const response = await fetch(`${BASE}/api/rents/`, {
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             if (!response.ok) throw new Error("فشل تحميل العقود");

//             const data = await response.json();
//             let rentsData = Array.isArray(data) ? data : (data.results || data.rents || []);
//             rentsData.sort((a, b) => a.id - b.id);
//             setRents(rentsData);
//         } catch (error) {
//             toast.error("❌ حدث خطأ أثناء جلب العقود");
//         } finally {
//             setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchRents();
        
//         // Ensure fonts for PDF
//         const ensureFonts = async () => {
//             if (document.fonts?.ready) {
//                 try {
//                     await document.fonts.load("700 16px Cairo");
//                     await document.fonts.load("400 16px Cairo");
//                 } catch {}
//                 await document.fonts.ready;
//             }
//             setPdfReady(true);
//         };
//         ensureFonts();
//     }, []);

//     /* =========================================================
//        DELETE
//     ========================================================= */
//     const handleDelete = async (id) => {
//         if (!window.confirm("هل أنت متأكد من حذف هذا العقد؟")) return;
//         try {
//             const token = localStorage.getItem("access_token");
//             const response = await fetch(`${BASE}/api/rents/${id}/delete/`, {
//                 method: "DELETE",
//                 headers: { Authorization: `Bearer ${token}` },
//             });
//             if (!response.ok) throw new Error("فشل الحذف");
//             toast.success("✅ تم حذف العقد");
//             fetchRents();
//         } catch (error) {
//             toast.error("❌ حدث خطأ أثناء الحذف");
//         }
//     };

//     /* =========================================================
//        MODAL HANDLERS
//     ========================================================= */
//     const handleAdd = () => { setSelectedRent(null); setShowAddModal(true); };
//     const handleEdit = (rent) => { setSelectedRent(rent); setShowAddModal(true); };
//     const handleDetails = (rent) => { setSelectedRent(rent); setShowDetailModal(true); };
//     const handleAddPayment = (rent) => { setSelectedRent(rent); setShowAddPaymentModal(true); };
//     const handleModalClose = () => {
//         setShowAddModal(false);
//         setShowAddPaymentModal(false);
//         setShowDetailModal(false);
//         setSelectedRent(null);
//     };
//     const handleSuccess = () => fetchRents();

//     /* =========================================================
//        HELPERS
//     ========================================================= */
//     const getTenantName = (r) => r?.tenant_name || r?.rental_name?.name || "-";
//     const getUnitDisplay = (r) => r?.unit_display || r?.unit_name?.name || "-";
//     const getUnitCategory = (r) => r?.unit_category || "-";
//     const getUnitOwner = (r) => r?.unit_owner || "-";

//     const formatAmount = (a) => Number(a || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
//     const formatInteger = (a) => Number(a || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

//     const getDaysRemaining = (endDate) => {
//         if (!endDate) return 9999;
//         const today = new Date();
//         const end = new Date(endDate);
//         return Math.ceil((end - today) / (1000 * 60 * 60 * 24));
//     };

//     const getStatusLabel = (rent) => {
//         const today = new Date();
//         const start = rent.start_date ? new Date(rent.start_date) : null;
//         const end = rent.end_date ? new Date(rent.end_date) : null;

//         if (start && end) {
//             if (today < start) return "لم يبدأ";
//             else if (today > end) return "منتهي";
//             else if (getDaysRemaining(rent.end_date) <= 90) return "قارب على الانتهاء";
//             else return "نشط";
//         }
//         return "غير معروف";
//     };

//     const getStatusBadge = (rent) => {
//         const label = getStatusLabel(rent);
//         let className = "bg-gray-100 text-gray-700";
//         if (label === "لم يبدأ") className = "bg-yellow-100 text-yellow-700";
//         else if (label === "منتهي") className = "bg-red-100 text-red-700";
//         else if (label === "نشط") className = "bg-green-100 text-green-700";
//         else if (label === "قارب على الانتهاء") className = "bg-orange-100 text-orange-700";
//         return <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${className}`}>{label}</span>;
//     };

//     const getRowBgColor = (rent) => {
//         const today = new Date();
//         const end = rent.end_date ? new Date(rent.end_date) : null;
//         if (!end) return "bg-white";
//         if (today > end) return "bg-red-100 hover:bg-red-200";
//         if (getDaysRemaining(rent.end_date) <= 90) return "bg-orange-100 hover:bg-orange-200";
//         return "bg-white hover:bg-gray-50";
//     };

//     const getCardBgColor = (rent) => {
//         const today = new Date();
//         const end = rent.end_date ? new Date(rent.end_date) : null;
//         if (!end) return "bg-white border-[#e9e6e1]";
//         if (today > end) return "bg-red-50 border-red-200";
//         if (getDaysRemaining(rent.end_date) <= 90) return "bg-orange-50 border-orange-200";
//         return "bg-white border-[#e9e6e1]";
//     };

//     /* =========================================================
//        FILTER (✅ Updated to include Status Search)
//     ========================================================= */
//     const filteredRents = rents.filter((rent) => {
//         const search = searchTerm.trim().toLowerCase();
//         if (!search) return true;
//         const tenant = String(getTenantName(rent)).toLowerCase();
//         const unit = String(getUnitDisplay(rent)).toLowerCase();
//         const category = String(getUnitCategory(rent)).toLowerCase();
//         const owner = String(getUnitOwner(rent)).toLowerCase();
//         const start = String(rent.start_date || "").toLowerCase();
//         const end = String(rent.end_date || "").toLowerCase();
//         const status = String(getStatusLabel(rent)).toLowerCase();

//         return (
//             tenant.includes(search) || unit.includes(search) ||
//             category.includes(search) || owner.includes(search) ||
//             start.includes(search) || end.includes(search) ||
//             status.includes(search) // ✅ Status search enabled
//         );
//     });

//     /* =========================================================
//        TOTALS FOR DASHBOARD
//     ========================================================= */
//     const totalRentValue = filteredRents.reduce((sum, rent) => sum + Number(rent.unit_price || 0), 0);
//     let activeCount = 0, expiringCount = 0, expiredCount = 0;
//     filteredRents.forEach(rent => {
//         const status = getStatusLabel(rent);
//         if (status === "منتهي") expiredCount++;
//         else if (status === "قارب على الانتهاء") expiringCount++;
//         else if (status === "نشط") activeCount++;
//     });

//     /* =========================================================
//        PDF DOWNLOAD (✅ Added to RentList)
//     ========================================================= */
//     const handleDownloadPDF = async () => {
//         if (!filteredRents || filteredRents.length === 0) return toast.warning("لا توجد بيانات لتصديرها");
//         if (isGeneratingRef.current || !renderRef.current) return;

//         isGeneratingRef.current = true;
//         setIsGeneratingPdf(true);

//         try {
//             const node = renderRef.current;
//             const scale = 3.0; // Increased zoom display for PDF
            
//             const canvas = await html2canvas(node, {
//                 scale,
//                 useCORS: true,
//                 backgroundColor: "#ffffff",
//                 logging: false,
//                 windowWidth: node.scrollWidth,
//                 windowHeight: node.scrollHeight,
//             });

//             const doc = new jsPDF({
//                 orientation: "landscape",
//                 unit: "mm",
//                 format: "a4",
//                 compress: true,
//             });

//             const pageW = doc.internal.pageSize.getWidth();
//             const pageH = doc.internal.pageSize.getHeight();
//             const imgData = canvas.toDataURL("image/jpeg", 0.95);
//             const imgHmm = (canvas.height * pageW) / canvas.width;

//             doc.addImage(imgData, "JPEG", 0, 0, pageW, imgHmm, undefined, "FAST");
            
//             doc.setFont("helvetica", "bold");
//             doc.setFontSize(7.5);
//             doc.setTextColor(164, 125, 82);
//             doc.text("BROKER CITY PROPERTIES", pageW / 2, pageH - 5, { align: "center" });

//             doc.save(`Rents_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
//             toast.success("✅ تم تحميل تقرير العقود");
//         } catch (err) {
//             console.error("PDF generation error:", err);
//             toast.error("❌ تعذر إنشاء ملف PDF");
//         } finally {
//             isGeneratingRef.current = false;
//             setIsGeneratingPdf(false);
//         }
//     };

//     /* =========================================================
//        CARD VIEW
//     ========================================================= */
//     const renderCardsView = () => (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 max-w-full sm:max-w-[1550px] mx-auto px-2 md:px-2">
//             {filteredRents.map((rent) => {
//                 const tenant = getTenantName(rent);
//                 const unit = getUnitDisplay(rent);
//                 const category = getUnitCategory(rent);
//                 const owner = getUnitOwner(rent);

//                 return (
//                     <div key={rent.id} className={`border rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 relative group ${getCardBgColor(rent)}`}>
//                         <button onClick={() => handleDelete(rent.id)} className="absolute top-3 left-3 p-2 rounded-full bg-white/80 hover:bg-red-100 hover:scale-110 z-10 shadow-sm" title="حذف">
//                             <MdDeleteForever className="text-red-500 text-2xl" />
//                         </button>
//                         <button onClick={() => handleEdit(rent)} className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-green-50 hover:scale-110 z-10 shadow-sm" title="تعديل">
//                             <CiEdit className="text-green-600 text-2xl" />
//                         </button>

//                         <div className="p-4 pt-14 flex flex-col items-center text-center">
//                             <div className="w-full flex gap-3 items-center mb-4">
//                                 <div className="w-14 h-14 rounded-full bg-white/60 border border-white flex items-center justify-center shrink-0">
//                                     <FiUser className="text-[#a47d52]" size={26} />
//                                 </div>
//                                 <div className="flex-1 min-w-0 text-right ">
//                                     <h3 className="text-base font-extrabold text-[#7a5c3a] truncate">{tenant}</h3>
//                                     <p className="text-xs text-gray-600 mt-1 truncate">{unit}</p>
//                                     <p className="text-[10px] text-gray-500 mt-0.5 truncate flex items-center gap-1 bg-[#f8f7f5]">
//                                         <FiTag /> {category}
//                                     </p>
//                                     <p className="text-[10px] text-gray-500 mt-0.5 truncate flex items-center gap-1 bg-[#f8f7f5]">
//                                         <FiBriefcase /> {owner}
//                                     </p>
//                                 </div>
//                             </div>

//                             <div className="w-full grid grid-cols-2 gap-2 mb-3">
//                                 <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
//                                     <p className="text-[10px] font-bold text-blue-600 mb-1">من</p>
//                                     <p className="text-xs font-extrabold text-blue-800" dir="ltr">{rent.start_date}</p>
//                                 </div>
//                                 <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
//                                     <p className="text-[10px] font-bold text-indigo-600 mb-1">إلى</p>
//                                     <p className="text-xs font-extrabold text-indigo-800" dir="ltr">{rent.end_date}</p>
//                                 </div>
//                             </div>

//                             <div className="w-full grid grid-cols-2 gap-2 mb-3">
//                                 <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
//                                     <p className="text-[10px] font-bold text-green-600 mb-1">قيمة القسط</p>
//                                     <p className="text-sm font-extrabold text-green-700" dir="ltr">{formatAmount(rent.installment_amount)}</p>
//                                 </div>
//                                 <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center justify-center">
//                                     <p className="text-[10px] font-bold text-gray-500 mb-1">الحالة</p>
//                                     {getStatusBadge(rent)}
//                                 </div>
//                             </div>

//                             <div className="w-full grid grid-cols-2 gap-2 mb-3">
//                                 <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
//                                     <p className="text-[10px] font-bold text-gray-500 mb-1">سعر الوحدة</p>
//                                     <p className="text-sm font-extrabold text-[#a47d52]" dir="ltr">{formatAmount(rent.unit_price)}</p>
//                                 </div>
//                                 <div className="bg-white/60 rounded-lg py-2 px-2 flex flex-col items-center">
//                                     <p className="text-[10px] font-bold text-gray-500 mb-1">عدد الأقساط</p>
//                                     <p className="text-sm font-extrabold text-gray-800" dir="ltr">{formatInteger(rent.installment_no)}</p>
//                                 </div>
//                             </div>

//                             <div className="w-full border-t border-black/5 pt-3 mt-auto flex flex-col gap-2">
//                                 <div className="flex gap-2">
//                                     <button onClick={() => handleDetails(rent)} className="flex-1 bg-white text-[#a47d52] py-2 px-2 rounded-sm font-extrabold text-xs hover:bg-[#f8f7f5] transition flex items-center justify-center gap-1 shadow-sm">
//                                         <FiEye size={14} /> التفاصيل
//                                     </button>
//                                     <button onClick={() => handleEdit(rent)} className="flex-1 bg-green-600 text-white py-2 px-2 rounded-sm font-extrabold text-xs hover:bg-green-700 transition flex items-center justify-center gap-1 shadow-sm">
//                                         <CiEdit size={14} /> تعديل
//                                     </button>
//                                 </div>
//                                 <button onClick={() => handleAddPayment(rent)} className="w-full bg-[#a47d52] text-white py-2 px-2 rounded-sm font-extrabold text-xs hover:bg-[#8a6a44] transition flex items-center justify-center gap-1 shadow-sm">
//                                     <FiCreditCard size={14} /> إضافة دفعة شهرية
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 );
//             })}
//         </div>
//     );

//     /* =========================================================
//        TABLE VIEW
//     ========================================================= */
//     const renderTableView = () => (
//         <div className="max-w-full mx-auto px-2 md:px-2">
//             <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
//                 <div className="overflow-x-auto">
//                     <table className="w-full text-right whitespace-nowrap">
//                         <thead className="bg-[#e9e6e1] text-[#a47d52]">
//                             <tr>
//                                 <th className="px-4 py-4 text-sm font-bold">#</th>
//                                 <th className="px-4 py-4 text-sm font-bold">المستأجر</th>
//                                 <th className="px-4 py-4 text-sm font-bold">الوحدة</th>
//                                 <th className="px-4 py-4 text-sm font-bold">التصنيف</th>
//                                 <th className="px-4 py-4 text-sm font-bold">المالك</th>
//                                 <th className="px-4 py-4 text-sm font-bold">من تاريخ</th>
//                                 <th className="px-4 py-4 text-sm font-bold">إلى تاريخ</th>
//                                 <th className="px-4 py-4 text-sm font-bold">سعر الوحدة</th>
//                                 <th className="px-4 py-4 text-sm font-bold">عدد الاقساط</th>
//                                 <th className="px-4 py-4 text-sm font-bold">قيمة القسط</th>
//                                 <th className="px-4 py-4 text-sm font-bold">الحالة</th>
//                                 <th className="px-4 py-4 text-center text-sm font-bold">الإجراءات</th>
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {filteredRents.map((rent, index) => (
//                                 <tr key={rent.id} className={`border-b border-gray-200 transition-colors duration-200 ${getRowBgColor(rent)}`}>
//                                     <td className="px-4 py-4 text-sm text-gray-700">{index + 1}</td>
//                                     <td className="px-4 py-4 text-sm font-bold text-gray-800">{getTenantName(rent)}</td>
//                                     <td className="px-4 py-4 text-sm text-gray-700">{getUnitDisplay(rent)}</td>
//                                     <td className="px-4 py-4 text-sm text-gray-700">{getUnitCategory(rent)}</td>
//                                     <td className="px-4 py-4 text-sm text-gray-700">{getUnitOwner(rent)}</td>
//                                     <td className="px-4 py-4 text-sm text-gray-700" dir="ltr">{rent.start_date}</td>
//                                     <td className="px-4 py-4 text-sm text-gray-700" dir="ltr">{rent.end_date}</td>
//                                     <td className="px-4 py-4 text-sm font-bold text-[#a47d52]" dir="ltr">{formatAmount(rent.unit_price)}</td>
//                                     <td className="px-4 py-4 text-sm font-bold text-gray-800" dir="ltr">{formatInteger(rent.installment_no)}</td>
//                                     <td className="px-4 py-4 text-sm font-bold text-green-700" dir="ltr">{formatAmount(rent.installment_amount)}</td>
//                                     <td className="px-4 py-4 text-sm">{getStatusBadge(rent)}</td>
//                                     <td className="px-4 py-4 text-center">
//                                         <div className="flex justify-center gap-1">
//                                             <button onClick={() => handleDetails(rent)} className="px-2 py-2 bg-white/80 rounded-lg hover:scale-110 transition" title="التفاصيل">
//                                                 <FiEye className="text-[#a47d52]" size={21} />
//                                             </button>
//                                             <button onClick={() => handleAddPayment(rent)} className="px-2 py-2 bg-white/80 rounded-lg hover:scale-110 transition" title="إضافة دفعة">
//                                                 <FiCreditCard className="text-blue-600" size={21} />
//                                             </button>
//                                             <button onClick={() => handleEdit(rent)} className="px-2 py-2 bg-white/80 rounded-lg hover:scale-110 transition" title="تعديل">
//                                                 <CiEdit className="text-green-600" size={22} />
//                                             </button>
//                                             <button onClick={() => handleDelete(rent.id)} className="px-2 py-2 bg-white/80 rounded-lg hover:scale-110 transition" title="حذف">
//                                                 <MdDeleteForever className="text-red-600" size={22} />
//                                             </button>
//                                         </div>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//             </div>
//         </div>
//     );

//     return (
//         <div className="min-h-screen bg-[#f8f7f5] py-6 px-2 md:py-8 md:px-3 lg:py-5 lg:px-2 rtl" dir="rtl">
//             <Toaster position="top-center" reverseOrder={false} />

//             {/* HEADER */}
//             <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-2 md:px-2 mb-6 md:mb-8 lg:mb-10 gap-4 lg:shadow-lg">
//                 <div className="text-center sm:text-right">
//                     <div className="flex items-center gap-3">
//                         <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[#e9e6e1] items-center justify-center">
//                             <FiHome className="text-[#a47d52]" size={24} />
//                         </div>
//                         <div>
//                             <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 tracking-wide">إدارة العقود</h2>
//                             <p className="text-base md:text-lg text-gray-600 mt-1">إدارة عقود الإيجار والدفعات الشهرية</p>
//                         </div>
//                     </div>
//                 </div>

//                 <div className="flex flex-col sm:flex-row gap-3">
//                     {/* ✅ Added PDF Download Button */}
//                     <button onClick={handleDownloadPDF} disabled={isGeneratingPdf || filteredRents.length === 0 || !pdfReady} className="flex items-center justify-center gap-2 bg-white border-2 border-[#a47d52] text-[#a47d52] px-5 md:px-6 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#a47d52] hover:text-white hover:scale-105 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
//                         <MdPictureAsPdf size={20} />
//                         {isGeneratingPdf ? "جاري التحميل..." : "تحميل PDF"}
//                     </button>

//                     <button onClick={handleAdd} className="flex items-center justify-center gap-2 bg-[#a47d52] text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 shadow-sm">
//                         <FiPlus size={20} /> إضافة عقد
//                     </button>
//                     <button onClick={fetchRents} disabled={loading} className="flex items-center justify-center gap-2 bg-[#6c7a89] text-white px-5 py-3 rounded-full font-extrabold transition-all duration-300 hover:bg-[#5a6775] disabled:opacity-50">
//                         <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
//                     </button>
//                 </div>
//             </div>

//             {/* SEARCH + VIEW TOGGLE */}
//             <div className="max-w-full mx-auto px-2 md:px-2 mb-5">
//                 <div className="flex flex-col md:flex-row gap-4 items-center">
//                     <div className="relative w-full md:flex-1">
//                         <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
//                         <input
//                             type="text"
//                             placeholder="بحث بالمستأجر أو الوحدة أو التصنيف أو المالك..."
//                             className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white text-right"
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                         />
//                     </div>
//                     <div className="w-full md:w-auto flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
//                         <button onClick={() => setViewMode("cards")} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${viewMode === "cards" ? "bg-[#a47d52] text-white shadow-md" : "text-gray-600 hover:bg-[#f8f7f5]"}`}>
//                             <FiGrid size={18} /> بطاقات
//                         </button>
//                         <button onClick={() => setViewMode("table")} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${viewMode === "table" ? "bg-[#a47d52] text-white shadow-md" : "text-gray-600 hover:bg-[#f8f7f5]"}`}>
//                             <FiList size={18} /> جدول
//                         </button>
//                     </div>
//                 </div>
//             </div>

//             {/* ✅ DASHBOARD SUMMARY CARDS */}
//             {!loading && rents.length > 0 && (
//                 <div className="max-w-full mx-auto px-2 md:px-2 mb-6">
//                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
//                         <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-[#a47d52]">
//                             <div className="flex justify-between items-start mb-2">
//                                 <p className="text-xs text-gray-500 font-bold">عدد عقود الايجار</p>
//                                 <FiHome className="text-[#a47d52]" size={18} />
//                             </div>
//                             <p className="text-2xl font-black text-[#a47d52]">{filteredRents.length}</p>
//                         </div>
//                         <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-green-500">
//                             <div className="flex justify-between items-start mb-2">
//                                 <p className="text-xs text-gray-500 font-bold">ساري (نشط)</p>
//                                 <FiCheckCircle className="text-green-500" size={18} />
//                             </div>
//                             <p className="text-2xl font-black text-green-600">{activeCount}</p>
//                         </div>
//                         <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-orange-500">
//                             <div className="flex justify-between items-start mb-2">
//                                 <p className="text-xs text-gray-500 font-bold">قارب على الانتهاء</p>
//                                 <FiClock className="text-orange-500" size={18} />
//                             </div>
//                             <p className="text-2xl font-black text-orange-600">{expiringCount}</p>
//                         </div>
//                         <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-red-500">
//                             <div className="flex justify-between items-start mb-2">
//                                 <p className="text-xs text-gray-500 font-bold">منتهي</p>
//                                 <FiXCircle className="text-red-500" size={18} />
//                             </div>
//                             <p className="text-2xl font-black text-red-600">{expiredCount}</p>
//                         </div>
//                         <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm flex flex-col justify-between border-r-4 border-r-blue-500 col-span-2 md:col-span-1">
//                             <div className="flex justify-between items-start mb-2">
//                                 <p className="text-xs text-gray-500 font-bold">إجمالي قيمة العقود</p>
//                                 <span>AED</span>
//                             </div>
//                             <p className="text-xl font-black text-blue-700 truncate" dir="ltr">
//                                 {formatInteger(totalRentValue)}
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {/* CONTENT */}
//             {loading ? (
//                 <div className="flex justify-center items-center py-20">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />
//                 </div>
//             ) : filteredRents.length === 0 ? (
//                 <div className="max-w-full mx-auto px-2 md:px-2">
//                     <div className="bg-white rounded-xl shadow-lg text-center py-20">
//                         <FiHome className="mx-auto text-gray-300 mb-4" size={50} />
//                         <p className="text-gray-500 text-lg">لا توجد عقود</p>
//                         <button onClick={handleAdd} className="mt-5 bg-[#a47d52] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8a6a44] transition">+ إضافة عقد</button>
//                     </div>
//                 </div>
//             ) : viewMode === "cards" ? renderCardsView() : renderTableView()}

//             {/* MODALS */}
//             {showAddModal && <RentAddEdit rent={selectedRent} onClose={handleModalClose} onSuccess={handleSuccess} />}
//             {showAddPaymentModal && selectedRent && <AddMonthlyPayment rent={selectedRent} onClose={handleModalClose} onSuccess={handleSuccess} />}
//             {showDetailModal && selectedRent && <DetailRent rentId={selectedRent.id} onClose={handleModalClose} />}

//             {/* HIDDEN PDF RENDER TARGET */}
//             {pdfReady && filteredRents.length > 0 && (
//                 <PdfRenderTarget
//                     ref={renderRef}
//                     rents={filteredRents}
//                     generatedAt={new Date().toLocaleString("ar-EG")}
//                 />
//             )}
//         </div>
//     );
// };

// export default RentList;

