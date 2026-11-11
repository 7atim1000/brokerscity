import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
    FaSave,
    FaTimes,
    FaHome,
    FaImage,
    FaMapMarkerAlt,
    FaMoneyBillWave,
    FaListUl,
    FaBuilding,
    FaTag,
    FaExchangeAlt,
    FaCheckCircle,
    FaArrowRight,
    FaArrowLeft,
    FaInfoCircle,
    FaFileSignature,
    FaUserTie
} from "react-icons/fa";
import { FiChevronDown, FiUploadCloud } from "react-icons/fi";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// ✅ Shared classes matching AddEditLandLord style
const FIELD_BASE = "w-full px-4 py-3 text-base sm:text-sm bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-left border border-gray-200";
const FIELD_WRAPPER = "relative rounded-sm transition-shadow focus-within:ring-2 focus-within:ring-[#4285F4]/30";

const AddEditListing = ({ listing, onClose, onSuccess }) => {
    const isEditMode = !!listing;

    // =========================================================
    // STATE
    // =========================================================
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState(1); // 1 to 4

    // Form State
    const [formData, setFormData] = useState({
        status: "draft",
        category: "residential",
        offer_type: "sale",
        
        title: "",
        unit_no: "",
        property_type: "",
        bedrooms: "",
        bathrooms: "",
        parking: "",
        furnished: "",
        size: "",
        built_up_area: "",
        plot_size: "",
        project_status: "",
        
        sale_price: "",
        rent_price_yearly: "",
        
        emirate: "Dubai",
        location_text: "",
        city: "",
        
        permit_type: "RERA (Trakheesi)",
        adrec_permit_no: "",
        issue_expiry: "",
        
        description: "",
        
        // Booleans
        central_ac: false, maids_room: false, built_in_wardrobes: false,
        walk_in_closet: false, balcony_or_terrace: false, built_in_kitchen_appliances: false,
        laundry_room: false, storage_areas: false, study_room: false,
        security: false, lobby_in_building: false, cleaning_services: false,
        private_pool: false, shared_pool: false, private_gym: false,
        shared_gym: false, jacuzzi: false, reception_waiting_room: false,
        atm_facility: false, cafeteria_or_canteen: false, private_garden: false,
        view_of_landmark: false, childrens_play_area: false, barbeque_area: false,
        pets_allowed: false, covered_parking: false, view_of_water: false,
    });

    // Media State
    const [coverImage, setCoverImage] = useState(null);
    const [video1, setVideo1] = useState(null);
    const [video2, setVideo2] = useState(null);
    const [galleryImages, setGalleryImages] = useState([]);
    
    // Previews
    const [coverPreview, setCoverPreview] = useState(null);
    const [galleryPreviews, setGalleryPreviews] = useState([]);

    // =========================================================
    // INITIAL LOAD
    // =========================================================
    useEffect(() => {
        if (isEditMode && listing) {
            setFormData((prev) => ({
                ...prev,
                ...listing,
                size: listing.size || "",
                sale_price: listing.sale_price || "",
                rent_price_yearly: listing.rent_price_yearly || "",
                issue_expiry: listing.issue_expiry || "",
            }));
            if (listing.cover_image) setCoverPreview(listing.cover_image);
            if (listing.gallery_images) {
                setGalleryPreviews(listing.gallery_images.map((img) => img.image));
            }
        }
    }, [isEditMode, listing]);

    // =========================================================
    // HANDLERS
    // =========================================================
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleSetStatus = (status) => {
        setFormData(prev => ({ ...prev, status }));
    };

    const handleImageChange = (e, type) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (type === "cover") {
            setCoverImage(files[0]);
            setCoverPreview(URL.createObjectURL(files[0]));
        } else if (type === "video1") {
            setVideo1(files[0]);
        } else if (type === "video2") {
            setVideo2(files[0]);
        } else if (type === "gallery") {
            const newFiles = Array.from(files);
            setGalleryImages((prev) => [...prev, ...newFiles]);
            const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
            setGalleryPreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (loading) return;

        setLoading(true);
        setErrors({});

        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                toast.error("Please login to continue");
                setLoading(false);
                return;
            }

            if (!formData.unit_no || !formData.property_type) {
                toast.error("Please fill in Unit No. and Property Type.");
                setActiveTab(1);
                setLoading(false);
                return;
            }

            const data = new FormData();
            Object.keys(formData).forEach((key) => {
                if (formData[key] !== "" && formData[key] !== null) {
                    data.append(key, formData[key]);
                }
            });

            if (coverImage) data.append("cover_image", coverImage);
            if (video1) data.append("video_1", video1);
            if (video2) data.append("video_2", video2);

            if (galleryImages.length > 0) {
                galleryImages.forEach((img) => data.append("gallery_images", img));
            }

            const url = isEditMode
                ? `${BASE}/api/crmlistings/${listing.id}/update/`
                : `${BASE}/api/crmlistings/create/`;

            const response = await fetch(url, {
                method: isEditMode ? "PATCH" : "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: data,
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.unit_no) {
                    const errMsg = Array.isArray(errorData.unit_no) ? errorData.unit_no[0] : errorData.unit_no;
                    if (errMsg.includes("exists") || errMsg.includes("unique")) {
                        toast.error("A listing with this Unit Number already exists.");
                        setActiveTab(1);
                    }
                }
                throw new Error(errorData.message || "Validation failed");
            }

            toast.success(isEditMode ? "✅ Listing updated!" : "✅ Listing created!");
            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch (error) {
            console.error("Submit error:", error);
            if (!error.message.includes("Validation")) {
                toast.error(error.message || "An error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // BUTTON LOGIC
    // =========================================================
    const isDraft = formData.status === "draft" || !formData.status;
    
    // Save Draft is enabled ONLY if status is draft
    const canSaveDraft = isDraft;
    
    // Save/Next is enabled ONLY if status is NOT draft
    const canSaveLive = !isDraft; 

    // =========================================================
    // RENDER HELPERS
    // =========================================================
    const renderInput = (label, name, type = "text", placeholder = "", required = false) => (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-bold text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                type={type}
                name={name}
                value={formData[name] || ""}
                onChange={handleChange}
                placeholder={placeholder}
                className={FIELD_BASE}
            />
            {errors[name] && <p className="text-red-500 text-xs">{errors[name]}</p>}
        </div>
    );

    const renderSelect = (label, name, options, placeholder = "Select...", required = false) => (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-sm font-bold text-gray-700">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <select
                    name={name}
                    value={formData[name] || ""}
                    onChange={handleChange}
                    className={`${FIELD_BASE} appearance-none cursor-pointer`}
                >
                    <option value="">{placeholder}</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
        </div>
    );

    // =========================================================
    // RENDER
    // =========================================================
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-6" dir="ltr">
            <div className="bg-[#f8f7f5] rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden animate-fadeIn">
                
                {/* =========================================
                    HEADER (Title & Status)
                ========================================= */}
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#4285F4] flex items-center justify-center text-white shadow-md">
                            <FaBuilding size={22} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-extrabold text-gray-900">
                                    {isEditMode ? "Edit listing" : "New listing"}
                                </h3>
                                <span className="bg-[#4285F4]/10 text-[#4285F4] text-xs font-bold px-2.5 py-1 rounded-md capitalize">
                                    {formData.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {formData.title || "Untitled"} • {formData.offer_type === 'rent' ? 'Rent' : 'Sale'} • {formData.category}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* =========================================
                    STEPPER TABS
                ========================================= */}
                <div className="bg-white px-6 py-3 border-b border-gray-200 shrink-0 grid grid-cols-4 gap-4">
                    {[
                        { id: 1, label: "Property & Compliance" },
                        { id: 2, label: "Pricing & Location" },
                        { id: 3, label: "Media" },
                        { id: 4, label: "Publishing" }
                    ].map((step) => (
                        <button
                            key={step.id}
                            onClick={() => setActiveTab(step.id)}
                            className={`flex items-center justify-center gap-2 py-3 rounded-lg border-2 font-bold text-sm transition-all ${
                                activeTab === step.id 
                                    ? "border-[#4285F4] bg-[#4285F4]/5 text-[#4285F4]" 
                                    : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100"
                            }`}
                        >
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                activeTab === step.id ? "bg-[#4285F4] text-white" : "bg-gray-200 text-gray-500"
                            }`}>
                                {step.id}
                            </span>
                            {step.label}
                        </button>
                    ))}
                </div>

                {/* =========================================
                    MAIN FORM CONTENT
                ========================================= */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 custom-scrollbar">
                    
                    {/* LEFT COLUMN (Tabs 1, 2, 3) */}
                    <div className="flex-1 space-y-6">
                        
                        {/* TAB 1: PROPERTY & COMPLIANCE */}
                        {activeTab === 1 && (
                            <div className="space-y-6 animate-fadeIn">
                                {/* Category & Offer */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    
                                    {/* Category */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Category</label>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setFormData({...formData, category: 'residential'})} className={`flex-1 flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all ${formData.category === 'residential' ? 'border-[#4285F4] bg-[#4285F4]/5' : 'border-gray-200'}`}>
                                                <div className="flex justify-between w-full">
                                                    <FaHome className={formData.category === 'residential' ? 'text-[#4285F4]' : 'text-gray-400'} size={18} />
                                                    {formData.category === 'residential' && <FaCheckCircle className="text-[#4285F4]" />}
                                                </div>
                                                <span className="font-bold text-gray-800 text-sm mt-2">Residential</span>
                                                <span className="text-[10px] text-gray-500">Homes • apartments</span>
                                            </button>
                                            <button type="button" onClick={() => setFormData({...formData, category: 'commercial'})} className={`flex-1 flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all ${formData.category === 'commercial' ? 'border-[#4285F4] bg-[#4285F4]/5' : 'border-gray-200'}`}>
                                                <div className="flex justify-between w-full">
                                                    <FaBuilding className={formData.category === 'commercial' ? 'text-[#4285F4]' : 'text-gray-400'} size={18} />
                                                    {formData.category === 'commercial' && <FaCheckCircle className="text-[#4285F4]" />}
                                                </div>
                                                <span className="font-bold text-gray-800 text-sm mt-2">Commercial</span>
                                                <span className="text-[10px] text-gray-500">Offices • retail</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Offer Type */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Offer</label>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setFormData({...formData, offer_type: 'sale'})} className={`flex-1 flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all ${formData.offer_type === 'sale' ? 'border-[#4285F4] bg-[#4285F4]/5' : 'border-gray-200'}`}>
                                                <div className="flex justify-between w-full">
                                                    <FaTag className={formData.offer_type === 'sale' ? 'text-[#4285F4]' : 'text-gray-400'} size={18} />
                                                    {formData.offer_type === 'sale' && <FaCheckCircle className="text-[#4285F4]" />}
                                                </div>
                                                <span className="font-bold text-gray-800 text-sm mt-2">For Sale</span>
                                                <span className="text-[10px] text-gray-500">Ownership transfer</span>
                                            </button>
                                            <button type="button" onClick={() => setFormData({...formData, offer_type: 'rent'})} className={`flex-1 flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all ${formData.offer_type === 'rent' ? 'border-[#4285F4] bg-[#4285F4]/5' : 'border-gray-200'}`}>
                                                <div className="flex justify-between w-full">
                                                    <FaExchangeAlt className={formData.offer_type === 'rent' ? 'text-[#4285F4]' : 'text-gray-400'} size={18} />
                                                    {formData.offer_type === 'rent' && <FaCheckCircle className="text-[#4285F4]" />}
                                                </div>
                                                <span className="font-bold text-gray-800 text-sm mt-2">For Rent</span>
                                                <span className="text-[10px] text-gray-500">Yearly • short-term</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Property Details */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaHome className="text-gray-400"/> The property</h4>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {renderSelect("Property type *", "property_type", [{value: 'apartment', label: 'Apartment'}, {value: 'villa', label: 'Villa'}], "Select type", true)}
                                        {renderSelect("Bedrooms *", "bedrooms", [1,2,3,4,5].map(n => ({value: n, label: n})), "Beds", true)}
                                        {renderSelect("Bathrooms *", "bathrooms", [1,2,3,4].map(n => ({value: n, label: n})), "Baths", true)}
                                        
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-gray-700">Size *</label>
                                            <div className="flex">
                                                <span className="bg-gray-100 border border-r-0 border-gray-200 px-3 flex items-center text-xs font-bold text-gray-500 rounded-l-sm">sqft</span>
                                                <input type="number" name="size" value={formData.size} onChange={handleChange} placeholder="e.g. 1,200" className="w-full px-3 py-3 border border-gray-200 rounded-r-sm text-sm focus:outline-none" />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-gray-700">Built-up area</label>
                                            <div className="flex">
                                                <span className="bg-gray-100 border border-r-0 border-gray-200 px-3 flex items-center text-xs font-bold text-gray-500 rounded-l-sm">sqft</span>
                                                <input type="number" name="built_up_area" value={formData.built_up_area} onChange={handleChange} placeholder="e.g. 1,400" className="w-full px-3 py-3 border border-gray-200 rounded-r-sm text-sm focus:outline-none" />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-gray-700">Plot size</label>
                                            <div className="flex">
                                                <span className="bg-gray-100 border border-r-0 border-gray-200 px-3 flex items-center text-xs font-bold text-gray-500 rounded-l-sm">sqft</span>
                                                <input type="number" name="plot_size" value={formData.plot_size} onChange={handleChange} placeholder="e.g. 2,500" className="w-full px-3 py-3 border border-gray-200 rounded-r-sm text-sm focus:outline-none" />
                                            </div>
                                        </div>

                                        {renderInput("Unit no. *", "unit_no", "text", "e.g. 1203", true)}
                                        {renderSelect("Project status *", "project_status", [{value: 'ready', label: 'Ready'}, {value: 'off-plan', label: 'Off-plan'}], "Select status", true)}
                                        
                                        {renderSelect("Parking", "parking", [1,2,3].map(n => ({value: n, label: n})), "Parking")}
                                        {renderSelect("Furnished", "furnished", [{value: 'furnished', label: 'Furnished'}, {value: 'unfurnished', label: 'Unfurnished'}], "Furnished")}
                                    </div>
                                </div>

                                {/* More Specifications (Title & Desc) */}
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaListUl className="text-gray-400"/> Description</h4>
                                    <div className="space-y-4">
                                        {renderInput("Title", "title", "text", "Property title e.g. Luxury 2BHK")}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-gray-700">Description *</label>
                                            <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className={FIELD_BASE} placeholder="Describe the property..."></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: PRICING & LOCATION */}
                        {activeTab === 2 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaMoneyBillWave className="text-gray-400"/> Pricing</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {formData.offer_type === 'sale' ? (
                                            <>
                                                {renderInput("Sale Price (AED)", "sale_price", "number", "e.g. 1500000")}
                                                {renderInput("Sale Price / sqft", "sale_price_sqft", "number")}
                                            </>
                                        ) : (
                                            <>
                                                {renderInput("Yearly Rent (AED)", "rent_price_yearly", "number")}
                                                {renderInput("Monthly Rent (AED)", "rent_price", "number")}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaMapMarkerAlt className="text-gray-400"/> Location</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {renderInput("City", "city", "text", "e.g. Dubai")}
                                        {renderInput("Area / Community", "location_text", "text", "e.g. Dubai Marina")}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: MEDIA */}
                        {activeTab === 3 && (
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-8 animate-fadeIn">
                                <div>
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaImage className="text-gray-400"/> Cover Image</h4>
                                    <div className="flex gap-4 items-center">
                                        <label className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                            <FiUploadCloud size={24} className="text-gray-400 mb-2" />
                                            <span className="text-sm text-gray-500 font-bold">Upload</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'cover')} />
                                        </label>
                                        {coverPreview && (
                                            <div className="w-40 h-40 rounded-xl overflow-hidden border border-gray-200">
                                                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaImage className="text-gray-400"/> Gallery Images</h4>
                                    <div className="flex flex-wrap gap-4">
                                        {galleryPreviews.map((src, i) => (
                                            <div key={i} className="w-28 h-28 rounded-lg overflow-hidden border border-gray-200">
                                                <img src={src} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                        <label className="w-28 h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                            <FiUploadCloud size={20} className="text-gray-400" />
                                            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageChange(e, 'gallery')} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: PUBLISHING (Status) */}
                        {activeTab === 4 && (
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-6 animate-fadeIn">
                                <h4 className="font-extrabold text-gray-800 mb-2 flex items-center gap-2"><FaFileSignature className="text-gray-400"/> Publishing Status</h4>
                                <p className="text-sm text-gray-500 mb-4">Select the current status of this listing.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {['draft', 'live', 'Under Mou', 'Under Reservation', 'Sold'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => handleSetStatus(status)}
                                            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                                                formData.status === status 
                                                    ? "border-[#4285F4] bg-[#4285F4]/5" 
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                            }`}
                                        >
                                            <span className={`font-bold ${formData.status === status ? "text-[#4285F4]" : "text-gray-700"}`}>
                                                {status === 'draft' ? "Draft (Unpublished)" : status}
                                            </span>
                                            {formData.status === status && <FaCheckCircle className="text-[#4285F4]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN (Compliance & Assignments - Always visible) */}
                    <div className="w-full lg:w-[350px] space-y-6">
                        
                        {/* Compliance Panel */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                                <FaCheckCircle className="text-[#4285F4]" />
                                <h4 className="font-bold text-sm text-gray-800">Compliance & permit</h4>
                            </div>
                            <div className="p-4 space-y-4">
                                {renderSelect("Emirate", "emirate", [{value: 'dubai', label: 'Dubai'}, {value: 'abudhabi', label: 'Abu Dhabi'}, {value: 'sharjah', label: 'Sharjah'}], "Select")}
                                {renderSelect("Permit type", "permit_type", [{value: 'rera', label: 'RERA (Trakheesi)'}, {value: 'adrec', label: 'ADREC'}], "Select")}
                                
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-bold text-gray-700">Permit no. *</label>
                                    <div className="flex gap-2">
                                        <input type="text" name="adrec_permit_no" value={formData.adrec_permit_no} onChange={handleChange} placeholder="7XXXXXXXXX" className={FIELD_BASE} />
                                        <button type="button" className="bg-white border border-gray-300 text-[#4285F4] px-3 rounded-sm text-xs font-bold hover:bg-gray-50">Validate</button>
                                    </div>
                                </div>
                                
                                {renderInput("Issue → expiry", "issue_expiry", "date")}
                            </div>
                        </div>

                        {/* Assignment Panel */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                                <FaUserTie className="text-purple-500" />
                                <h4 className="font-bold text-sm text-gray-800">Assignment</h4>
                            </div>
                            <div className="p-4 space-y-4">
                                {renderInput("Listing Owner", "listing_owner", "text", "Select Owner")}
                            </div>
                        </div>

                        {/* Info Alert */}
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 flex gap-3">
                            <FaInfoCircle className="text-orange-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-orange-800 leading-relaxed">
                                Ensure all required fields marked with <span className="text-red-500">*</span> are filled before publishing. Drafts do not require compliance validation.
                            </p>
                        </div>

                    </div>
                </form>

                {/* =========================================
                    STICKY FOOTER
                ========================================= */}
                <div className="bg-white px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                    
                    {/* Left side: Cancel & Back */}
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        {activeTab > 1 && (
                            <button onClick={() => setActiveTab(activeTab - 1)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                                <FaArrowLeft /> Back
                            </button>
                        )}
                    </div>

                    {/* Center: Error message if required fields missing */}
                    <div className="text-xs text-orange-500 font-medium text-center hidden md:block">
                        {(!formData.title || !formData.property_type || !formData.bedrooms || !formData.bathrooms || !formData.unit_no || !formData.size || !formData.description) && !isDraft && (
                            <span>Title, Property type, Bedrooms, Bathrooms, Unit no., Size, Description are required</span>
                        )}
                    </div>

                    {/* Right side: Actions (Save Draft vs Save/Next) */}
                    <div className="flex gap-3 w-full sm:w-auto">
                        {/* Save Draft Button */}
                        <button
                            type="submit"
                            disabled={loading || !canSaveDraft}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all ${
                                canSaveDraft 
                                    ? "bg-green-500 text-white hover:bg-green-600 shadow-md" 
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                        >
                            <FaSave /> Save draft
                        </button>

                        {/* Save / Next Button */}
                        {activeTab < 4 ? (
                            <button
                                type="button"
                                onClick={() => setActiveTab(activeTab + 1)}
                                disabled={!canSaveLive}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg font-bold transition-all ${
                                    canSaveLive 
                                        ? "bg-[#4285F4] text-white hover:bg-blue-600 shadow-md" 
                                        : "bg-blue-200 text-white cursor-not-allowed"
                                }`}
                            >
                                Next <FaArrowRight />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading || !canSaveLive}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg font-bold transition-all ${
                                    canSaveLive 
                                        ? "bg-[#4285F4] text-white hover:bg-blue-600 shadow-md" 
                                        : "bg-blue-200 text-white cursor-not-allowed"
                                }`}
                            >
                                {loading ? "Saving..." : "Save Listing"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddEditListing;


// import React, { useState, useEffect, useRef } from "react";
// import toast from "react-hot-toast";
// import {
//     FaSave,
//     FaTimes,
//     FaHome,
//     FaImage,
//     FaMapMarkerAlt,
//     FaMoneyBillWave,
//     FaListUl,
//     FaUserTie,
//     FaCheckCircle,
// } from "react-icons/fa";
// import { FiUploadCloud, FiChevronDown } from "react-icons/fi";

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// // ✅ Shared classes matching AddEditLandLord style
// const FIELD_BASE = "w-full px-4 py-3 text-base sm:text-sm bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-left";
// const FIELD_WRAPPER = "relative rounded-sm transition-shadow focus-within:ring-2 focus-within:ring-[#4285F4]/30";

// const AddEditListing = ({ listing, onClose, onSuccess }) => {
//     const isEditMode = !!listing;

//     // =========================================================
//     // STATE
//     // =========================================================
//     const [loading, setLoading] = useState(false);
//     const [errors, setErrors] = useState({});
//     const [activeTab, setActiveTab] = useState("basic");

//     // Form State
//     const [formData, setFormData] = useState({
//         listing_owner: "",
//         listing_source: "",
//         title: "",
//         unit_no: "",
//         property_type: "",
//         tenure: "",
//         bedrooms: "",
//         bathrooms: "",
//         parking: "",
//         furnished: "",
//         size: "",
//         built_up_area: "",
//         plot_size: "",
//         project_status: "",
//         sale_price: "",
//         sale_price_sqft: "",
//         payment_method: "",
//         service_charge: "",
//         rent_price: "",
//         rent_price_yearly: "",
//         rent_type: "",
//         city: "",
//         location_text: "",
//         title_description: "",
//         description: "",
//         notes: "",
//         emirate: "",
//         permit_type: "",
//         adrec_permit_no: "",
//         issue_expiry: "",
//         // Amenities (bool)
//         central_ac: false, maids_room: false, built_in_wardrobes: false,
//         walk_in_closet: false, balcony_or_terrace: false, built_in_kitchen_appliances: false,
//         laundry_room: false, storage_areas: false, study_room: false,
//         security: false, lobby_in_building: false, cleaning_services: false,
//         private_pool: false, shared_pool: false, private_gym: false,
//         shared_gym: false, jacuzzi: false, reception_waiting_room: false,
//         atm_facility: false, cafeteria_or_canteen: false, private_garden: false,
//         view_of_landmark: false, childrens_play_area: false, barbeque_area: false,
//         pets_allowed: false, covered_parking: false, view_of_water: false,
//     });

//     // Files State
//     const [coverImage, setCoverImage] = useState(null);
//     const [video1, setVideo1] = useState(null);
//     const [video2, setVideo2] = useState(null);
//     const [galleryImages, setGalleryImages] = useState([]);
    
//     // Previews
//     const [coverPreview, setCoverPreview] = useState(null);
//     const [galleryPreviews, setGalleryPreviews] = useState([]);

//     const firstInputRef = useRef(null);

//     // =========================================================
//     // INITIAL LOAD
//     // =========================================================
//     useEffect(() => {
//         if (isEditMode && listing) {
//             setFormData((prev) => ({
//                 ...prev,
//                 ...listing,
//                 // Format decimals and nulls
//                 size: listing.size || "",
//                 sale_price: listing.sale_price || "",
//                 rent_price: listing.rent_price || "",
//                 issue_expiry: listing.issue_expiry || "",
//             }));
//             if (listing.cover_image) setCoverPreview(listing.cover_image);
//             if (listing.gallery_images) {
//                 setGalleryPreviews(listing.gallery_images.map((img) => img.image));
//             }
//         }

//         setTimeout(() => {
//             if (firstInputRef.current) firstInputRef.current.focus();
//         }, 100);
//     }, [isEditMode, listing]);

//     // =========================================================
//     // HANDLERS
//     // =========================================================
//     const handleChange = (e) => {
//         const { name, value, type, checked } = e.target;
//         setFormData((prev) => ({
//             ...prev,
//             [name]: type === "checkbox" ? checked : value,
//         }));
//         setErrors((prev) => ({ ...prev, [name]: "" }));
//     };

//     const handleEnterNavigation = (e) => {
//         if (e.key === "Enter") {
//             e.preventDefault();
//             const form = e.target.form;
//             const index = Array.prototype.indexOf.call(form, e.target);
//             if (form.elements[index + 1]) {
//                 form.elements[index + 1].focus();
//             }
//         }
//     };

//     const handleImageChange = (e, type) => {
//         const files = e.target.files;
//         if (!files || files.length === 0) return;

//         if (type === "cover") {
//             setCoverImage(files[0]);
//             setCoverPreview(URL.createObjectURL(files[0]));
//         } else if (type === "video1") {
//             setVideo1(files[0]);
//         } else if (type === "video2") {
//             setVideo2(files[0]);
//         } else if (type === "gallery") {
//             const newFiles = Array.from(files);
//             setGalleryImages((prev) => [...prev, ...newFiles]);
//             const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
//             setGalleryPreviews((prev) => [...prev, ...newPreviews]);
//         }
//     };

//     const handleSubmit = async (e) => {
//         if (e) e.preventDefault();
//         if (loading) return;

//         setLoading(true);
//         setErrors({});

//         try {
//             const token = localStorage.getItem("access_token");
//             if (!token) {
//                 toast.error("Please login to continue");
//                 setLoading(false);
//                 return;
//             }

//             // Basic Validation
//             if (!formData.unit_no) {
//                 toast.error("Unit Number is required");
//                 setActiveTab("basic");
//                 setLoading(false);
//                 return;
//             }

//             const data = new FormData();

//             // Append normal fields
//             Object.keys(formData).forEach((key) => {
//                 if (key === "cover_image" || key === "gallery_images") return;
//                 if (formData[key] !== "" && formData[key] !== null) {
//                     data.append(key, formData[key]);
//                 }
//             });

//             // Append Files
//             if (coverImage) data.append("cover_image", coverImage);
//             if (video1) data.append("video_1", video1);
//             if (video2) data.append("video_2", video2);

//             // Append Gallery Images (Multiple)
//             if (galleryImages.length > 0) {
//                 galleryImages.forEach((img) => {
//                     data.append("gallery_images", img);
//                 });
//             }

//             const url = isEditMode
//                 ? `${BASE}/api/crmlistings/${listing.id}/update/`
//                 : `${BASE}/api/crmlistings/create/`;

//             const method = isEditMode ? "PATCH" : "POST";

//             const response = await fetch(url, {
//                 method,
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     // Don't set Content-Type for FormData (browser sets it automatically)
//                 },
//                 body: data,
//             });

//             if (!response.ok) {
//                 const errorData = await response.json();
                
//                 // ✅ Handle specific unique errors
//                 if (errorData.unit_no) {
//                     const errMsg = Array.isArray(errorData.unit_no) ? errorData.unit_no[0] : errorData.unit_no;
//                     if (errMsg.includes("exists") || errMsg.includes("unique")) {
//                         toast.error("A listing with this Unit Number already exists.");
//                         setActiveTab("basic");
//                     }
//                 }
//                 if (errorData.adrec_permit_no) {
//                      const errMsg = Array.isArray(errorData.adrec_permit_no) ? errorData.adrec_permit_no[0] : errorData.adrec_permit_no;
//                      if (errMsg.includes("exists") || errMsg.includes("unique")) {
//                          toast.error("A listing with this ADREC Permit No. already exists.");
//                          setActiveTab("legal");
//                      }
//                 }
                
//                 const backendErrors = {};
//                 Object.keys(errorData).forEach((key) => {
//                     if (key !== "message" && key !== "error") {
//                         backendErrors[key] = Array.isArray(errorData[key]) ? errorData[key][0] : errorData[key];
//                     }
//                 });
//                 setErrors(backendErrors);
//                 throw new Error(errorData.message || "Validation failed");
//             }

//             toast.success(isEditMode ? "✅ Listing updated successfully" : "✅ Listing created successfully");
//             if (onSuccess) onSuccess();
//             if (onClose) onClose();

//         } catch (error) {
//             console.error("Submit error:", error);
//             if (!error.message.includes("Validation") && !error.message.includes("exists")) {
//                 toast.error(error.message || "An error occurred");
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     // =========================================================
//     // DESIGN HELPERS
//     // =========================================================
//     const isFilled = (val) => val !== undefined && val !== null && String(val).trim() !== "" && val !== false;

//     const inputStyle = (filled) => ({
//         borderTopColor: "transparent",
//         borderBottomColor: "transparent",
//         borderRightColor: "transparent",
//         borderLeftColor: filled ? "#4285F4" : "#ef4444",
//         borderWidth: "2px",
//         borderStyle: "solid",
//         boxShadow: filled
//             ? "0 0 0 3px rgba(66, 133, 244, 0.1)"
//             : "0 0 0 3px rgba(239, 68, 68, 0.1)",
//     });

//     const getFieldIndicatorColor = (filled) => (filled ? "bg-[#4285F4]" : "bg-red-500");

//     // Helper to render text inputs quickly
//     const renderInput = (label, name, type = "text", placeholder = "", required = false) => {
//         const filled = isFilled(formData[name]);
//         return (
//             <div className="flex flex-col gap-1.5">
//                 <label className="text-sm font-bold text-gray-700">
//                     {label} {required && <span className="text-red-500">*</span>}
//                 </label>
//                 <div className={FIELD_WRAPPER}>
//                     <input
//                         type={type}
//                         name={name}
//                         value={formData[name] || ""}
//                         onChange={handleChange}
//                         onKeyDown={handleEnterNavigation}
//                         placeholder={placeholder}
//                         className={FIELD_BASE}
//                         style={inputStyle(filled)}
//                     />
//                     <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(filled)}`} />
//                 </div>
//                 {errors[name] && <p className="text-red-500 text-xs">{errors[name]}</p>}
//             </div>
//         );
//     };

//     // Helper to render select inputs
//     const renderSelect = (label, name, options, required = false) => {
//         const filled = isFilled(formData[name]);
//         return (
//             <div className="flex flex-col gap-1.5">
//                 <label className="text-sm font-bold text-gray-700">
//                     {label} {required && <span className="text-red-500">*</span>}
//                 </label>
//                 <div className={FIELD_WRAPPER}>
//                     <select
//                         name={name}
//                         value={formData[name] || ""}
//                         onChange={handleChange}
//                         className={`${FIELD_BASE} appearance-none cursor-pointer`}
//                         style={inputStyle(filled)}
//                     >
//                         <option value="">Select...</option>
//                         {options.map((opt) => (
//                             <option key={opt.value} value={opt.value}>{opt.label}</option>
//                         ))}
//                     </select>
//                     <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
//                     <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(filled)}`} />
//                 </div>
//             </div>
//         );
//     };

//     // =========================================================
//     // TABS CONFIG
//     // =========================================================
//     const tabs = [
//         { id: "basic", label: "Basic Info", icon: <FaHome /> },
//         { id: "pricing", label: "Pricing & Spaces", icon: <FaMoneyBillWave /> },
//         { id: "location", label: "Location & Legal", icon: <FaMapMarkerAlt /> },
//         { id: "amenities", label: "Amenities", icon: <FaListUl /> },
//         { id: "media", label: "Images & Videos", icon: <FaImage /> },
//     ];

//     // =========================================================
//     // RENDER
//     // =========================================================
//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-6" dir="ltr">
//             <div className="bg-[#f8f7f5] rounded-2xl shadow-2xl w-full max-w-5xl h-[95vh] flex flex-col overflow-hidden animate-fadeIn">
                
//                 {/* HEADER */}
//                 <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
//                     <div className="flex items-center gap-3">
//                         <div className="w-10 h-10 rounded-full bg-[#4285F4]/10 flex items-center justify-center border border-[#4285F4]/20">
//                             <FaHome className="text-[#4285F4]" size={20} />
//                         </div>
//                         <div>
//                             <h3 className="text-xl font-extrabold text-gray-800">
//                                 {isEditMode ? "Edit Listing" : "Add New Listing"}
//                             </h3>
//                             <p className="text-xs text-gray-500">Fill in the property details below</p>
//                         </div>
//                     </div>
//                     <button
//                         onClick={onClose}
//                         disabled={loading}
//                         className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
//                     >
//                         <FaTimes size={18} />
//                     </button>
//                 </div>

//                 {/* TABS NAVIGATION */}
//                 <div className="bg-white px-6 border-b border-gray-100 flex gap-6 shrink-0 overflow-x-auto no-scrollbar">
//                     {tabs.map((tab) => (
//                         <button
//                             key={tab.id}
//                             onClick={() => setActiveTab(tab.id)}
//                             className={`flex items-center gap-2 py-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${
//                                 activeTab === tab.id 
//                                     ? "border-[#4285F4] text-[#4285F4]" 
//                                     : "border-transparent text-gray-500 hover:text-gray-800"
//                             }`}
//                         >
//                             {tab.icon} {tab.label}
//                         </button>
//                     ))}
//                 </div>

//                 {/* FORM CONTENT */}
//                 <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    
//                     {/* =========================================
//                         TAB 1: BASIC INFO
//                     ========================================= */}
//                     {activeTab === "basic" && (
//                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-fadeIn">
//                             {renderInput("Unit Number / Reference", "unit_no", "text", "e.g. APT-101", true)}
//                             {renderInput("Title", "title", "text", "e.g. Luxury 2BHK Apartment")}
//                             {renderInput("Property Type", "property_type", "text", "e.g. Apartment, Villa", true)}
                            
//                             {renderInput("Bedrooms", "bedrooms", "number")}
//                             {renderInput("Bathrooms", "bathrooms", "number")}
//                             {renderInput("Parking Spaces", "parking", "number")}

//                             {renderSelect("Furnished Status", "furnished", [
//                                 { value: "furnished", label: "Furnished" },
//                                 { value: "unfurnished", label: "Unfurnished" },
//                             ])}
//                             {renderInput("Tenure", "tenure", "text", "e.g. Freehold")}
//                             {renderInput("Project Status", "project_status", "text", "e.g. Ready, Off-plan")}
//                         </div>
//                     )}

//                     {/* =========================================
//                         TAB 2: PRICING & SPACES
//                     ========================================= */}
//                     {activeTab === "pricing" && (
//                         <div className="space-y-6 animate-fadeIn">
//                             {/* Spaces */}
//                             <div>
//                                 <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Spaces</h4>
//                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
//                                     {renderInput("Size (sqft)", "size", "number")}
//                                     {renderInput("Built-up Area", "built_up_area", "number")}
//                                     {renderInput("Plot Size", "plot_size", "number")}
//                                 </div>
//                             </div>
                            
//                             {/* Pricing */}
//                             <div className="border-t border-gray-200 pt-5">
//                                 <h4 className="text-sm font-bold text-gray-800 mb-3 uppercase tracking-wider">Pricing</h4>
//                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
//                                     {renderInput("Sale Price (AED)", "sale_price", "number")}
//                                     {renderInput("Sale Price per sqft", "sale_price_sqft", "number")}
//                                     {renderInput("Service Charge", "service_charge", "number")}
                                    
//                                     {renderInput("Rent Price (Yearly)", "rent_price_yearly", "number")}
//                                     {renderInput("Rent Price (Monthly)", "rent_price", "number")}
//                                     {renderInput("Payment Method", "payment_method", "text", "e.g. Cash, Cheques")}
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {/* =========================================
//                         TAB 3: LOCATION & LEGAL
//                     ========================================= */}
//                     {activeTab === "location" && (
//                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
//                             {renderInput("City", "city", "text")}
//                             {renderInput("Location Text (Area/Community)", "location_text", "text")}
                            
//                             {renderInput("Emirate", "emirate", "text")}
//                             {renderInput("Permit Type", "permit_type", "text")}
                            
//                             {renderInput("ADREC Permit No.", "adrec_permit_no", "text")}
//                             {renderInput("Issue Expiry Date", "issue_expiry", "date")}

//                             <div className="md:col-span-2">
//                                 <label className="text-sm font-bold text-gray-700 block mb-1.5">Description</label>
//                                 <textarea
//                                     name="description"
//                                     value={formData.description || ""}
//                                     onChange={handleChange}
//                                     rows="4"
//                                     className={FIELD_BASE}
//                                     placeholder="Describe the property details, view, etc."
//                                 />
//                             </div>
//                         </div>
//                     )}

//                     {/* =========================================
//                         TAB 4: AMENITIES
//                     ========================================= */}
//                     {activeTab === "amenities" && (
//                         <div className="animate-fadeIn">
//                             <p className="text-sm text-gray-500 mb-4">Select all the amenities this property offers.</p>
//                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
//                                 {Object.keys(formData).filter(k => typeof formData[k] === 'boolean').map((amenity) => (
//                                     <label key={amenity} className={`flex items-center gap-2 p-3 rounded-sm border cursor-pointer transition-colors ${formData[amenity] ? 'bg-[#4285F4]/5 border-[#4285F4]' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
//                                         <input
//                                             type="checkbox"
//                                             name={amenity}
//                                             checked={formData[amenity]}
//                                             onChange={handleChange}
//                                             className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4]"
//                                         />
//                                         <span className="text-sm text-gray-700 capitalize">
//                                             {amenity.replace(/_/g, ' ')}
//                                         </span>
//                                     </label>
//                                 ))}
//                             </div>
//                         </div>
//                     )}

//                     {/* =========================================
//                         TAB 5: IMAGES & VIDEOS
//                     ========================================= */}
//                     {activeTab === "media" && (
//                         <div className="space-y-8 animate-fadeIn">
//                             {/* Cover Image */}
//                             <div>
//                                 <label className="text-sm font-bold text-gray-700 block mb-2">Cover Image</label>
//                                 <div className="flex gap-4 items-center">
//                                     <label className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
//                                         <FiUploadCloud size={24} className="text-gray-400 mb-1" />
//                                         <span className="text-xs text-gray-500">Upload</span>
//                                         <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e, 'cover')} />
//                                     </label>
//                                     {coverPreview && (
//                                         <div className="w-32 h-32 rounded-xl overflow-hidden border border-gray-200">
//                                             <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
//                                         </div>
//                                     )}
//                                 </div>
//                             </div>

//                             {/* Gallery Images */}
//                             <div className="border-t border-gray-200 pt-6">
//                                 <label className="text-sm font-bold text-gray-700 block mb-2">Gallery Images</label>
//                                 <div className="flex flex-wrap gap-4">
//                                     {galleryPreviews.map((src, i) => (
//                                         <div key={i} className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200">
//                                             <img src={src} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
//                                         </div>
//                                     ))}
//                                     <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
//                                         <FiUploadCloud size={20} className="text-gray-400" />
//                                         <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageChange(e, 'gallery')} />
//                                     </label>
//                                 </div>
//                             </div>

//                             {/* Videos */}
//                             <div className="border-t border-gray-200 pt-6">
//                                 <label className="text-sm font-bold text-gray-700 block mb-2">Videos (Optional)</label>
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                     <input type="file" accept="video/*" onChange={(e) => handleImageChange(e, 'video1')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-semibold file:bg-[#4285F4]/10 file:text-[#4285F4] hover:file:bg-[#4285F4]/20" />
//                                     <input type="file" accept="video/*" onChange={(e) => handleImageChange(e, 'video2')} className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-semibold file:bg-[#4285F4]/10 file:text-[#4285F4] hover:file:bg-[#4285F4]/20" />
//                                 </div>
//                             </div>
//                         </div>
//                     )}
//                 </form>

//                 {/* FOOTER */}
//                 <div className="bg-white px-6 py-4 border-t border-gray-100 flex justify-between items-center shrink-0">
//                     <div className="text-xs text-gray-500 font-medium">
//                         * All fields with red left borders are required.
//                     </div>
//                     <div className="flex gap-3">
//                         <button
//                             type="button"
//                             onClick={onClose}
//                             disabled={loading}
//                             className="px-6 py-2.5 rounded-sm border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
//                         >
//                             Cancel
//                         </button>
//                         <button
//                             type="submit"
//                             onClick={handleSubmit}
//                             disabled={loading}
//                             className="flex items-center gap-2 px-8 py-2.5 rounded-sm bg-[#4285F4] text-white font-bold hover:bg-blue-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
//                         >
//                             {loading ? (
//                                 <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                             ) : (
//                                 <FaSave />
//                             )}
//                             {loading ? "Saving..." : "Save Listing"}
//                         </button>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default AddEditListing;