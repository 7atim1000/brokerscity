import React, { useEffect, useState, useRef, forwardRef } from "react";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import { MdClose, MdPictureAsPdf } from "react-icons/md";
import { FaBuilding, FaUserTie, FaFileContract } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import logo from "../../../assets/images/logogo-removebg-old.png";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const PRINT_FONT = '"Cairo", "Tajawal", "Segoe UI", "Tahoma", "Arial", sans-serif';

// =============================================================
// HIDDEN PDF RENDER TARGET (A4 Landscape matching the doc)
// =============================================================
const PdfRenderTarget = forwardRef(({ rent, generatedAt }, ref) => {
    // Helpers for the PDF
    const formatDate = (dateStr) => {
        if (!dateStr) return "—";
        return dateStr;
    };

    const formatAmount = (amount) => {
        const number = Number(amount || 0);
        return number.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    return (
        <div
            ref={ref}
            dir="rtl"
            lang="ar"
            data-pdf-root="true"
            style={{
                width: "1123px", // A4 Landscape
                padding: "30px 40px",
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
            <header
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "2px solid #a47d52",
                    paddingBottom: "15px",
                    marginBottom: "20px",
                }}
            >
                <div style={{ textAlign: "right" }}>
                    <h1 style={{ color: "#a47d52", fontSize: "24px", fontWeight: 900, margin: 0 }}>
                        عقد إيجار
                    </h1>
                    <p style={{ fontSize: "14px", margin: "4px 0 0 0", color: "#6b7280" }}>
                        Tenancy Contract
                    </p>
                </div>
                <div style={{ textAlign: "center" }}>
                    {/* <img src={logo} alt="Logo" crossOrigin="anonymous" style={{ height: "80px", objectFit: "contain"  }} /> */}
                    <img
                                            src={logo}
                                            alt="Broker City"
                                            // ✅ Logo scaled down to fit shorter navbar
                                            className="
                                                h-20
                                                sm:h-14
                                                w-auto
                                                object-contain
                                                scale-320
                                                contrast-125
                                                saturate-125
                                            "
                                            style={{
                                                filter:
                                                    "drop-shadow(0 0 1px rgba(0,0,0,0.25)) contrast(1.2) saturate(1.15)",
                                            }}
                                        />
                </div>
                <div style={{ textAlign: "left", fontSize: "12px", color: "#6b7280" }}>
                    <p style={{ margin: 0 }}>تاريخ الطباعة: {generatedAt}</p>
                    <p style={{ margin: "4px 0 0 0" }}>رقم العقد: #{rent.id || "—"}</p>
                </div>
            </header>

            {/* PROPERTY OWNER & LANDLORD DETAILS */}
            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                <div style={{ flex: 1, border: "1px solid #ccc", padding: "10px", borderRadius: "8px" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#a47d52", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                        تفاصيل مالك العقار / Property Owner Details
                    </h3>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>الاسم:</strong> {rent.unit_owner || "—"}</p>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>الموقع:</strong> {rent.unit_category || "—"}</p>
                </div>
                <div style={{ flex: 1, border: "1px solid #ccc", padding: "10px", borderRadius: "8px" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#a47d52", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                        المؤجر / Landlord
                    </h3>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>الاسم:</strong> Broker City Properties</p>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>الهاتف:</strong> 2000195-97150</p>
                
                </div>
            </div>

            {/* TENANT & UNIT DETAILS */}
            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                <div style={{ flex: 1, border: "1px solid #ccc", padding: "10px", borderRadius: "8px" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#a47d52", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                        المستأجر / Tenants
                    </h3>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>الاسم:</strong> {rent.tenant_name || "—"}</p>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>الوحدة:</strong> {rent.unit_display || "—"}</p>
                </div>
                <div style={{ flex: 1, border: "1px solid #ccc", padding: "10px", borderRadius: "8px" }}>
                    <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#a47d52", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                        تفاصيل الوحدة / Unit Details
                    </h3>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>الوحدة:</strong> {rent.unit_display || "—"}</p>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>سعر الوحدة:</strong> {formatAmount(rent.unit_price)} AED</p>
                    <p style={{ fontSize: "13px", margin: "4px 0" }}><strong>مبلغ التأمين:</strong> {formatAmount(rent.unit_security_deposit)} AED</p>
                </div>
            </div>

            {/* RENTAL & PAYMENT DETAILS */}
            <div style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "8px", marginBottom: "20px" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#a47d52", borderBottom: "1px solid #eee", paddingBottom: "5px" }}>
                    تفاصيل الإيجار والدفع / Rental and Payment Details
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" }}>
                    <div>
                        <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>تاريخ البدء / Start Date</p>
                        <p style={{ fontSize: "14px", fontWeight: "bold", margin: "2px 0" }}>{formatDate(rent.start_date)}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>تاريخ الانتهاء / Expiry Date</p>
                        <p style={{ fontSize: "14px", fontWeight: "bold", margin: "2px 0" }}>{formatDate(rent.end_date)}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>المدة الزمنية / Duration</p>
                        <p style={{ fontSize: "14px", fontWeight: "bold", margin: "2px 0" }}>{rent.total_months || 0} شهر</p>
                    </div>
                    <div>
                        <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>عدد الأقساط / No. of Installments</p>
                        <p style={{ fontSize: "14px", fontWeight: "bold", margin: "2px 0" }}>{rent.installment_no || 0}</p>
                    </div>
                    <div>
                        <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>قيمة الإيجار / Rental Value</p>
                        <p style={{ fontSize: "14px", fontWeight: "bold", margin: "2px 0" }}>{formatAmount(rent.unit_price)} AED</p>
                    </div>
                    <div>
                        <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>قيمة القسط / Installment Amount</p>
                        <p style={{ fontSize: "14px", fontWeight: "bold", margin: "2px 0" }}>{formatAmount(rent.installment_amount)} AED</p>
                    </div>
                </div>
            </div>

            {/* TERMS & CONDITIONS */}
            <div style={{ fontSize: "10px", color: "#4b5563", lineHeight: "1.5", textAlign: "justify" }}>
                <h4 style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#a47d52" }}>الشروط والأحكام / Terms & Conditions:</h4>
                <p>1- يتعهد المستأجر بأن حق الانتفاع بالعين المستأجرة قاصر عليه ولا يجوز انتقاله لاي احد اخر وفى حال اخلاله يعتبر العقد ملغيا ويتحمل المستأجر كافة الاضرار الناشئة عن ذلك.</p>
                <p>2- تعتبر هذه الوثيقة قائمة الى انتهاء المدة المقررة وتنتهى اثارها بإستلام المؤجر او من يمثله للعين المستاجرة بالحالة التى تم تاجيرها بها.</p>
                <p>3- أي اصلاح أو ترميم في العقار يتم بعد حصول المستاجر على موافقة خطية من المؤجر ويتحمل المستأجر مصاريف تلك الصيانة او الترميم.</p>
                <p>4- يوافق المستأجر على انه اطلع على كافة شروط وبنود وثيقة الايجار وفي حال مخالفته لايا من البنود الواردة بها فمن حق المؤجر مطالبة المستأجر باخلاء العين المستاجرة فوراً.</p>
                <p>5- في حال رغب المستأجر باخلاء العين المستاجرة عند نهاية الفترة الايجارية او قبلها فيتوجب عليه اخطار المؤجر كتابة قبل 60 يوم من الاخلاء.</p>
            </div>

            {/* SIGNATURES */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", borderTop: "1px dashed #ccc", paddingTop: "20px" }}>
                <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "12px", fontWeight: "bold", margin: "0 0 30px 0" }}>توقيع المؤجر</p>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>Broker City Properties</p>
                </div>
                <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "12px", fontWeight: "bold", margin: "0 0 30px 0" }}>توقيع المستأجر</p>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>{rent.tenant_name || "Tenant signature"}</p>
                </div>
            </div>
        </div>
    );
});
PdfRenderTarget.displayName = "PdfRenderTarget";

// =============================================================
// MAIN COMPONENT
// =============================================================
const DetailRent = ({ rentId, onClose }) => {
    const [rent, setRent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfReady, setPdfReady] = useState(false);

    const renderRef = useRef(null);
    const isGeneratingRef = useRef(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const token = localStorage.getItem("access_token");
                const res = await fetch(`${BASE}/api/rents/${rentId}/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("فشل تحميل بيانات العقد");
                const data = await res.json();
                setRent(data.rent || data);
            } catch (err) {
                console.error(err);
                toast.error("❌ حدث خطأ أثناء جلب التفاصيل");
            } finally {
                setLoading(false);
            }
        };

        if (rentId) fetchDetails();

        // Ensure fonts are loaded for PDF
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
    }, [rentId]);

    const handleDownloadPDF = async () => {
        if (!rent || isGeneratingRef.current || !renderRef.current) return;
        
        isGeneratingRef.current = true;
        setIsGeneratingPdf(true);

        try {
            const node = renderRef.current;
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

            // Add Image to PDF
            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            const imgHmm = (canvas.height * pageW) / canvas.width;

            doc.addImage(imgData, "JPEG", 0, 0, pageW, imgHmm, undefined, "FAST");

            // Footer
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(164, 125, 82);
            doc.text("BROKER CITY PROPERTIES", pageW / 2, pageH - 5, { align: "center" });

            doc.save(`Tenancy_Contract_${rentId}.pdf`);
            toast.success("✅ تم تحميل العقد بنجاح");
        } catch (err) {
            console.error("PDF generation error:", err);
            toast.error("❌ تعذر إنشاء ملف PDF");
        } finally {
            isGeneratingRef.current = false;
            setIsGeneratingPdf(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-[#a47d52] rounded-full animate-spin mb-4" />
                    <p className="text-gray-700 font-bold">جاري تحميل العقد...</p>
                </div>
            </div>
        );
    }

    if (!rent) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <Toaster position="top-center" reverseOrder={false} />

            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col" dir="rtl">
                
                {/* HEADER */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-[#f8f7f5] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                            <FaFileContract size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-extrabold text-gray-800">
                                تفاصيل عقد الإيجار
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                عقد رقم: #{rent.id || "-"}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-white text-gray-500 hover:text-red-500 transition-all shadow-sm cursor-pointer"
                    >
                        <MdClose size={24} />
                    </button>
                </div>

                {/* BODY */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    
                    {/* MAIN CONTRACT PREVIEW BOX */}
                    <div className="border border-[#e9e6e1] rounded-xl p-5 bg-white shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h2 className="text-2xl font-black text-[#a47d52]">عقد إيجار <span className="text-sm text-gray-400 font-normal">Tenancy Contract</span></h2>
                            <span className="text-xs text-gray-500 font-bold">{rent.created_at ? new Date(rent.created_at).toLocaleDateString() : ""}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Owner & Landlord */}
                            <div className="bg-[#f8f7f5] p-4 rounded-lg space-y-2">
                                <h4 className="font-bold text-[#a47d52] text-sm flex items-center gap-2"><FaBuilding /> المالك والمؤجر</h4>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">المالك:</span>
                                    <span className="font-bold text-gray-800">{rent.unit_owner || "—"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">المؤجر:</span>
                                    <span className="font-bold text-gray-800">Broker City Properties</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">الموقع:</span>
                                    <span className="font-bold text-gray-800">{rent.unit_category || "—"}</span>
                                </div>
                            </div>

                            {/* Tenant & Unit */}
                            <div className="bg-[#f8f7f5] p-4 rounded-lg space-y-2">
                                <h4 className="font-bold text-[#a47d52] text-sm flex items-center gap-2"><FaUserTie /> المستأجر والوحدة</h4>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">المستأجر:</span>
                                    <span className="font-bold text-gray-800">{rent.tenant_name || "—"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">الوحدة:</span>
                                    <span className="font-bold text-gray-800">{rent.unit_display || "—"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">سعر الوحدة:</span>
                                    <span className="font-bold text-[#a47d52]" dir="ltr">{rent.unit_price} AED</span>
                                </div>
                            </div>
                        </div>

                        {/* Dates & Payments */}
                        <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-bold text-gray-800 text-sm mb-3">تفاصيل الدفع</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-1">تاريخ البدء</p>
                                    <p className="text-sm font-extrabold text-blue-700">{rent.start_date || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-1">تاريخ الانتهاء</p>
                                    <p className="text-sm font-extrabold text-indigo-700">{rent.end_date || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-1">المدة</p>
                                    <p className="text-sm font-extrabold text-gray-800">{rent.total_months || 0} شهر</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-1">عدد الأقساط</p>
                                    <p className="text-sm font-extrabold text-gray-800">{rent.installment_no || 0}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-1">قيمة الإيجار</p>
                                    <p className="text-sm font-extrabold text-green-700" dir="ltr">{rent.unit_price} AED</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-1">قيمة القسط</p>
                                    <p className="text-sm font-extrabold text-green-700" dir="ltr">{rent.installment_amount} AED</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold mb-1">مبلغ التأمين</p>
                                    <p className="text-sm font-extrabold text-gray-800" dir="ltr">{rent.unit_security_deposit} AED</p>
                                </div>
                            </div>
                        </div>
                        
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex flex-col md:flex-row gap-3 border-t border-gray-200 p-6 bg-[#f8f7f5] shrink-0">
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPdf || !pdfReady}
                        className="flex-1 flex items-center justify-center gap-2 cursor-pointer font-extrabold bg-white border-2 border-[#a47d52] text-[#a47d52] px-6 py-3 rounded-xl transition-all duration-300 hover:bg-[#a47d52] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        <MdPictureAsPdf size={20} />
                        {isGeneratingPdf ? "جاري التحميل..." : "تحميل PDF (عقد الإيجار)"}
                    </button>

                    <button
                        onClick={onClose}
                        className="flex-1 cursor-pointer font-extrabold bg-gray-200 text-gray-700 hover:bg-gray-300 px-6 py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                    >
                        إغلاق
                    </button>
                </div>

                {/* HIDDEN PDF RENDERER */}
                {pdfReady && rent && (
                    <PdfRenderTarget
                        ref={renderRef}
                        rent={rent}
                        generatedAt={new Date().toLocaleString("ar-EG")}
                    />
                )}
            </div>
        </div>
    );
};

export default DetailRent;