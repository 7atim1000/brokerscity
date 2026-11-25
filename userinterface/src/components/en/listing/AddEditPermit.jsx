import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
    FaFileAlt,
    FaSave,
    FaTimes,
    FaUserShield,
    FaCloudUploadAlt,
    FaFilePdf,
    FaTrashAlt,
    FaBed,
    FaCheckCircle, // Added for status dropdown icon
} from "react-icons/fa";
import { FiUserCheck, FiEdit2 } from "react-icons/fi";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// ✅ Shared classes for inputs
const FIELD_BASE = "w-full px-4 py-3 text-base sm:text-sm bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-left";
const FIELD_WRAPPER = "relative rounded-sm transition-shadow focus-within:ring-2 focus-within:ring-[#1e3a8a]/30";

const UNASSIGN_VALUE = "unassigned";

// ✅ Status Options
const PERMIT_STATUS_OPTIONS = [
    { value: "owner_approval", label: "Owner's Approval" },
    { value: "payment", label: "Payment" },
    { value: "completed", label: "Completed" },
];

const AddEditPermit = ({ permit, onClose, onSuccess }) => {
    const isEditMode = !!permit;

    // =========================================================
    // STATE
    // =========================================================
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [file, setFile] = useState(null);
    const [clearFile, setClearFile] = useState(false);

    const defaultFormData = {
        title: "",
        refrence_no: "",
        permit_no: "",
        permit_status: "",
        property_offer: "",
        price: "",
        bedrooms: "",
        managed_by: "",
    };

    const [formData, setFormData] = useState(defaultFormData);
    
    // Users State
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const firstInputRef = useRef(null);

    // =========================================================
    // INITIAL DATA POPULATION & AUTO-FOCUS
    // =========================================================
    useEffect(() => {
        // Fetch users for the "Managed By" dropdown
        const fetchUsers = async () => {
            setLoadingUsers(true);
            try {
                const token = localStorage.getItem("access_token");
                const res = await fetch(`${BASE}/api/users/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const userList = Array.isArray(data) ? data : (data.results || data.users || []);
                    // Filter by listing roles just like in OwnersArchive
                    setUsers(userList.filter(u => u.role === 'listing' || u.role === 'listing_sales_rent'));
                }
            } catch (err) {
                console.error("Failed to load users", err);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();

        if (isEditMode && permit) {
            // Check if the saved status matches our options, otherwise keep it as is
            let initialStatus = permit.permit_status || "";
            const matchedOption = PERMIT_STATUS_OPTIONS.find(
                opt => opt.value.toLowerCase() === initialStatus.toLowerCase() || opt.label.toLowerCase() === initialStatus.toLowerCase()
            );
            if (matchedOption) {
                initialStatus = matchedOption.value;
            }

            setFormData({
                title: permit.title || "",
                refrence_no: permit.refrence_no || "",
                permit_no: permit.permit_no || "",
                permit_status: initialStatus,
                property_offer: permit.property_offer || "",
                price: permit.price || "",
                bedrooms: permit.bedrooms || "",
                managed_by: permit.managed_by || "",
            });
        }

        setTimeout(() => {
            if (firstInputRef.current) firstInputRef.current.focus();
        }, 100);
    }, [isEditMode, permit]);

    // =========================================================
    // HANDLERS
    // =========================================================
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    // Enter key navigation logic
    const handleEnterNavigation = (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); 
            const form = e.target.form;
            const index = Array.prototype.indexOf.call(form.elements, e.target);
            
            // Find the next valid element (skips hidden inputs)
            if (form.elements[index + 1]) {
                form.elements[index + 1].focus();
            }
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.size > 10 * 1024 * 1024) {
                toast.error("File is too large. Max size is 10MB.");
                return;
            }
            setFile(selectedFile);
            setClearFile(false);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setClearFile(true);
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
            if (!formData.permit_no && !formData.refrence_no) {
                newErrors.permit_no = "Either Permit No or Reference No is required";
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                toast.error("Please fill in all required fields");
                setLoading(false);
                return;
            }

            const payload = new FormData();
            
            // Append text fields
            Object.keys(formData).forEach((key) => {
                let val = formData[key];
                if (key === 'managed_by' && val === UNASSIGN_VALUE) {
                    val = ""; // Send empty so backend sets null
                }
                
                // Convert status value to label for saving (optional, depends on your backend logic)
                if (key === 'permit_status') {
                    const matchedOpt = PERMIT_STATUS_OPTIONS.find(o => o.value === val);
                    if (matchedOpt) val = matchedOpt.label; // Saves as "Owner's Approval", "Payment", etc.
                }
                
                if (val === "") {
                    payload.append(key, ""); // Let backend clean it to null
                } else {
                    payload.append(key, val);
                }
            });

            if (file) payload.append("title_deed", file);
            if (clearFile) payload.append("clear_title_deed", "true");

            const url = isEditMode
                ? `${BASE}/api/permit-numbers/${permit.id}/update/`
                : `${BASE}/api/permit-numbers/create/`;

            const method = isEditMode ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: payload,
            });

            if (!response.ok) {
                let errorData = null;
                try {
                    errorData = await response.json();
                } catch (err) {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }
                
                if (errorData) {
                    const backendErrors = {};
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
                throw new Error("Failed to save permit");
            }

            toast.success(isEditMode ? "✅ Permit updated successfully" : "✅ Permit created successfully");
            if (onSuccess) onSuccess();
            if (onClose) onClose();

        } catch (error) {
            console.error("Submit error:", error);
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
        borderLeftColor: filled ? "#1e3a8a" : "#ef4444",
        borderWidth: "2px",
        borderStyle: "solid",
        boxShadow: filled
            ? "0 0 0 3px rgba(30, 58, 138, 0.1)"
            : "0 0 0 3px rgba(239, 68, 68, 0.1)",
    });

    const getFieldIndicatorColor = (filled) => (filled ? "bg-[#1e3a8a]" : "bg-red-500");

    // Header logic for displaying current logged-in user or updater
    const getManagerName = () => {
        if (isEditMode) {
            return permit?.updated_by_name || permit?.created_by_name || "System User";
        }
        try {
            const userStr = localStorage.getItem("user");
            if (userStr) {
                const userObj = JSON.parse(userStr);
                return `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim() || userObj.username;
            }
        } catch (e) { /* Ignore */ }
        return localStorage.getItem("user_name") || localStorage.getItem("first_name") || "Active User";
    };

    const currentDeedName = permit?.title_deed_name;
    const currentDeedUrl = permit?.title_deed_url;

    // =========================================================
    // MAIN RENDER
    // =========================================================
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" dir="ltr">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-fadeIn">
                
                {/* HEADER */}
                <div className="relative flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#a47d52]/10 flex items-center justify-center border border-[#a47d52]/20 shrink-0">
                            {isEditMode ? <FiEdit2 className="text-[#a47d52]" size={18} /> : <FaFileAlt className="text-[#a47d52]" size={18} />}
                        </div>
                        <h3 className="text-lg font-extrabold text-gray-800 whitespace-nowrap">
                            {isEditMode ? "Edit Permit Number" : "Add New Permit"}
                        </h3>
                    </div>

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="flex items-center gap-2 bg-[#1e3a8a]/5 border border-[#1e3a8a]/20 px-4 py-1.5 rounded-full shadow-sm cursor-default hover:bg-[#1e3a8a]/10 transition-colors">
                            <FiUserCheck className={isEditMode ? "text-green-500" : "text-[#1e3a8a]"} size={14} />
                            <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                                {isEditMode ? "Updated by" : "Managed by"}: <span className="font-bold text-[#1e3a8a]">{getManagerName()}</span>
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
                    
                    {/* CORE FIELDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        
                        {/* Title */}
                        <div className="md:col-span-2 flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Title / Description</label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    ref={firstInputRef}
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    placeholder="Enter permit title or description"
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.title))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.title))}`} />
                            </div>
                            {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
                        </div>

                        {/* Permit Number */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Permit Number</label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="text"
                                    name="permit_no"
                                    value={formData.permit_no}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    placeholder="e.g. PRM-12345"
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.permit_no))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.permit_no))}`} />
                            </div>
                            {errors.permit_no && <p className="text-red-500 text-xs">{errors.permit_no}</p>}
                        </div>

                        {/* Reference Number */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Reference Number</label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="text"
                                    name="refrence_no"
                                    value={formData.refrence_no}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    placeholder="e.g. REF-9876"
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.refrence_no))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.refrence_no))}`} />
                            </div>
                            {errors.refrence_no && <p className="text-red-500 text-xs">{errors.refrence_no}</p>}
                        </div>

                        {/* Permit Status (SELECT BOX) */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <FaCheckCircle className="text-[#1e3a8a]" /> Status
                            </label>
                            <div className={FIELD_WRAPPER}>
                                <select
                                    name="permit_status"
                                    value={formData.permit_status}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    className={`${FIELD_BASE} cursor-pointer appearance-none pr-10`}
                                    style={inputStyle(isFilled(formData.permit_status))}
                                >
                                    <option value="">-- Select Status --</option>
                                    {PERMIT_STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.permit_status))}`} />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            {errors.permit_status && <p className="text-red-500 text-xs">{errors.permit_status}</p>}
                        </div>

                        {/* Bedrooms */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <FaBed className="text-[#1e3a8a]" /> Bedrooms
                            </label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="number"
                                    name="bedrooms"
                                    value={formData.bedrooms}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    placeholder="e.g. 3"
                                    min="0"
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.bedrooms))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.bedrooms))}`} />
                            </div>
                            {errors.bedrooms && <p className="text-red-500 text-xs">{errors.bedrooms}</p>}
                        </div>

                        {/* Property Offer */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Property Offer</label>
                            <div className={FIELD_WRAPPER}>
                                <select
                                    name="property_offer"
                                    value={formData.property_offer}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    className={`${FIELD_BASE} cursor-pointer appearance-none pr-10`}
                                    style={inputStyle(isFilled(formData.property_offer))}
                                >
                                    <option value="">-- Select Offer --</option>
                                    <option value="sale">Sale</option>
                                    <option value="rent">Rent</option>
                                </select>
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.property_offer))}`} />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            {errors.property_offer && <p className="text-red-500 text-xs">{errors.property_offer}</p>}
                        </div>

                        {/* Price */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Price</label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="number"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    placeholder="e.g. 150000"
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.price))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.price))}`} />
                            </div>
                            {errors.price && <p className="text-red-500 text-xs">{errors.price}</p>}
                        </div>

                        {/* Managed By (Dropdown) */}
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <FaUserShield className="text-[#1e3a8a]" /> Managed By
                            </label>
                            <div className={FIELD_WRAPPER}>
                                <select
                                    name="managed_by"
                                    value={formData.managed_by}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    className={`${FIELD_BASE} cursor-pointer appearance-none pr-10`}
                                    style={inputStyle(isFilled(formData.managed_by) && formData.managed_by !== UNASSIGN_VALUE)}
                                    disabled={loadingUsers}
                                >
                                    <option value="">-- Select User --</option>
                                    <option value={UNASSIGN_VALUE} className="font-bold text-gray-800">Unassigned</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.first_name || u.username} {u.last_name || ''} ({u.role === 'listing' ? 'Listing' : 'Listing Sales Rent'})
                                        </option>
                                    ))}
                                </select>
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.managed_by) && formData.managed_by !== UNASSIGN_VALUE)}`} />
                                
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                            {loadingUsers && <p className="text-xs text-blue-500 mt-1">Loading agents...</p>}
                            {!loadingUsers && users.length === 0 && <p className="text-xs text-red-500 mt-1">No eligible users found.</p>}
                            {errors.managed_by && <p className="text-red-500 text-xs">{errors.managed_by}</p>}
                        </div>
                    </div>

                    {/* TITLE DEED UPLOAD */}
                    <div className="pt-5 border-t border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Title Deed Document</label>
                        
                        {(!file && !currentDeedUrl) || clearFile ? (
                            <div className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-white hover:bg-gray-50 border-gray-300`}>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    onKeyDown={handleEnterNavigation}
                                    accept=".pdf, .jpg, .jpeg, .png, .webp"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <FaCloudUploadAlt size={28} className="text-[#1e3a8a] mb-2" />
                                <p className="text-sm font-bold text-gray-700">Click to upload title deed</p>
                                <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (max 10MB)</p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#a47d52]/10 flex items-center justify-center">
                                        {(file && file.name.endsWith('.pdf')) || (!file && currentDeedName?.endsWith('.pdf')) ? (
                                            <FaFilePdf className="text-red-500" size={20} />
                                        ) : (
                                            <FaFileAlt className="text-[#1e3a8a]" size={20} />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 break-all">
                                            {file ? file.name : currentDeedName}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Current Uploaded File"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {currentDeedUrl && !file && (
                                        <a 
                                            href={currentDeedUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 text-xs font-bold text-[#1e3a8a] bg-[#1e3a8a]/10 rounded-md hover:bg-[#1e3a8a]/20 transition-colors"
                                        >
                                            View
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Remove File"
                                    >
                                        <FaTrashAlt size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                        {errors.title_deed && <p className="text-red-500 text-xs mt-1">{errors.title_deed}</p>}
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
                        className="flex items-center gap-2 px-8 py-2.5 rounded-sm bg-[#a47d52] text-white font-bold hover:bg-[#8a6a44] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <FaSave />
                        )}
                        {loading ? "Saving..." : (isEditMode ? "Update Permit" : "Save Permit")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddEditPermit;

// import React, { useState, useEffect, useRef } from "react";
// import toast from "react-hot-toast";
// import {
//     FaFileAlt,
//     FaSave,
//     FaTimes,
//     FaUserShield,
//     FaCloudUploadAlt,
//     FaFilePdf,
//     FaTrashAlt,
// } from "react-icons/fa";
// import { FiUserCheck, FiEdit2 } from "react-icons/fi";

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// // ✅ Shared classes for inputs
// const FIELD_BASE = "w-full px-4 py-3 text-base sm:text-sm bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-left";
// const FIELD_WRAPPER = "relative rounded-sm transition-shadow focus-within:ring-2 focus-within:ring-[#1e3a8a]/30";

// const UNASSIGN_VALUE = "unassigned";

// const AddEditPermit = ({ permit, onClose, onSuccess }) => {
//     const isEditMode = !!permit;

//     // =========================================================
//     // STATE
//     // =========================================================
//     const [loading, setLoading] = useState(false);
//     const [errors, setErrors] = useState({});
//     const [file, setFile] = useState(null);
//     const [clearFile, setClearFile] = useState(false);

//     const defaultFormData = {
//         title: "",
//         refrence_no: "",
//         permit_no: "",
//         permit_status: "",
//         property_offer: "", // ✅ ADDED
//         price: "",          // ✅ ADDED
//         managed_by: "",
//     };

//     const [formData, setFormData] = useState(defaultFormData);
    
//     // Users State
//     const [users, setUsers] = useState([]);
//     const [loadingUsers, setLoadingUsers] = useState(false);

//     const firstInputRef = useRef(null);

//     // =========================================================
//     // INITIAL DATA POPULATION & AUTO-FOCUS
//     // =========================================================
//     useEffect(() => {
//         // Fetch users for the "Managed By" dropdown
//         const fetchUsers = async () => {
//             setLoadingUsers(true);
//             try {
//                 const token = localStorage.getItem("access_token");
//                 const res = await fetch(`${BASE}/api/users/`, {
//                     headers: { Authorization: `Bearer ${token}` }
//                 });
//                 if (res.ok) {
//                     const data = await res.json();
//                     const userList = Array.isArray(data) ? data : (data.results || data.users || []);
//                     // Filter by listing roles just like in OwnersArchive
//                     setUsers(userList.filter(u => u.role === 'listing' || u.role === 'listing_sales_rent'));
//                 }
//             } catch (err) {
//                 console.error("Failed to load users", err);
//             } finally {
//                 setLoadingUsers(false);
//             }
//         };
//         fetchUsers();

//         if (isEditMode && permit) {
//             setFormData({
//                 title: permit.title || "",
//                 refrence_no: permit.refrence_no || "",
//                 permit_no: permit.permit_no || "",
//                 permit_status: permit.permit_status || "",
//                 property_offer: permit.property_offer || "", // ✅ ADDED
//                 price: permit.price || "",                    // ✅ ADDED
//                 managed_by: permit.managed_by || "",
//             });
//         }

//         setTimeout(() => {
//             if (firstInputRef.current) firstInputRef.current.focus();
//         }, 100);
//     }, [isEditMode, permit]);

//     // =========================================================
//     // HANDLERS
//     // =========================================================
//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setFormData((prev) => ({ ...prev, [name]: value }));
//         setErrors((prev) => ({ ...prev, [name]: "" }));
//     };

//     // Enter key navigation logic
//     const handleEnterNavigation = (e) => {
//         if (e.key === "Enter") {
//             e.preventDefault(); 
//             const form = e.target.form;
//             const index = Array.prototype.indexOf.call(form.elements, e.target);
            
//             // Find the next valid element (skips hidden inputs)
//             if (form.elements[index + 1]) {
//                 form.elements[index + 1].focus();
//             }
//         }
//     };

//     const handleFileChange = (e) => {
//         const selectedFile = e.target.files[0];
//         if (selectedFile) {
//             if (selectedFile.size > 10 * 1024 * 1024) {
//                 toast.error("File is too large. Max size is 10MB.");
//                 return;
//             }
//             setFile(selectedFile);
//             setClearFile(false);
//         }
//     };

//     const handleRemoveFile = () => {
//         setFile(null);
//         setClearFile(true);
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

//             const newErrors = {};
//             if (!formData.permit_no && !formData.refrence_no) {
//                 newErrors.permit_no = "Either Permit No or Reference No is required";
//             }

//             if (Object.keys(newErrors).length > 0) {
//                 setErrors(newErrors);
//                 toast.error("Please fill in all required fields");
//                 setLoading(false);
//                 return;
//             }

//             const payload = new FormData();
            
//             // Append text fields
//             Object.keys(formData).forEach((key) => {
//                 let val = formData[key];
//                 if (key === 'managed_by' && val === UNASSIGN_VALUE) {
//                     val = ""; // Send empty so backend sets null
//                 }
                
//                 if (val === "") {
//                     payload.append(key, ""); // Let backend clean it to null
//                 } else {
//                     payload.append(key, val);
//                 }
//             });

//             if (file) payload.append("title_deed", file);
//             if (clearFile) payload.append("clear_title_deed", "true");

//             const url = isEditMode
//                 ? `${BASE}/api/permit-numbers/${permit.id}/update/`
//                 : `${BASE}/api/permit-numbers/create/`;

//             const method = isEditMode ? "PATCH" : "POST";

//             const response = await fetch(url, {
//                 method,
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                 },
//                 body: payload,
//             });

//             if (!response.ok) {
//                 let errorData = null;
//                 try {
//                     errorData = await response.json();
//                 } catch (err) {
//                     throw new Error(`Server error: ${response.status} ${response.statusText}`);
//                 }
                
//                 if (errorData) {
//                     const backendErrors = {};
//                     Object.keys(errorData).forEach((key) => {
//                         if (key !== "message" && key !== "error") {
//                             backendErrors[key] = Array.isArray(errorData[key]) 
//                                 ? errorData[key][0] 
//                                 : errorData[key];
//                         }
//                     });
//                     setErrors(backendErrors);
//                     throw new Error(errorData.message || "Validation failed");
//                 }
//                 throw new Error("Failed to save permit");
//             }

//             toast.success(isEditMode ? "✅ Permit updated successfully" : "✅ Permit created successfully");
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
//     const isFilled = (val) => val !== undefined && val !== null && String(val).trim() !== "";

//     const inputStyle = (filled) => ({
//         borderTopColor: "transparent",
//         borderBottomColor: "transparent",
//         borderRightColor: "transparent",
//         borderLeftColor: filled ? "#1e3a8a" : "#ef4444",
//         borderWidth: "2px",
//         borderStyle: "solid",
//         boxShadow: filled
//             ? "0 0 0 3px rgba(30, 58, 138, 0.1)"
//             : "0 0 0 3px rgba(239, 68, 68, 0.1)",
//     });

//     const getFieldIndicatorColor = (filled) => (filled ? "bg-[#1e3a8a]" : "bg-red-500");

//     // Header logic for displaying current logged-in user or updater
//     const getManagerName = () => {
//         if (isEditMode) {
//             return permit?.updated_by_name || permit?.created_by_name || "System User";
//         }
//         try {
//             const userStr = localStorage.getItem("user");
//             if (userStr) {
//                 const userObj = JSON.parse(userStr);
//                 return `${userObj.first_name || ""} ${userObj.last_name || ""}`.trim() || userObj.username;
//             }
//         } catch (e) { /* Ignore */ }
//         return localStorage.getItem("user_name") || localStorage.getItem("first_name") || "Active User";
//     };

//     const currentDeedName = permit?.title_deed_name;
//     const currentDeedUrl = permit?.title_deed_url;

//     // =========================================================
//     // MAIN RENDER
//     // =========================================================
//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6" dir="ltr">
//             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-fadeIn">
                
//                 {/* HEADER */}
//                 <div className="relative flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10">
//                     <div className="flex items-center gap-3">
//                         <div className="w-10 h-10 rounded-full bg-[#a47d52]/10 flex items-center justify-center border border-[#a47d52]/20 shrink-0">
//                             {isEditMode ? <FiEdit2 className="text-[#a47d52]" size={18} /> : <FaFileAlt className="text-[#a47d52]" size={18} />}
//                         </div>
//                         <h3 className="text-lg font-extrabold text-gray-800 whitespace-nowrap">
//                             {isEditMode ? "Edit Permit Number" : "Add New Permit"}
//                         </h3>
//                     </div>

//                     <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
//                         <div className="flex items-center gap-2 bg-[#1e3a8a]/5 border border-[#1e3a8a]/20 px-4 py-1.5 rounded-full shadow-sm cursor-default hover:bg-[#1e3a8a]/10 transition-colors">
//                             <FiUserCheck className={isEditMode ? "text-green-500" : "text-[#1e3a8a]"} size={14} />
//                             <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
//                                 {isEditMode ? "Updated by" : "Managed by"}: <span className="font-bold text-[#1e3a8a]">{getManagerName()}</span>
//                             </span>
//                         </div>
//                     </div>

//                     <button
//                         onClick={onClose}
//                         disabled={loading}
//                         className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
//                     >
//                         <FaTimes size={18} />
//                     </button>
//                 </div>

//                 {/* FORM */}
//                 <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#f8f7f5]/30">
                    
//                     {/* CORE FIELDS */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        
//                         {/* Title */}
//                         <div className="md:col-span-2 flex flex-col gap-1.5">
//                             <label className="text-sm font-bold text-gray-700">Title / Description</label>
//                             <div className={FIELD_WRAPPER}>
//                                 <input
//                                     ref={firstInputRef}
//                                     type="text"
//                                     name="title"
//                                     value={formData.title}
//                                     onChange={handleChange}
//                                     onKeyDown={handleEnterNavigation}
//                                     placeholder="Enter permit title or description"
//                                     className={FIELD_BASE}
//                                     style={inputStyle(isFilled(formData.title))}
//                                 />
//                                 <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.title))}`} />
//                             </div>
//                             {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
//                         </div>

//                         {/* Permit Number */}
//                         <div className="flex flex-col gap-1.5">
//                             <label className="text-sm font-bold text-gray-700">Permit Number</label>
//                             <div className={FIELD_WRAPPER}>
//                                 <input
//                                     type="text"
//                                     name="permit_no"
//                                     value={formData.permit_no}
//                                     onChange={handleChange}
//                                     onKeyDown={handleEnterNavigation}
//                                     placeholder="e.g. PRM-12345"
//                                     className={FIELD_BASE}
//                                     style={inputStyle(isFilled(formData.permit_no))}
//                                 />
//                                 <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.permit_no))}`} />
//                             </div>
//                             {errors.permit_no && <p className="text-red-500 text-xs">{errors.permit_no}</p>}
//                         </div>

//                         {/* Reference Number */}
//                         <div className="flex flex-col gap-1.5">
//                             <label className="text-sm font-bold text-gray-700">Reference Number</label>
//                             <div className={FIELD_WRAPPER}>
//                                 <input
//                                     type="text"
//                                     name="refrence_no"
//                                     value={formData.refrence_no}
//                                     onChange={handleChange}
//                                     onKeyDown={handleEnterNavigation}
//                                     placeholder="e.g. REF-9876"
//                                     className={FIELD_BASE}
//                                     style={inputStyle(isFilled(formData.refrence_no))}
//                                 />
//                                 <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.refrence_no))}`} />
//                             </div>
//                             {errors.refrence_no && <p className="text-red-500 text-xs">{errors.refrence_no}</p>}
//                         </div>

//                         {/* Permit Status */}
//                         <div className="flex flex-col gap-1.5">
//                             <label className="text-sm font-bold text-gray-700">Status</label>
//                             <div className={FIELD_WRAPPER}>
//                                 <input
//                                     type="text"
//                                     name="permit_status"
//                                     value={formData.permit_status}
//                                     onChange={handleChange}
//                                     onKeyDown={handleEnterNavigation}
//                                     placeholder="e.g. Paid, Pending Approval"
//                                     className={FIELD_BASE}
//                                     style={inputStyle(isFilled(formData.permit_status))}
//                                 />
//                                 <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.permit_status))}`} />
//                             </div>
//                         </div>

//                         {/* Property Offer (NEW) */}
//                         <div className="flex flex-col gap-1.5">
//                             <label className="text-sm font-bold text-gray-700">Property Offer</label>
//                             <div className={FIELD_WRAPPER}>
//                                 <select
//                                     name="property_offer"
//                                     value={formData.property_offer}
//                                     onChange={handleChange}
//                                     onKeyDown={handleEnterNavigation}
//                                     className={`${FIELD_BASE} cursor-pointer appearance-none pr-10`}
//                                     style={inputStyle(isFilled(formData.property_offer))}
//                                 >
//                                     <option value="">-- Select Offer --</option>
//                                     <option value="sale">Sale</option>
//                                     <option value="rent">Rent</option>
//                                 </select>
//                                 <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.property_offer))}`} />
//                                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
//                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
//                                 </div>
//                             </div>
//                             {errors.property_offer && <p className="text-red-500 text-xs">{errors.property_offer}</p>}
//                         </div>

//                         {/* Price (NEW) */}
//                         <div className="flex flex-col gap-1.5">
//                             <label className="text-sm font-bold text-gray-700">Price</label>
//                             <div className={FIELD_WRAPPER}>
//                                 <input
//                                     type="number"
//                                     name="price"
//                                     value={formData.price}
//                                     onChange={handleChange}
//                                     onKeyDown={handleEnterNavigation}
//                                     placeholder="e.g. 150000"
//                                     className={FIELD_BASE}
//                                     style={inputStyle(isFilled(formData.price))}
//                                 />
//                                 <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.price))}`} />
//                             </div>
//                             {errors.price && <p className="text-red-500 text-xs">{errors.price}</p>}
//                         </div>

//                         {/* Managed By (Dropdown) */}
//                         <div className="flex flex-col gap-1.5 md:col-span-2">
//                             <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
//                                 <FaUserShield className="text-[#1e3a8a]" /> Managed By
//                             </label>
//                             <div className={FIELD_WRAPPER}>
//                                 <select
//                                     name="managed_by"
//                                     value={formData.managed_by}
//                                     onChange={handleChange}
//                                     onKeyDown={handleEnterNavigation}
//                                     className={`${FIELD_BASE} cursor-pointer appearance-none pr-10`}
//                                     style={inputStyle(isFilled(formData.managed_by) && formData.managed_by !== UNASSIGN_VALUE)}
//                                     disabled={loadingUsers}
//                                 >
//                                     <option value="">-- Select User --</option>
//                                     <option value={UNASSIGN_VALUE} className="font-bold text-gray-800">Unassigned</option>
//                                     {users.map(u => (
//                                         <option key={u.id} value={u.id}>
//                                             {u.first_name || u.username} {u.last_name || ''} ({u.role === 'listing' ? 'Listing' : 'Listing Sales Rent'})
//                                         </option>
//                                     ))}
//                                 </select>
//                                 <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.managed_by) && formData.managed_by !== UNASSIGN_VALUE)}`} />
                                
//                                 {/* Custom arrow indicator for the select box */}
//                                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
//                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
//                                 </div>
//                             </div>
//                             {loadingUsers && <p className="text-xs text-blue-500 mt-1">Loading agents...</p>}
//                             {!loadingUsers && users.length === 0 && <p className="text-xs text-red-500 mt-1">No eligible users found.</p>}
//                             {errors.managed_by && <p className="text-red-500 text-xs">{errors.managed_by}</p>}
//                         </div>
//                     </div>

//                     {/* TITLE DEED UPLOAD */}
//                     <div className="pt-5 border-t border-gray-200">
//                         <label className="block text-sm font-bold text-gray-700 mb-2">Title Deed Document</label>
                        
//                         {(!file && !currentDeedUrl) || clearFile ? (
//                             <div className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-white hover:bg-gray-50 border-gray-300`}>
//                                 <input
//                                     type="file"
//                                     onChange={handleFileChange}
//                                     onKeyDown={handleEnterNavigation}
//                                     accept=".pdf, .jpg, .jpeg, .png, .webp"
//                                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
//                                 />
//                                 <FaCloudUploadAlt size={28} className="text-[#1e3a8a] mb-2" />
//                                 <p className="text-sm font-bold text-gray-700">Click to upload title deed</p>
//                                 <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG (max 10MB)</p>
//                             </div>
//                         ) : (
//                             <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
//                                 <div className="flex items-center gap-3">
//                                     <div className="w-10 h-10 rounded-full bg-[#a47d52]/10 flex items-center justify-center">
//                                         {(file && file.name.endsWith('.pdf')) || (!file && currentDeedName?.endsWith('.pdf')) ? (
//                                             <FaFilePdf className="text-red-500" size={20} />
//                                         ) : (
//                                             <FaFileAlt className="text-[#1e3a8a]" size={20} />
//                                         )}
//                                     </div>
//                                     <div>
//                                         <p className="text-sm font-bold text-gray-800 break-all">
//                                             {file ? file.name : currentDeedName}
//                                         </p>
//                                         <p className="text-xs text-gray-500">
//                                             {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Current Uploaded File"}
//                                         </p>
//                                     </div>
//                                 </div>
//                                 <div className="flex items-center gap-2">
//                                     {currentDeedUrl && !file && (
//                                         <a 
//                                             href={currentDeedUrl} 
//                                             target="_blank" 
//                                             rel="noopener noreferrer"
//                                             className="px-3 py-1.5 text-xs font-bold text-[#1e3a8a] bg-[#1e3a8a]/10 rounded-md hover:bg-[#1e3a8a]/20 transition-colors"
//                                         >
//                                             View
//                                         </a>
//                                     )}
//                                     <button
//                                         type="button"
//                                         onClick={handleRemoveFile}
//                                         className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
//                                         title="Remove File"
//                                     >
//                                         <FaTrashAlt size={16} />
//                                     </button>
//                                 </div>
//                             </div>
//                         )}
//                         {errors.title_deed && <p className="text-red-500 text-xs mt-1">{errors.title_deed}</p>}
//                     </div>
//                 </form>

//                 {/* FOOTER */}
//                 <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 sticky bottom-0">
//                     <button
//                         type="button"
//                         onClick={onClose}
//                         disabled={loading}
//                         className="px-6 py-2.5 rounded-sm border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
//                     >
//                         Cancel
//                     </button>
//                     <button
//                         type="submit"
//                         onClick={handleSubmit}
//                         disabled={loading}
//                         className="flex items-center gap-2 px-8 py-2.5 rounded-sm bg-[#a47d52] text-white font-bold hover:bg-[#8a6a44] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
//                     >
//                         {loading ? (
//                             <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//                         ) : (
//                             <FaSave />
//                         )}
//                         {loading ? "Saving..." : (isEditMode ? "Update Permit" : "Save Permit")}
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default AddEditPermit;