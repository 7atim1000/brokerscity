import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
    MdDeleteForever, 
    MdModeEdit, 
    MdVisibility 
} from 'react-icons/md';
import { 
    FiHome, 
    FiMapPin, 
    FiLock, 
    FiGrid, 
    FiList, 
    FiAlertTriangle,
    FiTag,
    FiLayers
} from 'react-icons/fi';
import { 
    FaBuilding, 
    FaPlus, 
    FaBed, 
    FaBath, 
    FaVectorSquare 
} from 'react-icons/fa';

import AddEditListing from "../../components/en/listing/AddEditListing";
import ListingDetail from "../../components/en/listing/ListingDetail";
import { usePermissions } from "../context/PermissionsContext"; 

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const Listing = () => {
    const { permissions } = usePermissions(); 
    
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Modal State
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedListing, setSelectedListing] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // View Mode State (Cards vs Table)
    const [viewMode, setViewMode] = useState("cards"); 

    // Permissions
    const canViewAll = permissions?.view_all_listing === true;
    const canCreate = permissions?.create_new_listing === true;
    const canUpdate = permissions?.update_listing === true;
    const canDelete = permissions?.delete_listing === true;

    // =========================================================
    // FETCH DATA
    // =========================================================
    const fetchListings = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('access_token');
            
            if (!token) {
                toast.error('Please login to view Listings');
                setLoading(false);
                window.location.href = '/login';
                return;
            }

            const response = await fetch(`${BASE}/api/crmlistings/`, {
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
                    toast.error('Failed to load Listings');
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            let listingsData = [];
            if (Array.isArray(data)) {
                listingsData = data;
            } else if (data.results && Array.isArray(data.results)) {
                listingsData = data.results;
            }

            setListings(listingsData);
            setLoading(false);
        } catch (err) {
            setError('Failed to load Listings');
            setLoading(false);
            console.error('Error fetching listings:', err);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    // =========================================================
    // ACTIONS
    // =========================================================
    const handleOpenCreate = () => {
        if (!canCreate) {
            toast.error("You don't have permission to create listings.");
            return;
        }
        setSelectedListing(null);
        setShowAddEditModal(true);
    };

    const handleOpenEdit = (listing) => {
        if (!canUpdate) {
            toast.error("You don't have permission to edit listings.");
            return;
        }
        setSelectedListing(listing);
        setShowAddEditModal(true);
    };

    const handleOpenDetails = (listing) => {
        setSelectedListing(listing);
        setShowDetailsModal(true);
    };

    const confirmDelete = (listing) => {
        if (!canDelete) {
            toast.error("You don't have permission to delete listings.");
            return;
        }
        setDeleteConfirm(listing);
    };

    const handleDeleteListing = async () => {
        if (!deleteConfirm) return;
        
        const id = deleteConfirm.id;
        setDeletingId(id);
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE}/api/crmlistings/${id}/delete/`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                toast.error('Failed to delete listing');
                return;
            }

            setListings(prev => prev.filter(item => item.id !== id));
            toast.success(`✅ Listing deleted successfully!`);
            setDeleteConfirm(null);
        } catch (err) {
            toast.error('Server connection error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleCloseModals = () => {
        setShowAddEditModal(false);
        setShowDetailsModal(false);
        setSelectedListing(null);
        setDeleteConfirm(null);
    };

    // =========================================================
    // HELPERS
    // =========================================================
    const formatAmount = (amount) => {
        if (!amount) return "0";
        return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount);
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'live': return 'bg-green-50 text-green-700 border-green-200';
            case 'under mou': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'under reservation': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'sold': 
            case 'rented': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-600 border-gray-200'; // Draft
        }
    };

    // =========================================================
    // RENDER
    // =========================================================
    if (loading) {
        return (
            <div dir="ltr" className="min-h-screen bg-white flex flex-col justify-center items-center gap-5">
                <div className="w-12 h-12 border-4 border-[#f8f7f5] border-t-[#4285F4] rounded-full animate-spin"></div>
                <p className="text-[#4285F4] text-lg font-extrabold">Loading Listings...</p>
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
                    onClick={fetchListings}
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
                        <FiLayers className="text-[#4285F4]" />
                        Listings Management
                    </h2>
                    
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                        {canViewAll ? (
                            <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">
                                Viewing: All Listings
                            </span>
                        ) : (
                            <span className="bg-orange-50 text-orange-600 text-xs font-bold px-2 py-1 rounded-md border border-orange-100 flex items-center gap-1">
                                <FiLock size={10} /> Viewing: My Listings
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* View Mode Toggles */}
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

                    <button 
                        className={`flex items-center justify-center gap-2 px-6 md:px-8 py-3 rounded-lg font-bold text-sm md:text-base transition-all duration-300 whitespace-nowrap flex-1 sm:flex-none ${
                            canCreate 
                                ? "bg-[#4285F4] text-white hover:bg-blue-600 hover:shadow-lg hover:-translate-y-0.5" 
                                : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        onClick={handleOpenCreate}
                    >
                        <FaPlus />
                        Add New Listing
                    </button>
                </div>
            </div>

            <hr className="border-t-2 border-gray-100 max-w-full mx-auto mb-8" />

            {/* EMPTY STATE */}
            {listings.length === 0 ? (
                <div className="flex flex-col justify-center items-center gap-4 p-10 text-center bg-[#f8f7f5] rounded-2xl border border-gray-100 max-w-3xl mx-auto shadow-sm">
                    <span className="text-6xl">🏠</span>
                    <h3 className="text-2xl font-extrabold text-gray-800">
                        {canViewAll ? "No Listings Found" : "You haven't created any Listings yet"}
                    </h3>
                    <p className="text-gray-500">
                        {canViewAll ? "There are no listings registered in the system." : "Start by adding your first property listing."}
                    </p>
                    <button 
                        className={`mt-4 px-8 py-3 rounded-lg font-bold transition-all ${
                            canCreate ? "bg-[#4285F4] text-white hover:bg-blue-600 hover:scale-105" : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        onClick={handleOpenCreate}
                    >
                        Add Listing
                    </button>
                </div>
            ) : viewMode === "cards" ? (
                
                /* =========================================
                   CARD VIEW
                ========================================= */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-full mx-auto animate-fadeIn">
                    {listings.map((listing) => (
                        <div 
                            key={listing.id} 
                            className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1 relative group flex flex-col"
                        >
                            {/* Action Buttons */}
                            <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleOpenEdit(listing)}
                                    className={`p-2 rounded-full shadow transition-colors ${
                                        canUpdate ? "bg-white/90 text-gray-600 hover:bg-[#4285F4] hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                                    title={canUpdate ? "Edit" : "No permission"}
                                >
                                    <MdModeEdit size={18} />
                                </button>
                                <button
                                    onClick={() => confirmDelete(listing)}
                                    disabled={deletingId === listing.id}
                                    className={`p-2 rounded-full shadow transition-colors disabled:opacity-50 ${
                                        canDelete ? "bg-white/90 text-red-500 hover:bg-red-500 hover:text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                                    title={canDelete ? "Delete" : "No permission"}
                                >
                                    {deletingId === listing.id ? (
                                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <MdDeleteForever size={18} />
                                    )}
                                </button>
                            </div>

                            {/* Image Area */}
                            <div className="relative h-48 bg-gray-100 overflow-hidden cursor-pointer" onClick={() => handleOpenDetails(listing)}>
                                <img 
                                    src={listing.cover_image || "https://placehold.co/600x400/f8f7f5/cccccc?text=No+Image"} 
                                    alt={listing.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                
                                {/* Status Badge */}
                                <div className={`absolute top-3 left-3 text-[10px] uppercase font-bold px-2.5 py-1 rounded border shadow-sm ${getStatusColor(listing.status)}`}>
                                    {listing.status || "Draft"}
                                </div>

                                {/* Reference Badge */}
                                <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                    {listing.reference || "REF"}
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-5 flex flex-col flex-1">
                                <h3 
                                    className="text-lg font-bold text-gray-800 mb-1 truncate hover:text-[#4285F4] cursor-pointer transition-colors" 
                                    title={listing.title || 'Untitled Listing'}
                                    onClick={() => handleOpenDetails(listing)}
                                >
                                    {listing.title || 'Untitled Listing'}
                                </h3>
                                <p className="text-xs text-gray-500 flex items-center gap-1 mb-4 truncate">
                                    <FiMapPin size={12} /> {listing.location_text || "Location not specified"}
                                </p>

                                {/* Specs */}
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-[11px] bg-[#f8f7f5] text-gray-600 px-2 py-1 rounded font-bold flex items-center gap-1">
                                        <FaBed size={12} /> {listing.bedrooms || 0} bd
                                    </span>
                                    <span className="text-[11px] bg-[#f8f7f5] text-gray-600 px-2 py-1 rounded font-bold flex items-center gap-1">
                                        <FaBath size={12} /> {listing.bathrooms || 0} ba
                                    </span>
                                    <span className="text-[11px] bg-[#f8f7f5] text-gray-600 px-2 py-1 rounded font-bold flex items-center gap-1">
                                        <FaVectorSquare size={12} /> {listing.size || 0} sqft
                                    </span>
                                </div>

                                {/* Price & Actions */}
                                <div className="mt-auto border-t border-gray-100 pt-4 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Asking Price</p>
                                        <p className="text-base font-extrabold text-[#4285F4]">
                                            AED {formatAmount(listing.sale_price || listing.rent_price_yearly || 0)}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleOpenDetails(listing)}
                                        className="p-2.5 bg-[#f8f7f5] text-[#4285F4] rounded-lg hover:bg-[#4285F4] hover:text-white transition-colors shadow-sm"
                                    >
                                        <MdVisibility size={18} />
                                    </button>
                                </div>
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
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Property</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price (AED)</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {listings.map((listing) => (
                                    <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                                        {/* Property */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                                                    <img 
                                                        src={listing.cover_image || "https://placehold.co/100x100/f8f7f5/cccccc?text=Img"} 
                                                        alt="" 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 truncate max-w-[200px]">{listing.title || 'Untitled'}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{listing.location_text || 'No location'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* Status */}
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded border ${getStatusColor(listing.status)}`}>
                                                {listing.status || "Draft"}
                                            </span>
                                        </td>
                                        
                                        {/* Details */}
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs text-gray-600">
                                                <span className="flex items-center gap-1"><FaBed className="text-gray-400" /> {listing.bedrooms || 0} Beds | <FaBath className="text-gray-400" /> {listing.bathrooms || 0} Baths</span>
                                                <span className="flex items-center gap-1"><FaVectorSquare className="text-gray-400" /> {listing.size || 0} sqft</span>
                                            </div>
                                        </td>
                                        
                                        {/* Price */}
                                        <td className="px-6 py-4 font-extrabold text-[#4285F4]">
                                            {formatAmount(listing.sale_price || listing.rent_price_yearly || 0)}
                                        </td>
                                        
                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenDetails(listing)}
                                                    className="p-2 text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <MdVisibility size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenEdit(listing)}
                                                    className={`p-2 rounded-lg transition-colors ${
                                                        canUpdate ? "text-gray-400 hover:text-[#4285F4] hover:bg-[#4285F4]/10" : "text-gray-300 cursor-not-allowed"
                                                    }`}
                                                >
                                                    <MdModeEdit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(listing)}
                                                    disabled={deletingId === listing.id}
                                                    className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                                        canDelete ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-300 cursor-not-allowed"
                                                    }`}
                                                >
                                                    {deletingId === listing.id ? (
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

            {/* =========================================
                MODALS
            ========================================= */}
            {showAddEditModal && (
                <AddEditListing 
                    listing={selectedListing}
                    onClose={handleCloseModals}
                    onSuccess={() => {
                        handleCloseModals();
                        fetchListings();
                    }}
                />
            )}

            {showDetailsModal && selectedListing && (
                <ListingDetail 
                    listing={selectedListing}
                    onClose={handleCloseModals}
                />
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn" dir="ltr">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col text-center">
                        <div className="flex justify-center pt-6 pb-4">
                            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
                                <FiAlertTriangle className="text-red-500" size={32} />
                            </div>
                        </div>

                        <div className="px-6 pb-6">
                            <h3 className="text-xl font-extrabold text-gray-800 mb-2">Confirm Delete</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete the listing <span className="font-bold text-gray-800">"{deleteConfirm.title || deleteConfirm.reference}"</span>? This action cannot be undone.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={deletingId === deleteConfirm.id}
                                    className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteListing}
                                    disabled={deletingId === deleteConfirm.id}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-red-500 text-white font-bold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
                                >
                                    {deletingId === deleteConfirm.id ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <MdDeleteForever size={18} />
                                    )}
                                    {deletingId === deleteConfirm.id ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};



export default Listing;