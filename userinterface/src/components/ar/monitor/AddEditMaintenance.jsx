import React, { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
    FaTools,
    FaSave,
    FaTimes,
    FaCalendarAlt,
    FaMapMarkerAlt,
} from "react-icons/fa";
import { FiEdit2 } from "react-icons/fi";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// ✅ Shared classes for inputs
const FIELD_BASE = "w-full px-4 py-3 text-base sm:text-sm bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-left";
const FIELD_WRAPPER = "relative rounded-sm transition-shadow focus-within:ring-2 focus-within:ring-[#1e3a8a]/30";

const AddEditMaintenance = ({ maintenance, onClose, onSuccess }) => {
    const isEditMode = !!maintenance;

    // =========================================================
    // STATE
    // =========================================================
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const defaultFormData = {
        date: "",
        location: "",
        notes: "",
    };

    const [formData, setFormData] = useState(defaultFormData);
    const firstInputRef = useRef(null);

    // =========================================================
    // INITIAL DATA POPULATION & AUTO-FOCUS
    // =========================================================
    useEffect(() => {
        if (isEditMode && maintenance) {
            setFormData({
                date: maintenance.date || "",
                location: maintenance.location || "",
                notes: maintenance.notes || "",
            });
        }

        setTimeout(() => {
            if (firstInputRef.current) firstInputRef.current.focus();
        }, 100);
    }, [isEditMode, maintenance]);

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

            const payload = {
                date: formData.date || null,
                location: formData.location.trim() || null,
                notes: formData.notes.trim() || null,
            };

            const url = isEditMode
                ? `${BASE}/api/maintenances/${maintenance.id}/update/`
                : `${BASE}/api/maintenances/create/`;
                
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
                throw new Error("Failed to save maintenance record");
            }

            toast.success(isEditMode ? "✅ Maintenance updated successfully" : "✅ Maintenance created successfully");
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
                            {isEditMode ? <FiEdit2 className="text-[#a47d52]" size={18} /> : <FaTools className="text-[#a47d52]" size={18} />}
                        </div>
                        <h3 className="text-lg font-extrabold text-gray-800 whitespace-nowrap">
                            {isEditMode ? "Edit Maintenance" : "Add New Maintenance"}
                        </h3>
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
                    
                    <div className="grid grid-cols-1 gap-5 mb-5">
                        
                        {/* Date */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <FaCalendarAlt className="text-[#1e3a8a]" /> Date
                            </label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    ref={firstInputRef}
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.date))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.date))}`} />
                            </div>
                            {errors.date && <p className="text-red-500 text-xs">{errors.date}</p>}
                        </div>

                        {/* Location */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                <FaMapMarkerAlt className="text-[#1e3a8a]" /> Location
                            </label>
                            <div className={FIELD_WRAPPER}>
                                <input
                                    type="text"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    onKeyDown={handleEnterNavigation}
                                    placeholder="Enter maintenance location"
                                    className={FIELD_BASE}
                                    style={inputStyle(isFilled(formData.location))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.location))}`} />
                            </div>
                            {errors.location && <p className="text-red-500 text-xs">{errors.location}</p>}
                        </div>

                        {/* Notes */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-bold text-gray-700">Notes / Description</label>
                            <div className={FIELD_WRAPPER}>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            handleEnterNavigation(e);
                                        }
                                    }}
                                    placeholder="Enter maintenance details or notes..."
                                    className={`${FIELD_BASE} min-h-[100px] resize-y`}
                                    style={inputStyle(isFilled(formData.notes))}
                                />
                                <div className={`absolute left-0 top-0 h-full w-1 rounded-l-sm transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(isFilled(formData.notes))}`} />
                            </div>
                            {errors.notes && <p className="text-red-500 text-xs">{errors.notes}</p>}
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
                        className="flex items-center gap-2 px-8 py-2.5 rounded-sm bg-[#a47d52] text-white font-bold hover:bg-[#8a6a44] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <FaSave />
                        )}
                        {loading ? "Saving..." : (isEditMode ? "Update Maintenance" : "Save Maintenance")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddEditMaintenance;