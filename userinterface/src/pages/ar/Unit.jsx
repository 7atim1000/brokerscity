import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; 
import { Toaster } from "react-hot-toast";

import AddUnit from "../../components/ar/propertymanagement/AddUnit";

import EditUnit from "../../components/ar/propertymanagement/EditUnit";
import DetailUnit from "../../components/ar/propertymanagement/DetailUnit";

import { GiVillage } from "react-icons/gi";
import { CiEdit } from "react-icons/ci";
import { MdDeleteForever } from "react-icons/md";
import { FaBed, FaBath, FaCouch, FaExclamationTriangle, FaTrash, FaCar } from "react-icons/fa";

// ✅ Imported images for fallbacks
import apartmentImg from '../../assets/images/apartment.jpg';
import officeImg from '../../assets/images/office.jpg'; 

import {
    FiEye,
    FiPlus,
    FiSearch,
    FiRefreshCw,
    FiHome,
    FiBriefcase,
    FiGrid,
    FiList,
} from "react-icons/fi";

import { FaBuilding } from "react-icons/fa";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const Unit = () => {
    const navigate = useNavigate();

    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [selectedUnit, setSelectedUnit] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [confirmDelete, setConfirmDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const [selectedStatus, setSelectedStatus] = useState("residential");
    const [viewMode, setViewMode] = useState("cards");

    const fetchUnits = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                toast.error("يرجى تسجيل الدخول");
                return;
            }

            const response = await fetch(`${BASE}/api/units/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error("انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى");
                } else {
                    toast.error("فشل تحميل الوحدات");
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            let unitsData = [];
            if (Array.isArray(data)) unitsData = data;
            else if (Array.isArray(data.results)) unitsData = data.results;
            else if (Array.isArray(data.units)) unitsData = data.units;
            else if (Array.isArray(data.unit)) unitsData = data.unit;

            setUnits(unitsData);
        } catch (error) {
            console.error("Error fetching units:", error);
            if (!error.message?.includes("401") && error.message !== "Failed to fetch") {
                toast.error("❌ حدث خطأ أثناء جلب الوحدات");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnits();
    }, []);

    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);

        try {
            const token = localStorage.getItem("access_token");
            const response = await fetch(`${BASE}/api/units/${confirmDelete.id}/delete/`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                let message = "فشل حذف الوحدة";
                const data = await response.json().catch(() => null);
                if (data?.detail || data?.message) message = data.detail || data.message;
                throw new Error(message);
            }

            toast.success("✅ تم حذف الوحدة بنجاح");
            setConfirmDelete(null);
            fetchUnits();
        } catch (error) {
            console.error("Error deleting unit:", error);
            toast.error(`❌ ${error.message || "حدث خطأ أثناء حذف الوحدة"}`);
        } finally {
            setDeleting(false);
        }
    };

    const handleAdd = () => { setSelectedUnit(null); setShowAddModal(true); };
    const handleEdit = (unit) => { setSelectedUnit(unit); setShowEditModal(true); };
    const handleDetails = (unit) => { setSelectedUnit(unit); setShowDetailModal(true); };
    
    const handleModalClose = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowDetailModal(false);
        setSelectedUnit(null);
    };

    const getCategory = (unit) => unit?.category_details || unit?.category || null;
    
    const getCategoryName = (unit) => {
        const category = getCategory(unit);
        if (!category) return "-";
        if (typeof category === "string") return category;
        return category?.name || category?.title || category?.category_name || "-";
    };

    const getOwnerName = (unit) => {
        const category = getCategory(unit);
        if (!category || typeof category === "string") return "-";
        const owner = category?.owner_details || category?.owner || null;
        if (!owner) return "-";
        if (typeof owner === "string") return owner;
        return owner?.name || owner?.full_name || "-";
    };

    const getLocation = (unit) => {
        const category = getCategory(unit);
        if (!category || typeof category === "string") return "-";
        return category?.location || category?.location_name || "-";
    };

    const residentialCount = units.filter((u) => 
        u?.category_details?.status === "residential" || u?.category?.status === "residential"
    ).length;
    
    const commercialCount = units.filter((u) => 
        u?.category_details?.status === "commercial" || u?.category?.status === "commercial"
    ).length;

    const filteredUnits = units.filter((unit) => {
        const category = getCategory(unit);
        const categoryStatus = category && typeof category === "object" 
            ? category?.status 
            : unit?.category_status || "";

        if (categoryStatus !== selectedStatus) return false;

        const search = searchTerm.trim().toLowerCase();
        if (!search) return true;

        return (
            String(unit.name || "").toLowerCase().includes(search) ||
            String(getCategoryName(unit)).toLowerCase().includes(search) ||
            String(getOwnerName(unit)).toLowerCase().includes(search) ||
            String(getLocation(unit)).toLowerCase().includes(search)
        );
    });

    const formatAmount = (amount) => {
        const number = Number(amount || 0);
        return number.toLocaleString("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        });
    };

    const getTypeLabel = (type) => {
        const types = { apartment: "شقة", vila: "فيلا", villa: "فيلا", room: "غرفة" };
        return types[type] || type || "-";
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            available: { label: "متاحة", className: "bg-green-100 text-green-700" },
            occupied: { label: "مشغولة", className: "bg-red-100 text-red-700" },
            rented: { label: "مؤجرة", className: "bg-green-100 text-green-700" },
            sold: { label: "مباعة", className: "bg-purple-100 text-purple-700" },
            reserved: { label: "محجوزة", className: "bg-yellow-100 text-yellow-700" },
        };

        const config = statusConfig[status];

        if (!config) {
            return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status || "-"}</span>;
        }
        return <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${config.className}`}>{config.label}</span>;
    };

    const getFurnishedLabel = (unit) => {
        if (unit.furnished === true || unit.furnished === "furnished") {
            return <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">مفروشة</span>;
        }
        if (unit.unfurnished === true || unit.furnished === "unfurnished") {
            return <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-700">غير مفروشة</span>;
        }
        return <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500">-</span>;
    };

    // ✅ Determines which image to show based on status
    const getFallbackImage = (unit) => {
        const category = getCategory(unit);
        const status = category?.status || "";
        return status === "commercial" ? officeImg : apartmentImg;
    };

    /* =========================================================
       CARD VIEW
    ========================================================= */
    const renderCardsView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 max-w-full mx-auto px-2 md:px-2">
            {filteredUnits.map((unit) => {
                const categoryName = getCategoryName(unit);
                const ownerName = getOwnerName(unit);
                const location = getLocation(unit);

                return (
                    <div key={unit.id} className="bg-white border border-[#e9e6e1] rounded-xl shadow-md hover:shadow-xl transition-all duration-300 relative group flex flex-col">
                        
                        {/* Top Buttons */}
                        <button
                            onClick={() => setConfirmDelete(unit)}
                            className="absolute cursor-pointer top-3 left-3 p-2 rounded-full transition-all duration-300 z-10 bg-red-50 hover:bg-red-100 hover:scale-110 active:scale-95 shadow-sm"
                            title="حذف الوحدة"
                        >
                            <MdDeleteForever className="text-red-500" size={22} />
                        </button>

                        <button
                            onClick={() => handleEdit(unit)}
                            className="absolute cursor-pointer top-3 right-3 p-2 rounded-full bg-[#f8f7f5] hover:bg-green-50 hover:scale-110 active:scale-95 transition-all duration-300 z-10 shadow-sm"
                            title="تعديل الوحدة"
                        >
                            <CiEdit className="text-green-600" size={22} />
                        </button>

                        {/* Image */}
                        <div className="w-full h-48 overflow-hidden rounded-t-xl">
                            <img 
                                src={unit.image_1 || getFallbackImage(unit)} 
                                alt={unit.name} 
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                            {/* Name & Category */}
                            <div className="mb-3">
                                <h3 className="text-lg font-extrabold text-[#7a5c3a] line-clamp-1">
                                    {unit.name || "بدون اسم"}
                                </h3>
                                {categoryName && categoryName !== "-" && (
                                    <p className="text-xs text-gray-500 mt-1 truncate">{categoryName}</p>
                                )}
                            </div>

                            {/* Owner & Location */}
                            <div className="flex justify-between items-center w-full gap-2 mb-4 bg-gray-50 p-2 rounded-lg">
                                <div className="flex flex-col w-1/2">
                                    <span className="text-gray-500 font-bold text-[10px]">المالك:</span>
                                    <span className="truncate text-gray-800 text-xs font-semibold">{ownerName || "-"}</span>
                                </div>
                                <div className="flex flex-col w-1/2 text-left">
                                    <span className="text-gray-500 font-bold text-[10px]">الموقع:</span>
                                    <span className="truncate text-gray-800 text-xs font-semibold">{location || "-"}</span>
                                </div>
                            </div>

                            {/* Kind & Type */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1.5">
                                    <p className="text-[10px] font-bold text-gray-500">النوع:</p>
                                    <p className="font-extrabold text-gray-800 text-[11px]">{unit.kind || "-"}</p>
                                </div>
                                <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1.5">
                                    <p className="text-[10px] font-bold text-gray-500">الفئة:</p>
                                    <p className="font-extrabold text-gray-800 text-[11px]">{getTypeLabel(unit.type)}</p>
                                </div>
                            </div>

                            {/* Status & Price */}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-blue-50 rounded-lg py-2 px-2 flex flex-col items-center justify-center">
                                    <p className="text-[10px] font-bold text-blue-600 mb-1">الحالة</p>
                                    {getStatusBadge(unit.status)}
                                </div>
                                <div className="bg-green-50 rounded-lg py-2 px-2 flex flex-col items-center justify-center">
                                    <p className="text-[10px] font-bold text-green-600 mb-1">السعر</p>
                                    <p className="text-sm font-extrabold text-green-700" dir="ltr">
                                        {unit.price !== null && unit.price !== undefined ? formatAmount(unit.price) : "-"}
                                    </p>
                                </div>
                            </div>

                            {/* Extras */}
                            <div className="grid grid-cols-3 gap-1 mb-4">
                                <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1">
                                    <FaBed className="text-blue-400" size={20} />
                                    <p className="font-extrabold text-gray-800 text-[10px]">{unit.bedrooms ?? "-"}</p>
                                </div>
                                <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1">
                                    <FaBath className="text-green-500" size={20} />
                                    <p className="font-extrabold text-gray-800 text-[10px]">{unit.bathrooms ?? "-"}</p>
                                </div>
                                <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1">
                                    <FaCouch className="text-orange-400" size={20} />
                                    {getFurnishedLabel(unit)}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-auto border-t border-gray-200 pt-4 flex gap-2">
                                <button
                                    onClick={() => handleDetails(unit)}
                                    className="flex-1 cursor-pointer shadow-sm bg-white text-[#a47d52] py-2 px-2 rounded-lg font-extrabold text-xs transition-all duration-300 hover:bg-[#f8f7f5] hover:scale-105 active:scale-95 flex items-center justify-center gap-1 border border-gray-200"
                                >
                                    <FiEye size={14} /> التفاصيل
                                </button>
                                <button
                                    onClick={() => handleEdit(unit)}
                                    className="flex-1 cursor-pointer bg-green-600 shadow-sm text-white py-2 px-2 rounded-lg font-extrabold text-xs transition-all duration-300 hover:bg-green-700 hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                                >
                                    <CiEdit size={14} /> تعديل
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
                    <table className="w-full text-right">
                        <thead className="bg-[#e9e6e1] text-[#a47d52]">
                            <tr>
                                <th className="px-4 py-4 text-sm font-bold">#</th>
                                <th className="px-4 py-4 text-sm font-bold">اسم الوحدة</th>
                                <th className="px-4 py-4 text-sm font-bold">التصنيف</th>
                                <th className="px-4 py-4 text-sm font-bold">المالك</th>
                                <th className="px-4 py-4 text-sm font-bold">الموقع</th>
                                <th className="px-4 py-4 text-sm font-bold">النوع (Kind)</th>
                                <th className="px-4 py-4 text-sm font-bold">الحالة</th>
                                <th className="px-4 py-4 text-sm font-bold">السعر</th>
                                <th className="px-4 py-4 text-sm font-bold">غرف</th>
                                <th className="px-4 py-4 text-sm font-bold">حمامات</th>
                                <th className="px-4 py-4 text-sm font-bold">مفروشة</th>
                                <th className="px-4 py-4 text-center text-sm font-bold">الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUnits.map((unit, index) => (
                                <tr key={unit.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 text-sm text-gray-700">{index + 1}</td>
                                    <td className="px-4 py-4 text-sm font-bold text-gray-800">{unit.name || "-"}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{getCategoryName(unit)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{getOwnerName(unit)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{getLocation(unit)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700 font-bold">{unit.kind || "-"}</td>
                                    <td className="px-4 py-4 text-sm">{getStatusBadge(unit.status)}</td>
                                    <td className="px-4 py-4 text-sm text-gray-800 font-bold">
                                        {unit.price !== null && unit.price !== undefined ? formatAmount(unit.price) : "-"}
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{unit.bedrooms ?? "-"}</td>
                                    <td className="px-4 py-4 text-sm text-gray-700">{unit.bathrooms ?? "-"}</td>
                                    <td className="px-4 py-4 text-sm">{getFurnishedLabel(unit)}</td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button onClick={() => handleDetails(unit)} className="p-2 cursor-pointer bg-gray-50 text-gray-600 rounded-lg transition-all hover:scale-110" title="التفاصيل">
                                                <FiEye size={16} />
                                            </button>
                                            <button onClick={() => handleEdit(unit)} className="p-2 cursor-pointer bg-green-50 text-green-600 rounded-lg transition-all hover:scale-110" title="تعديل">
                                                <CiEdit size={16} />
                                            </button>
                                            <button onClick={() => setConfirmDelete(unit)} className="p-2 cursor-pointer bg-red-50 text-red-600 rounded-lg transition-all hover:scale-110" title="حذف">
                                                <MdDeleteForever size={16} />
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
        <div className="min-h-screen bg-[#f8f7f5] py-6 px-2 md:py-8 md:px-3 lg:py-5 lg:px-2 rtl" dir="rtl">
            <Toaster position="top-center" reverseOrder={false} />

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-2 md:px-2 mb-6 md:mb-8 lg:mb-10 gap-4 lg:shadow-lg">
                <div className="text-center sm:text-right">
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[#e9e6e1] items-center justify-center">
                            <FaBuilding className="text-[#a47d52]" size={24} />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 tracking-wide">إدارة الوحدات</h2>
                            <p className="text-base md:text-lg text-gray-600 mt-1">إدارة الوحدات العقارية وبياناتها</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={handleAdd} className="flex items-center justify-center gap-2 bg-[#a47d52] cursor-pointer text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap">
                        <FiPlus size={20} /> إضافة وحدة
                    </button>
                    <button type="button" onClick={() => navigate("/ar-category")} className="flex items-center justify-center gap-2 bg-green-600 cursor-pointer text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap">
                        <GiVillage size={20} /> البنايات والفلل
                    </button>
                    <button type="button" onClick={fetchUnits} disabled={loading} className="flex items-center justify-center gap-2 bg-[#6c7a89] cursor-pointer text-white px-5 py-3 rounded-full font-extrabold transition-all duration-300 hover:bg-[#5a6775] hover:scale-105 disabled:opacity-50">
                        <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* FILTERS */}
            <div className="max-w-full mx-auto px-2 md:px-2 mb-5">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="بحث باسم الوحدة أو المالك أو التصنيف أو الموقع..."
                            className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white text-right"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-auto flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                        <button type="button" onClick={() => setViewMode("cards")} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${viewMode === "cards" ? "bg-[#a47d52] text-white shadow-md" : "text-gray-600 hover:bg-[#f8f7f5]"}`}>
                            <FiGrid size={18} />
                        </button>
                        <button type="button" onClick={() => setViewMode("table")} className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${viewMode === "table" ? "bg-[#a47d52] text-white shadow-md" : "text-gray-600 hover:bg-[#f8f7f5]"}`}>
                            <FiList size={18} />
                        </button>
                    </div>
                </div>

                <div className="w-full flex flex-col sm:flex-row gap-3 justify-start mt-4">
                    <button type="button" onClick={() => setSelectedStatus("residential")} className={`flex items-center justify-center gap-3 min-w-[220px] px-6 py-3 rounded-xl border-2 cursor-pointer font-extrabold transition-all duration-300 ${selectedStatus === "residential" ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.02]" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"}`}>
                        <FiHome size={21} /> <span>سكني</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${selectedStatus === "residential" ? "bg-white/20 text-white" : "bg-white text-emerald-700"}`}>{residentialCount}</span>
                    </button>
                    <button type="button" onClick={() => setSelectedStatus("commercial")} className={`flex items-center justify-center gap-3 min-w-[220px] px-6 py-3 rounded-xl border-2 cursor-pointer font-extrabold transition-all duration-300 ${selectedStatus === "commercial" ? "bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]" : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"}`}>
                        <FiBriefcase size={21} /> <span>تجاري</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${selectedStatus === "commercial" ? "bg-white/20 text-white" : "bg-white text-indigo-700"}`}>{commercialCount}</span>
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            {loading ? (
                <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" /></div>
            ) : filteredUnits.length === 0 ? (
                <div className="max-w-full mx-auto px-2 md:px-2">
                    <div className="bg-white rounded-xl shadow-lg text-center py-20">
                        <FaBuilding className="mx-auto text-gray-300 mb-4" size={50} />
                        <p className="text-gray-500 text-lg">لا توجد وحدات</p>
                        <p className="text-gray-400 text-sm mt-2">قم بإضافة وحدة جديدة</p>
                        <button type="button" onClick={handleAdd} className="mt-5 bg-[#a47d52] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8a6a44] transition cursor-pointer">+ إضافة وحدة</button>
                    </div>
                </div>
            ) : viewMode === "cards" ? renderCardsView() : renderTableView()}

            {/* ADD UNIT */}
            {showAddModal && <AddUnit onClose={handleModalClose} onSuccess={fetchUnits} />}
            
            {/* EDIT UNIT */}
            {showEditModal && selectedUnit && <EditUnit unitId={selectedUnit.id} onClose={handleModalClose} onSuccess={fetchUnits} />}
            
            {/* DETAILS */}
            {showDetailModal && selectedUnit && <DetailUnit unitData={selectedUnit} onClose={handleModalClose} />}

            {/* DELETE CONFIRMATION MODAL */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !deleting) setConfirmDelete(null); }}>
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.3)] overflow-hidden" style={{ animation: "modalIn 0.25s ease-out" }}>
                        <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-red-400" />
                        <div className="flex justify-center pt-6">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />
                                <div className="relative w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
                                    <FaExclamationTriangle className="text-red-500" size={28} />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 pt-4 pb-6 text-center">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">تأكيد الحذف</h3>
                            <p className="text-sm text-gray-600 leading-relaxed mb-4">
                                هل أنت متأكد من حذف هذه الوحدة؟<br />
                                <span className="font-extrabold text-gray-800 mt-1 inline-block">{confirmDelete.name || "وحدة بدون اسم"}</span>
                            </p>
                            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-4">
                                <p className="text-xs text-red-700 font-bold">⚠️ لا يمكن التراجع عن هذا الإجراء</p>
                            </div>
                            <div className="flex flex-col md:flex-row gap-3">
                                <button onClick={handleConfirmDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-red-600 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
                                    {deleting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            جاري الحذف...
                                        </>
                                    ) : (
                                        <><FaTrash size={14} /> نعم، احذف</>
                                    )}
                                </button>
                                <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">إلغاء</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(15px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Unit;


// import React, { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast"; 
// import { Toaster } from "react-hot-toast";

// import AddUnit from "../../components/ar/propertymanagement/AddUnit";
// import EditUnit from "../../components/ar/propertymanagement/EditUnit";
// import DetailUnit from "../../components/ar/propertymanagement/DetailUnit";

// import { GiVillage } from "react-icons/gi";
// import { CiEdit } from "react-icons/ci";
// import { MdDeleteForever } from "react-icons/md";
// import { FaBed, FaBath, FaCouch, FaExclamationTriangle, FaTrash } from "react-icons/fa";

// import apartmentImg from '../../assets/images/apartment.jpg'
// import officeImg from '../../assets/images/office.jpg' 

// import {
//     FiEye,
//     FiPlus,
//     FiSearch,
//     FiRefreshCw,
//     FiHome,
//     FiBriefcase,
//     FiGrid,
//     FiList,
// } from "react-icons/fi";

// import { FaBuilding } from "react-icons/fa";

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// const Unit = () => {
//     const navigate = useNavigate();

//     const [units, setUnits] = useState([]);
//     const [loading, setLoading] = useState(false);

//     const [showAddModal, setShowAddModal] = useState(false);
//     const [showEditModal, setShowEditModal] = useState(false);
//     const [showDetailModal, setShowDetailModal] = useState(false);

//     const [selectedUnit, setSelectedUnit] = useState(null);

//     const [searchTerm, setSearchTerm] = useState("");

//     // ✅ Added state for custom delete confirmation
//     const [confirmDelete, setConfirmDelete] = useState(null);
//     const [deleting, setDeleting] = useState(false);

//     // =========================================================
//     // Status filter
//     // Default = Residential
//     // =========================================================
//     const [selectedStatus, setSelectedStatus] =
//         useState("residential");

//     // =========================================================
//     // View mode: "cards" (default) or "table"
//     // =========================================================
//     const [viewMode, setViewMode] = useState("cards");

//     // =========================================================
//     // Fetch all units
//     // =========================================================
//     const fetchUnits = async () => {
//         setLoading(true);

//         try {
//             const token = localStorage.getItem("access_token");

//             if (!token) {
//                 toast.error("يرجى تسجيل الدخول");
//                 return;
//             }

//             const response = await fetch(`${BASE}/api/units/`, {
//                 method: "GET",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             if (!response.ok) {
//                 if (response.status === 401) {
//                     toast.error(
//                         "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى"
//                     );
//                 } else {
//                     toast.error("فشل تحميل الوحدات");
//                 }

//                 throw new Error(
//                     `HTTP error! status: ${response.status}`
//                 );
//             }

//             const data = await response.json();

//             console.log("Fetched units:", data);

//             let unitsData = [];

//             if (Array.isArray(data)) {
//                 unitsData = data;
//             } else if (Array.isArray(data.results)) {
//                 unitsData = data.results;
//             } else if (Array.isArray(data.units)) {
//                 unitsData = data.units;
//             } else if (Array.isArray(data.unit)) {
//                 unitsData = data.unit;
//             }

//             setUnits(unitsData);
//         } catch (error) {
//             console.error("Error fetching units:", error);

//             if (
//                 !error.message?.includes("401") &&
//                 error.message !== "Failed to fetch"
//             ) {
//                 toast.error("❌ حدث خطأ أثناء جلب الوحدات");
//             }
//         } finally {
//             setLoading(false);
//         }
//     };

//     // =========================================================
//     // Initial fetch
//     // =========================================================
//     useEffect(() => {
//         fetchUnits();
//     }, []);

//     // =========================================================
//     // ✅ Updated Delete unit logic (Custom Modal)
//     // =========================================================
//     const handleConfirmDelete = async () => {
//         if (!confirmDelete) return;
//         setDeleting(true);

//         try {
//             const token = localStorage.getItem("access_token");

//             if (!token) {
//                 toast.error("يرجى تسجيل الدخول");
//                 setDeleting(false);
//                 return;
//             }

//             const response = await fetch(
//                 `${BASE}/api/units/${confirmDelete.id}/delete/`,
//                 {
//                     method: "DELETE",
//                     headers: {
//                         "Content-Type": "application/json",
//                         Authorization: `Bearer ${token}`,
//                     },
//                 }
//             );

//             const responseText = await response.text();

//             let data = null;

//             try {
//                 data = responseText ? JSON.parse(responseText) : null;
//             } catch {
//                 data = null;
//             }

//             if (!response.ok) {
//                 let message = "فشل حذف الوحدة";

//                 if (data && typeof data === "object") {
//                     message =
//                         data.detail || data.message || message;
//                 }

//                 throw new Error(message);
//             }

//             toast.success("✅ تم حذف الوحدة بنجاح");

//             setConfirmDelete(null); // Close modal
//             fetchUnits();
//         } catch (error) {
//             console.error("Error deleting unit:", error);

//             toast.error(
//                 `❌ ${error.message || "حدث خطأ أثناء حذف الوحدة"}`
//             );
//         } finally {
//             setDeleting(false);
//         }
//     };

//     // =========================================================
//     // Add
//     // =========================================================
//     const handleAdd = () => {
//         setSelectedUnit(null);
//         setShowAddModal(true);
//     };

//     // =========================================================
//     // Edit
//     // =========================================================
//     const handleEdit = (unit) => {
//         setSelectedUnit(unit);
//         setShowEditModal(true);
//     };

//     // =========================================================
//     // Details
//     // =========================================================
//     const handleDetails = (unit) => {
//         setSelectedUnit(unit);
//         setShowDetailModal(true);
//     };

//     // =========================================================
//     // Close all modals
//     // =========================================================
//     const handleModalClose = () => {
//         setShowAddModal(false);
//         setShowEditModal(false);
//         setShowDetailModal(false);
//         setSelectedUnit(null);
//     };

//     // =========================================================
//     // Success
//     // =========================================================
//     const handleSuccess = () => {
//         fetchUnits();
//     };

//     // =========================================================
//     // Get Category
//     // =========================================================
//     const getCategory = (unit) => {
//         return unit?.category_details || unit?.category || null;
//     };

//     // =========================================================
//     // Get Category Name
//     // =========================================================
//     const getCategoryName = (unit) => {
//         const category = getCategory(unit);

//         if (!category) return "-";

//         if (typeof category === "string") {
//             return category;
//         }

//         return (
//             category?.name ||
//             category?.title ||
//             category?.category_name ||
//             "-"
//         );
//     };

//     // =========================================================
//     // Get Owner From Category
//     // =========================================================
//     const getOwner = (unit) => {
//         const category = getCategory(unit);

//         if (!category || typeof category === "string") {
//             return null;
//         }

//         return category?.owner_details || category?.owner || null;
//     };

//     // =========================================================
//     // Get Owner Name
//     // =========================================================
//     const getOwnerName = (unit) => {
//         const owner = getOwner(unit);

//         if (!owner) return "-";

//         if (typeof owner === "string") {
//             return owner;
//         }

//         return (
//             owner?.name ||
//             owner?.full_name ||
//             owner?.owner_name ||
//             "-"
//         );
//     };

//     // =========================================================
//     // Get Owner Phone
//     // =========================================================
//     const getOwnerPhone = (unit) => {
//         const owner = getOwner(unit);

//         if (!owner || typeof owner === "string") {
//             return "";
//         }

//         return (
//             owner?.phone ||
//             owner?.mobile ||
//             owner?.phone_number ||
//             ""
//         );
//     };

//     // =========================================================
//     // Get Location From Category
//     // =========================================================
//     const getLocation = (unit) => {
//         const category = getCategory(unit);

//         if (!category || typeof category === "string") {
//             return "";
//         }

//         return (
//             category?.location || category?.location_name || ""
//         );
//     };

//     // =========================================================
//     // Residential Count
//     // =========================================================
//     const residentialCount = units.filter(
//         (unit) =>
//             unit?.category_details?.status === "residential" ||
//             unit?.category?.status === "residential"
//     ).length;

//     // =========================================================
//     // Commercial Count
//     // =========================================================
//     const commercialCount = units.filter(
//         (unit) =>
//             unit?.category_details?.status === "commercial" ||
//             unit?.category?.status === "commercial"
//     ).length;

//     // =========================================================
//     // Search + Status Filter
//     // =========================================================
//     const filteredUnits = units.filter((unit) => {
//         const category = getCategory(unit);

//         const categoryStatus =
//             category && typeof category === "object"
//                 ? category?.status
//                 : unit?.category_status ||
//                   unit?.status_type ||
//                   "";

//         if (categoryStatus !== selectedStatus) {
//             return false;
//         }

//         const search = searchTerm.trim().toLowerCase();

//         if (!search) return true;

//         const categoryName = getCategoryName(unit);
//         const ownerName = getOwnerName(unit);
//         const ownerPhone = getOwnerPhone(unit);
//         const location = getLocation(unit);
//         const unitType = unit.type || "";
//         const unitStatus = unit.status || "";
//         const unitKind = unit.kind || ""; 

//         return (
//             String(unit.name || "")
//                 .toLowerCase()
//                 .includes(search) ||
//             String(categoryName).toLowerCase().includes(search) ||
//             String(ownerName).toLowerCase().includes(search) ||
//             String(ownerPhone).toLowerCase().includes(search) ||
//             String(location).toLowerCase().includes(search) ||
//             String(unitType).toLowerCase().includes(search) ||
//             String(unitStatus).toLowerCase().includes(search) ||
//             String(unitKind).toLowerCase().includes(search) 
//         );
//     });

//     // =========================================================
//     // Format amount
//     // =========================================================
//     const formatAmount = (amount) => {
//         const number = Number(amount || 0);

//         return number.toLocaleString("en-US", {
//             minimumFractionDigits: 2,
//             maximumFractionDigits: 2,
//         });
//     };

//     // =========================================================
//     // Type label
//     // =========================================================
//     const getTypeLabel = (type) => {
//         const types = {
//             apartment: "شقة",
//             vila: "فيلا",
//             villa: "فيلا",
//             room: "غرفة",
//         };

//         return types[type] || type || "-";
//     };

//     // =========================================================
//     // Status badge
//     // =========================================================
//     const getStatusBadge = (status) => {
//         const statusConfig = {
//             available: {
//                 label: "متاحة",
//                 className: "bg-green-100 text-green-700",
//             },
//             occupied: {
//                 label: "مشغولة",
//                 className: "bg-red-100 text-red-700",
//             },
//             rented: {
//                 label: "مؤجرة",
//                 className: "bg-green-100 text-green-700",
//             },
//             sold: {
//                 label: "مباعة",
//                 className: "bg-purple-100 text-purple-700",
//             },
//             reserved: {
//                 label: "محجوزة",
//                 className: "bg-yellow-100 text-yellow-700",
//             },
//         };

//         const config = statusConfig[status];

//         if (!config) {
//             return (
//                 <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
//                     {status || "-"}
//                 </span>
//             );
//         }

//         return (
//             <span
//                 className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${config.className}`}
//             >
//                 {config.label}
//             </span>
//         );
//     };

//     // =========================================================
//     // Furnished status
//     // =========================================================
//     const getFurnishedLabel = (unit) => {
//         if (unit.furnished === true || unit.furnished === "furnished") {
//             return (
//                 <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-100 text-green-700">
//                     مفروشة
//                 </span>
//             );
//         }

//         if (unit.unfurnished === true || unit.furnished === "unfurnished") {
//             return (
//                 <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-700">
//                     غير مفروشة
//                 </span>
//             );
//         }

//         return (
//             <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-500">
//                 -
//             </span>
//         );
//     };

//     // =========================================================
//     // CARD VIEW
//     // =========================================================
//     const renderCardsView = () => (
//         <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-5 max-w-full sm:max-w-[1550px] mx-auto sm:mx-2 px-2 md:px-2">

//             {filteredUnits.map((unit) => {

//                 const categoryName = getCategoryName(unit);
//                 const ownerName = getOwnerName(unit);
//                 const location = getLocation(unit);

//                 return (
//                     <div
//                         key={unit.id}
//                         className="bg-white
//                             border border-[#e9e6e1]
//                             p-[5px] pt-[5px]
//                             rounded-xl shadow-md hover:shadow-xl
//                             transition-all duration-300
//                             overflow-hidden hover:-translate-y-1
//                             relative group"
//                     >

//                         {/* ✅ Delete button (top-left) - Bigger Icon */}
//                         <button
//                             onClick={() => setConfirmDelete(unit)}
//                             className="absolute cursor-pointer top-3 left-3 p-2 rounded-full transition-all duration-300 z-10 bg-red-50 hover:bg-red-100 hover:scale-110 active:scale-95"
//                             title="حذف الوحدة"
//                         >
//                             <MdDeleteForever className="text-red-500" size={25} />
//                         </button>

//                         {/* ✅ Edit button (top-right) - Bigger Icon & Green Color */}
//                         <button
//                             onClick={() => handleEdit(unit)}
//                             className="absolute cursor-pointer top-3 right-3 p-2 rounded-full bg-[#f8f7f5] hover:bg-green-50 hover:scale-110 active:scale-95 transition-all duration-300 z-10"
//                             title="تعديل الوحدة"
//                         >
//                             <CiEdit className="text-green-600" size={25} />
//                         </button>

//                         <div className="p-4 pt-0 pt-7 sm:pt-0 flex flex-col items-center text-center">

//                             {/* ============ IMAGE + NAME + CATEGORY (ONE ROW) ============ */}
//                             <div className="w-full flex gap-3 md:gap-10 items-center mb-4 md:px-20">

//                                 {/* ✅ Image Box — Removed border, unified bg, bigger building icon */}
//                                 <div className="w-20 h-20 sm:w-24 sm:h-20 md:w-20 md:h-20 lg:w-20 lg:h-20 rounded-sm flex items-center justify-center overflow-hidden shrink-0">
//                                     {unit.image_1 ? (
//                                         <img
//                                             src={unit.image_1}
//                                             alt={unit.name}
//                                             className="w-full h-[40px] object-cover"
//                                         />
//                                     ) : (
//                                         <FaBuilding
//                                             className="text-[#a47d52]"
//                                             size={30}
//                                         />
//                                     )}
//                                 </div>

//                                 {/* Name + Category */}
//                                 <div className="flex-1 min-w-0 text-right sm:text-left md:text-left lg:text-right">
//                                     <h3 className="text-base sm:text-lg font-extrabold text-[#7a5c3a] line-clamp-2">
//                                         {unit.name || "بدون اسم"}
//                                     </h3>

//                                     {categoryName && categoryName !== "-" && (
//                                         <p className="text-xs text-gray-500 mt-1 truncate">
//                                             {categoryName}
//                                         </p>
//                                     )}
//                                 </div>

//                             </div>

//                             {/* ============ INFO ROW — OWNER / LOCATION ============ */}
//                             <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-2 sm:gap-4 mb-4">
                                
//                                 {/* المالك Block */}
//                                 <div className="flex flex-col sm:flex-row items-center gap-1 w-full sm:w-1/2">
//                                     <span className="text-gray-500 font-bold text-[10px] sm:text-xs whitespace-nowrap">
//                                         المالك:
//                                     </span>
//                                     <span className="truncate text-gray-800 w-full text-center sm:text-right text-xs">
//                                         {ownerName || "-"}
//                                     </span>
//                                 </div>

//                                 {/* الموقع Block */}
//                                 <div className="flex flex-col sm:flex-row items-center gap-1 w-full sm:w-1/2">
//                                     <span className="text-gray-500 font-bold text-[10px] sm:text-xs whitespace-nowrap">
//                                         الموقع:
//                                     </span>
//                                     <span className="truncate text-gray-800 w-full text-center sm:text-right text-xs">
//                                         {location || "-"}
//                                     </span>
//                                 </div>

//                             </div>

//                             {/* ============ KIND & TYPE ============ */}
//                             <div className="w-full grid grid-cols-2 gap-2 mb-4">
//                                 <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1.5">
//                                     <p className="text-[10px] font-bold text-gray-500">
//                                         النوع (Kind):
//                                     </p>
//                                     <p className="font-extrabold text-gray-800 text-[11px]">
//                                         {unit.kind || "-"}
//                                     </p>
//                                 </div>
//                                 <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1.5">
//                                     <p className="text-[10px] font-bold text-gray-500">
//                                         نوع الوحدة:
//                                     </p>
//                                     <p className="font-extrabold text-gray-800 text-[11px]">
//                                         {getTypeLabel(unit.type)}
//                                     </p>
//                                 </div>
//                             </div>

//                             {/* ============ STATUS + PRICE ============ */}
//                             <div className="w-full grid grid-cols-2 gap-2 mb-4">

//                                 <div className="bg-blue-50 rounded-lg py-2 px-2 flex flex-col sm:flex-row sm:justify-between items-center">
//                                     <p className="text-[10px] font-bold text-blue-600 mb-1">
//                                         الحالة
//                                     </p>
//                                     {getStatusBadge(unit.status)}
//                                 </div>

//                                 <div className="bg-green-50 rounded-lg py-2 px-2 flex flex-col sm:flex-row sm:justify-between items-center">
//                                     <p className="text-[10px] font-bold text-green-600 mb-1">
//                                         السعر
//                                     </p>
//                                     <p
//                                         className="text-sm font-extrabold text-green-700"
//                                         dir="ltr"
//                                     >
//                                         {unit.price !== null &&
//                                         unit.price !== undefined
//                                             ? formatAmount(unit.price)
//                                             : "-"}
//                                     </p>
//                                 </div>

//                             </div>

//                             {/* ============ EXTRA DETAILS ============ */}
//                             <div className="w-full grid grid-cols-3 gap-1 mb-4">

//                                 {/* Bedrooms (✅ Bigger Icon, Smaller Text) */}
//                                 <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1">
//                                     <FaBed className="text-blue-400" size={25} />
//                                     <p className="text-gray-500 text-[9px]">
                                    
//                                     </p>
//                                     <p className="font-extrabold text-gray-800 text-[10px]">
//                                         {unit.bedrooms ?? "-"}
//                                     </p>
//                                 </div>

//                                 {/* Bathrooms (✅ Bigger Icon, Smaller Text) */}
//                                 <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1">
//                                     <FaBath className="text-green-500" size={20} />
//                                     <p className="text-gray-500 text-[9px]">
                                        
//                                     </p>
//                                     <p className="font-extrabold text-gray-800 text-[10px]">
//                                         {unit.bathrooms ?? "-"}
//                                     </p>
//                                 </div>

//                                 {/* Furnished (✅ Bigger Icon, Smaller Text) */}
//                                 <div className="bg-[#f8f7f5] rounded-lg py-1.5 flex flex-row items-center justify-center gap-1">
//                                     <FaCouch className="text-orange-400" size={20} />
//                                     <p className="text-gray-500 text-[9px]">
                                        
//                                     </p>
//                                     {getFurnishedLabel(unit)}
//                                 </div>

//                             </div>

//                             {/* ============ ACTIONS ============ */}
//                             <div className="w-full border-t border-gray-200 pt-4 mt-auto flex gap-2">

//                                 <button
//                                     onClick={() =>
//                                         handleDetails(unit)
//                                     }
//                                     className="flex-1 cursor-pointer shadow-lg bg-white text-[#a47d52] py-2.5 px-2 rounded-sm font-extrabold text-xs transition-all duration-300 hover:bg-[#f8f7f5] hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
//                                 >
//                                     <FiEye size={16} />
//                                     التفاصيل
//                                 </button>

//                                 <button
//                                     onClick={() => handleEdit(unit)}
//                                     className="flex-1 cursor-pointer bg-[linear-gradient(135deg,#5fb87f_0%,#52a46f_205%,#448a59_100%)] shadow-lg text-white py-2.5 px-2 rounded-sm font-extrabold text-xs transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
//                                 >
//                                     <CiEdit size={16} />
//                                     تعديل
//                                 </button>

//                             </div>

//                         </div>

//                     </div>
//                 );
//             })}

//         </div>
//     );

//     // =========================================================
//     // TABLE VIEW
//     // =========================================================
//     const renderTableView = () => (
//         <div className="max-w-full mx-auto px-2 md:px-2">

//             <div className="bg-white rounded-xl shadow-lg overflow-hidden">

//                 <div className="overflow-x-auto">

//                     <table className="w-full">

//                         <thead className="bg-[#e9e6e1] text-[#a47d52]">

//                             <tr>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     #
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     اسم الوحدة
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     التصنيف
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     المالك
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     الموقع
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     النوع
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     النوع (Kind)
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     الحالة
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     السعر
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     غرف
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     حمامات
//                                 </th>

//                                 <th className="px-6 py-4 text-right text-sm font-bold">
//                                     مفروشة
//                                 </th>

//                                 <th className="px-6 py-4 text-center text-sm font-bold">
//                                     الإجراءات
//                                 </th>

//                             </tr>

//                         </thead>

//                         <tbody>

//                             {filteredUnits.map((unit, index) => {

//                                 const categoryName =
//                                     getCategoryName(unit);

//                                 const ownerName =
//                                     getOwnerName(unit);

//                                 const location =
//                                     getLocation(unit);

//                                 return (
//                                     <tr
//                                         key={unit.id}
//                                         className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
//                                     >

//                                         <td className="px-6 py-4 text-right text-sm text-gray-700">
//                                             {index + 1}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">
//                                             {unit.name || "-"}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm text-gray-700">
//                                             {categoryName}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm text-gray-700">
//                                             {ownerName}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm text-gray-700">
//                                             {location || "-"}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm text-gray-700">
//                                             {getTypeLabel(unit.type)}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm text-gray-700 font-bold">
//                                             {unit.kind || "-"}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm">
//                                             {getStatusBadge(unit.status)}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm text-gray-700">
//                                             {unit.price !== null &&
//                                             unit.price !== undefined
//                                                 ? formatAmount(
//                                                       unit.price
//                                                   )
//                                                 : "-"}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm text-gray-700">
//                                             {unit.bedrooms ?? "-"}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm text-gray-700">
//                                             {unit.bathrooms ?? "-"}
//                                         </td>

//                                         <td className="px-6 py-4 text-right text-sm">
//                                             {getFurnishedLabel(unit)}
//                                         </td>

//                                         <td className="px-6 py-4 text-center">

//                                             <div className="flex justify-center gap-1">

//                                                 <button
//                                                     type="button"
//                                                     onClick={() =>
//                                                         handleDetails(unit)
//                                                     }
//                                                     className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
//                                                     title="التفاصيل"
//                                                 >
//                                                     <FiEye
//                                                         className="text-[#a47d52]"
//                                                         size={21}
//                                                     />
//                                                 </button>

//                                                 <button
//                                                     type="button"
//                                                     onClick={() =>
//                                                         handleEdit(unit)
//                                                     }
//                                                     className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
//                                                     title="تعديل"
//                                                 >
//                                                     <CiEdit
//                                                         className="text-green-600"
//                                                         size={22}
//                                                     />
//                                                 </button>

//                                                 <button
//                                                     type="button"
//                                                     onClick={() =>
//                                                         setConfirmDelete(unit)
//                                                     }
//                                                     className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
//                                                     title="حذف"
//                                                 >
//                                                     <MdDeleteForever
//                                                         className="text-red-600"
//                                                         size={22}
//                                                     />
//                                                 </button>

//                                             </div>

//                                         </td>

//                                     </tr>
//                                 );
//                             })}

//                         </tbody>

//                     </table>

//                 </div>

//             </div>

//         </div>
//     );

//     return (
//         <div
//             className="min-h-screen bg-[#f8f7f5] py-6 px-2 md:py-8 md:px-3 lg:py-5 lg:px-2 rtl"
//             dir="rtl"
//         >
//             <Toaster position="top-center" reverseOrder={false} />

//             {/* HEADER */}
//             <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-2 md:px-2 mb-6 md:mb-8 lg:mb-10 gap-4 lg:shadow-lg">

//                 <div className="text-center sm:text-right">

//                     <div className="flex items-center gap-3">

//                         <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[#e9e6e1] items-center justify-center">

//                             <FaBuilding
//                                 className="text-[#a47d52]"
//                                 size={24}
//                             />

//                         </div>

//                         <div>

//                             <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 tracking-wide">
//                                 إدارة الوحدات
//                             </h2>

//                             <p className="text-base md:text-lg text-gray-600 mt-1">
//                                 إدارة الوحدات العقارية وبياناتها
//                             </p>

//                         </div>

//                     </div>

//                 </div>

//                 <div className="flex flex-col sm:flex-row gap-3">

//                     <button
//                         type="button"
//                         onClick={handleAdd}
//                         className="flex items-center justify-center gap-2 bg-[#a47d52] cursor-pointer text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
//                     >
//                         <FiPlus size={20} />
//                         إضافة وحدة
//                     </button>

//                     <button
//                         type="button"
//                         onClick={() => navigate("/ar-category")}
//                         className="flex items-center justify-center gap-2 bg-green-600 cursor-pointer text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
//                     >
//                         <GiVillage size={20} />
//                         البنايات والفلل
//                     </button>

//                     <button
//                         type="button"
//                         onClick={fetchUnits}
//                         disabled={loading}
//                         className="flex items-center justify-center gap-2 bg-[#6c7a89] cursor-pointer text-white px-5 py-3 rounded-full font-extrabold transition-all duration-300 hover:bg-[#5a6775] hover:scale-105 disabled:opacity-50"
//                     >
//                         <FiRefreshCw
//                             size={18}
//                             className={loading ? "animate-spin" : ""}
//                         />
//                     </button>

//                 </div>

//             </div>

//             {/* SEARCH + STATUS FILTER + VIEW TOGGLE */}
//             <div className="max-w-full mx-auto px-2 md:px-2 mb-5">

//                 <div className="flex flex-col md:flex-row gap-4 items-center">

//                     <div className="relative w-full md:flex-1">

//                         <FiSearch
//                             className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
//                             size={20}
//                         />

//                         <input
//                             type="text"
//                             placeholder="بحث باسم الوحدة أو المالك أو التصنيف أو الموقع أو النوع أو الحالة..."
//                             className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white text-right"
//                             value={searchTerm}
//                             onChange={(e) =>
//                                 setSearchTerm(e.target.value)
//                             }
//                         />

//                     </div>

//                     <div className="w-full md:w-auto flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">

//                         <button
//                             type="button"
//                             onClick={() => setViewMode("cards")}
//                             className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${
//                                 viewMode === "cards"
//                                     ? "bg-[#a47d52] text-white shadow-md"
//                                     : "text-gray-600 hover:bg-[#f8f7f5]"
//                             }`}
//                             title="عرض البطاقات"
//                         >
//                             <FiGrid size={18} />
                            
//                         </button>

//                         <button
//                             type="button"
//                             onClick={() => setViewMode("table")}
//                             className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${
//                                 viewMode === "table"
//                                     ? "bg-[#a47d52] text-white shadow-md"
//                                     : "text-gray-600 hover:bg-[#f8f7f5]"
//                             }`}
//                             title="عرض الجدول"
//                         >
//                             <FiList size={18} />
                        
//                         </button>

//                     </div>

//                 </div>

//                 {/* Status buttons */}
//                 <div className="w-full flex flex-col sm:flex-row gap-3 justify-start mt-4">

//                     <button
//                         type="button"
//                         onClick={() =>
//                             setSelectedStatus("residential")
//                         }
//                         className={`
//                             flex items-center justify-center gap-3
//                             min-w-[220px]
//                             px-6 py-3
//                             rounded-xl
//                             border-2
//                             cursor-pointer
//                             font-extrabold
//                             transition-all duration-300
//                             ${
//                                 selectedStatus === "residential"
//                                     ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.02]"
//                                     : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
//                             }
//                         `}
//                     >
//                         <FiHome size={21} />

//                         <span>سكني</span>

//                         <span
//                             className={`
//                                 px-2 py-0.5 rounded-full text-xs
//                                 ${
//                                     selectedStatus === "residential"
//                                         ? "bg-white/20 text-white"
//                                         : "bg-white text-emerald-700"
//                                 }
//                             `}
//                         >
//                             {residentialCount}
//                         </span>
//                     </button>

//                     <button
//                         type="button"
//                         onClick={() =>
//                             setSelectedStatus("commercial")
//                         }
//                         className={`
//                             flex items-center justify-center gap-3
//                             min-w-[220px]
//                             px-6 py-3
//                             rounded-xl
//                             border-2
//                             cursor-pointer
//                             font-extrabold                            transition-all duration-300
//                             ${
//                                 selectedStatus === "commercial"
//                                     ? "bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]"
//                                     : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
//                             }
//                         `}
//                     >
//                         <FiBriefcase size={21} />

//                         <span>تجاري</span>

//                         <span
//                             className={`
//                                 px-2 py-0.5 rounded-full text-xs
//                                 ${
//                                     selectedStatus === "commercial"
//                                         ? "bg-white/20 text-white"
//                                         : "bg-white text-indigo-700"
//                                 }
//                             `}
//                         >
//                             {commercialCount}
//                         </span>
//                     </button>

//                 </div>

//             </div>

//             {/* CONTENT */}
//             {loading ? (

//                 <div className="flex justify-center items-center py-20">

//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />

//                 </div>

//             ) : filteredUnits.length === 0 ? (

//                 <div className="max-w-full mx-auto px-2 md:px-2">

//                     <div className="bg-white rounded-xl shadow-lg text-center py-20">

//                         <FaBuilding
//                             className="mx-auto text-gray-300 mb-4"
//                             size={50}
//                         />

//                         <p className="text-gray-500 text-lg">
//                             لا توجد وحدات
//                         </p>

//                         <p className="text-gray-400 text-sm mt-2">
//                             قم بإضافة وحدة جديدة
//                         </p>

//                         <button
//                             type="button"
//                             onClick={handleAdd}
//                             className="mt-5 bg-[#a47d52] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8a6a44] transition cursor-pointer"
//                         >
//                             + إضافة وحدة
//                         </button>

//                     </div>

//                 </div>

//             ) : viewMode === "cards" ? (
//                 renderCardsView()
//             ) : (
//                 renderTableView()
//             )}

//             {/* ADD UNIT */}
//             {showAddModal && (
//                 <AddUnit
//                     onClose={handleModalClose}
//                     onSuccess={handleSuccess}
//                 />
//             )}

//             {/* EDIT UNIT */}
//             {showEditModal && selectedUnit && (
//                 <EditUnit
//                     unitId={selectedUnit.id}
//                     onClose={handleModalClose}
//                     onSuccess={handleSuccess}
//                 />
//             )}

//             {/* DETAILS */}
//             {showDetailModal && selectedUnit && (
//                 <DetailUnit
//                     unitData={selectedUnit}
//                     onClose={handleModalClose}
//                 />
//             )}

//             {/* ✅ CUSTOM DELETE CONFIRMATION MODAL */}
//             {confirmDelete && (
//                 <div
//                     className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
//                     onClick={(e) => {
//                         if (e.target === e.currentTarget && !deleting)
//                             setConfirmDelete(null);
//                     }}
//                 >
//                     <div
//                         className="w-full max-w-md bg-white rounded-2xl shadow-[0_25px_80px_rgba(0,0,0,0.3)] overflow-hidden"
//                         style={{ animation: "modalIn 0.25s ease-out" }}
//                     >
//                         <div className="h-1.5 bg-gradient-to-r from-red-400 via-red-500 to-red-400" />

//                         <div className="flex justify-center pt-6">
//                             <div className="relative">
//                                 <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl animate-pulse" />
//                                 <div className="relative w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
//                                     <FaExclamationTriangle
//                                         className="text-red-500"
//                                         size={28}
//                                     />
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="px-6 pt-4 pb-6 text-center">
//                             <h3 className="text-xl font-extrabold text-gray-800 mb-2">
//                                 تأكيد الحذف
//                             </h3>
//                             <p className="text-sm text-gray-600 leading-relaxed mb-4">
//                                 هل أنت متأكد من حذف هذه الوحدة؟
//                                 <br />
//                                 <span className="font-extrabold text-gray-800 mt-1 inline-block">
//                                     {confirmDelete.name || "وحدة بدون اسم"}
//                                 </span>
//                             </p>

//                             <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 mb-4">
//                                 <p className="text-xs text-red-700 font-bold">
//                                     ⚠️ لا يمكن التراجع عن هذا الإجراء
//                                 </p>
//                             </div>

//                             <div className="flex flex-col md:flex-row gap-3">
//                                 <button
//                                     onClick={handleConfirmDelete}
//                                     disabled={deleting}
//                                     className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-red-600 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
//                                 >
//                                     {deleting ? (
//                                         <>
//                                             <svg
//                                                 className="animate-spin h-4 w-4 text-white"
//                                                 xmlns="http://www.w3.org/2000/svg"
//                                                 fill="none"
//                                                 viewBox="0 0 24 24"
//                                             >
//                                                 <circle
//                                                     className="opacity-25"
//                                                     cx="12"
//                                                     cy="12"
//                                                     r="10"
//                                                     stroke="currentColor"
//                                                     strokeWidth="4"
//                                                 />
//                                                 <path
//                                                     className="opacity-75"
//                                                     fill="currentColor"
//                                                     d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//                                                 />
//                                             </svg>
//                                             جاري الحذف...
//                                         </>
//                                     ) : (
//                                         <>
//                                             <FaTrash size={14} />
//                                             نعم، احذف
//                                         </>
//                                     )}
//                                 </button>

//                                 <button
//                                     onClick={() => setConfirmDelete(null)}
//                                     disabled={deleting}
//                                     className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-extrabold px-5 py-3 rounded-xl transition-all duration-300 hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
//                                 >
//                                     إلغاء
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}

//             <style>{`
//                 @keyframes modalIn {
//                     from { opacity: 0; transform: scale(0.95) translateY(15px); }
//                     to   { opacity: 1; transform: scale(1) translateY(0); }
//                 }
//             `}</style>

//         </div>
//     );
// };

// export default Unit;

