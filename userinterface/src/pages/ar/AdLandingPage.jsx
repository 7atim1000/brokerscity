import React, { useEffect, useState, useMemo } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { usePermissions } from "../context/PermissionsContext"; 
import { useNavigate } from "react-router-dom";

// ✅ Import the Add Modal
import AddCrmLead from '../../components/ar/crmleads/AddCrmLead';

import {
    FiPlus,
    FiSearch,
    FiRefreshCw,
    FiUser,
    FiPhone,
} from "react-icons/fi";
import { FaRegAddressCard } from "react-icons/fa";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const CrmLeads = ({ type = "all" }) => {
    const navigate = useNavigate();
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [showAddModal, setShowAddModal] = useState(false);

    // ✅ ADDED: Destructure permissionsLoading from the context
    const { permissions, loading: permissionsLoading } = usePermissions();

    // ---------------------------------------------------------
    // Fetch Leads (Dynamic URL based on `type`)
    // ---------------------------------------------------------
    const fetchLeads = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                toast.error("يرجى تسجيل الدخول");
                return;
            }

            const endpoint = type === "my" 
                ? `${BASE}/api/lead/my-leads/` 
                : `${BASE}/api/lead/list/`;

            const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "فشل تحميل العملاء");
            }

            const data = await response.json();
            const leadsData = Array.isArray(data) ? data : data.results || [];
            setLeads(leadsData);

        } catch (error) {
            console.error("Error fetching leads:", error);
            toast.error(`❌ ${error.message || "حدث خطأ أثناء جلب العملاء"}`);
        } finally {
            setLoading(false);
        }
    };

    // ---------------------------------------------------------
    // SECURITY GUARD & INITIAL FETCH
    // ---------------------------------------------------------
    useEffect(() => {
        // ✅ FIX: Wait for permissions to finish loading before checking!
        if (permissionsLoading) return;

        // 1. Check "All Leads" Permission
        if (type === "all" && !permissions?.view_all_lead) {
            toast.error("ليس لديك صلاحية لعرض جميع الليدز");
            navigate("/ar/crm/my-leads"); 
            return; 
        }

        // 2. Check "My Leads" Permission
        if (type === "my" && !permissions?.view_my_lead && !permissions?.view_all_lead) {
            toast.error("ليس لديك صلاحية لعرض الليدز");
            navigate("/ar/dashboard"); 
            return; 
        }

        // 3. If they pass the checks, fetch the data!
        fetchLeads();

    }, [type, permissions, permissionsLoading, navigate]); 

    // ---------------------------------------------------------
    // Stage Color & Text Mapper
    // ---------------------------------------------------------
    const getStageConfig = (stage) => {
        switch (stage) {
            case "fresh_lead": return { text: "عميل جديد", color: "bg-cyan-400", textColor: "text-cyan-700" };
            case "reassign": return { text: "معاد توزيعة", color: "bg-blue-600", textColor: "text-blue-700" };
            case "lead_accepted": return { text: "قبول الطلب", color: "bg-blue-400", textColor: "text-blue-700" };
            case "contact_attempt": return { text: "لم يتم الرد", color: "bg-yellow-400", textColor: "text-yellow-700" };
            case "lead_contacted": return { text: "تم الرد", color: "bg-yellow-500", textColor: "text-yellow-700" };
            case "hold": return { text: "مستقبلي", color: "bg-gray-400", textColor: "text-gray-700" };
            case "complete": return { text: "مكتمل", color: "bg-green-500", textColor: "text-green-700" };
            default: return { text: stage || "غير محدد", color: "bg-gray-300", textColor: "text-gray-600" };
        }
    };

    // ---------------------------------------------------------
    // Search Filter
    // ---------------------------------------------------------
    const filteredLeads = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();
        if (!search) return leads;

        return leads.filter((lead) =>
            String(lead.name || "").toLowerCase().includes(search) ||
            String(lead.phone || "").toLowerCase().includes(search) ||
            String(lead.phone1 || "").toLowerCase().includes(search) ||
            String(lead.phone2 || "").toLowerCase().includes(search) ||
            String(lead.responsible_name || "").toLowerCase().includes(search)
        );
    }, [leads, searchTerm]);

    // Prevent rendering the table until permissions are loaded (optional, but prevents flashes)
    if (permissionsLoading) {
        return (
            <div className="min-h-screen bg-[#f8f7f5] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8f7f5] py-8 px-4 md:py-10 md:px-6 lg:py-6 lg:px-0 rtl" dir="rtl">
            <ToastContainer position="top-center" autoClose={3000} rtl={true} theme="light" />

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-4 md:px-3 mb-8 gap-4 lg:shadow-lg p-4 bg-white rounded-xl">
                <div className="text-center sm:text-right">
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-[#e9e6e1] items-center justify-center">
                            <FaRegAddressCard className="text-[#a47d52]" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-800 tracking-wide">
                                {type === "my" ? "الليدز الخاصة بي" : "جميع العملاء المحتملين"}
                            </h2>
                            <p className="text-sm md:text-base text-gray-600 mt-1">
                                {type === "my" ? "متابعة العملاء المخصصين لك فقط" : "متابعة وتصفية جميع طلبات العملاء"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {permissions?.create_new_lead && (
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center justify-center gap-2 bg-[#a47d52] cursor-pointer text-white px-6 md:px-8 py-3 rounded-lg font-extrabold text-sm md:text-base transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
                        >
                            <FiPlus size={20} />
                            إضافة عميل جديد
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={fetchLeads}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 bg-[#6c7a89] cursor-pointer text-white px-5 py-3 rounded-lg font-extrabold transition-all duration-300 hover:bg-[#5a6775] hover:scale-105 disabled:opacity-50"
                    >
                        <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        تحديث
                    </button>
                </div>
            </div>

            {/* SEARCH */}
            <div className="max-w-full mx-auto px-4 md:px-3 mb-6">
                <div className="bg-white rounded-xl shadow-md p-4 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:w-2/3">
                        <FiSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="بحث بالاسم، رقم الهاتف، أو المسؤول..."
                            className="w-full pr-12 pl-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white text-right"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-1/3 flex justify-end">
                        <span className="text-gray-600 text-sm font-semibold">
                            إجمالي الليدز: <span className="text-[#a47d52] text-lg">{filteredLeads.length}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="max-w-full mx-auto px-4 md:px-3">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                    {loading ? (
                        <div className="flex justify-center items-center py-24">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]" />
                        </div>
                    ) : filteredLeads.length === 0 ? (
                        <div className="text-center py-24">
                            <FaRegAddressCard className="mx-auto text-gray-300 mb-4" size={60} />
                            <p className="text-gray-500 text-lg font-bold">لا يوجد عملاء محتملين حالياً</p>
                            <p className="text-gray-400 text-sm mt-2">لم يتم العثور على أي سجلات</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-max">
                                <thead className="bg-[#f4f5f7] text-[#555] text-sm border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-4 text-right font-bold w-12">#</th>
                                        <th className="px-4 py-4 text-right font-bold w-1/4">العميل / Lead</th>
                                        <th className="px-4 py-4 text-right font-bold w-1/4">المرحلة / Stage</th>
                                        <th className="px-4 py-4 text-right font-bold">النشاط / Activity</th>
                                        <th className="px-4 py-4 text-right font-bold">الهاتف</th>
                                        <th className="px-4 py-4 text-right font-bold">المسؤول</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.map((lead, index) => {
                                        const stageConfig = getStageConfig(lead.stage);

                                        return (
                                            <tr key={lead.id} className="border-b border-gray-100 hover:bg-[#f8f2e7] transition-colors duration-200 bg-white">
                                                <td className="px-4 py-4 text-sm text-gray-500 text-center">
                                                    <input type="checkbox" className="w-4 h-4 cursor-pointer rounded border-gray-300 text-[#a47d52] focus:ring-[#a47d52]" />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                                                            <span className="text-xs">✓</span>
                                                        </div>
                                                        <span className="font-bold text-gray-800 text-sm">
                                                            {lead.name || "N/A"}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1 mr-7">
                                                        {lead.source_description || "مصدر غير محدد"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="w-full bg-gray-200 rounded-full h-2 flex overflow-hidden">
                                                            <div className={`h-full ${stageConfig.color} w-1/4`}></div>
                                                        </div>
                                                        <span className={`text-xs font-semibold ${stageConfig.textColor}`}>
                                                            {stageConfig.text}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-600">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">لا يوجد نشاط</span>
                                                        <button className="text-blue-600 text-xs mt-1 hover:underline text-right w-fit">
                                                            + إضافة نشاط
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-700 dir-ltr text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span>{lead.phone || lead.phone1 || "-"}</span>
                                                        <FiPhone className="text-gray-400 text-xs" />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                                            <FiUser size={14} />
                                                        </div>
                                                        <span className="text-sm text-gray-700">
                                                            {lead.responsible_name || "غير معين"}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ✅ ADDED: The Modal Component */}
            {showAddModal && (
                <AddCrmLead
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchLeads(); // Refresh the table immediately after adding
                    }}
                />
            )}

        </div>
    );
};

export default CrmLeads;