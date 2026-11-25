import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
    FaSave, FaTimes, FaHome, FaImage, FaMapMarkerAlt, FaMoneyBillWave,
    FaListUl, FaBuilding, FaTag, FaExchangeAlt, FaCheckCircle, FaArrowRight,
    FaArrowLeft, FaFileSignature, FaUserTie, FaCheck, FaFire, FaVideo
} from "react-icons/fa";
import { FiChevronDown, FiUploadCloud } from "react-icons/fi";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const FIELD_BASE = "w-full px-4 py-3 text-base sm:text-sm bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-left";
const FIELD_WRAPPER = "relative rounded-sm transition-shadow focus-within:ring-2 focus-within:ring-[#4285F4]/30";

const ABU_DHABI_AREAS = [
    { value: "Al Reem Island", label: "Al Reem Island" },
    { value: "Al Maryah Island", label: "Al Maryah Island" },
    { value: "Saadiyat Island", label: "Saadiyat Island" },
    { value: "Yas Island", label: "Yas Island" },
    { value: "Khalifa City", label: "Khalifa City" },
    { value: "Mohammed Bin Zayed City", label: "Mohammed Bin Zayed City" },
    { value: "Al Shamkha", label: "Al Shamkha" },
    { value: "Al Reef", label: "Al Reef" },
    { value: "Masdar City", label: "Masdar City" },
    { value: "Al Raha Beach", label: "Al Raha Beach" },
    { value: "Corniche Area", label: "Corniche Area" },
    { value: "Al Bateen", label: "Al Bateen" },
    { value: "Al Mushrif", label: "Al Mushrif" },
    { value: "Al Muroor", label: "Al Muroor" },
    { value: "Al Wahda", label: "Al Wahda" },
    { value: "Al Nahyan", label: "Al Nahyan" },
    { value: "Tourist Club Area (TCA)", label: "Tourist Club Area (TCA)" },
    { value: "Al Zahiyah", label: "Al Zahiyah" },
    { value: "Other", label: "Other" },
];

const PROPERTY_STATUS = [
    { value: 'draft', label: 'Draft' },
    { value: 'live', label: 'Live' },
    { value: 'Under Mou', label: 'Under Mou' },
    { value: 'Under Reservation', label: 'Under Reservation' },
    { value: 'Sold', label: 'Sold / Rented' },
];

const AddEditListing = ({ listing, onClose, onSuccess }) => {
    const isEditMode = !!listing;

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState(1);

    const [owners, setOwners] = useState([]);
    const [users, setUsers] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    const [formData, setFormData] = useState({
        property_status: "draft", 
        
        property_category: "residential", 
        property_offer: "sale",
        property_type: "",

        listing_owner: "",
        listing_source: "",
        
        title: "",
        hot_deal: false, 
        unit_no: "",
        tenure: "",
        bedrooms: "",
        bathrooms: "",
        parking: "",
        furnished: "",
        size: "",
        built_up_area: "",
        plot_size: "",
        project_status: "",
        
        sale_price: "",
        sale_price_sqft: "",
        payment_method: "",
        service_charge: "",

        rent_price: "",
        rent_price_yearly: "",
        rent_type: "",
        
        city: "Abu Dhabi",
        location_text: "",
        
        emirate: "Abu Dhabi",
        permit_type: "ADREC", 
        adrec_permit_no: "",
        issue_expiry: "",
        property_finder: true, 
        
        description: "",
        
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

    const [coverImage, setCoverImage] = useState(null);
    const [video1, setVideo1] = useState(null);
    const [video2, setVideo2] = useState(null);
    const [galleryImages, setGalleryImages] = useState([]);
    
    const [coverPreview, setCoverPreview] = useState(null);
    const [galleryPreviews, setGalleryPreviews] = useState([]);
    
    const [video1Name, setVideo1Name] = useState("");
    const [video2Name, setVideo2Name] = useState("");
    
    const [manualRentYearly, setManualRentYearly] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoadingData(true);
            const token = localStorage.getItem("access_token");
            if (!token) return;

            try {
                const ownersRes = await fetch(`${BASE}/api/landlord/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (ownersRes.ok) {
                    const ownersData = await ownersRes.json();
                    setOwners(Array.isArray(ownersData) ? ownersData : ownersData.results || []);
                }

                const usersRes = await fetch(`${BASE}/api/users/`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(Array.isArray(usersData) ? usersData : usersData.results || usersData.users || []);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoadingData(false);
            }
        };

        fetchData();

        if (isEditMode && listing) {
            setFormData((prev) => ({
                ...prev,
                ...listing,
                property_status: listing.property_status || "draft",
                property_category: listing.property_category || "residential",
                property_offer: listing.property_offer || "sale",
                property_type: listing.property_type || "",
                hot_deal: listing.hot_deal || false,
                property_finder: listing.property_finder || false,
                size: listing.size || "",
                sale_price: listing.sale_price || "",
                sale_price_sqft: listing.sale_price_sqft || "",
                payment_method: listing.payment_method || "",
                service_charge: listing.service_charge || "",
                rent_price: listing.rent_price || "",
                rent_price_yearly: listing.rent_price_yearly || "",
                rent_type: listing.rent_type || "",
                issue_expiry: listing.issue_expiry || "",
                city: listing.city || "Abu Dhabi",
                location_text: listing.location_text || "",
                listing_owner: listing.listing_owner || "",
                listing_source: listing.listing_source || "",
                adrec_permit_no: listing.adrec_permit_no || "",
                permit_type: listing.permit_type || "ADREC",
                tenure: listing.tenure || "",
            }));
            if (listing.cover_image) setCoverPreview(listing.cover_image);
            if (listing.gallery_images) {
                setGalleryPreviews(listing.gallery_images.map((img) => img.image));
            }
            if (listing.video_1) setVideo1Name(listing.video_1.split('/').pop());
            if (listing.video_2) setVideo2Name(listing.video_2.split('/').pop());
            
            if (listing.rent_price_yearly && listing.rent_price_yearly !== listing.rent_price) {
                setManualRentYearly(true);
            }
        }
    }, [isEditMode, listing]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name === "permit_type") {
            setFormData((prev) => ({
                ...prev,
                permit_type: value,
                property_finder: value === "ADREC",
            }));
        } else if (name === "rent_price" && !manualRentYearly) {
            setFormData((prev) => ({
                ...prev,
                rent_price: value,
                rent_price_yearly: value, 
            }));
        } else if (name === "rent_price_yearly") {
            setManualRentYearly(true);
            setFormData((prev) => ({
                ...prev,
                rent_price_yearly: value,
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === "checkbox" ? checked : value,
            }));
        }
        
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleEnterNavigation = (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); 
            const form = e.target.form;
            if (!form) return;
            
            const focusableElements = Array.from(
                form.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])')
            ).filter(el => el.offsetParent !== null);
            
            const index = focusableElements.indexOf(e.target);
            
            if (index > -1 && index < focusableElements.length - 1) {
                focusableElements[index + 1].focus();
            }
        }
    };

    const handleSetPropertyStatus = (status) => {
        setFormData(prev => ({ ...prev, property_status: status }));
    };

    const handleImageChange = (e, type) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        if (type === "cover") {
            setCoverImage(files[0]);
            setCoverPreview(URL.createObjectURL(files[0]));
        } else if (type === "gallery") {
            const newFiles = Array.from(files);
            setGalleryImages((prev) => [...prev, ...newFiles]);
            const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
            setGalleryPreviews((prev) => [...prev, ...newPreviews]);
        }
    };

    const handleVideoChange = (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (type === "video1") {
            setVideo1(file);
            setVideo1Name(file.name);
        } else if (type === "video2") {
            setVideo2(file);
            setVideo2Name(file.name);
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

            if (!formData.title) {
                toast.error("Title is required.");
                setActiveTab(1);
                setLoading(false);
                return;
            }

            const data = new FormData();
            
            Object.keys(formData).forEach((key) => {
                if (key === 'cover_image' || key === 'video_1' || key === 'video_2' || key === 'gallery_images') return;
                
                const value = formData[key];
                if (value !== "" && value !== null && value !== undefined && value !== false) {
                    data.append(key, value);
                }
            });

            Object.keys(formData).forEach((key) => {
                if (typeof formData[key] === "boolean" && formData[key] === false) {
                    data.append(key, "false");
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
                } else {
                    const firstError = Object.keys(errorData)[0];
                    toast.error(`Error on ${firstError}: ${errorData[firstError][0] || errorData[firstError]}`);
                }
                throw new Error("Validation failed");
            }

            toast.success(isEditMode ? "✅ Listing updated!" : "✅ Listing saved!");
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

    const isFilled = (val) => val !== undefined && val !== null && String(val).trim() !== "" && val !== false;

    const inputStyle = (filled) => ({
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderRightColor: "transparent",
        borderLeftColor: filled ? "#4285F4" : "#ef4444",
        borderWidth: "2px",
        borderStyle: "solid",
        boxShadow: filled
            ? "0 0 0 3px rgba(66, 133, 244, 0.1)"
            : "0 0 0 3px rgba(239, 68, 68, 0.1)",
    });

    const getFieldIndicatorColor = (filled) => (filled ? "bg-[#4285F4]" : "bg-red-500");

    const renderInput = (label, name, type = "text", placeholder = "", required = false) => {
        const filled = isFilled(formData[name]);
        return (
            <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-bold text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className={FIELD_WRAPPER}>
                    <input
                        type={type}
                        name={name}
                        value={formData[name] || ""}
                        onChange={handleChange}
                        onKeyDown={handleEnterNavigation}
                        placeholder={placeholder}
                        className={FIELD_BASE}
                        style={inputStyle(filled)}
                    />
                    <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(filled)}`} />
                </div>
                {errors[name] && <p className="text-red-500 text-xs">{errors[name]}</p>}
            </div>
        );
    };

    const renderSelect = (label, name, options, placeholder = "Select...", required = false) => {
        const filled = isFilled(formData[name]);
        return (
            <div className="flex flex-col gap-1.5 w-full">
                <label className="text-sm font-bold text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                <div className={FIELD_WRAPPER}>
                    <select
                        name={name}
                        value={formData[name] || ""}
                        onChange={handleChange}
                        onKeyDown={handleEnterNavigation}
                        className={`${FIELD_BASE} appearance-none cursor-pointer`}
                        style={inputStyle(filled)}
                    >
                        <option value="">{placeholder}</option>
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                    <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(filled)}`} />
                </div>
            </div>
        );
    };

    const getManagerName = () => {
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const userObj = JSON.parse(userStr);
                if (userObj.first_name || userObj.username || userObj.name) {
                    return `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim() || userObj.username || userObj.name;
                }
            }
        } catch (e) { }
        return localStorage.getItem("user_name") || localStorage.getItem("first_name") || "Active User";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-6" dir="ltr">
            
            <form 
                onSubmit={handleSubmit} 
                className="bg-[#f8f7f5] rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden animate-fadeIn"
            >
                
                {/* HEADER */}
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
                                    {formData.property_status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">
                                {formData.title || "Untitled"} • {formData.property_offer === 'rent' ? 'Rent' : 'Sale'} • {formData.property_category}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* STEPPER TABS */}
                <div className="bg-white px-6 py-3 border-b border-gray-200 shrink-0 grid grid-cols-5 gap-2 md:gap-4 overflow-x-auto">
                    {[
                        { id: 1, label: "Property" },
                        { id: 2, label: "Pricing & Loc" },
                        { id: 3, label: "Media" },
                        { id: 4, label: "Amenities" },
                        { id: 5, label: "Publishing" }
                    ].map((step) => (
                        <button
                            key={step.id}
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveTab(step.id);
                            }}
                            className={`flex items-center justify-center gap-2 py-3 px-2 rounded-lg border-2 font-bold text-xs md:text-sm transition-all whitespace-nowrap cursor-pointer ${
                                activeTab === step.id 
                                    ? "border-[#4285F4] bg-[#4285F4]/5 text-[#4285F4]" 
                                    : "border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100"
                            }`}
                        >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] md:text-xs ${
                                activeTab === step.id ? "bg-[#4285F4] text-white" : "bg-gray-200 text-gray-500"
                            }`}>
                                {step.id}
                            </span>
                            {step.label}
                        </button>
                    ))}
                </div>

                {/* MAIN FORM CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6 custom-scrollbar">
                    
                    {/* LEFT COLUMN */}
                    <div className="flex-1 space-y-6">
                        
                        {/* TAB 1: PROPERTY */}
                        {activeTab === 1 && (
                            <div className="space-y-6 animate-fadeIn">
                                
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                                    <div className="flex-1 w-full">
                                        {renderInput("Listing Title", "title", "text", "e.g. Luxury 2BHK with Sea View", true)}
                                    </div>
                                    
                                    <div className="w-full md:w-auto pb-1">
                                        <label 
                                            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg border-2 cursor-pointer transition-all font-bold select-none ${
                                                formData.hot_deal 
                                                    ? "border-[#E53935]/50 bg-[#E53935]/10 text-[#E53935] shadow-sm" 
                                                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                name="hot_deal"
                                                checked={formData.hot_deal}
                                                onChange={handleChange}
                                                className="hidden cursor-pointer" 
                                            />
                                            <FaFire 
                                                size={18} 
                                                className={`${formData.hot_deal ? "text-[#E53935] animate-pulse-slow" : "text-gray-400"}`} 
                                            />
                                            Hot Deal
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Category</label>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setFormData({...formData, property_category: 'residential'})} className={`flex-1 flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${formData.property_category === 'residential' ? 'border-[#4285F4] bg-[#4285F4]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                                <div className="flex flex-row items-center gap-2">
                                                    <FaHome className={formData.property_category === 'residential' ? 'text-[#4285F4]' : 'text-gray-400'} size={18} />
                                                    <span className="font-bold text-gray-800 text-sm">Residential</span>
                                                </div>
                                                {formData.property_category === 'residential' && <FaCheckCircle className="text-[#4285F4]" />}
                                            </button>
                                            <button type="button" onClick={() => setFormData({...formData, property_category: 'commercial'})} className={`flex-1 flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${formData.property_category === 'commercial' ? 'border-[#4285F4] bg-[#4285F4]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                                <div className="flex flex-row items-center gap-2">
                                                    <FaBuilding className={formData.property_category === 'commercial' ? 'text-[#4285F4]' : 'text-gray-400'} size={18} />
                                                    <span className="font-bold text-gray-800 text-sm">Commercial</span>
                                                </div>
                                                {formData.property_category === 'commercial' && <FaCheckCircle className="text-[#4285F4]" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 block">Offer</label>
                                        <div className="flex gap-3">
                                            <button type="button" onClick={() => setFormData({...formData, property_offer: 'sale'})} className={`flex-1 flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${formData.property_offer === 'sale' ? 'border-[#4285F4] bg-[#4285F4]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                                <div className="flex flex-row items-center gap-2">
                                                    <FaTag className={formData.property_offer === 'sale' ? 'text-[#4285F4]' : 'text-gray-400'} size={18} />
                                                    <span className="font-bold text-gray-800 text-sm">For Sale</span>
                                                </div>
                                                {formData.property_offer === 'sale' && <FaCheckCircle className="text-[#4285F4]" />}
                                            </button>
                                            <button type="button" onClick={() => setFormData({...formData, property_offer: 'rent'})} className={`flex-1 flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${formData.property_offer === 'rent' ? 'border-[#4285F4] bg-[#4285F4]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                                <div className="flex flex-row items-center gap-2">
                                                    <FaExchangeAlt className={formData.property_offer === 'rent' ? 'text-[#4285F4]' : 'text-gray-400'} size={18} />
                                                    <span className="font-bold text-gray-800 text-sm">For Rent</span>
                                                </div>
                                                {formData.property_offer === 'rent' && <FaCheckCircle className="text-[#4285F4]" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaHome className="text-gray-400"/> The property</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {renderInput("Property type", "property_type", "text", "e.g. Apartment, Villa")}
                                        {renderSelect("Bedrooms", "bedrooms", [1,2,3,4,5].map(n => ({value: n, label: n})), "Beds")}
                                        {renderSelect("Bathrooms", "bathrooms", [1,2,3,4].map(n => ({value: n, label: n})), "Baths")}
                                        {renderInput("Size (sqft)", "size", "number", "e.g. 1,200")}
                                        {renderInput("Built-up area (sqft)", "built_up_area", "number", "e.g. 1,400")}
                                        {renderInput("Plot size (sqft)", "plot_size", "number", "e.g. 2,500")}
                                        {renderInput("Unit no.", "unit_no", "text", "e.g. 1203")}
                                        {renderInput("Tenure", "tenure", "text", "e.g. Freehold")}
                                        {renderSelect("Project status", "project_status", [{value: 'ready', label: 'Ready'}, {value: 'off-plan', label: 'Off-plan'}], "Select")}
                                        {renderSelect("Parking", "parking", [1,2,3].map(n => ({value: n, label: n})), "Parking")}
                                        {renderSelect("Furnished", "furnished", [{value: 'furnished', label: 'Furnished'}, {value: 'unfurnished', label: 'Unfurnished'}], "Furnished")}
                                    </div>
                                </div>

                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaListUl className="text-gray-400"/> Description</h4>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-gray-700">Description</label>
                                            <textarea name="description" value={formData.description || ""} onChange={handleChange} onKeyDown={handleEnterNavigation} rows="4" className={FIELD_BASE} placeholder="Describe the property..."></textarea>
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
                                    
                                    <div className="flex flex-row items-center gap-2 mb-4 bg-[#f8f7f5] p-3 rounded-lg border border-gray-100 w-fit">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ASKING PRICE:</span>
                                        <span className={`text-sm font-extrabold uppercase px-2 py-0.5 rounded ${formData.property_offer === 'rent' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {formData.property_offer === 'rent' ? 'RENT' : 'SALE'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {formData.property_offer === 'sale' ? (
                                            <>
                                                {renderInput("Sale Price (AED)", "sale_price", "number", "e.g. 1500000")}
                                                {renderInput("Sale Price / sqft", "sale_price_sqft", "number")}
                                                {renderSelect("Payment Method", "payment_method", [
                                                    {value: 'Cash', label: 'Cash'},
                                                    {value: 'Mortgage', label: 'Mortgage'},
                                                    {value: 'Cheques', label: 'Cheques'},
                                                    {value: 'Bank Transfer', label: 'Bank Transfer'}
                                                ], "Select Method")}
                                                {renderInput("Service Charge", "service_charge", "number", "e.g. 5000")}
                                            </>
                                        ) : (
                                            <>
                                                {renderInput("Rent Price (AED)", "rent_price", "number", "e.g. 10000")}
                                                {renderInput("Yearly Rent (AED)", "rent_price_yearly", "number", "e.g. 120000")}
                                                {renderSelect("Rent Type", "rent_type", [
                                                    {value: 'Yearly', label: 'Yearly'},
                                                    {value: 'Monthly', label: 'Monthly'},
                                                    {value: 'Daily', label: 'Daily'}
                                                ], "Select Rent Type")}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaMapMarkerAlt className="text-gray-400"/> Location</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {renderSelect("City", "city", [
                                            { value: "Abu Dhabi", label: "Abu Dhabi" },
                                            { value: "Dubai", label: "Dubai" },
                                            { value: "Sharjah", label: "Sharjah" }
                                        ], "Select City")}
                                        {renderSelect("Area / Community", "location_text", ABU_DHABI_AREAS, "Select Area")}
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
                                            <input type="file" accept="image/*" className="hidden cursor-pointer" onChange={(e) => handleImageChange(e, 'cover')} />
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
                                            <input type="file" accept="image/*" multiple className="hidden cursor-pointer" onChange={(e) => handleImageChange(e, 'gallery')} />
                                        </label>
                                    </div>
                                </div>

                                <div className="border-t border-gray-200 pt-6">
                                    <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaVideo className="text-gray-400"/> Videos (Optional)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-gray-700">Video 1</label>
                                            <input 
                                                type="file" 
                                                accept="video/*" 
                                                onChange={(e) => handleVideoChange(e, 'video1')} 
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-bold file:bg-[#4285F4]/10 file:text-[#4285F4] hover:file:bg-[#4285F4]/20 cursor-pointer border border-gray-200 rounded-sm bg-white" 
                                            />
                                            {video1Name && <p className="text-xs text-green-600 font-medium">Selected: {video1Name}</p>}
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-gray-700">Video 2</label>
                                            <input 
                                                type="file" 
                                                accept="video/*" 
                                                onChange={(e) => handleVideoChange(e, 'video2')} 
                                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-bold file:bg-[#4285F4]/10 file:text-[#4285F4] hover:file:bg-[#4285F4]/20 cursor-pointer border border-gray-200 rounded-sm bg-white" 
                                            />
                                            {video2Name && <p className="text-xs text-green-600 font-medium">Selected: {video2Name}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: AMENITIES */}
                        {activeTab === 4 && (
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm animate-fadeIn">
                                <h4 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2"><FaCheck className="text-green-500"/> Select Amenities</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {Object.keys(formData).filter(k => typeof formData[k] === 'boolean').map((amenity) => (
                                        <label key={amenity} className={`flex items-center gap-2 p-3 rounded-sm border cursor-pointer transition-colors ${formData[amenity] ? 'bg-[#4285F4]/5 border-[#4285F4]' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                            <input
                                                type="checkbox"
                                                name={amenity}
                                                checked={formData[amenity]}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-[#4285F4] rounded focus:ring-[#4285F4] cursor-pointer"
                                            />
                                            <span className="text-sm text-gray-700 capitalize truncate">
                                                {amenity.replace(/_/g, ' ')}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 5: PUBLISHING */}
                        {activeTab === 5 && (
                            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-6 animate-fadeIn">
                                <h4 className="font-extrabold text-gray-800 mb-2 flex items-center gap-2">
                                    <FaFileSignature className="text-gray-400"/> Publishing Status
                                </h4>
                                
                                <p className="text-sm text-gray-500 mb-4">Select the current status of this listing to save as Draft or Publish.</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {PROPERTY_STATUS.map((status) => (
                                        <button
                                            key={status.value}
                                            type="button"
                                            onClick={() => handleSetPropertyStatus(status.value)}
                                            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                                formData.property_status === status.value 
                                                    ? "border-[#4285F4] bg-[#4285F4]/5" 
                                                    : "border-gray-200 bg-white hover:border-gray-300"
                                            }`}
                                        >
                                            <span className={`font-bold ${formData.property_status === status.value ? "text-[#4285F4]" : "text-gray-700"}`}>
                                                {status.label}
                                            </span>
                                            {formData.property_status === status.value && <FaCheckCircle className="text-[#4285F4]" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT COLUMN (Assignment & Compliance) */}
                    <div className="w-full lg:w-[350px] space-y-6">
                        
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-[#f8f7f5] px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                                <FaUserTie className="text-purple-500" />
                                <h4 className="font-bold text-sm text-gray-800">Assignment</h4>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    Managed by: <span className="font-bold text-gray-800">{getManagerName()}</span>
                                </div>
                                
                                {renderSelect(
                                    "Listing Owner", 
                                    "listing_owner", 
                                    owners.map(o => {
                                        let label = o.name || o.company || o.phone;
                                        if (!label || label.trim() === "") {
                                            label = `Owner #${o.id}`;
                                        }
                                        return { value: o.id, label: label };
                                    }), 
                                    "Select Owner"
                                )}

                                {renderSelect(
                                    "Listing Source", 
                                    "listing_source", 
                                    users.map(u => ({ value: u.profile_id || u.id, label: u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username })), 
                                    "Select Source"
                                )}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-[#f8f7f5] px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                                <FaCheckCircle className="text-[#4285F4]" />
                                <h4 className="font-bold text-sm text-gray-800">Compliance & permit</h4>
                            </div>
                            <div className="p-4 space-y-4">
                                {renderSelect("Emirate", "emirate", [
                                    {value: 'Abu Dhabi', label: 'Abu Dhabi'}, 
                                    {value: 'Dubai', label: 'Dubai'}
                                ], "Select")}
                                
                                {renderSelect("Permit type", "permit_type", [
                                    {value: 'ADREC', label: 'ADREC'},
                                    {value: 'EXEMPT', label: 'EXEMPT'} 
                                ], "Select")}
                                
                                {formData.permit_type !== 'EXEMPT' && (
                                    <>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-sm font-bold text-gray-700">Permit no.</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    name="adrec_permit_no" 
                                                    value={formData.adrec_permit_no || ""} 
                                                    onChange={handleChange} 
                                                    onKeyDown={handleEnterNavigation} 
                                                    placeholder="7XXXXXXXXX" 
                                                    className={FIELD_BASE} 
                                                />
                                                <button type="button" className="bg-white border border-gray-300 text-[#4285F4] px-3 rounded-sm text-xs font-bold hover:bg-gray-50 cursor-pointer">
                                                    Validate
                                                </button>
                                            </div>
                                        </div>
                                        {renderInput("Issue → expiry", "issue_expiry", "date")}
                                    </>
                                )}

                                {formData.permit_type === 'ADREC' && (
                                    <div className="pt-2">
                                        <label className={`flex items-center gap-2 p-3 rounded-sm border cursor-pointer transition-colors ${formData.property_finder ? 'bg-[#0D5AA7]/5 border-[#0D5AA7]' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                                            <input
                                                type="checkbox"
                                                name="property_finder"
                                                checked={formData.property_finder}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-[#0D5AA7] rounded focus:ring-[#0D5AA7] cursor-pointer"
                                            />
                                            <FaHome className={formData.property_finder ? "text-[#0D5AA7]" : "text-gray-400"} size={18} />
                                            <span className={`text-sm font-bold ${formData.property_finder ? 'text-[#0D5AA7]' : 'text-gray-700'}`}>
                                                Inserted in PF
                                            </span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* STICKY FOOTER */}
                <div className="bg-white px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                    
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button type="button" onClick={onClose} className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer">
                            Cancel
                        </button>
                        {activeTab > 1 && (
                            <button 
                                type="button" 
                                onClick={(e) => { e.preventDefault(); setActiveTab(activeTab - 1); }} 
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                                <FaArrowLeft /> Back
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3 w-full sm:w-auto">
                        {activeTab < 5 ? (
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); setActiveTab(activeTab + 1); }}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg font-bold bg-[#4285F4] text-white hover:bg-blue-600 shadow-md transition-all cursor-pointer"
                            >
                                Next <FaArrowRight />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-lg font-bold transition-all bg-[#4285F4] text-white hover:bg-blue-600 shadow-md cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? "Saving..." : (isEditMode ? "Update Listing" : "Save and Publish")}
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddEditListing;

