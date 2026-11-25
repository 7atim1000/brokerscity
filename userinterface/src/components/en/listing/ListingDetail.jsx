// // //import logo from '../../../assets/images/logogo-removebg-old.png'
import React, { useState, useRef, useEffect } from "react";
import {
    FaTimes, FaHome, FaMapMarkerAlt, FaBed, FaBath, FaVectorSquare,
    FaUserTie, FaCheckCircle, FaFilePdf, FaCar, FaTag, 
    FaFire, FaCheck
} from "react-icons/fa";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

// ✅ Import your logo
import logo from '../../../assets/images/logogo-removebg-old.png';

// PDF page size (A4 portrait at 96dpi) and gallery layout
const PDF_PAGE_W = 794;
const PDF_PAGE_H = 1123;
const GALLERY_IMAGES_PER_PAGE = 2;      // 2 big images per page → no image is ever split
const GALLERY_IMAGE_HEIGHT_FIRST = 430; // first gallery page (has the "Property Gallery" heading)
const GALLERY_IMAGE_HEIGHT_NEXT = 470;  // next gallery pages (no heading → slightly taller images)
const PDF_MASTHEAD_H = 140;             // logo strip at the top of the cover page
const PDF_FOOTER_ZONE = 80;             // bottom area kept free for the "BROKER CITY PROPERTIES" footer

const ListingDetail = ({ listing, onClose }) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    
    // PDF State
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const pdfRef = useRef(null);
    const isGeneratingRef = useRef(false);

    // The logo PNG has empty padding (transparent or white) around the artwork, which makes it look
    // tiny in the PDF. Trim that padding once, so the logo can be sized by its visible artwork.
    const [pdfLogo, setPdfLogo] = useState(logo);
    const logoReadyRef = useRef(Promise.resolve());
    useEffect(() => {
        logoReadyRef.current = new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const w = img.naturalWidth;
                    const h = img.naturalHeight;
                    const canvas = document.createElement("canvas");
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    const { data } = ctx.getImageData(0, 0, w, h);

                    // "ink" = visible pixel that is not (almost) white
                    const isInk = (i) => data[i + 3] > 10 && !(data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240);

                    let minX = w, minY = h, maxX = -1, maxY = -1;
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            if (isInk((y * w + x) * 4)) {
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }

                    if (maxX >= 0) {
                        const cw = maxX - minX + 1;
                        const ch = maxY - minY + 1;
                        const out = document.createElement("canvas");
                        out.width = cw;
                        out.height = ch;
                        out.getContext("2d").drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
                        setPdfLogo(out.toDataURL("image/png"));
                    }
                } catch (e) {
                    // keep the original logo if trimming is not possible
                }
                resolve();
            };
            img.onerror = () => resolve();
            img.src = logo;
        });
    }, []);

    if (!listing) return null;

    // Format currency
    const formatAmount = (amount) => {
        if (!amount) return "0";
        return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
    };

    // Prepare gallery images
    const allImages = [
        listing.cover_image,
        ...(listing.gallery_images || []).map(img => img.image)
    ].filter(Boolean);

    const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % allImages.length);
    const prevImage = () => setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'live': return 'bg-green-100 text-green-700 border-green-200';
            case 'under mou': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'under reservation': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'sold': 
            case 'rented': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const amenitiesList = Object.keys(listing).filter(key => 
        typeof listing[key] === 'boolean' && listing[key] === true && !['hot_deal', 'property_finder'].includes(key)
    );

    const isRent = listing.property_offer === 'rent';

    // Split gallery images (everything after the cover) into PDF pages
    const galleryImages = allImages.slice(1);
    const galleryPages = [];
    for (let i = 0; i < galleryImages.length; i += GALLERY_IMAGES_PER_PAGE) {
        galleryPages.push(galleryImages.slice(i, i + GALLERY_IMAGES_PER_PAGE));
    }

    // Shared inline styles for the PDF pages
    const pdfPageStyle = {
        width: `${PDF_PAGE_W}px`,
        height: `${PDF_PAGE_H}px`,
        backgroundColor: "#ffffff",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
    };
    const pdfH2Style = {
        fontSize: "38px",
        lineHeight: 1.2,
        fontWeight: "bold",
        color: "#a47d52",
        borderBottom: "3px solid #a47d52",
        paddingBottom: "10px",
        marginTop: 0,
        marginBottom: "24px",
    };
    const pdfTableStyle = { width: "100%", borderCollapse: "collapse", fontSize: "26px", lineHeight: 1.3 };
    const pdfRowStyle = { borderBottom: "1px solid #d1d5db" };
    const pdfLabelStyle = { padding: "12px 0", fontWeight: "bold", color: "#374151", width: "38%", verticalAlign: "top" };
    const pdfValueStyle = { padding: "12px 0", color: "#111827", verticalAlign: "top" };

    // Logo strip at the top of the cover page only (large, left aligned)
    const renderPdfMasthead = () => (
        <div style={{
            height: `${PDF_MASTHEAD_H}px`,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "0 40px",
            boxSizing: "border-box",
            backgroundColor: "#ffffff",
            borderBottom: "3px solid #a47d52",
        }}>
            <img src={pdfLogo} alt="Logo" style={{ height: "92px", maxWidth: "430px", objectFit: "contain", display: "block" }} />
        </div>
    );

    // =========================================================
    // PDF GENERATION LOGIC
    // Each [data-pdf-page] element is captured on its own and placed on its own
    // PDF page, so nothing (e.g. gallery images) is ever cut between two pages.
    // =========================================================
    const handleDownloadPDF = async () => {
        if (!pdfRef.current) return toast.error("PDF target not found.");
        if (isGeneratingRef.current) return;

        isGeneratingRef.current = true;
        setIsGeneratingPdf(true);
        const toastId = toast.loading("Generating Brochure PDF...");

        try {
            // make sure the trimmed logo is ready and rendered before capturing
            await logoReadyRef.current;
            await new Promise((r) => setTimeout(r, 60));

            const pages = Array.from(pdfRef.current.querySelectorAll("[data-pdf-page]"));
            if (pages.length === 0) throw new Error("No PDF pages found");

            // If a page's content is taller than its area (e.g. long text), shrink it to fit
            // so it can never run into the footer or get cut off.
            const fitPageContent = (pageNode) => {
                const fit = pageNode.querySelector("[data-pdf-fit]");
                if (!fit || !fit.parentElement) return;
                fit.style.transform = "";
                fit.style.width = "100%";
                const available = fit.parentElement.clientHeight;
                const needed = fit.scrollHeight;
                if (needed > available) {
                    const k = available / needed;
                    fit.style.transformOrigin = "top left";
                    fit.style.transform = `scale(${k})`;
                    fit.style.width = `${100 / k}%`;
                }
            };

            const scale = 3.0; 

            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
                compress: true,
            });

            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();

            for (let i = 0; i < pages.length; i++) {
                const pageNode = pages[i];
                fitPageContent(pageNode);

                const canvas = await html2canvas(pageNode, {
                    scale,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                    windowWidth: pageNode.scrollWidth,
                    windowHeight: pageNode.scrollHeight,
                });

                const imgData = canvas.toDataURL("image/jpeg", 0.95);

                if (i > 0) doc.addPage();
                doc.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
            }

            // Add footer
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(164, 125, 82); // #a47d52
                doc.text("BROKER CITY PROPERTIES", pageW / 2, pageH - 5, { align: "center" });
            }

            doc.save(`${listing.reference || 'Property'}_Brochure.pdf`);
            toast.success("✅ Brochure downloaded!", { id: toastId });
        } catch (err) {
            console.error("PDF generation error:", err);
            toast.error("❌ Failed to generate PDF", { id: toastId });
        } finally {
            isGeneratingRef.current = false;
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-6" dir="ltr">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden animate-fadeIn relative">
                
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-extrabold text-gray-900 truncate max-w-md">
                                {listing.title || "Untitled Listing"}
                            </h2>
                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded border ${getStatusColor(listing.property_status)}`}>
                                {listing.property_status || "Draft"}
                            </span>
                            {listing.hot_deal && (
                                <span className="bg-red-50 text-red-600 text-[10px] uppercase font-bold px-2.5 py-1 rounded border border-red-200 flex items-center gap-1">
                                    <FaFire className="animate-pulse" /> Hot Deal
                                </span>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                                <FaMapMarkerAlt className="text-[#4285F4]" /> 
                                {listing.location_text || "Location not specified"}
                            </span>
                            <span className="text-gray-300">|</span>
                            <span className="flex items-center gap-1 font-bold text-gray-700">
                                <FaTag className="text-[#4285F4]" /> 
                                Offer: <span className="uppercase text-[#4285F4]">{listing.property_offer || "Sale"}</span>
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPdf}
                            className="flex items-center gap-2 px-4 py-2 bg-[#4285F4]/10 text-[#4285F4] rounded-lg font-bold text-sm hover:bg-[#4285F4] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        >
                            <FaFilePdf size={16} /> 
                            {isGeneratingPdf ? "Generating..." : "Brochure"}
                        </button>

                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                            <FaTimes size={20} />
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT (UI) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f7f5]">
                    
                    {/* HERO / GALLERY */}
                    <div className="relative h-80 bg-transparent group">
                        {allImages.length > 0 ? (
                            <>
                                <img 
                                    src={allImages[activeImageIndex]} 
                                    alt="Property" 
                                    className="w-full h-full object-contain"
                                />
                                {allImages.length > 1 && (
                                    <>
                                        <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                            <FiChevronLeft size={24} />
                                        </button>
                                        <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                                            <FiChevronRight size={24} />
                                        </button>
                                    </>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <FaHome size={64} className="opacity-20" />
                            </div>
                        )}
                    </div>

                    {/* PRICING & SPECS BANNER */}
                    <div className="max-w-5xl mx-auto px-6 -mt-8 relative z-10">
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 flex flex-wrap gap-6 items-center justify-between">
                            
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {isRent ? 'Asking Rent' : 'Asking Price'}
                                </p>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-extrabold text-[#4285F4]">
                                        AED {formatAmount(listing.sale_price || listing.rent_price_yearly || 0)}
                                    </p>
                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded mb-1 ${isRent ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {isRent ? 'Rent' : 'Sale'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4 md:gap-6 flex-wrap">
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-[#4285F4]/10 flex items-center justify-center mb-1">
                                        <FaBed className="text-[#4285F4]" size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{listing.bedrooms || 0} Beds</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-1">
                                        <FaBath className="text-[#10B981]" size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{listing.bathrooms || 0} Baths</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center mb-1">
                                        <FaVectorSquare className="text-[#8B5CF6]" size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{listing.size || 0} sqft</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mb-1">
                                        <FaCar className="text-[#F59E0B]" size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-gray-700">{listing.parking || 0} Parking</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TABS */}
                    <div className="max-w-5xl mx-auto px-6 py-8">
                        <div className="flex gap-4 border-b border-gray-200 mb-6">
                            <button 
                                onClick={() => setActiveTab("overview")}
                                className={`pb-3 font-bold text-sm cursor-pointer transition-colors border-b-2 ${activeTab === "overview" ? "border-[#4285F4] text-[#4285F4]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                            >
                                Overview
                            </button>
                            <button 
                                onClick={() => setActiveTab("amenities")}
                                className={`pb-3 font-bold text-sm cursor-pointer transition-colors border-b-2 ${activeTab === "amenities" ? "border-[#4285F4] text-[#4285F4]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                            >
                                Amenities
                            </button>
                        </div>

                        {/* TAB CONTENT */}
                        {activeTab === "overview" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                                <div className="md:col-span-2 space-y-6">
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                        <h3 className="text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                                            <FaHome className="text-gray-400" /> Property Details
                                        </h3>
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                            <div>
                                                <p className="text-gray-400 font-bold mb-1">Property Type</p>
                                                <p className="font-semibold text-gray-800 capitalize">{listing.property_type || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 font-bold mb-1">Tenure</p>
                                                <p className="font-semibold text-gray-800">{listing.tenure || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 font-bold mb-1">Unit No.</p>
                                                <p className="font-semibold text-gray-800">{listing.unit_no || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 font-bold mb-1">Built-up Area</p>
                                                <p className="font-semibold text-gray-800">{listing.built_up_area ? `${listing.built_up_area} sqft` : "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-400 font-bold mb-1">Plot Size</p>
                                                <p className="font-semibold text-gray-800">{listing.plot_size ? `${listing.plot_size} sqft` : "—"}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-6 border-t border-gray-100 pt-4">
                                            <p className="text-gray-400 font-bold mb-2">Description</p>
                                            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">
                                                {listing.description || "No description provided."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                                        <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                            <FaUserTie className="text-purple-500" /> Assignment
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Managed By</p>
                                                <p className="font-bold text-gray-800">{listing.created_by_name || "System"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Listing Owner</p>
                                                <p className="font-bold text-gray-800">{listing.listing_owner_name || "—"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "amenities" && (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-fadeIn">
                                <h3 className="text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2">
                                    <FaCheck className="text-green-500" /> Included Amenities
                                </h3>
                                {amenitiesList.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {amenitiesList.map(amenity => (
                                            <div key={amenity} className="flex items-center gap-2 bg-[#f8f7f5] p-3 rounded-lg border border-gray-100">
                                                <FaCheckCircle className="text-green-500 shrink-0" size={14} />
                                                <span className="text-sm font-semibold text-gray-700 capitalize truncate">
                                                    {amenity.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-sm">No amenities specified for this listing.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* =========================================================
                    HIDDEN PDF RENDER TARGET (100% Inline Styles)
                    Every [data-pdf-page] block below = exactly one A4 page in the PDF
                ========================================================= */}
                <div className="fixed -left-[9999px] top-0 z-[-1]">
                    <div 
                        ref={pdfRef} 
                        style={{
                            width: `${PDF_PAGE_W}px`, // A4 Portrait width in px
                            backgroundColor: "#ffffff",
                            color: "#000000",
                            fontFamily: "Arial, sans-serif",
                            lineHeight: 1.3,
                        }}
                    >
                        
                        {/* PAGE 1: COVER — logo (left) on top, photo, then title / offer / price / location */}
                        <div data-pdf-page style={{ ...pdfPageStyle, display: "flex", flexDirection: "column" }}>
                            
                            {renderPdfMasthead()}

                            {/* Cover photo */}
                            <div style={{ width: "100%", height: "590px", flexShrink: 0, backgroundColor: "#f3f4f6" }}>
                                {allImages.length > 0 && (
                                    <img src={allImages[0]} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                )}
                            </div>

                            {/* Title, offer, price (single price) and location — all on the left */}
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "left", padding: "24px 40px 60px", backgroundColor: "#f8f7f5", borderTop: "3px solid #a47d52", boxSizing: "border-box" }}>
                                <h1 style={{ fontSize: "36px", fontWeight: "bold", color: "#a47d52", margin: "0 0 10px 0", lineHeight: 1.25 }}>
                                    {listing.title || "Luxury Property"}
                                </h1>
                                <p style={{ fontSize: "26px", color: "#4b5563", fontWeight: "bold", margin: "0 0 10px 0" }}>
                                    {isRent ? "For Rent" : "For Sale"}
                                </p>
                                <p style={{ fontSize: "50px", fontWeight: "bold", color: "#111827", margin: 0, lineHeight: 1.15 }}>
                                    AED {formatAmount(listing.sale_price || listing.rent_price_yearly || 0)}
                                </p>
                                <p style={{ fontSize: "26px", color: "#374151", margin: "10px 0 0 0" }}>
                                    {listing.location_text || "Abu Dhabi"}
                                </p>
                            </div>
                        </div>

                        {/* PAGE 2: DETAILS & FINANCIALS */}
                        <div data-pdf-page style={pdfPageStyle}>
                            {/* content area: stops above the footer zone (no logo on this page) */}
                            <div style={{ height: `${PDF_PAGE_H - PDF_FOOTER_ZONE}px`, overflow: "hidden", position: "relative" }}>
                                <div data-pdf-fit style={{ padding: "50px 50px 0", boxSizing: "border-box", width: "100%" }}>
                                    <h2 style={pdfH2Style}>
                                        Property Details
                                    </h2>
                                    
                                    <table style={{ ...pdfTableStyle, marginBottom: "36px" }}>
                                        <tbody>
                                            <tr style={pdfRowStyle}>
                                                <td style={pdfLabelStyle}>Location</td>
                                                <td style={pdfValueStyle}>{listing.location_text || "—"}</td>
                                            </tr>
                                            <tr style={pdfRowStyle}>
                                                <td style={pdfLabelStyle}>Property Type</td>
                                                <td style={{ ...pdfValueStyle, textTransform: "capitalize" }}>{listing.property_type || "—"}</td>
                                            </tr>
                                            <tr style={pdfRowStyle}>
                                                <td style={pdfLabelStyle}>Bedrooms</td>
                                                <td style={pdfValueStyle}>{listing.bedrooms || 0} Bedrooms</td>
                                            </tr>
                                            <tr style={pdfRowStyle}>
                                                <td style={pdfLabelStyle}>Bathrooms</td>
                                                <td style={pdfValueStyle}>{listing.bathrooms || 0} Bathrooms</td>
                                            </tr>
                                            <tr style={pdfRowStyle}>
                                                <td style={pdfLabelStyle}>Plot Area</td>
                                                <td style={pdfValueStyle}>{listing.plot_size || listing.size || 0} sq.ft.</td>
                                            </tr>
                                            <tr style={pdfRowStyle}>
                                                <td style={pdfLabelStyle}>Built-up Area</td>
                                                <td style={pdfValueStyle}>{listing.built_up_area || 0} sq.ft.</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <h2 style={pdfH2Style}>
                                        Financials
                                    </h2>
                                    <table style={pdfTableStyle}>
                                        <tbody>
                                            <tr style={pdfRowStyle}>
                                                <td style={pdfLabelStyle}>{isRent ? "Asking Rent" : "Asking Price"}</td>
                                                <td style={{ ...pdfValueStyle, fontWeight: "bold", fontSize: "34px", lineHeight: 1.2 }}>AED {formatAmount(listing.sale_price || listing.rent_price_yearly || 0)}</td>
                                            </tr>
                                            <tr style={pdfRowStyle}>
                                                <td style={pdfLabelStyle}>Payment Method</td>
                                                <td style={pdfValueStyle}>{listing.payment_method || "Cash"}</td>
                                            </tr>
                                            <tr style={pdfRowStyle}>
                                                <td style={pdfLabelStyle}>Service Charge</td>
                                                <td style={pdfValueStyle}>AED {formatAmount(listing.service_charge || 0)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* PAGES 3+: GALLERY — whole images only (2 per page), so the last image
                            always sits fully on its own page. The "Property Gallery" heading
                            appears on the first gallery page only. */}
                        {galleryPages.map((pageImages, pageIndex) => (
                            <div key={pageIndex} data-pdf-page style={pdfPageStyle}>
                                <div style={{ height: `${PDF_PAGE_H - PDF_FOOTER_ZONE}px`, overflow: "hidden", position: "relative" }}>
                                    <div data-pdf-fit style={{ padding: "50px 50px 0", boxSizing: "border-box", width: "100%" }}>
                                        {pageIndex === 0 && (
                                            <h2 style={pdfH2Style}>
                                                Property Gallery
                                            </h2>
                                        )}

                                        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                                            {pageImages.map((img, i) => (
                                                <div 
                                                    key={i} 
                                                    style={{ 
                                                        width: "100%", 
                                                        height: `${pageIndex === 0 ? GALLERY_IMAGE_HEIGHT_FIRST : GALLERY_IMAGE_HEIGHT_NEXT}px`, 
                                                        borderRadius: "8px", 
                                                        overflow: "hidden", 
                                                        border: "1px solid #e5e7eb",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <img 
                                                        src={img} 
                                                        alt={`Gallery ${pageIndex * GALLERY_IMAGES_PER_PAGE + i + 1}`} 
                                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} 
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ListingDetail;


// // // //import logo from '../../../assets/images/logogo-removebg-old.png'
// import React, { useState, useRef } from "react";
// import {
//     FaTimes, FaHome, FaMapMarkerAlt, FaBed, FaBath, FaVectorSquare,
//     FaUserTie, FaCheckCircle, FaFilePdf, FaCar, FaTag, 
//     FaFire, FaCheck
// } from "react-icons/fa";
// import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
// import html2canvas from "html2canvas";
// import jsPDF from "jspdf";
// import toast from "react-hot-toast";

// // ✅ Import your logo
// import logo from '../../../assets/images/logogo-removebg-old.png';

// const ListingDetail = ({ listing, onClose }) => {
//     const [activeTab, setActiveTab] = useState("overview");
//     const [activeImageIndex, setActiveImageIndex] = useState(0);
    
//     // PDF State
//     const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
//     const pdfRef = useRef(null);
//     const isGeneratingRef = useRef(false);

//     if (!listing) return null;

//     // Format currency
//     const formatAmount = (amount) => {
//         if (!amount) return "0";
//         return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
//     };

//     // Prepare gallery images
//     const allImages = [
//         listing.cover_image,
//         ...(listing.gallery_images || []).map(img => img.image)
//     ].filter(Boolean);

//     const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % allImages.length);
//     const prevImage = () => setActiveImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);

//     const getStatusColor = (status) => {
//         switch (status?.toLowerCase()) {
//             case 'live': return 'bg-green-100 text-green-700 border-green-200';
//             case 'under mou': return 'bg-blue-100 text-blue-700 border-blue-200';
//             case 'under reservation': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
//             case 'sold': 
//             case 'rented': return 'bg-red-100 text-red-700 border-red-200';
//             default: return 'bg-gray-100 text-gray-600 border-gray-200';
//         }
//     };

//     const amenitiesList = Object.keys(listing).filter(key => 
//         typeof listing[key] === 'boolean' && listing[key] === true && !['hot_deal', 'property_finder'].includes(key)
//     );

//     const isRent = listing.property_offer === 'rent';

//     // =========================================================
//     // PDF GENERATION LOGIC
//     // =========================================================
//     const handleDownloadPDF = async () => {
//         if (!pdfRef.current) return toast.error("PDF target not found.");
//         if (isGeneratingRef.current) return;

//         isGeneratingRef.current = true;
//         setIsGeneratingPdf(true);
//         const toastId = toast.loading("Generating Brochure PDF...");

//         try {
//             const node = pdfRef.current;
//             const scale = 3.0; 
            
//             const canvas = await html2canvas(node, {
//                 scale,
//                 useCORS: true,
//                 backgroundColor: "#ffffff",
//                 logging: false,
//                 windowWidth: node.scrollWidth,
//                 windowHeight: node.scrollHeight,
//             });

//             const doc = new jsPDF({
//                 orientation: "portrait",
//                 unit: "mm",
//                 format: "a4",
//                 compress: true,
//             });

//             const pageW = doc.internal.pageSize.getWidth();
//             const pageH = doc.internal.pageSize.getHeight();
//             const imgData = canvas.toDataURL("image/jpeg", 0.95);
            
//             const imgHeightInMm = (canvas.height * pageW) / canvas.width;

//             let heightLeft = imgHeightInMm;
//             let position = 0;

//             // Add first page
//             doc.addImage(imgData, "JPEG", 0, position, pageW, imgHeightInMm, undefined, "FAST");
//             heightLeft -= pageH;

//             // Add subsequent pages
//             while (heightLeft > 0) {
//                 position = heightLeft - imgHeightInMm; 
//                 doc.addPage();
//                 doc.addImage(imgData, "JPEG", 0, position, pageW, imgHeightInMm, undefined, "FAST");
//                 heightLeft -= pageH;
//             }

//             // Add footer
//             const totalPages = doc.internal.getNumberOfPages();
//             for (let i = 1; i <= totalPages; i++) {
//                 doc.setPage(i);
//                 doc.setFont("helvetica", "bold");
//                 doc.setFontSize(8);
//                 doc.setTextColor(164, 125, 82); // #a47d52
//                 doc.text("BROKER CITY PROPERTIES", pageW / 2, pageH - 5, { align: "center" });
//             }

//             doc.save(`${listing.reference || 'Property'}_Brochure.pdf`);
//             toast.success("✅ Brochure downloaded!", { id: toastId });
//         } catch (err) {
//             console.error("PDF generation error:", err);
//             toast.error("❌ Failed to generate PDF", { id: toastId });
//         } finally {
//             isGeneratingRef.current = false;
//             setIsGeneratingPdf(false);
//         }
//     };

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-6" dir="ltr">
//             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden animate-fadeIn relative">
                
//                 {/* HEADER */}
//                 <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0 bg-white z-10">
//                     <div>
//                         <div className="flex items-center gap-3 mb-1">
//                             <h2 className="text-2xl font-extrabold text-gray-900 truncate max-w-md">
//                                 {listing.title || "Untitled Listing"}
//                             </h2>
//                             <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded border ${getStatusColor(listing.property_status)}`}>
//                                 {listing.property_status || "Draft"}
//                             </span>
//                             {listing.hot_deal && (
//                                 <span className="bg-red-50 text-red-600 text-[10px] uppercase font-bold px-2.5 py-1 rounded border border-red-200 flex items-center gap-1">
//                                     <FaFire className="animate-pulse" /> Hot Deal
//                                 </span>
//                             )}
//                         </div>
                        
//                         <div className="flex items-center gap-3 text-sm text-gray-500">
//                             <span className="flex items-center gap-1">
//                                 <FaMapMarkerAlt className="text-[#4285F4]" /> 
//                                 {listing.location_text || "Location not specified"}
//                             </span>
//                             <span className="text-gray-300">|</span>
//                             <span className="flex items-center gap-1 font-bold text-gray-700">
//                                 <FaTag className="text-[#4285F4]" /> 
//                                 Offer: <span className="uppercase text-[#4285F4]">{listing.property_offer || "Sale"}</span>
//                             </span>
//                         </div>
//                     </div>
                    
//                     <div className="flex items-center gap-3">
//                         <button
//                             onClick={handleDownloadPDF}
//                             disabled={isGeneratingPdf}
//                             className="flex items-center gap-2 px-4 py-2 bg-[#4285F4]/10 text-[#4285F4] rounded-lg font-bold text-sm hover:bg-[#4285F4] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
//                         >
//                             <FaFilePdf size={16} /> 
//                             {isGeneratingPdf ? "Generating..." : "Brochure"}
//                         </button>

//                         <button
//                             onClick={onClose}
//                             className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
//                         >
//                             <FaTimes size={20} />
//                         </button>
//                     </div>
//                 </div>

//                 {/* SCROLLABLE CONTENT (UI) */}
//                 <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8f7f5]">
                    
//                     {/* HERO / GALLERY */}
//                     <div className="relative h-80 bg-gray-900 group">
//                         {allImages.length > 0 ? (
//                             <>
//                                 <img 
//                                     src={allImages[activeImageIndex]} 
//                                     alt="Property" 
//                                     className="w-full h-full object-contain"
//                                 />
//                                 {allImages.length > 1 && (
//                                     <>
//                                         <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
//                                             <FiChevronLeft size={24} />
//                                         </button>
//                                         <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
//                                             <FiChevronRight size={24} />
//                                         </button>
//                                     </>
//                                 )}
//                             </>
//                         ) : (
//                             <div className="w-full h-full flex items-center justify-center text-gray-400">
//                                 <FaHome size={64} className="opacity-20" />
//                             </div>
//                         )}
//                     </div>

//                     {/* PRICING & SPECS BANNER */}
//                     <div className="max-w-5xl mx-auto px-6 -mt-8 relative z-10">
//                         <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 flex flex-wrap gap-6 items-center justify-between">
                            
//                             <div>
//                                 <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
//                                     {isRent ? 'Asking Rent' : 'Asking Price'}
//                                 </p>
//                                 <div className="flex items-end gap-2">
//                                     <p className="text-3xl font-extrabold text-[#4285F4]">
//                                         AED {formatAmount(listing.sale_price || listing.rent_price_yearly || 0)}
//                                     </p>
//                                     <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded mb-1 ${isRent ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
//                                         {isRent ? 'Rent' : 'Sale'}
//                                     </span>
//                                 </div>
//                             </div>
                            
//                             <div className="flex items-center gap-4 md:gap-6 flex-wrap">
//                                 <div className="flex flex-col items-center">
//                                     <div className="w-10 h-10 rounded-full bg-[#4285F4]/10 flex items-center justify-center mb-1">
//                                         <FaBed className="text-[#4285F4]" size={18} />
//                                     </div>
//                                     <span className="text-sm font-bold text-gray-700">{listing.bedrooms || 0} Beds</span>
//                                 </div>
//                                 <div className="flex flex-col items-center">
//                                     <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center mb-1">
//                                         <FaBath className="text-[#10B981]" size={18} />
//                                     </div>
//                                     <span className="text-sm font-bold text-gray-700">{listing.bathrooms || 0} Baths</span>
//                                 </div>
//                                 <div className="flex flex-col items-center">
//                                     <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center mb-1">
//                                         <FaVectorSquare className="text-[#8B5CF6]" size={18} />
//                                     </div>
//                                     <span className="text-sm font-bold text-gray-700">{listing.size || 0} sqft</span>
//                                 </div>
//                                 <div className="flex flex-col items-center">
//                                     <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mb-1">
//                                         <FaCar className="text-[#F59E0B]" size={18} />
//                                     </div>
//                                     <span className="text-sm font-bold text-gray-700">{listing.parking || 0} Parking</span>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* TABS */}
//                     <div className="max-w-5xl mx-auto px-6 py-8">
//                         <div className="flex gap-4 border-b border-gray-200 mb-6">
//                             <button 
//                                 onClick={() => setActiveTab("overview")}
//                                 className={`pb-3 font-bold text-sm cursor-pointer transition-colors border-b-2 ${activeTab === "overview" ? "border-[#4285F4] text-[#4285F4]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
//                             >
//                                 Overview
//                             </button>
//                             <button 
//                                 onClick={() => setActiveTab("amenities")}
//                                 className={`pb-3 font-bold text-sm cursor-pointer transition-colors border-b-2 ${activeTab === "amenities" ? "border-[#4285F4] text-[#4285F4]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
//                             >
//                                 Amenities
//                             </button>
//                         </div>

//                         {/* TAB CONTENT */}
//                         {activeTab === "overview" && (
//                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
//                                 <div className="md:col-span-2 space-y-6">
//                                     <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
//                                         <h3 className="text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2">
//                                             <FaHome className="text-gray-400" /> Property Details
//                                         </h3>
//                                         <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
//                                             <div>
//                                                 <p className="text-gray-400 font-bold mb-1">Property Type</p>
//                                                 <p className="font-semibold text-gray-800 capitalize">{listing.property_type || "—"}</p>
//                                             </div>
//                                             <div>
//                                                 <p className="text-gray-400 font-bold mb-1">Tenure</p>
//                                                 <p className="font-semibold text-gray-800">{listing.tenure || "—"}</p>
//                                             </div>
//                                             <div>
//                                                 <p className="text-gray-400 font-bold mb-1">Unit No.</p>
//                                                 <p className="font-semibold text-gray-800">{listing.unit_no || "—"}</p>
//                                             </div>
//                                             <div>
//                                                 <p className="text-gray-400 font-bold mb-1">Built-up Area</p>
//                                                 <p className="font-semibold text-gray-800">{listing.built_up_area ? `${listing.built_up_area} sqft` : "—"}</p>
//                                             </div>
//                                             <div>
//                                                 <p className="text-gray-400 font-bold mb-1">Plot Size</p>
//                                                 <p className="font-semibold text-gray-800">{listing.plot_size ? `${listing.plot_size} sqft` : "—"}</p>
//                                             </div>
//                                         </div>
                                        
//                                         <div className="mt-6 border-t border-gray-100 pt-4">
//                                             <p className="text-gray-400 font-bold mb-2">Description</p>
//                                             <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">
//                                                 {listing.description || "No description provided."}
//                                             </p>
//                                         </div>
//                                     </div>
//                                 </div>

//                                 <div className="space-y-6">
//                                     <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
//                                         <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
//                                             <FaUserTie className="text-purple-500" /> Assignment
//                                         </h4>
//                                         <div className="space-y-4">
//                                             <div>
//                                                 <p className="text-xs font-bold text-gray-400 uppercase mb-1">Managed By</p>
//                                                 <p className="font-bold text-gray-800">{listing.created_by_name || "System"}</p>
//                                             </div>
//                                             <div>
//                                                 <p className="text-xs font-bold text-gray-400 uppercase mb-1">Listing Owner</p>
//                                                 <p className="font-bold text-gray-800">{listing.listing_owner_name || "—"}</p>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         )}

//                         {activeTab === "amenities" && (
//                             <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-fadeIn">
//                                 <h3 className="text-lg font-extrabold text-gray-800 mb-4 flex items-center gap-2">
//                                     <FaCheck className="text-green-500" /> Included Amenities
//                                 </h3>
//                                 {amenitiesList.length > 0 ? (
//                                     <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
//                                         {amenitiesList.map(amenity => (
//                                             <div key={amenity} className="flex items-center gap-2 bg-[#f8f7f5] p-3 rounded-lg border border-gray-100">
//                                                 <FaCheckCircle className="text-green-500 shrink-0" size={14} />
//                                                 <span className="text-sm font-semibold text-gray-700 capitalize truncate">
//                                                     {amenity.replace(/_/g, ' ')}
//                                                 </span>
//                                             </div>
//                                         ))}
//                                     </div>
//                                 ) : (
//                                     <p className="text-gray-500 text-sm">No amenities specified for this listing.</p>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                 </div>

//                 {/* =========================================================
//                     HIDDEN PDF RENDER TARGET (100% Inline Styles)
//                 ========================================================= */}
//                 <div className="fixed -left-[9999px] top-0 z-[-1]">
//                     <div 
//                         ref={pdfRef} 
//                         style={{
//                             width: "794px", // A4 Portrait width in px
//                             backgroundColor: "#ffffff",
//                             color: "#000000",
//                             fontFamily: "Arial, sans-serif",
//                         }}
//                     >
                        
//                         {/* PAGE 1: COVER */}
//                         <div style={{ height: "1123px", display: "flex", flexDirection: "column", position: "relative" }}>
                            
//                             {allImages.length > 0 && (
//                                 <div style={{ width: "100%", height: "550px", backgroundColor: "#f3f4f6" }}>
//                                     <img src={allImages[0]} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
//                                 </div>
//                             )}

//                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "30px 40px", backgroundColor: "#f8f7f5", borderBottom: "2px solid #a47d52" }}>
//                                 <img src={logo} alt="Logo" style={{ height: "120px", objectFit: "contain" }} />
//                                 <div style={{ textAlign: "right" }}>
//                                     <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#a47d52", margin: 0, maxWidth: "400px" }}>
//                                         {listing.title || "Luxury Property"}
//                                     </h1>
//                                     <p style={{ fontSize: "18px", color: "#6b7280", fontWeight: "bold", margin: 0 }}>
//                                         {isRent ? "For Rent" : "For Sale"}
//                                     </p>
//                                 </div>
//                             </div>

//                             <div style={{ padding: "40px", textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
//                                 <p style={{ fontSize: "20px", color: "#4b5563", marginBottom: "24px" }}>
//                                     {listing.location_text || "Abu Dhabi"}
//                                 </p>
//                                 <div style={{ display: "inline-block", alignSelf: "center", backgroundColor: "#a47d52", color: "#ffffff", padding: "16px 48px", borderRadius: "9999px", fontSize: "28px", fontWeight: "bold" }}>
//                                     AED {formatAmount(listing.sale_price || listing.rent_price_yearly || 0)}
//                                 </div>
//                             </div>
//                         </div>

//                         {/* PAGE SEPARATOR */}
//                         <div style={{ width: "100%", padding: "10px 0", backgroundColor: "#f3f4f6", display: "flex", justifyContent: "center", alignItems: "center" }}>
//                             <hr style={{ width: "80%", borderTop: "1px dashed #a47d52", margin: "0 10px" }} />
//                             <span style={{ fontSize: "12px", color: "#a47d52", fontWeight: "bold" }}>Page 2</span>
//                             <hr style={{ width: "80%", borderTop: "1px dashed #a47d52", margin: "0 10px" }} />
//                         </div>

//                         {/* PAGE 2: DETAILS & FINANCIALS */}
//                         <div style={{ padding: "50px", minHeight: "1123px" }}>
//                             <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#a47d52", borderBottom: "2px solid #a47d52", paddingBottom: "8px", marginBottom: "24px" }}>
//                                 Property Details
//                             </h2>
                            
//                             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", marginBottom: "40px" }}>
//                                 <tbody>
//                                     <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
//                                         <td style={{ padding: "12px 0", fontWeight: "bold", color: "#4b5563", width: "33%" }}>Location</td>
//                                         <td style={{ padding: "12px 0", color: "#1f2937" }}>{listing.location_text || "—"}</td>
//                                     </tr>
//                                     <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
//                                         <td style={{ padding: "12px 0", fontWeight: "bold", color: "#4b5563" }}>Property Type</td>
//                                         <td style={{ padding: "12px 0", color: "#1f2937", textTransform: "capitalize" }}>{listing.property_type || "—"}</td>
//                                     </tr>
//                                     <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
//                                         <td style={{ padding: "12px 0", fontWeight: "bold", color: "#4b5563" }}>Bedrooms</td>
//                                         <td style={{ padding: "12px 0", color: "#1f2937" }}>{listing.bedrooms || 0} Bedrooms</td>
//                                     </tr>
//                                     <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
//                                         <td style={{ padding: "12px 0", fontWeight: "bold", color: "#4b5563" }}>Bathrooms</td>
//                                         <td style={{ padding: "12px 0", color: "#1f2937" }}>{listing.bathrooms || 0} Bathrooms</td>
//                                     </tr>
//                                     <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
//                                         <td style={{ padding: "12px 0", fontWeight: "bold", color: "#4b5563" }}>Plot Area</td>
//                                         <td style={{ padding: "12px 0", color: "#1f2937" }}>{listing.plot_size || listing.size || 0} sq.ft.</td>
//                                     </tr>
//                                     <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
//                                         <td style={{ padding: "12px 0", fontWeight: "bold", color: "#4b5563" }}>Built-up Area</td>
//                                         <td style={{ padding: "12px 0", color: "#1f2937" }}>{listing.built_up_area || 0} sq.ft.</td>
//                                     </tr>
//                                 </tbody>
//                             </table>

//                             <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#a47d52", borderBottom: "2px solid #a47d52", paddingBottom: "8px", marginBottom: "24px", marginTop: "40px" }}>
//                                 Financials
//                             </h2>
//                             <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
//                                 <tbody>
//                                     <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
//                                         <td style={{ padding: "12px 0", fontWeight: "bold", color: "#4b5563", width: "33%" }}>Asking Price</td>
//                                         <td style={{ padding: "12px 0", color: "#1f2937", fontWeight: "bold", fontSize: "18px" }}>AED {formatAmount(listing.sale_price || listing.rent_price_yearly || 0)}</td>
//                                     </tr>
//                                     <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
//                                         <td style={{ padding: "12px 0", fontWeight: "bold", color: "#4b5563" }}>Payment Method</td>
//                                         <td style={{ padding: "12px 0", color: "#1f2937" }}>{listing.payment_method || "Cash"}</td>
//                                     </tr>
//                                     <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
//                                         <td style={{ padding: "12px 0", fontWeight: "bold", color: "#4b5563" }}>Service Charge</td>
//                                         <td style={{ padding: "12px 0", color: "#1f2937" }}>AED {formatAmount(listing.service_charge || 0)}</td>
//                                     </tr>
//                                 </tbody>
//                             </table>
//                         </div>

//                         {/* PAGE SEPARATOR */}
//                         {allImages.length > 1 && (
//                             <div style={{ width: "100%", padding: "10px 0", backgroundColor: "#f3f4f6", display: "flex", justifyContent: "center", alignItems: "center" }}>
//                                 <hr style={{ width: "80%", borderTop: "1px dashed #a47d52", margin: "0 10px" }} />
//                                 <span style={{ fontSize: "12px", color: "#a47d52", fontWeight: "bold" }}>Page 3</span>
//                                 <hr style={{ width: "80%", borderTop: "1px dashed #a47d52", margin: "0 10px" }} />
//                             </div>
//                         )}

//                         {/* PAGE 3: GALLERY (✅ Fixed to not cut images) */}
//                         {allImages.length > 1 && (
//                             <div style={{ padding: "50px", height: "1123px", overflow: "hidden" }}>
//                                 <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#a47d52", borderBottom: "2px solid #a47d52", paddingBottom: "8px", marginBottom: "24px" }}>
//                                     Property Gallery
//                                 </h2>
                                
//                                 <div 
//                                     style={{
//                                         display: "grid",
//                                         gridTemplateColumns: "repeat(1, 1fr)", 
//                                         gap: "20px",
//                                     }}
//                                 >
//                                     {allImages.slice(1).map((img, i) => (
//                                         <div 
//                                             key={i} 
//                                             style={{ 
//                                                 width: "100%", 
//                                                 height: "300px", 
//                                                 borderRadius: "8px", 
//                                                 overflow: "hidden", 
//                                                 border: "1px solid #e5e7eb",
//                                                 breakInside: "avoid",
//                                                 pageBreakInside: "avoid",
//                                             }}
//                                         >
//                                             <img 
//                                                 src={img} 
//                                                 alt={`Gallery ${i}`} 
//                                                 style={{ width: "100%", height: "100%", objectFit: "cover" }} 
//                                             />
//                                         </div>
//                                     ))}
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </div>

//             </div>
//         </div>
//     );
// };

// export default ListingDetail;
