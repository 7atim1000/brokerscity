import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MdDeleteForever, MdModeEdit, MdVisibility } from 'react-icons/md';
import { FiUser, FiPhone, FiMail, FiMapPin, FiLock, FiGrid, FiList, FiAlertTriangle } from 'react-icons/fi';
import { FaBuilding, FaPlus, FaHome } from 'react-icons/fa';

import AddEditLandLord from "../../components/en/listing/AddEditLandLoard";
import LandLoardDetails from "../../components/en/listing/LandLordDetails";
import { usePermissions } from "../context/PermissionsContext"; 

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const LandLord = () => {
    const { permissions } = usePermissions(); 
    
    const [landlords, setLandlords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Modal State
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedLandlord, setSelectedLandlord] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // ✅ Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // ✅ View Mode State (Cards vs Table)
    const [viewMode, setViewMode] = useState("cards"); 

    // ✅ Permissions
    const canViewAll = permissions?.view_all_listing_owners === true;
    const canCreate = permissions?.create_new_listing_owners === true;
    const canUpdate = permissions?.update_listing_owners === true;
    const canDelete = permissions?.delete_listing_owners === true;

    const fetchLandlords = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');
            
            if (!token) {
                toast.error('Please login to view Landlords');
                setLoading(false);
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${BASE}/api/landlord/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error('Session expired. Please login again.');
                    localStorage.removeItem('access_token');
                    window.location.href = '/login';
                } else {
                    toast.error('Failed to load Landlords');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            let landlordsData = [];
            if (Array.isArray(data)) {
                landlordsData = data;
            } else if (data.results && Array.isArray(data.results)) {
                landlordsData = data.results;
            }

            setLandlords(landlordsData);
            setLoading(false);
        } catch (err) {
            setError('Failed to load Landlords');
            setLoading(false);
            console.error('Error fetching landlords:', err);
        }
    };

    useEffect(() => {
        fetchLandlords();
    }, []);

    // ✅ Handle Delete Confirmation
    const confirmDelete = (landlord) => {
        if (!canDelete) {
            toast.error("You don't have permission to delete landlords.");
            return;
        }
        setDeleteConfirm(landlord);
    };

    const handleDeleteLandlord = async () => {
        if (!deleteConfirm) return;

        const id = deleteConfirm.id;
        const name = deleteConfirm.name || deleteConfirm.company;

        setDeletingId(id);
        
        try {
            const token = localStorage.getItem('access_token');
            
            if (!token) {
                toast.error('Please login to continue');
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${BASE}/api/landlord/${id}/delete/`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                toast.error('Session expired. Please login again.');
                localStorage.removeItem('access_token');
                window.location.href = '/login';
                return;
            }

            if (!response.ok) {
                toast.error('Failed to delete Landlord');
                return;
            }

            setLandlords(prev => prev.filter(item => item.id !== id));
            toast.success(`✅ Landlord "${name}" deleted successfully!`);
            setDeleteConfirm(null); // Close modal on success
        } catch (err) {
            toast.error('Server connection error');
        } finally {
            setDeletingId(null);
        }
    };

    // ✅ Handle Create with Permission Check
    const handleOpenCreate = () => {
        if (!canCreate) {
            toast.error("You don't have permission to create new landlords.");
            return;
        }
        setSelectedLandlord(null);
        setShowAddEditModal(true);
    };

    // ✅ Handle Edit with Permission Check
    const handleOpenEdit = (landlord) => {
        if (!canUpdate) {
            toast.error("You don't have permission to edit landlords.");
            return;
        }
        setSelectedLandlord(landlord);
        setShowAddEditModal(true);
    };

    const handleOpenDetails = (landlord) => {
        setSelectedLandlord(landlord);
        setShowDetailsModal(true);
    };

    const handleCloseModals = () => {
        setShowAddEditModal(false);
        setShowDetailsModal(false);
        setSelectedLandlord(null);
        setDeleteConfirm(null);
    };

    // ✅ Helper to determine the dominant status color for the badge
    const getStatusColorClasses = (landlord) => {
        const hasLive = landlord.live_units > 0 || (landlord.units_count > 0 && !landlord.status);
        const status = landlord.status?.toLowerCase();

        if (status === 'sold' || status === 'rented') return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
        if (status === 'under mou') return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
        if (status === 'under reservation') return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
        if (status === 'pocket') return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
        if (hasLive) return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
        return 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100';
    };

    if (loading) {
        return (
            <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-5">
                <div className="w-12 h-12 border-4 border-[#f8f7f5] border-t-[#4285F4] rounded-full animate-spin"></div>
                <p className="text-[#4285F4] text-lg font-extrabold">Loading Landlords...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-4 p-5 text-center">
                <span className="text-5xl">⚠️</span>
                <p className="text-red-500 text-lg font-extrabold">{error}</p>
                <button 
                    className="bg-[#4285F4] text-white px-8 py-3 rounded-lg font-extrabold transition-colors hover:bg-blue-600"
                    onClick={fetchLandlords}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div dir="ltr" className="min-h-screen bg-white py-10 px-5 md:py-12 md:px-8 lg:py-8 lg:px-6 font-sans">
            <ToastContainer position="top-right" theme="light" />
            
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto mb-6 md:mb-8 gap-4">
                <div className="text-center sm:text-left">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-800 tracking-wide flex items-center justify-center sm:justify-start gap-3">
                        <FaBuilding className="text-[#4285F4]" />
                        Owners Management
                    </h2>
                    
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                        {canViewAll ? (
                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">
                                Viewing: All Landlords
                            </span>
                        ) : (
                            <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
                                <FiLock size={10} /> Viewing: Only My Landlords
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* ✅ View Mode Toggles */}
                    <div className="flex bg-[#f8f7f5] p-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <button 
                            onClick={() => setViewMode("cards")} 
                            className={`p-2 rounded-md transition-all ${viewMode === "cards" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            title="Card View"
                        >
                            <FiGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode("table")} 
                            className={`p-2 rounded-md transition-all ${viewMode === "table" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            title="Table View"
                        >
                            <FiList size={18} />
                        </button>
                    </div>

                    {/* ✅ Create Button (with permissions check) */}
                    <button 
                        className={`flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap flex-1 sm:flex-none ${
                            canCreate 
                                ? "bg-[#4285F4] text-white hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5" 
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        onClick={handleOpenCreate}
                    >
                        <FaPlus />
                        Add New Landlord
                    </button>
                </div>
            </div>

            {/* ✅ SEPARATOR LINE */}
            <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

            {/* EMPTY STATE */}
            {landlords.length === 0 ? (
                <div className="flex flex-col justify-center items-center gap-4 p-10 text-center bg-[#f8f7f5] rounded-2xl border border-gray-100 max-w-3xl mx-auto shadow-sm">
                    <span className="text-6xl">🏢</span>
                    <h3 className="text-2xl font-extrabold text-gray-800">
                        {canViewAll ? "No Landlords Found" : "You haven't created any Landlords yet"}
                    </h3>
                    <p className="text-gray-500">
                        {canViewAll ? "There are no landlords registered in the system." : "Start by adding your first landlord."}
                    </p>
                    <button 
                        className={`mt-4 px-8 py-3 rounded-lg font-bold transition-all ${
                            canCreate ? "bg-[#4285F4] text-white hover:bg-blue-600 hover:scale-105" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        onClick={handleOpenCreate}
                    >
                        Add Landlord
                    </button>
                </div>
            ) : viewMode === "cards" ? (
                
                /* =========================================
                   CARD VIEW
                ========================================= */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-full mx-auto animate-fadeIn">
                    {landlords.map((landlord) => (
                        <div 
                            key={landlord.id} 
                            className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1 relative group"
                        >
                            {/* Action Buttons */}
                            <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenEdit(landlord)}
                                    className={`p-2 rounded-full shadow transition-colors ${
                                        canUpdate ? "bg-white/90 text-gray-600 hover:bg-[#4285F4] hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                                    title={canUpdate ? "Edit" : "No permission"}
                                >
                                    <MdModeEdit size={18} />
                                </button>
                                <button
                                    onClick={() => confirmDelete(landlord)}
                                    disabled={deletingId === landlord.id}
                                    className={`p-2 rounded-full shadow transition-colors disabled:opacity-50 ${
                                        canDelete ? "bg-white/90 text-red-500 hover:bg-red-500 hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                                    title={canDelete ? "Delete" : "No permission"}
                                >
                                    {deletingId === landlord.id ? (
                                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <MdDeleteForever size={18} />
                                    )}
                                </button>
                            </div>

                            <div className="p-6 flex flex-col h-full">
                                {/* Header Info */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="relative">
                                        <div className="w-14 h-14 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 group-hover:bg-[#4285F4]/10 transition-colors">
                                            <FiUser className="text-[#4285F4]" size={28} />
                                        </div>
                                        <button
                                            onClick={() => handleOpenDetails(landlord)}
                                            className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm text-gray-500 hover:text-[#4285F4] hover:border-[#4285F4] transition-colors"
                                            title="View Details"
                                        >
                                            <MdVisibility size={12} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${
                                            landlord.owner_type === 'company' 
                                                ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                                : 'bg-green-50 text-green-700 border border-green-100'
                                        }`}>
                                            {landlord.owner_type || 'Individual'}
                                        </span>

                                        <button
                                            onClick={() => handleOpenDetails(landlord)}
                                            title={landlord.status || "Units"}
                                            className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 transition-colors ${getStatusColorClasses(landlord)}`}
                                        >
                                            <FaHome size={10} />
                                            <span>{landlord.units_count || 0} Units</span>
                                            {(landlord.live_units > 0 || (landlord.units_count > 0 && !landlord.status)) && (
                                                <span className="text-green-600 font-extrabold ml-0.5">• live</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                <h3 
                                    className="text-xl font-bold text-gray-800 mb-1 truncate hover:text-[#4285F4] cursor-pointer transition-colors" 
                                    title={landlord.name || 'Unnamed Landlord'}
                                    onClick={() => handleOpenDetails(landlord)}
                                >
                                    {landlord.name || 'Unnamed Landlord'}
                                </h3>
                                {landlord.company && (
                                    <p className="text-sm font-medium text-gray-500 mb-4 truncate" title={landlord.company}>
                                        {landlord.company}
                                    </p>
                                )}
                                
                                <div className="space-y-3 mt-auto pt-4 border-t border-gray-50">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0">
                                            <FiPhone className="text-[#4285F4]" size={12} />
                                        </div>
                                        <span className="truncate font-medium">{landlord.phone || 'No phone'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0">
                                            <FiMail className="text-[#4285F4]" size={12} />
                                        </div>
                                        <span className="truncate font-medium">{landlord.email || 'No email'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                        <div className="w-6 h-6 rounded bg-[#f8f7f5] flex items-center justify-center shrink-0">
                                            <FiMapPin className="text-[#4285F4]" size={12} />
                                        </div>
                                        <span className="truncate font-medium">{landlord.address || landlord.country || 'No address'}</span>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => handleOpenDetails(landlord)}
                                    className="mt-6 w-full flex items-center justify-center gap-2 bg-[#f8f7f5] text-[#4285F4] py-2.5 rounded-lg font-bold text-sm transition-all duration-300 hover:bg-[#4285F4] hover:text-white"
                                >
                                    <MdVisibility size={16} />
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (

                /* =========================================
                   TABLE VIEW
                ========================================= */
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-full mx-auto animate-fadeIn">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#f8f7f5] border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Owner Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Info</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Units</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {landlords.map((landlord) => (
                                    <tr key={landlord.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Name */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#f8f7f5] flex items-center justify-center border border-[#4285F4]/20 shrink-0">
                                                    <FiUser className="text-[#4285F4]" size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">{landlord.name || 'Unnamed Landlord'}</p>
                                                    {landlord.company && <p className="text-xs text-gray-500">{landlord.company}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Type */}
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${
                                                landlord.owner_type === 'company' 
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                                    : 'bg-green-50 text-green-700 border border-green-100'
                                            }`}>
                                                {landlord.owner_type || 'Individual'}
                                            </span>
                                        </td>
                                        
                                        {/* Contact */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-sm text-gray-600">
                                                <span className="flex items-center gap-2"><FiPhone size={12} className="text-gray-400" /> {landlord.phone || '—'}</span>
                                                <span className="flex items-center gap-2"><FiMail size={12} className="text-gray-400" /> {landlord.email || '—'}</span>
                                            </div>
                                        </td>
                                        
                                        {/* Units */}
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleOpenDetails(landlord)}
                                                className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 w-fit transition-colors ${getStatusColorClasses(landlord)}`}
                                            >
                                                <FaHome size={10} />
                                                <span>{landlord.units_count || 0} Units</span>
                                            </button>
                                        </td>
                                        
                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenDetails(landlord)}
                                                    className="p-2 text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <MdVisibility size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(landlord)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        canUpdate ? "text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10" : "text-gray-300 cursor-not-allowed"
                                                    }`}
                                                    title={canUpdate ? "Edit" : "No permission"}
                                                >
                                                    <MdModeEdit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(landlord)}
                                                    disabled={deletingId === landlord.id}
                                                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                                        canDelete ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-300 cursor-not-allowed"
                                                    }`}
                                                    title={canDelete ? "Delete" : "No permission"}
                                                >
                                                    {deletingId === landlord.id ? (
                                                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <MdDeleteForever size={18} />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODALS */}
            {showAddEditModal && (
                <AddEditLandLord 
                    landlord={selectedLandlord}
                    onClose={handleCloseModals}
                    onSuccess={() => {
                        handleCloseModals();
                        fetchLandlords();
                    }}
                />
            )}

            {showDetailsModal && selectedLandlord && (
                <LandLoardDetails 
                    landlord={selectedLandlord}
                    onClose={handleCloseModals}
                />
            )}

            {/* ✅ DELETE CONFIRMATION MODAL */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
                        
                        {/* Modal Header */}
                        <div className="flex justify-center pt-6 pb-4">
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                                <FiAlertTriangle className="text-red-500" size={32} />
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="px-6 pb-6">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Delete</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete the landlord <span className="font-bold text-gray-800">"{deleteConfirm.name || deleteConfirm.company}"</span>? This action cannot be undone.
                            </p>

                            {/* Modal Footer */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={deletingId === deleteConfirm.id}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteLandlord}
                                    disabled={deletingId === deleteConfirm.id}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {deletingId === deleteConfirm.id ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <MdDeleteForever size={18} />
                                            Delete
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default LandLord;