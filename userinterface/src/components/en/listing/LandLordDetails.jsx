import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    FaUser,
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaRegFileAlt,
    FaHome,
    FaEye,
    FaArrowLeft,
    FaEdit,
    FaTimes,
    FaBed,
    FaBath,
    FaVectorSquare,
} from "react-icons/fa";
import { FiGrid, FiList, FiLink } from "react-icons/fi";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const LandLoardDetails = ({ landlord, onClose }) => {
    const [activeTab, setActiveTab] = useState("units"); // "units" | "documents"
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
    const [ownerListings, setOwnerListings] = useState([]);
    const [loading, setLoading] = useState(true);

    // =========================================================
    // FETCH OWNER'S LISTINGS
    // =========================================================
    useEffect(() => {
        const fetchListings = async () => {
            if (!landlord?.id) return;
            
            setLoading(true);
            try {
                const token = localStorage.getItem("access_token");
                // Assuming your API allows filtering listings by owner ID
                // If not, you can filter them on the frontend if you pass them through the landlord object
                const response = await fetch(`${BASE}/api/listing/?listing_owner=${landlord.id}`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    let listData = Array.isArray(data) ? data : data.results || data.listings || [];
                    setOwnerListings(listData);
                }
            } catch (error) {
                console.error("Error fetching owner listings:", error);
                // toast.error("Could not load owner's listings.");
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [landlord?.id]);

    // Fallback if landlord object is missing
    if (!landlord) return null;

    // Calculate total asking value
    const totalAskingValue = ownerListings.reduce((sum, item) => {
        const price = Number(item.sale_price || item.rent_price || item.price || 0);
        return sum + price;
    }, 0);

    const formatAmount = (val) => {
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4" dir="ltr">
            <div className="bg-[#f8f7f5] rounded-2xl shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col overflow-hidden animate-fadeIn">
                
                {/* =========================================================
                    MAIN HEADER (Top Bar)
                ========================================================= */}
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <FaArrowLeft className="text-gray-500" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                                <span>Owners</span>
                                <span>/</span>
                                <span className="font-bold text-gray-800">{landlord.name || "Unnamed Owner"}</span>
                            </div>
                            
                            {/* Owner Identity Row */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#4285F4]/10 flex items-center justify-center border border-[#4285F4]/20">
                                    <FaUser className="text-[#4285F4]" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
                                        {landlord.name}
                                        <span className="bg-[#f8f7f5] text-[10px] uppercase text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                                            {landlord.owner_type}
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <FaPhone size={10} /> {landlord.phone}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 bg-[#4285F4] text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors">
                            <FaEdit /> Edit landlord
                        </button>
                    </div>
                </div>

                {/* =========================================================
                    SCROLLABLE CONTENT BODY
                ========================================================= */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    
                    {/* 4 SUMMARY CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {/* Listings Card */}
                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                                <FaHome className="text-purple-500" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-gray-800">{ownerListings.length}</p>
                                <p className="text-xs font-bold text-gray-400 tracking-wider">LISTINGS</p>
                            </div>
                        </div>

                        {/* Live on Portals Card */}
                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                <FiLink className="text-green-500" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-gray-800">
                                    {ownerListings.filter(l => l.status === 'live' || l.confirmed).length}
                                </p>
                                <p className="text-xs font-bold text-gray-400 tracking-wider">LIVE ON PORTALS</p>
                            </div>
                        </div>

                        {/* Asking Value Card */}
                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <span className="text-blue-500 font-bold">AED</span>
                            </div>
                            <div>
                                <p className="text-xl font-extrabold text-gray-800">{formatAmount(totalAskingValue)}</p>
                                <p className="text-xs font-bold text-gray-400 tracking-wider">ASKING VALUE</p>
                            </div>
                        </div>

                        {/* Documents Card */}
                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <FaRegFileAlt className="text-indigo-500" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-gray-800">—</p>
                                <p className="text-xs font-bold text-gray-400 tracking-wider">DOCUMENTS</p>
                            </div>
                        </div>
                    </div>

                    {/* BASIC INFO TABLE */}
                    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        <div>
                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Type</p>
                            <p className="font-bold text-gray-800">{landlord.owner_type || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Phone</p>
                            <p className="font-bold text-gray-800">{landlord.phone || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Email</p>
                            <p className="font-bold text-gray-800 truncate" title={landlord.email}>{landlord.email || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">TRN</p>
                            <p className="font-bold text-gray-800">—</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">City</p>
                            <p className="font-bold text-gray-800">{landlord.country || "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Added</p>
                            <p className="font-bold text-gray-800">
                                {new Date(landlord.created_at).toLocaleDateString("en-GB", {
                                    day: 'numeric', month: 'short', year: 'numeric'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* =========================================================
                        TABS & LISTINGS GRID
                    ========================================================= */}
                    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm min-h-[400px]">
                        
                        {/* Tab Header */}
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex gap-2 bg-[#f8f7f5] p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab("units")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
                                        activeTab === "units" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-800"
                                    }`}
                                >
                                    <FaHome /> Units 
                                    <span className="bg-[#4285F4]/10 text-[#4285F4] px-2 py-0.5 rounded text-xs">
                                        {ownerListings.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab("documents")}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-sm transition-all ${
                                        activeTab === "documents" ? "bg-white text-[#4285F4] shadow-sm" : "text-gray-500 hover:text-gray-800"
                                    }`}
                                >
                                    <FaRegFileAlt /> Documents
                                </button>
                            </div>

                            {/* View Toggles & Actions */}
                            <div className="flex items-center gap-3">
                                <div className="flex bg-[#f8f7f5] p-1 rounded-lg">
                                    <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded ${viewMode === "grid" ? "bg-white shadow-sm text-[#4285F4]" : "text-gray-400"}`}>
                                        <FiGrid size={16} />
                                    </button>
                                    <button onClick={() => setViewMode("list")} className={`p-1.5 rounded ${viewMode === "list" ? "bg-white shadow-sm text-[#4285F4]" : "text-gray-400"}`}>
                                        <FiList size={16} />
                                    </button>
                                </div>
                                <button className="flex items-center gap-2 bg-[#4285F4] text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors">
                                    <FiLink /> Link a listing
                                </button>
                            </div>
                        </div>

                        {/* TAB CONTENT */}
                        {activeTab === "units" && (
                            <>
                                <div className="mb-4">
                                    <h3 className="text-lg font-extrabold text-gray-800">What this landlord holds</h3>
                                    <p className="text-sm text-gray-500">{ownerListings.length} listings. Each row is a property they give you to advertise.</p>
                                </div>

                                {/* EMPTY STATE */}
                                {ownerListings.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center">
                                        <div className="w-16 h-16 bg-[#f8f7f5] rounded-full flex items-center justify-center mb-4">
                                            <FaHome className="text-gray-300" size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-700">No Units Found</h3>
                                        <p className="text-sm text-gray-500 mb-4">This landlord does not have any units linked yet.</p>
                                        <button className="text-[#4285F4] font-bold text-sm hover:underline">Link a listing</button>
                                    </div>
                                ) : (
                                    /* LISTINGS GRID */
                                    <div className={`grid gap-5 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
                                        {ownerListings.map((listing) => (
                                            <div key={listing.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group">
                                                
                                                {/* Image Area */}
                                                <div className="relative h-48 bg-gray-100 overflow-hidden">
                                                    <img 
                                                        src={listing.cover_image || "https://placehold.co/600x400/f8f7f5/cccccc?text=No+Image"} 
                                                        alt={listing.title} 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                    
                                                    {/* LIVE Badge */}
                                                    <div className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span> LIVE
                                                    </div>

                                                    {/* Price Badge */}
                                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                                        {formatAmount(listing.sale_price || listing.rent_price || 0)}
                                                    </div>
                                                </div>

                                                {/* Content Area */}
                                                <div className="p-4">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-extrabold text-gray-800 text-sm truncate pr-2" title={listing.title || listing.property_type}>
                                                            {listing.title || listing.property_type || "Untitled Property"}
                                                        </h4>
                                                        <span className="text-[10px] bg-[#4285F4]/10 text-[#4285F4] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                                                            {listing.reference || "REF"}
                                                        </span>
                                                    </div>
                                                    
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                                                        <FaMapMarkerAlt size={10} /> {listing.location_text || "Location not specified"}
                                                    </p>

                                                    <div className="flex items-center gap-2 mb-4">
                                                        <span className="text-[10px] bg-[#f8f7f5] text-gray-600 px-2 py-1 rounded font-bold flex items-center gap-1">
                                                            <FaHome size={10} /> {listing.bedrooms || 0} bd
                                                        </span>
                                                        <span className="text-[10px] bg-[#f8f7f5] text-gray-600 px-2 py-1 rounded font-bold flex items-center gap-1">
                                                            <FaBath size={10} /> {listing.bathrooms || 0} ba
                                                        </span>
                                                        <span className="text-[10px] bg-[#f8f7f5] text-gray-600 px-2 py-1 rounded font-bold flex items-center gap-1">
                                                            <FaVectorSquare size={10} /> {listing.size || 0} sqft
                                                        </span>
                                                    </div>

                                                    <div className="flex justify-between items-end border-t border-gray-100 pt-3">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-400">Price</p>
                                                            <p className="text-sm font-extrabold text-gray-800">
                                                                AED {formatAmount(listing.sale_price || listing.rent_price || 0)}
                                                            </p>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                            {listing.offer_type || "SALE"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === "documents" && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 bg-[#f8f7f5] rounded-full flex items-center justify-center mb-4">
                                    <FaRegFileAlt className="text-gray-300" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-700">No Documents</h3>
                                <p className="text-sm text-gray-500">There are no documents uploaded for this landlord.</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LandLoardDetails;