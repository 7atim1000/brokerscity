import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast"; // ✅ Changed to react-hot-toast
import {
    FaUser,
    FaBuilding,
    FaSave,
    FaTimes,
    FaPlus,
    FaMinus,
    FaCheckCircle,
} from "react-icons/fa";
import { FiUserCheck, FiEdit2, FiChevronDown } from "react-icons/fi";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// ✅ Shared classes for inputs
const FIELD_BASE = "w-full px-4 py-3 text-base sm:text-sm bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-left";
const FIELD_WRAPPER = "relative rounded-sm transition-shadow focus-within:ring-2 focus-within:ring-[#4285F4]/30";

// ✅ Country Codes List (UAE First)
const COUNTRY_CODES = [
    { code: "+971", iso: "AE", flag: "🇦🇪", name: "UAE" },
    { code: "+966", iso: "SA", flag: "🇸🇦", name: "Saudi Arabia" },
    { code: "+974", iso: "QA", flag: "🇶🇦", name: "Qatar" },
    { code: "+973", iso: "BH", flag: "🇧🇭", name: "Bahrain" },
    { code: "+968", iso: "OM", flag: "🇴🇲", name: "Oman" },
    { code: "+965", iso: "KW", flag: "🇰🇼", name: "Kuwait" },
    { code: "+20", iso: "EG", flag: "🇪🇬", name: "Egypt" },
    { code: "+44", iso: "GB", flag: "🇬🇧", name: "UK" },
    { code: "+1", iso: "US", flag: "🇺🇸", name: "USA" },
];

const AddEditLandLord = ({ landlord, onClose, onSuccess }) => {
    const isEditMode = !!landlord;

    // =========================================================
    // STATE
    // =========================================================
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showExtraPhones, setShowExtraPhones] = useState(false);

    const defaultFormData = {
        owner_type: "individual",
        name: "",
        company: "",
        nationality: "",
        birth_date: "",
        phone: "",
        phone1: "",
        phone2: "",
        email: "",
        country: "",
        address: "",
    };

    const [formData, setFormData] = useState(defaultFormData);
    
    // ✅ Phone State (Separating country code and number)
    const [phoneData, setPhoneData] = useState({
        code: "+971",
        number: "",
        code1: "+971",
        number1: "",
        code2: "+971",
        number2: "",
    });

    const firstInputRef = useRef(null);

    // =========================================================
    // INITIAL DATA POPULATION & AUTO-FOCUS
    // =========================================================
    useEffect(() => {
        if (isEditMode && landlord) {
            // Parse existing phone to separate country code
            const parsePhone = (fullPhone, defaultCode = "+971") => {
                if (!fullPhone) return { code: defaultCode, number: "" };
                
                // Find matching country code
                const matchedCountry = COUNTRY_CODES.find(c => fullPhone.startsWith(c.code));
                if (matchedCountry) {
                    return { 
                        code: matchedCountry.code, 
                        number: fullPhone.replace(matchedCountry.code, "").trim() 
                    };
                }
                return { code: defaultCode, number: fullPhone };
            };

            const p = parsePhone(landlord.phone);
            const p1 = parsePhone(landlord.phone1);
            const p2 = parsePhone(landlord.phone2);

            setPhoneData({
                code: p.code, number: p.number,
                code1: p1.code, number1: p1.number,
                code2: p2.code, number2: p2.number,
            });

            setFormData({
                owner_type: landlord.owner_type || "individual",
                name: landlord.name || "",
                company: landlord.company || "",
                nationality: landlord.nationality || "",
                birth_date: landlord.birth_date || "",
                phone: landlord.phone || "",
                phone1: landlord.phone1 || "",
                phone2: landlord.phone2 || "",
                email: landlord.email || "",
                country: landlord.country || "",
                address: landlord.address || "",
            });

            if (landlord.phone1 || landlord.phone2) {
                setShowExtraPhones(true);
            }
        }
        
        setTimeout(() => {
            if (firstInputRef.current) firstInputRef.current.focus();
        }, 100);
    }, [isEditMode, landlord]);

    // =========================================================
    // HANDLERS
    // =========================================================
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    // ✅ Specific handler for phone fields to update both raw state and formatted state
    const handlePhoneChange = (field, type, value) => {
        // type is 'code' or 'number'
        setPhoneData(prev => {
            const newData = { ...prev, [type === 'code' ? `code${field}` : `number${field}`]: value };
            
            // Reconstruct the full phone number for formData
            const fullNumber = `${newData[`code${field}`]}${newData[`number${field}`].replace(/\D/g, '')}`;
            setFormData(prevForm => ({ ...prevForm, [`phone${field}`]: newData[`number${field}`] ? fullNumber : "" }));
            
            return newData;
        });
        setErrors((prev) => ({ ...prev, [`phone${field}`]: "" }));
    };

    const handleTypeSelect = (type) => {
        setFormData((prev) => ({
            ...prev,
            owner_type: type,
            company: type === "individual" ? "" : prev.company,
        }));
    };

    const handleEnterNavigation = (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); 
            const form = e.target.form;
            const index = Array.prototype.indexOf.call(form, e.target);
            
            if (form.elements[index + 1]) {
                form.elements[index + 1].focus();
            }
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

            const newErrors = {};
            if (!phoneData.number) newErrors.phone = "Phone number is required";
            if (formData.owner_type === "company" && !formData.company) {
                newErrors.company = "Company name is required for company owners";
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                toast.error("Please fill in all required fields");
                setLoading(false);
                return;
            }

            // Clean payload
            const payload = { ...formData };
            Object.keys(payload).forEach((key) => {
                if (payload[key] === "") payload[key] = null;
            });
            if (payload.birth_date === null) delete payload.birth_date;

            const url = isEditMode
                ? `${BASE}/api/landlord/${landlord.id}/update/`
                : `${BASE}/api/landlord/create/`;

            const method = isEditMode ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData) {
                    const backendErrors = {};
                    
                    // ✅ Handle specific unique constraint errors with Toast
                    if (errorData.phone) {
                        const phoneErr = Array.isArray(errorData.phone) ? errorData.phone[0] : errorData.phone;
                        if (phoneErr.includes("exists") || phoneErr.includes("unique")) {
                            toast.error("CRM owner with this phone already exists.");
                        }
                    }
                    if (errorData.email) {
                        const emailErr = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
                        if (emailErr.includes("exists") || emailErr.includes("unique")) {
                            toast.error("CRM owner with this email already exists.");
                        }
                    }

                    Object.keys(errorData).forEach((key) => {
                        if (key !== "message" && key !== "error") {
                            backendErrors[key] = Array.isArray(errorData[key]) 
                                ? errorData[key][0] 
                                : errorData[key];
                        }
                    });
                    setErrors(backendErrors);
                    throw new Error(errorData.message || "Validation failed");
                }
                throw new Error("Failed to save landlord");
            }

            toast.success(isEditMode ? "✅ Landlord updated successfully" : "✅ Landlord created successfully");
            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch (error) {
            console.error("Submit error:", error);
            // Only show generic toast if it's not a validation error (which already showed above)
            if (!error.message.includes("Validation") && !error.message.includes("exists")) {
                toast.error(error.message || "An error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // DESIGN HELPERS
    // =========================================================
    const isFilled = (val) => val !== undefined && val !== null && String(val).trim() !== "";

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

    const getManagerName = () => {
        if (isEditMode) {
            return landlord?.updated_by_name || landlord?.created_by_name || "System User";
        }

        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const userObj = JSON.parse(userStr);
                if (userObj.first_name || userObj.username || userObj.name) {
                    return `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim() || userObj.username || userObj.name;
                }
            }
        } catch (e) { /* Ignore JSON parse errors */ }

        return localStorage.getItem("user_name") || 
               localStorage.getItem("first_name") || 
               localStorage.getItem("username") || 
               localStorage.getItem("name") || 
               "Active User";
    };

    // =========================================================
    // RENDER PHONE FIELD HELPER
    // =========================================================
    const renderPhoneField = (fieldSuffix, label, isRequired = false, onToggleExtra = null) => {
        const codeKey = `code${fieldSuffix}`;
        const numberKey = `number${fieldSuffix}`;
        const fieldName = `phone${fieldSuffix}`;
        
        const isFieldFilled = isFilled(phoneData[numberKey]);

        return (
            <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-gray-700">
                        {label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    {onToggleExtra && (
                        <button
                            type="button"
                            onClick={onToggleExtra}
                            className="text-[#4285F4] hover:text-blue-700 bg-[#4285F4]/10 hover:bg-[#4285F4]/20 p-2 rounded-sm transition-all flex items-center gap-1 text-xs font-bold"
                        >
                            {showExtraPhones ? <FaMinus size={12} /> : <FaPlus size={12} />}
                        </button>
                    )}
                </div>
                
                <div className={`flex ${FIELD_WRAPPER}`}>
                    {/* Country Code Dropdown */}
                    <div className="relative w-[110px] shrink-0">
                        <select
                            value={phoneData[codeKey]}
                            onChange={(e) => handlePhoneChange(fieldSuffix, 'code', e.target.value)}
                            className="w-full h-full pl-3 pr-8 py-3 bg-[#f8f7f5] border-r border-gray-200 rounded-l-sm text-sm font-bold text-gray-700 appearance-none cursor-pointer focus:outline-none"
                        >
                            {COUNTRY_CODES.map((c) => (
                                <option key={c.code} value={c.code}>
                                    {c.iso} {c.code}
                                </option>
                            ))}
                        </select>
                        <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Number Input */}
                    <input
                        type="tel"
                        value={phoneData[numberKey]}
                        onChange={(e) => handlePhoneChange(fieldSuffix, 'number', e.target.value)}
                        onKeyDown={handleEnterNavigation}
                        placeholder="56 188 7677"
                        className={`${FIELD_BASE} rounded-l-none`}
                        style={{ 
                            ...inputStyle(isFieldFilled), 
                            borderLeftColor: "transparent", // Hide left border since dropdown is there
                            boxShadow: "none" // Wrapper handles the shadow
                        }}
                    />
                    
                    {/* Left Indicator Bar */}
                    <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFieldFilled)}`} />
                </div>
                {errors[fieldName] && <p className="text-red-500 text-xs">{errors[fieldName]}</p>}
            </div>
        );
    };

    // =========================================================
    // MAIN RENDER
    // =========================================================
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" dir="ltr">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-fadeIn">
                
                {/* HEADER */}
                <div className="relative flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 shrink-0">
                            {isEditMode ? <FiEdit2 className="text-[#4285F4]" size={18} /> : <FaUser className="text-[#4285F4]" size={18} />}
                        </div>
                        <h3 className="text-lg font-extrabold text-gray-800 whitespace-nowrap">
                            {isEditMode ? "Edit Landlord" : "Add New Landlord"}
                        </h3>
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="flex items-center gap-2 bg-[#4285F4]/5 border border-[#4285F4]/20 px-4 py-1.5 rounded-full shadow-sm cursor-default hover:bg-[#4285F4]/10 transition-colors">
                            <FiUserCheck className={isEditMode ? "text-green-500" : "text-[#4285F4]"} size={14} />
                            <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                                {isEditMode ? "Updated by" : "Managed by"}: <span className="font-bold text-[#4285F4]">{getManagerName()}</span>
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#f8f7f5]/30">
                    
                    {/* TYPE SELECTOR */}
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Landlord Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => handleTypeSelect("individual")}
                                className={`flex items-center justify-center gap-2 py-3 rounded-sm border-2 transition-all font-bold ${
                                    formData.owner_type === "individual"
                                        ? "border-[#4285F4] bg-[#4285F4]/5 text-[#4285F4]"
                                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                }`}
                            >
                                <FaUser size={18} />
                                Individual
                                {formData.owner_type === "individual" && <FaCheckCircle className="ml-1" />}
                            </button>

                            <button
                                type="button"
                                onClick={() => handleTypeSelect("company")}
                                className={`flex items-center justify-center gap-2 py-3 rounded-sm border-2 transition-all font-bold ${
                                    formData.owner_type === "company"
                                        ? "border-[#4285F4] bg-[#4285F4]/5 text-[#4285F4]"
                                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                }`}
                            >
                                <FaBuilding size={18} />
                                Company
                                {formData.owner_type === "company" && <FaCheckCircle className="ml-1" />}
                            </button>
                        </div>
                    </div>

                    {/* CORE FIELDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        
                        {/* Name */}
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">
                                Full Name {formData.owner_type === "individual" && <span className="text-red-500">*</span>}
                            </label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    ref={firstInputRef}
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    placeholder="Enter full name"
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.name))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.name))}`} />
                            </div>
                            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                        </div>

                        {/* Dynamic Company Field */}
                        {formData.owner_type === "company" && (
                            <div className="md:col-span-2 animate-fadeIn flex flex-col gap-1.5">
                                <label className="text-sm font-bold text-gray-700">
                                    Company Name <span className="text-red-500">*</span>
                                </label>
                                <div className={FIELD_WRAPPER}>
                                    <FaBuilding className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                                    <input
                                        type="text"
                                        name="company"
                                        value={formData.company}
                                        onChange={handleChange}
                                        onKeyDown={handleEnterNavigation}
                                        placeholder="Enter company name"
                                        className={`${FIELD_BASE} pl-11`}
                                        style={inputStyle(isFilled(formData.company))}
                                    />
                                    <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.company))}`} />
                                </div>
                                {errors.company && <p className="text-red-500 text-xs">{errors.company}</p>}
                            </div>
                        )}

                        {/* Primary Phone */}
                        <div className="md:col-span-2">
                            {renderPhoneField("", "Phone Number", true, () => setShowExtraPhones(!showExtraPhones))}
                        </div>

                        {/* Extra Phones */}
                        {showExtraPhones && (
                            <>
                                <div className="animate-fadeIn">
                                    {renderPhoneField("1", "Alternative Phone 1")}
                                </div>
                                <div className="animate-fadeIn">
                                    {renderPhoneField("2", "Alternative Phone 2")}
                                </div>
                            </>
                        )}

                        {/* Email */}
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Email Address</label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    placeholder="email@example.com"
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.email))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.email))}`} />
                            </div>
                        </div>
                    </div>

                    {/* ADDITIONAL DETAILS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-gray-200">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Nationality</label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="text"
                                    name="nationality"
                                    value={formData.nationality}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.nationality))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.nationality))}`} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Country</label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.country))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.country))}`} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Birth Date</label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="date"
                                    name="birth_date"
                                    value={formData.birth_date}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.birth_date))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.birth_date))}`} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Address</label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.address))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.address))}`} />
                            </div>
                        </div>
                    </div>
                </form>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 sticky bottom-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-sm border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-2.5 rounded-sm bg-[#4285F4] text-white font-bold hover:bg-blue-600 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <FaSave />
                        )}
                        {loading ? "Saving..." : (isEditMode ? "Update Landlord" : "Save Landlord")}
                    </button>
                </div>
            </div>
        </div>
    );
};



export default AddEditLandLord;