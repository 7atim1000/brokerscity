import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AddRental from "../../components/ar/propertymanagement/AddRental";
import EditRental from "../../components/ar/propertymanagement/EditRental";
import DetailRental from "../../components/ar/propertymanagement/DetailRental";

import { CiEdit } from "react-icons/ci";
import { MdDeleteForever } from "react-icons/md";
import {
    FiEye,
    FiPlus,
    FiSearch,
    FiRefreshCw,
    FiGrid,
    FiList,
    FiPhone,
    FiMail,
    FiUser,
    FiCreditCard,
    FiGlobe,
    FiHash,
    FiShield,
} from "react-icons/fi";
import {
    FaUserTie,
    FaMoneyBillWave,
    FaUserCircle,
} from "react-icons/fa";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const Rental = () => {
    const [rentals, setRentals] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [selectedRental, setSelectedRental] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");

    // =========================================================
    // View mode: "cards" (default) or "table"
    // =========================================================
    const [viewMode, setViewMode] = useState("cards");

    /* =========================================================
       FETCH ALL RENTALS
    ========================================================= */

    const fetchRentals = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem("access_token");

            if (!token) {
                toast.error("يرجى تسجيل الدخول");
                return;
            }

            const response = await fetch(`${BASE}/api/rentals/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error(
                        "انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى"
                    );
                } else {
                    toast.error("فشل تحميل المستأجرين");
                }

                throw new Error(
                    `HTTP error! status: ${response.status}`
                );
            }

            const data = await response.json();

            let rentalsData = [];

            if (Array.isArray(data)) {
                rentalsData = data;
            } else if (Array.isArray(data.results)) {
                rentalsData = data.results;
            } else if (Array.isArray(data.rentals)) {
                rentalsData = data.rentals;
            } else if (Array.isArray(data.rental)) {
                rentalsData = data.rental;
            }

            setRentals(rentalsData);
        } catch (error) {
            console.error("Error fetching rentals:", error);

            if (
                !error.message?.includes("401") &&
                error.message !== "Failed to fetch"
            ) {
                toast.error("❌ حدث خطأ أثناء جلب المستأجرين");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRentals();
    }, []);

    /* =========================================================
       DELETE
    ========================================================= */

    const handleDelete = async (id, name) => {
        const confirmed = window.confirm(
            `هل أنت متأكد من حذف المستأجر "${name || ""}"؟`
        );

        if (!confirmed) return;

        try {
            const token = localStorage.getItem("access_token");

            if (!token) {
                toast.error("يرجى تسجيل الدخول");
                return;
            }

            const response = await fetch(
                `${BASE}/api/rentals/${id}/delete/`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const responseText = await response.text();

            let data = null;

            try {
                data = responseText ? JSON.parse(responseText) : null;
            } catch {
                data = null;
            }

            if (!response.ok) {
                let message = "فشل حذف المستأجر";

                if (data && typeof data === "object") {
                    message =
                        data.detail || data.message || message;
                }

                throw new Error(message);
            }

            toast.success("✅ تم حذف المستأجر بنجاح");

            fetchRentals();
        } catch (error) {
            console.error("Error deleting rental:", error);

            toast.error(
                `❌ ${error.message || "حدث خطأ أثناء حذف المستأجر"}`
            );
        }
    };

    /* =========================================================
       HANDLERS
    ========================================================= */

    const handleAdd = () => {
        setSelectedRental(null);
        setShowAddModal(true);
    };

    const handleEdit = (rental) => {
        setSelectedRental(rental);
        setShowEditModal(true);
    };

    const handleDetails = (rental) => {
        setSelectedRental(rental);
        setShowDetailModal(true);
    };

    const handleModalClose = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowDetailModal(false);
        setSelectedRental(null);
    };

    const handleSuccess = () => {
        fetchRentals();
    };

    /* =========================================================
       HELPERS
    ========================================================= */

    const formatAmount = (amount) => {
        const number = Number(amount || 0);

        return number.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    /* =========================================================
       FILTER
    ========================================================= */

    const filteredRentals = rentals.filter((rental) => {
        const search = searchTerm.trim().toLowerCase();

        if (!search) return true;

        return (
            String(rental.name || "")
                .toLowerCase()
                .includes(search) ||
            String(rental.nationality || "")
                .toLowerCase()
                .includes(search) ||
            String(rental.phone_1 || "")
                .toLowerCase()
                .includes(search) ||
            String(rental.phone_2 || "")
                .toLowerCase()
                .includes(search) ||
            String(rental.id_number || "")
                .toLowerCase()
                .includes(search) ||
            String(rental.email || "")
                .toLowerCase()
                .includes(search)
        );
    });

    /* =========================================================
       RENDER — CARD VIEW  (REDESIGNED)
    ========================================================= */

    const renderCardsView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto px-4 md:px-6">

            {filteredRentals.map((rental) => (

                <div
                    key={rental.id}
                    className="group relative bg-white rounded-3xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] hover:shadow-[0_18px_40px_-12px_rgba(164,125,82,0.35)] transition-all duration-500 overflow-hidden hover:-translate-y-1.5"
                >

                    {/* Decorative gradient top strip */}
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-l from-[#a47d52] via-[#c9a878] to-[#e6cba8]" />

                    {/* Soft corner glow */}
                    <div className="pointer-events-none absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#f8f7f5] group-hover:bg-[#f1ece4] transition-colors duration-500" />

                    {/* Floating action buttons */}
                    <div className="absolute top-4 left-4 z-20">
                        <button
                            onClick={() =>
                                handleDelete(rental.id, rental.name)
                            }
                            className="w-9 h-9 cursor-pointer flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-red-100 text-red-500 shadow-sm transition-all duration-300 hover:bg-red-500 hover:text-white hover:scale-110 active:scale-95"
                            title="حذف المستأجر"
                        >
                            <MdDeleteForever size={18} />
                        </button>
                    </div>

                    <div className="absolute top-4 right-4 z-20">
                        <button
                            onClick={() => handleEdit(rental)}
                            className="w-9 h-9 cursor-pointer flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm border border-[#e6cba8] text-[#a47d52] shadow-sm transition-all duration-300 hover:bg-[#a47d52] hover:text-white hover:scale-110 active:scale-95"
                            title="تعديل المستأجر"
                        >
                            <CiEdit size={18} />
                        </button>
                    </div>

                    <div className="relative p-6 pt-16 flex flex-col items-center">

                        {/* Avatar with ring */}
                        <div className="relative mb-4">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f8f7f5] to-[#efe9e0] flex items-center justify-center ring-4 ring-white shadow-[0_8px_20px_-6px_rgba(164,125,82,0.4)] transition-transform duration-500 group-hover:scale-105">
                                <FaUserCircle
                                    className="text-[#a47d52]"
                                    size={64}
                                />
                            </div>

                            {/* ID pill on avatar */}
                            {rental.id_number && (
                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#a47d52] text-white text-[10px] font-bold shadow-md whitespace-nowrap">
                                    <FiHash size={10} />
                                    {rental.id_number}
                                </span>
                            )}
                        </div>

                        {/* Name + nationality */}
                        <div className="text-center mb-4 min-h-[52px]">
                            <h3 className="text-lg font-extrabold text-gray-800 line-clamp-1">
                                {rental.name || "بدون اسم"}
                            </h3>

                            {rental.nationality && (
                                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#a47d52] bg-[#f8f7f5] px-2.5 py-1 rounded-full">
                                    <FiGlobe size={11} />
                                    {rental.nationality}
                                </p>
                            )}
                        </div>

                        {/* Contact info */}
                        <div className="w-full space-y-2 mb-4">

                            {rental.phone_1 && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <FiPhone size={13} />
                                    </span>
                                    <span
                                        dir="ltr"
                                        className="truncate font-medium"
                                    >
                                        {rental.phone_1}
                                    </span>
                                </div>
                            )}

                            {rental.email && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                    <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                        <FiMail size={13} />
                                    </span>
                                    <span className="truncate font-medium">
                                        {rental.email}
                                    </span>
                                </div>
                            )}

                        </div>

                        {/* Balances */}
                        <div className="w-full grid grid-cols-2 gap-2.5 mb-5">

                            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-100 p-3">
                                <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                                    <FiShield size={12} />
                                    <p className="text-[10px] font-bold uppercase tracking-wide">
                                        رصيد التأمين
                                    </p>
                                </div>
                                <p
                                    className="text-sm font-extrabold text-blue-700"
                                    dir="ltr"
                                >
                                    {formatAmount(
                                        rental.insurance_balance
                                    )}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-100 p-3">
                                <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                                    <FaMoneyBillWave size={12} />
                                    <p className="text-[10px] font-bold uppercase tracking-wide">
                                        الرصيد
                                    </p>
                                </div>
                                <p
                                    className="text-sm font-extrabold text-emerald-700"
                                    dir="ltr"
                                >
                                    {formatAmount(rental.balance)}
                                </p>
                            </div>

                        </div>

                        {/* Actions */}
                        <div className="w-full flex gap-2 mt-auto">

                            <button
                                onClick={() => handleDetails(rental)}
                                className="group/btn flex-1 cursor-pointer bg-white border-2 border-[#a47d52] text-[#a47d52] py-2.5 rounded-xl font-extrabold text-xs transition-all duration-300 hover:bg-[#a47d52] hover:text-white hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <FiEye size={15} />
                                التفاصيل
                            </button>

                            <button
                                onClick={() => handleEdit(rental)}
                                className="flex-1 cursor-pointer bg-gradient-to-l from-[#a47d52] to-[#8a6a44] text-white py-2.5 rounded-xl font-extrabold text-xs shadow-md shadow-[#a47d52]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#a47d52]/30 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5"
                            >
                                <CiEdit size={15} />
                                تعديل
                            </button>

                        </div>

                    </div>

                </div>

            ))}

        </div>
    );

    /* =========================================================
       RENDER — TABLE VIEW  (UNCHANGED)
    ========================================================= */

    const renderTableView = () => (
        <div className="max-w-full mx-auto px-4 md:px-3">

            <div className="bg-white rounded-xl shadow-lg overflow-hidden">

                <div className="overflow-x-auto">

                    <table className="w-full">

                        <thead className="bg-[#e9e6e1] text-[#a47d52]">

                            <tr>

                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    #
                                </th>

                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    الاسم
                                </th>

                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    الجنسية
                                </th>

                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    الهاتف 1
                                </th>

                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    الهاتف 2
                                </th>

                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    رقم الهوية
                                </th>

                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    البريد الإلكتروني
                                </th>

                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    رصيد التأمين
                                </th>

                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    الرصيد
                                </th>

                                <th className="px-6 py-4 text-center text-sm font-bold">
                                    الإجراءات
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {filteredRentals.map((rental, index) => (

                                <tr
                                    key={rental.id}
                                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                                >

                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                        {index + 1}
                                    </td>

                                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">
                                        {rental.name || "-"}
                                    </td>

                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                        {rental.nationality || "-"}
                                    </td>

                                    <td className="px-6 py-4 text-right text-sm text-gray-700" dir="ltr">
                                        {rental.phone_1 || "-"}
                                    </td>

                                    <td className="px-6 py-4 text-right text-sm text-gray-700" dir="ltr">
                                        {rental.phone_2 || "-"}
                                    </td>

                                    <td className="px-6 py-4 text-right text-sm text-gray-700" dir="ltr">
                                        {rental.id_number || "-"}
                                    </td>

                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                        {rental.email || "-"}
                                    </td>

                                    <td className="px-6 py-4 text-right text-sm text-gray-700">

                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">

                                            <FaMoneyBillWave size={12} />

                                            {formatAmount(
                                                rental.insurance_balance
                                            )}

                                        </span>

                                    </td>

                                    <td className="px-6 py-4 text-right text-sm text-gray-700">

                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">

                                            <FaMoneyBillWave size={12} />

                                            {formatAmount(
                                                rental.balance
                                            )}

                                        </span>

                                    </td>

                                    <td className="px-6 py-4 text-center">

                                        <div className="flex justify-center gap-1">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDetails(rental)
                                                }
                                                className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
                                                title="التفاصيل"
                                            >
                                                <FiEye
                                                    className="text-[#a47d52]"
                                                    size={21}
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleEdit(rental)
                                                }
                                                className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
                                                title="تعديل"
                                            >
                                                <CiEdit
                                                    className="text-green-600"
                                                    size={22}
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDelete(
                                                        rental.id,
                                                        rental.name
                                                    )
                                                }
                                                className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
                                                title="حذف"
                                            >
                                                <MdDeleteForever
                                                    className="text-red-600"
                                                    size={22}
                                                />
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

    /* =========================================================
       RENDER
    ========================================================= */

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

                            <FaUserTie
                                className="text-[#a47d52]"
                                size={24}
                            />

                        </div>

                        <div>

                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 tracking-wide">
                                إدارة المستأجرين
                            </h2>

                            <p className="text-base md:text-lg text-gray-600 mt-1">
                                إدارة بيانات المستأجرين وأرصدتهم
                            </p>

                        </div>

                    </div>

                </div>

                <div className="flex flex-col sm:flex-row gap-3">

                    {/* Add */}
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="flex items-center justify-center gap-2 bg-[#a47d52] cursor-pointer text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        <FiPlus size={20} />
                        إضافة مستأجر
                    </button>

                    {/* Refresh */}
                    <button
                        type="button"
                        onClick={fetchRentals}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-[#6c7a89] cursor-pointer text-white px-5 py-3 rounded-full font-extrabold transition-all duration-300 hover:bg-[#5a6775] hover:scale-105 disabled:opacity-50"
                    >
                        <FiRefreshCw
                            size={18}
                            className={loading ? "animate-spin" : ""}
                        />
                    </button>

                </div>

            </div>

            {/* =====================================================
                SEARCH + VIEW TOGGLE
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
                            placeholder="بحث بالاسم أو الجنسية أو رقم الهاتف أو البريد الإلكتروني..."
                            className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white text-right"
                            value={searchTerm}
                            onChange={(e) =>
                                setSearchTerm(e.target.value)
                            }
                        />

                    </div>

                    {/* View toggle */}
                    <div className="w-full md:w-auto flex gap-2 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">

                        <button
                            type="button"
                            onClick={() => setViewMode("cards")}
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${
                                viewMode === "cards"
                                    ? "bg-[#a47d52] text-white shadow-md"
                                    : "text-gray-600 hover:bg-[#f8f7f5]"
                            }`}
                            title="عرض البطاقات"
                        >
                            <FiGrid size={18} />
                            بطاقات
                        </button>

                        <button
                            type="button"
                            onClick={() => setViewMode("table")}
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-extrabold text-sm transition-all duration-300 cursor-pointer ${
                                viewMode === "table"
                                    ? "bg-[#a47d52] text-white shadow-md"
                                    : "text-gray-600 hover:bg-[#f8f7f5]"
                            }`}
                            title="عرض الجدول"
                        >
                            <FiList size={18} />
                            جدول
                        </button>

                    </div>

                </div>

            </div>

            {/* =====================================================
                CONTENT
            ====================================================== */}

            {loading ? (

                <div className="flex justify-center items-center py-20">

                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />

                </div>

            ) : filteredRentals.length === 0 ? (

                <div className="max-w-full mx-auto px-4 md:px-3">

                    <div className="bg-white rounded-xl shadow-lg text-center py-20">

                        <FaUserTie
                            className="mx-auto text-gray-300 mb-4"
                            size={50}
                        />

                        <p className="text-gray-500 text-lg">
                            لا يوجد مستأجرون
                        </p>

                        <p className="text-gray-400 text-sm mt-2">
                            قم بإضافة مستأجر جديد
                        </p>

                        <button
                            type="button"
                            onClick={handleAdd}
                            className="mt-5 bg-[#a47d52] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8a6a44] transition cursor-pointer"
                        >
                            + إضافة مستأجر
                        </button>

                    </div>

                </div>

            ) : viewMode === "cards" ? (
                renderCardsView()
            ) : (
                renderTableView()
            )}

            {/* =====================================================
                ADD RENTAL
            ====================================================== */}
            {showAddModal && (
                <AddRental
                    onClose={handleModalClose}
                    onSuccess={handleSuccess}
                />
            )}

            {/* =====================================================
                EDIT RENTAL
            ====================================================== */}
            {showEditModal && selectedRental && (
                <EditRental
                    rentalId={selectedRental.id}
                    onClose={handleModalClose}
                    onSuccess={handleSuccess}
                />
            )}

            {/* =====================================================
                DETAILS
            ====================================================== */}
            {showDetailModal && selectedRental && (
                <DetailRental
                    rentalId={selectedRental.id}
                    onClose={handleModalClose}
                />
            )}

        </div>
    );
};

export default Rental;