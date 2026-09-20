import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AddUnit from "../../components/ar/propertymanagement/AddUnit";
import EditUnit from "../../components/ar/propertymanagement/EditUnit";
import DetailUnit from "../../components/ar/propertymanagement/DetailUnit";

import { GiVillage } from "react-icons/gi";
import { CiEdit } from "react-icons/ci";
import { MdDeleteForever } from "react-icons/md";

import {
    FiEye,
    FiPlus,
    FiSearch,
    FiRefreshCw,
    FiHome,
    FiBriefcase,
} from "react-icons/fi";

import { FaBuilding } from "react-icons/fa";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const Unit = () => {
    const navigate = useNavigate();

    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showAddModal, setShowAddModal] =
        useState(false);

    const [showEditModal, setShowEditModal] =
        useState(false);

    const [showDetailModal, setShowDetailModal] =
        useState(false);

    const [selectedUnit, setSelectedUnit] =
        useState(null);

    const [searchTerm, setSearchTerm] =
        useState("");

    // =========================================================
    // Status filter
    // Default = Residential
    // =========================================================
    const [selectedStatus, setSelectedStatus] =
        useState("residential");

    // =========================================================
    // Fetch all units
    // =========================================================
    const fetchUnits = async () => {
        setLoading(true);

        try {
            const token =
                localStorage.getItem(
                    "access_token"
                );

            if (!token) {
                toast.error(
                    "يرجى تسجيل الدخول"
                );
                return;
            }

            const response = await fetch(
                `${BASE}/api/units/`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                if (
                    response.status === 401
                ) {
                    toast.error(
                        "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى"
                    );
                } else {
                    toast.error(
                        "فشل تحميل الوحدات"
                    );
                }

                throw new Error(
                    `HTTP error! status: ${response.status}`
                );
            }

            const data =
                await response.json();

            console.log(
                "Fetched units:",
                data
            );

            /*
             * API may return:
             *
             * [
             *   ...
             * ]
             *
             * OR:
             *
             * {
             *   results: [...]
             * }
             *
             * OR:
             *
             * {
             *   units: [...]
             * }
             */

            let unitsData = [];

            if (Array.isArray(data)) {
                unitsData = data;
            } else if (
                Array.isArray(
                    data.results
                )
            ) {
                unitsData =
                    data.results;
            } else if (
                Array.isArray(
                    data.units
                )
            ) {
                unitsData =
                    data.units;
            } else if (
                Array.isArray(
                    data.unit
                )
            ) {
                unitsData =
                    data.unit;
            }

            setUnits(unitsData);
        } catch (error) {
            console.error(
                "Error fetching units:",
                error
            );

            if (
                !error.message?.includes(
                    "401"
                ) &&
                error.message !==
                    "Failed to fetch"
            ) {
                toast.error(
                    "❌ حدث خطأ أثناء جلب الوحدات"
                );
            }
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // Initial fetch
    // =========================================================
    useEffect(() => {
        fetchUnits();
    }, []);

    // =========================================================
    // Delete unit
    // =========================================================
    const handleDelete = async (id) => {
        const confirmed =
            window.confirm(
                "هل أنت متأكد من حذف هذه الوحدة؟"
            );

        if (!confirmed) return;

        try {
            const token =
                localStorage.getItem(
                    "access_token"
                );

            if (!token) {
                toast.error(
                    "يرجى تسجيل الدخول"
                );
                return;
            }

            const response =
                await fetch(
                    `${BASE}/api/units/${id}/delete/`,
                    {
                        method: "DELETE",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

            const responseText =
                await response.text();

            let data = null;

            try {
                data = responseText
                    ? JSON.parse(
                          responseText
                      )
                    : null;
            } catch {
                data = null;
            }

            if (!response.ok) {
                let message =
                    "فشل حذف الوحدة";

                if (
                    data &&
                    typeof data ===
                        "object"
                ) {
                    message =
                        data.detail ||
                        data.message ||
                        message;
                }

                throw new Error(message);
            }

            toast.success(
                "✅ تم حذف الوحدة بنجاح"
            );

            fetchUnits();
        } catch (error) {
            console.error(
                "Error deleting unit:",
                error
            );

            toast.error(
                `❌ ${
                    error.message ||
                    "حدث خطأ أثناء حذف الوحدة"
                }`
            );
        }
    };

    // =========================================================
    // Add
    // =========================================================
    const handleAdd = () => {
        setSelectedUnit(null);
        setShowAddModal(true);
    };

    // =========================================================
    // Edit
    // =========================================================
    const handleEdit = (unit) => {
        setSelectedUnit(unit);
        setShowEditModal(true);
    };

    // =========================================================
    // Details
    // =========================================================
    const handleDetails = (unit) => {
        setSelectedUnit(unit);
        setShowDetailModal(true);
    };

    // =========================================================
    // Close all modals
    // =========================================================
    const handleModalClose = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowDetailModal(false);
        setSelectedUnit(null);
    };

    // =========================================================
    // Success
    // =========================================================
    const handleSuccess = () => {
        fetchUnits();
    };

    // =========================================================
    // Get Category
    // =========================================================
    const getCategory = (unit) => {
        return (
            unit?.category_details ||
            unit?.category ||
            null
        );
    };

    // =========================================================
    // Get Category Name
    // =========================================================
    const getCategoryName = (unit) => {
        const category =
            getCategory(unit);

        if (!category) {
            return "-";
        }

        if (
            typeof category ===
            "string"
        ) {
            return category;
        }

        return (
            category?.name ||
            category?.title ||
            category?.category_name ||
            "-"
        );
    };

    // =========================================================
    // Get Owner From Category
    // =========================================================
    const getOwner = (unit) => {
        const category =
            getCategory(unit);

        if (
            !category ||
            typeof category ===
                "string"
        ) {
            return null;
        }

        return (
            category?.owner_details ||
            category?.owner ||
            null
        );
    };

    // =========================================================
    // Get Owner Name
    // =========================================================
    const getOwnerName = (unit) => {
        const owner =
            getOwner(unit);

        if (!owner) {
            return "-";
        }

        if (
            typeof owner ===
            "string"
        ) {
            return owner;
        }

        return (
            owner?.name ||
            owner?.full_name ||
            owner?.owner_name ||
            "-"
        );
    };

    // =========================================================
    // Get Owner Phone
    // =========================================================
    const getOwnerPhone = (unit) => {
        const owner =
            getOwner(unit);

        if (
            !owner ||
            typeof owner ===
                "string"
        ) {
            return "";
        }

        return (
            owner?.phone ||
            owner?.mobile ||
            owner?.phone_number ||
            ""
        );
    };

    // =========================================================
    // Get Location From Category
    // =========================================================
    const getLocation = (unit) => {
        const category =
            getCategory(unit);

        if (
            !category ||
            typeof category ===
                "string"
        ) {
            return "";
        }

        return (
            category?.location ||
            category?.location_name ||
            ""
        );
    };

    // =========================================================
    // Residential Count
    // =========================================================
    const residentialCount =
        units.filter(
            (unit) =>
                unit?.category_details
                    ?.status ===
                    "residential" ||
                unit?.category?.status ===
                    "residential"
        ).length;

    // =========================================================
    // Commercial Count
    // =========================================================
    const commercialCount =
        units.filter(
            (unit) =>
                unit?.category_details
                    ?.status ===
                    "commercial" ||
                unit?.category?.status ===
                    "commercial"
        ).length;

    // =========================================================
    // Search + Status Filter
    // =========================================================
    const filteredUnits =
        units.filter((unit) => {
            // ---------------------------------------------
            // Get category
            // ---------------------------------------------
            const category =
                getCategory(unit);

            const categoryStatus =
                category &&
                typeof category ===
                    "object"
                    ? category?.status
                    : unit?.category_status ||
                      unit?.status_type ||
                      "";

            // ---------------------------------------------
            // Status filter
            // ---------------------------------------------
            if (
                categoryStatus !==
                selectedStatus
            ) {
                return false;
            }

            // ---------------------------------------------
            // Search
            // ---------------------------------------------
            const search =
                searchTerm
                    .trim()
                    .toLowerCase();

            if (!search) {
                return true;
            }

            const categoryName =
                getCategoryName(unit);

            const ownerName =
                getOwnerName(unit);

            const ownerPhone =
                getOwnerPhone(unit);

            const location =
                getLocation(unit);

            const unitType =
                unit.type || "";

            const unitStatus =
                unit.status || "";

            return (
                String(
                    unit.name || ""
                )
                    .toLowerCase()
                    .includes(search) ||

                String(categoryName)
                    .toLowerCase()
                    .includes(search) ||

                String(ownerName)
                    .toLowerCase()
                    .includes(search) ||

                String(ownerPhone)
                    .toLowerCase()
                    .includes(search) ||

                String(location)
                    .toLowerCase()
                    .includes(search) ||

                String(unitType)
                    .toLowerCase()
                    .includes(search) ||

                String(unitStatus)
                    .toLowerCase()
                    .includes(search)
            );
        });

    // =========================================================
    // Format amount
    // =========================================================
    const formatAmount = (amount) => {
        const number =
            Number(amount || 0);

        return number.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        );
    };

    // =========================================================
    // Type label
    // =========================================================
    const getTypeLabel = (type) => {
        const types = {
            apartment: "شقة",
            vila: "فيلا",
            villa: "فيلا",
            room: "غرفة",
        };

        return (
            types[type] ||
            type ||
            "-"
        );
    };

    // =========================================================
    // Status badge
    // =========================================================
    const getStatusBadge = (status) => {
        const statusConfig = {
            available: {
                label: "متاحة",
                className:
                    "bg-blue-100 text-blue-700",
            },

            occupied: {
                label: "مشغولة",
                className:
                    "bg-red-100 text-red-700",
            },

            rented: {
                label: "مؤجرة",
                className:
                    "bg-green-100 text-green-700",
            },

            sold: {
                label: "مباعة",
                className:
                    "bg-purple-100 text-purple-700",
            },

            reserved: {
                label: "محجوزة",
                className:
                    "bg-yellow-100 text-yellow-700",
            },
        };

        const config =
            statusConfig[status];

        if (!config) {
            return (
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                    {status || "-"}
                </span>
            );
        }

        return (
            <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${config.className}`}
            >
                {config.label}
            </span>
        );
    };

    // =========================================================
    // Furnished status
    // =========================================================
    const getFurnishedLabel = (unit) => {
        if (
            unit.furnished === true
        ) {
            return (
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    مفروشة
                </span>
            );
        }

        if (
            unit.unfurnished === true
        ) {
            return (
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                    غير مفروشة
                </span>
            );
        }

        return (
            <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                -
            </span>
        );
    };

    return (
        <div
            className="min-h-screen bg-[#f8f7f5] py-10 px-5 md:py-12 md:px-8 lg:py-5 lg:px-0 rtl"
            dir="rtl"
        >
            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={true}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />

            {/* =====================================================
                HEADER
            ====================================================== */}
            <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-4 md:px-3 mb-8 md:mb-10 lg:mb-12 gap-4 lg:shadow-lg">

                <div className="text-center sm:text-right">

                    <div className="flex items-center gap-3">

                        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[#e9e6e1] items-center justify-center">

                            <FaBuilding
                                className="text-[#a47d52]"
                                size={24}
                            />

                        </div>

                        <div>

                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 tracking-wide">
                                إدارة الوحدات
                            </h2>

                            <p className="text-base md:text-lg text-gray-600 mt-1">
                                إدارة الوحدات العقارية وبياناتها
                            </p>

                        </div>

                    </div>

                </div>

                <div className="flex flex-col sm:flex-row gap-3">

                    {/* Add */}
                    <button
                        type="button"
                        onClick={
                            handleAdd
                        }
                        className="flex items-center justify-center gap-2 bg-[#a47d52] cursor-pointer text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        <FiPlus size={20} />
                        إضافة وحدة
                    </button>

                    {/* Categories */}
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/ar-category"
                            )
                        }
                        className="flex items-center justify-center gap-2 bg-green-600 cursor-pointer text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        <GiVillage
                            size={20}
                        />
                        البنايات والفلل
                    </button>

                    {/* Refresh */}
                    <button
                        type="button"
                        onClick={
                            fetchUnits
                        }
                        disabled={
                            loading
                        }
                        className="flex items-center justify-center gap-2 bg-[#6c7a89] cursor-pointer text-white px-5 py-3 rounded-full font-extrabold transition-all duration-300 hover:bg-[#5a6775] hover:scale-105 disabled:opacity-50"
                    >
                        <FiRefreshCw
                            size={18}
                            className={
                                loading
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                    </button>

                </div>

            </div>

            {/* =====================================================
                SEARCH + STATUS FILTER
            ====================================================== */}
            <div className="max-w-full mx-auto px-4 md:px-3 mb-6">

                <div className="flex flex-col md:flex-row gap-4 items-center">

                    {/* Search */}
                    <div className="relative w-full md:flex-1">

                        <FiSearch
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            size={20}
                        />

                        <input
                            type="text"
                            placeholder="بحث باسم الوحدة أو المالك أو التصنيف أو الموقع أو النوع أو الحالة..."
                            className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white text-right"
                            value={
                                searchTerm
                            }
                            onChange={(e) =>
                                setSearchTerm(
                                    e.target
                                        .value
                                )
                            }
                        />

                    </div>

                    {/* Status buttons - LEFT SIDE */}
                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 justify-start">

                        {/* Residential */}
                        <button
                            type="button"
                            onClick={() =>
                                setSelectedStatus(
                                    "residential"
                                )
                            }
                            className={`
                                flex items-center justify-center gap-3
                                min-w-[220px]
                                px-6 py-3
                                rounded-xl
                                border-2
                                cursor-pointer
                                font-extrabold
                                transition-all duration-300
                                ${
                                    selectedStatus ===
                                    "residential"
                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.02]"
                                        : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                }
                            `}
                        >
                            <FiHome
                                size={21}
                            />

                            <span>
                                سكني
                            </span>

                            <span
                                className={`
                                    px-2 py-0.5 rounded-full text-xs
                                    ${
                                        selectedStatus ===
                                        "residential"
                                            ? "bg-white/20 text-white"
                                            : "bg-white text-emerald-700"
                                    }
                                `}
                            >
                                {
                                    residentialCount
                                }
                            </span>
                        </button>

                        {/* Commercial */}
                        <button
                            type="button"
                            onClick={() =>
                                setSelectedStatus(
                                    "commercial"
                                )
                            }
                            className={`
                                flex items-center justify-center gap-3
                                min-w-[220px]
                                px-6 py-3
                                rounded-xl
                                border-2
                                cursor-pointer
                                font-extrabold
                                transition-all duration-300
                                ${
                                    selectedStatus ===
                                    "commercial"
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]"
                                        : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                }
                            `}
                        >
                            <FiBriefcase
                                size={21}
                            />

                            <span>
                                تجاري
                            </span>

                            <span
                                className={`
                                    px-2 py-0.5 rounded-full text-xs
                                    ${
                                        selectedStatus ===
                                        "commercial"
                                            ? "bg-white/20 text-white"
                                            : "bg-white text-indigo-700"
                                    }
                                `}
                            >
                                {
                                    commercialCount
                                }
                            </span>
                        </button>

                    </div>

                </div>

            </div>

            {/* =====================================================
                TABLE
            ====================================================== */}
            <div className="max-w-full mx-auto px-4 md:px-3">

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">

                    {/* Loading */}
                    {loading ? (

                        <div className="flex justify-center items-center py-20">

                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />

                        </div>

                    ) : filteredUnits.length === 0 ? (

                        /* Empty */
                        <div className="text-center py-20">

                            <FaBuilding
                                className="mx-auto text-gray-300 mb-4"
                                size={50}
                            />

                            <p className="text-gray-500 text-lg">
                                لا توجد وحدات
                            </p>

                            <p className="text-gray-400 text-sm mt-2">
                                قم بإضافة وحدة جديدة
                            </p>

                            <button
                                type="button"
                                onClick={
                                    handleAdd
                                }
                                className="mt-5 bg-[#a47d52] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8a6a44] transition"
                            >
                                + إضافة وحدة
                            </button>

                        </div>

                    ) : (

                        /* Table */
                        <div className="overflow-x-auto">

                            <table className="w-full">

                                <thead className="bg-[#e9e6e1] text-[#a47d52]">

                                    <tr>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            #
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            اسم الوحدة
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            التصنيف
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            المالك
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            الموقع
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            النوع
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            الحالة
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            السعر
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            غرف
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            حمامات
                                        </th>

                                        <th className="px-6 py-4 text-right text-sm font-bold">
                                            مفروشة
                                        </th>

                                        <th className="px-6 py-4 text-center text-sm font-bold">
                                            الإجراءات
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {filteredUnits.map(
                                        (
                                            unit,
                                            index
                                        ) => {

                                            const categoryName =
                                                getCategoryName(
                                                    unit
                                                );

                                            const ownerName =
                                                getOwnerName(
                                                    unit
                                                );

                                            const location =
                                                getLocation(
                                                    unit
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        unit.id
                                                    }
                                                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                                                >

                                                    {/* Number */}
                                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                                        {
                                                            index +
                                                            1
                                                        }
                                                    </td>

                                                    {/* Unit name */}
                                                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">
                                                        {
                                                            unit.name ||
                                                            "-"
                                                        }
                                                    </td>

                                                    {/* Category */}
                                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                                        {
                                                            categoryName
                                                        }
                                                    </td>

                                                    {/* Owner */}
                                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                                        {
                                                            ownerName
                                                        }
                                                    </td>

                                                    {/* Location */}
                                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                                        {
                                                            location ||
                                                            "-"
                                                        }
                                                    </td>

                                                    {/* Type */}
                                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                                        {getTypeLabel(
                                                            unit.type
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-6 py-4 text-right text-sm">
                                                        {getStatusBadge(
                                                            unit.status
                                                        )}
                                                    </td>

                                                    {/* Price */}
                                                    <td className="px-6 py-4 text-right text-sm text-gray-700">

                                                        {unit.price !==
                                                            null &&
                                                        unit.price !==
                                                            undefined
                                                            ? formatAmount(
                                                                  unit.price
                                                              )
                                                            : "-"}

                                                    </td>

                                                    {/* Bedrooms */}
                                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                                        {
                                                            unit.bedrooms ??
                                                            "-"
                                                        }
                                                    </td>

                                                    {/* Bathrooms */}
                                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                                        {
                                                            unit.bathrooms ??
                                                            "-"
                                                        }
                                                    </td>

                                                    {/* Furnished */}
                                                    <td className="px-6 py-4 text-right text-sm">
                                                        {getFurnishedLabel(
                                                            unit
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-6 py-4 text-center">

                                                        <div className="flex justify-center gap-1">

                                                            {/* Details */}
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDetails(
                                                                        unit
                                                                    )
                                                                }
                                                                className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
                                                                title="التفاصيل"
                                                            >
                                                                <FiEye
                                                                    className="text-[#a47d52]"
                                                                    size={
                                                                        21
                                                                    }
                                                                />
                                                            </button>

                                                            {/* Edit */}
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleEdit(
                                                                        unit
                                                                    )
                                                                }
                                                                className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
                                                                title="تعديل"
                                                            >
                                                                <CiEdit
                                                                    className="text-green-600"
                                                                    size={
                                                                        22
                                                                    }
                                                                />
                                                            </button>

                                                            {/* Delete */}
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        unit.id
                                                                    )
                                                                }
                                                                className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
                                                                title="حذف"
                                                            >
                                                                <MdDeleteForever
                                                                    className="text-red-600"
                                                                    size={
                                                                        22
                                                                    }
                                                                />
                                                            </button>

                                                        </div>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </div>

            {/* =====================================================
                ADD UNIT
            ====================================================== */}
            {showAddModal && (
                <AddUnit
                    onClose={
                        handleModalClose
                    }
                    onSuccess={
                        handleSuccess
                    }
                />
            )}

            {/* =====================================================
                EDIT UNIT
            ====================================================== */}
            {showEditModal &&
                selectedUnit && (
                    <EditUnit
                        unitData={
                            selectedUnit
                        }
                        onClose={
                            handleModalClose
                        }
                        onSuccess={
                            handleSuccess
                        }
                    />
                )}

            {/* =====================================================
                DETAILS
            ====================================================== */}
            {showDetailModal &&
                selectedUnit && (
                    <DetailUnit
                        unitData={
                            selectedUnit
                        }
                        onClose={
                            handleModalClose
                        }
                    />
                )}

        </div>
    );
};

export default Unit;
