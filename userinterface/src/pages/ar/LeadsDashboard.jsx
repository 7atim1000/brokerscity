import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import { FaSearch, FaSync, FaUserCheck, FaBullhorn } from "react-icons/fa";
import { FiEye, FiMail, FiPhone } from "react-icons/fi";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const LeadsDashboard = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch Leads
    const fetchLeads = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${BASE}/api/leads/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setLeads(data.leads || []);
            } else {
                toast.error("Failed to fetch leads");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    // Update Status inline
    const handleStatusChange = async (id, newStatus) => {
        // Optimistic UI update
        setLeads((prev) =>
            prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
        );

        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${BASE}/api/leads/${id}/status/`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!res.ok) throw new Error("Failed to update");
            toast.success("Status updated!");
        } catch (err) {
            toast.error("Failed to update status");
            fetchLeads(); // Revert on failure
        }
    };

    // Filter leads by search term
    const filteredLeads = leads.filter((lead) => {
        const search = searchTerm.toLowerCase();
        return (
            lead.first_name?.toLowerCase().includes(search) ||
            lead.last_name?.toLowerCase().includes(search) ||
            lead.email?.toLowerCase().includes(search) ||
            lead.phone_number?.includes(search)
        );
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case "new": return "bg-blue-100 text-blue-700 border-blue-200";
            case "contacted": return "bg-amber-100 text-amber-700 border-amber-200";
            case "qualified": return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "closed": return "bg-gray-100 text-gray-700 border-gray-200";
            default: return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    return (
        <div dir="ltr" className="min-h-screen bg-[#f8f7f5] p-4 md:p-6 font-sans">
            <Toaster position="top-center" />

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#a47d52]/10 text-[#a47d52] flex items-center justify-center">
                        <FaBullhorn size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-800">Ad Leads Dashboard</h1>
                        <p className="text-sm text-gray-500">Manage customers from Facebook Ads</p>
                    </div>
                </div>

                <button
                    onClick={fetchLeads}
                    disabled={loading}
                    className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-50 transition shadow-sm"
                >
                    <FaSync className={loading ? "animate-spin" : ""} /> Refresh
                </button>
            </div>

            {/* SEARCH */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="relative w-full">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52]"
                    />
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="text-center py-20 font-bold text-gray-500">Loading Leads...</div>
                ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-20 text-gray-500">No leads found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#e9e6e1] text-[#a47d52]">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-sm">Name</th>
                                    <th className="px-6 py-4 font-bold text-sm">Contact Info</th>
                                    <th className="px-6 py-4 font-bold text-sm">Requirements</th>
                                    <th className="px-6 py-4 font-bold text-sm">Status</th>
                                    <th className="px-6 py-4 font-bold text-sm text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                        
                                        {/* Name */}
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{lead.first_name} {lead.last_name}</div>
                                            <div className="text-xs text-gray-400 mt-0.5">ID: {lead.id} • {new Date(lead.created_at).toLocaleDateString()}</div>
                                        </td>

                                        {/* Contact */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                                <FiMail className="text-gray-400" /> {lead.email || "N/A"}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <FiPhone className="text-gray-400" /> {lead.phone_number}
                                            </div>
                                        </td>

                                        {/* Requirements */}
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-600 mb-1">Budget: <span className="font-bold">{lead.estimated_budget || "N/A"}</span></div>
                                            <div className="text-xs text-gray-600 mb-1">Bedrooms: <span className="font-bold">{lead.bedrooms_interested || "N/A"}</span></div>
                                            <div className="text-xs text-gray-600">Timeframe: <span className="font-bold">{lead.purchase_timeframe || "N/A"}</span></div>
                                        </td>

                                        {/* Status Dropdown */}
                                        <td className="px-6 py-4">
                                            <select
                                                value={lead.status}
                                                onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold border outline-none cursor-pointer ${getStatusBadge(lead.status)}`}
                                            >
                                                <option value="new">New</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="qualified">Qualified</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-center">
                                            <a 
                                                href={`https://wa.me/${lead.phone_number.replace(/\D/g, '')}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 py-2 rounded-lg text-xs font-bold transition"
                                            >
                                                WhatsApp
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};


export default LeadsDashboard;