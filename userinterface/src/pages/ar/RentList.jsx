import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { CiEdit } from "react-icons/ci";
import { MdDeleteForever } from "react-icons/md";
import {
    FiEye,
    FiPlus,
    FiSearch,
    FiRefreshCw,
    FiGrid,
    FiList,
    FiCalendar,
    FiUser,
    FiHome,
    FiDollarSign,
    FiCreditCard,
} from "react-icons/fi";


import AddMonthlyPayment from "../../components/ar/rent/AddMonthlyPayment" ;
import DetailRent from "../../components/ar/rent/DetailRent" ;
import RentAddEdit from "../../components/ar/rent/RentAddEdit";


const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const RentList = () => {
    /* =========================================================
       STATE
    ========================================================= */

    const [rents, setRents] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [selectedRent, setSelectedRent] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

    /* =========================================================
       FETCH RENTS
    ========================================================= */

    const fetchRents = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem("access_token");

            if (!token) {
                toast.error("يرجى تسجيل الدخول");
                return;
            }

            const response = await fetch(`${BASE}/api/rents/`, {
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
                    toast.error("فشل تحميل العقود");
                }

                throw new Error(
                    `HTTP error! status: ${response.status}`
                );
            }

            const data = await response.json();

            let rentsData = [];

            if (Array.isArray(data)) {
                rentsData = data;
            } else if (Array.isArray(data.results)) {
                rentsData = data.results;
            } else if (Array.isArray(data.rents)) {
                rentsData = data.rents;
            }

            setRents(rentsData);
        } catch (error) {
            console.error("Error fetching rents:", error);

            if (
                !error.message?.includes("401") &&
                error.message !== "Failed to fetch"
            ) {
                toast.error("❌ حدث خطأ أثناء جلب العقود");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRents();
    }, []);

    /* =========================================================
       DELETE
    ========================================================= */

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "هل أنت متأكد من حذف هذا العقد؟"
        );

        if (!confirmed) return;

        try {
            const token = localStorage.getItem("access_token");

            if (!token) {
                toast.error("يرجى تسجيل الدخول");
                return;
            }

            const response = await fetch(
                `${BASE}/api/rents/${id}/delete/`,
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error("فشل حذف العقد");
            }

            toast.success("✅ تم حذف العقد بنجاح");
            fetchRents();
        } catch (error) {
            console.error("Error deleting rent:", error);
            toast.error(
                `❌ ${error.message || "حدث خطأ أثناء حذف العقد"}`
            );
        }
    };

    /* =========================================================
       MODAL HANDLERS
    ========================================================= */

    const handleAdd = () => {
        setSelectedRent(null);
        setShowAddModal(true);
    };

    const handleEdit = (rent) => {
        setSelectedRent(rent);
        setShowAddModal(true); // AddRent should support edit mode via `rent` prop
    };

    const handleDetails = (rent) => {
        setSelectedRent(rent);
        setShowDetailModal(true);
    };

    const handleAddPayment = (rent) => {
        setSelectedRent(rent);
        setShowAddPaymentModal(true);
    };

    const handleModalClose = () => {
        setShowAddModal(false);
        setShowAddPaymentModal(false);
        setShowDetailModal(false);
        setSelectedRent(null);
    };

    const handleSuccess = () => {
        fetchRents();
    };

    /* =========================================================
       HELPERS
    ========================================================= */

    const getTenantName = (rent) => {
        if (!rent) return "-";

        if (rent.tenant_name) return rent.tenant_name;

        const rental = rent.rental_name;

        if (!rental) return "-";

        if (typeof rental === "string") return rental;

        return (
            rental?.name ||
            rental?.tenant_name ||
            rental?.full_name ||
            `#${rental?.id || "-"}`
        );
    };

    const getUnitDisplay = (rent) => {
        if (!rent) return "-";

        if (rent.unit_display) return rent.unit_display;

        const unit = rent.unit_name;

        if (!unit) return "-";

        if (typeof unit === "string") return unit;

        return unit?.name || `Unit #${unit?.id || "-"}`;
    };

    const formatAmount = (amount) => {
        const number = Number(amount || 0);

        return number.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        return dateStr;
    };

    const getStatusBadge = (rent) => {
        const today = new Date();
        const start = rent.start_date
            ? new Date(rent.start_date)
            : null;
        const end = rent.end_date ? new Date(rent.end_date) : null;

        let label = "غير معروف";
        let className = "bg-gray-100 text-gray-700";

        if (start && end) {
            if (today < start) {
                label = "لم يبدأ";
                className = "bg-yellow-100 text-yellow-700";
            } else if (today > end) {
                label = "منتهي";
                className = "bg-red-100 text-red-700";
            } else {
                label = "نشط";
                className = "bg-green-100 text-green-700";
            }
        }

        return (
            <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${className}`}
            >
                {label}
            </span>
        );
    };

    /* =========================================================
       FILTER
    ========================================================= */

    const filteredRents = rents.filter((rent) => {
        const search = searchTerm.trim().toLowerCase();
        if (!search) return true;

        const tenant = String(getTenantName(rent)).toLowerCase();
        const unit = String(getUnitDisplay(rent)).toLowerCase();
        const start = String(rent.start_date || "").toLowerCase();
        const end = String(rent.end_date || "").toLowerCase();

        return (
            tenant.includes(search) ||
            unit.includes(search) ||
            start.includes(search) ||
            end.includes(search)
        );
    });

    /* =========================================================
       CARD VIEW
    ========================================================= */

    const renderCardsView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 max-w-full sm:max-w-[1550px] mx-auto px-2 md:px-2">
            {filteredRents.map((rent) => {
                const tenant = getTenantName(rent);
                const unit = getUnitDisplay(rent);

                return (
                    <div
                        key={rent.id}
                        className="bg-white border border-[#e9e6e1] rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-1 relative group"
                    >
                        {/* Delete button (top-left) */}
                        <button
                            onClick={() => handleDelete(rent.id)}
                            className="absolute cursor-pointer top-3 left-3 p-2 rounded-full transition-all duration-300 z-10 bg-red-50 hover:bg-red-100 hover:scale-110 active:scale-95"
                            title="حذف العقد"
                        >
                            <MdDeleteForever className="text-red-500 text-2xl" />
                        </button>

                        {/* Edit button (top-right) */}
                        <button
                            onClick={() => handleEdit(rent)}
                            className="absolute cursor-pointer top-3 right-3 p-2 rounded-full bg-[#f8f7f5] hover:bg-[#e6cba8] hover:scale-110 active:scale-95 transition-all duration-300 z-10"
                            title="تعديل العقد"
                        >
                            <CiEdit className="text-[#a47d52] text-2xl" />
                        </button>

                        <div className="p-4 pt-14 flex flex-col items-center text-center">
                            {/* Header — icon + tenant */}
                            <div className="w-full flex gap-3 items-center mb-4">
                                <div className="w-14 h-14 rounded-full bg-[#f8f7f5] border border-[#e9e6e1] flex items-center justify-center shrink-0">
                                    <FiUser
                                        className="text-[#a47d52]"
                                        size={26}
                                    />
                                </div>

                                <div className="flex-1 min-w-0 text-right">
                                    <h3 className="text-base font-extrabold text-[#7a5c3a] truncate">
                                        {tenant}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1 truncate">
                                        {unit}
                                    </p>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="w-full grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-blue-50 rounded-lg py-2 px-2 flex flex-col items-center">
                                    <p className="text-[10px] font-bold text-blue-600 mb-1">
                                        من
                                    </p>
                                    <p
                                        className="text-xs font-extrabold text-blue-800"
                                        dir="ltr"
                                    >
                                        {formatDate(rent.start_date)}
                                    </p>
                                </div>

                                <div className="bg-indigo-50 rounded-lg py-2 px-2 flex flex-col items-center">
                                    <p className="text-[10px] font-bold text-indigo-600 mb-1">
                                        إلى
                                    </p>
                                    <p
                                        className="text-xs font-extrabold text-indigo-800"
                                        dir="ltr"
                                    >
                                        {formatDate(rent.end_date)}
                                    </p>
                                </div>
                            </div>

                            {/* Amount + Status */}
                            <div className="w-full grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-green-50 rounded-lg py-2 px-2 flex flex-col items-center">
                                    <p className="text-[10px] font-bold text-green-600 mb-1">
                                        قيمة القسط
                                    </p>
                                    <p
                                        className="text-sm font-extrabold text-green-700"
                                        dir="ltr"
                                    >
                                        {formatAmount(rent.installment_no)}
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg py-2 px-2 flex flex-col items-center justify-center">
                                    <p className="text-[10px] font-bold text-gray-500 mb-1">
                                        الحالة
                                    </p>
                                    {getStatusBadge(rent)}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="w-full border-t border-gray-200 pt-3 mt-auto flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleDetails(rent)}
                                        className="flex-1 cursor-pointer shadow bg-white text-[#a47d52] py-2 px-2 rounded-sm font-extrabold text-xs transition-all duration-300 hover:bg-[#f8f7f5] hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                                    >
                                        <FiEye size={14} />
                                        التفاصيل
                                    </button>

                                    <button
                                        onClick={() => handleEdit(rent)}
                                        className="flex-1 cursor-pointer bg-[linear-gradient(135deg,#5fb87f_0%,#52a46f_205%,#448a59_100%)] shadow text-white py-2 px-2 rounded-sm font-extrabold text-xs transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                                    >
                                        <CiEdit size={14} />
                                        تعديل
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleAddPayment(rent)}
                                    className="w-full cursor-pointer bg-[#a47d52] text-white py-2 px-2 rounded-sm font-extrabold text-xs transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1"
                                >
                                    <FiCreditCard size={14} />
                                    إضافة دفعة شهرية
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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#e9e6e1] text-[#a47d52]">
                            <tr>
                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    #
                                </th>
                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    المستأجر
                                </th>
                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    الوحدة
                                </th>
                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    من تاريخ
                                </th>
                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    إلى تاريخ
                                </th>
                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    قيمة القسط
                                </th>
                                <th className="px-6 py-4 text-right text-sm font-bold">
                                    الحالة
                                </th>
                                <th className="px-6 py-4 text-center text-sm font-bold">
                                    الإجراءات
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredRents.map((rent, index) => (
                                <tr
                                    key={rent.id}
                                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                                >
                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-bold text-gray-800">
                                        {getTenantName(rent)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm text-gray-700">
                                        {getUnitDisplay(rent)}
                                    </td>
                                    <td
                                        className="px-6 py-4 text-right text-sm text-gray-700"
                                        dir="ltr"
                                    >
                                        {formatDate(rent.start_date)}
                                    </td>
                                    <td
                                        className="px-6 py-4 text-right text-sm text-gray-700"
                                        dir="ltr"
                                    >
                                        {formatDate(rent.end_date)}
                                    </td>
                                    <td
                                        className="px-6 py-4 text-right text-sm text-gray-700"
                                        dir="ltr"
                                    >
                                        {formatAmount(rent.installment_no)}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm">
                                        {getStatusBadge(rent)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDetails(rent)
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
                                                    handleAddPayment(rent)
                                                }
                                                className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-110"
                                                title="إضافة دفعة"
                                            >
                                                <FiCreditCard
                                                    className="text-blue-600"
                                                    size={21}
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleEdit(rent)
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
                                                    handleDelete(rent.id)
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
            className="min-h-screen bg-[#f8f7f5] py-6 px-2 md:py-8 md:px-3 lg:py-5 lg:px-2 rtl"
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

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-2 md:px-2 mb-6 md:mb-8 lg:mb-10 gap-4 lg:shadow-lg">
                <div className="text-center sm:text-right">
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[#e9e6e1] items-center justify-center">
                            <FiHome
                                className="text-[#a47d52]"
                                size={24}
                            />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 tracking-wide">
                                إدارة العقود
                            </h2>
                            <p className="text-base md:text-lg text-gray-600 mt-1">
                                إدارة عقود الإيجار والدفعات الشهرية
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="flex items-center justify-center gap-2 bg-[#a47d52] cursor-pointer text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
                    >
                        <FiPlus size={20} />
                        إضافة عقد
                    </button>

                    <button
                        type="button"
                        onClick={fetchRents}
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

            {/* SEARCH + VIEW TOGGLE */}
            <div className="max-w-full mx-auto px-2 md:px-2 mb-5">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:flex-1">
                        <FiSearch
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                            size={20}
                        />
                        <input
                            type="text"
                            placeholder="بحث بالمستأجر أو الوحدة أو التاريخ..."
                            className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white text-right"
                            value={searchTerm}
                            onChange={(e) =>
                                setSearchTerm(e.target.value)
                            }
                        />
                    </div>

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

            {/* CONTENT */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />
                </div>
            ) : filteredRents.length === 0 ? (
                <div className="max-w-full mx-auto px-2 md:px-2">
                    <div className="bg-white rounded-xl shadow-lg text-center py-20">
                        <FiHome
                            className="mx-auto text-gray-300 mb-4"
                            size={50}
                        />
                        <p className="text-gray-500 text-lg">
                            لا توجد عقود
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                            قم بإضافة عقد جديد
                        </p>
                        <button
                            type="button"
                            onClick={handleAdd}
                            className="mt-5 bg-[#a47d52] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#8a6a44] transition cursor-pointer"
                        >
                            + إضافة عقد
                        </button>
                    </div>
                </div>
            ) : viewMode === "cards" ? (
                renderCardsView()
            ) : (
                renderTableView()
            )}

            {/* MODALS */}
            {showAddModal && (
                <RentAddEdit
                    rent={selectedRent}
                    onClose={handleModalClose}
                    onSuccess={handleSuccess}
                />
            )}

            {showAddPaymentModal && selectedRent && (
                <AddMonthlyPayment
                    rent={selectedRent}
                    onClose={handleModalClose}
                    onSuccess={handleSuccess}
                />
            )}

            {showDetailModal && selectedRent && (
                <DetailRent
                    rent={selectedRent}
                    onClose={handleModalClose}
                />
            )}
        </div>
    );
};

export default RentList;