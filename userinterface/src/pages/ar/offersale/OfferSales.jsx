// src/pages/OfferSales.jsx
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { CiEdit } from "react-icons/ci";
import { MdDeleteForever } from "react-icons/md";

import OfferSaleModal from "../../../components/ar/offersale/OfferSaleModal";
import { fmt } from "../../../utils/OfferCalc";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const OfferSales = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [error, setError] = useState("");

  // ---------- Fetch offers ----------
  const fetchOffers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Please log in to view offers");
        setLoading(false);
        return;
      }

      const response = await fetch(`${BASE}/api/offersales/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please log in again");
        } else {
          toast.error("Failed to load offers");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setOffers(list);
      setLoading(false);
    } catch (err) {
      setError("Failed to load offers");
      setLoading(false);
      console.error("Error fetching offers:", err);
      toast.error("❌ Error while fetching offers");
    }
  };

  // ---------- Fetch single offer (detail) ----------
  const fetchOfferDetail = async (id) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${BASE}/api/offersales/${id}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error("Error fetching offer detail:", err);
      toast.error("❌ Failed to load offer details");
      return null;
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // ---------- Delete ----------
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this offer?")) return;
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Please log in");
        return;
      }

      const response = await fetch(`${BASE}/api/offersales/${id}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please log in again");
        } else {
          toast.error("Failed to delete offer");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success("✅ Offer deleted successfully");
      fetchOffers();
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("❌ Error while deleting offer");
    }
  };

  // ---------- Edit ----------
  const handleUpdate = async (offer) => {
    const detail = await fetchOfferDetail(offer.id);
    if (detail) {
      setSelectedOffer(detail);
      setShowModal(true);
    }
  };

  // ---------- Add ----------
  const handleAdd = () => {
    setSelectedOffer(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedOffer(null);
    fetchOffers();
  };

  // ---------- Filter ----------
  const filteredOffers = offers.filter((o) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      (o.reference_no || "").toLowerCase().includes(s) ||
      (o.project || "").toLowerCase().includes(s) ||
      (o.recipient_name || "").toLowerCase().includes(s) ||
      (o.unit_no || "").toLowerCase().includes(s);
    const matchesType = filterType ? o.offer_type === filterType : true;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type) => {
    if (type === "primary") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
          Primary
        </span>
      );
    }
    if (type === "resale") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          Resale
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
        {type || "-"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f7f5] py-10 px-5 md:py-12 md:px-8 lg:py-5 lg:px-0">
      <ToastContainer
        position="top-center"
        autoClose={3000}
        closeOnClick
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center max-w-full mx-auto px-4 md:px-3 mb-8 md:mb-10 lg:mb-12 gap-4 lg:shadow-lg">
        <div className="text-center sm:text-right">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-gray-800 tracking-wide">
            Offer Sales
          </h2>
          <p className="text-base md:text-lg text-gray-600 mt-1">
            Manage sale offers, payment plans & PDFs
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="bg-[#a47d52] cursor-pointer text-white px-6 md:px-8 py-3 rounded-sm font-extrabold text-sm md:text-base uppercase tracking-wide transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 hover:shadow-lg active:scale-95 whitespace-nowrap"
            onClick={handleAdd}
          >
            + Add Offer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-full mx-auto px-4 md:px-3 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="Search by reference, project, recipient, unit..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-1/4">
            <select
              className="w-full px-4 py-3 cursor-pointer rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#a47d52] focus:border-transparent bg-white"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="primary">Primary / Developer</option>
              <option value="resale">Resale</option>
            </select>
          </div>
          <div className="w-full md:w-auto">
            <span className="text-gray-600 text-sm">
              Offers: {filteredOffers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-full mx-auto px-4 md:px-3">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a47d52]"></div>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">No offers found</p>
              <p className="text-gray-400 text-sm mt-2">Add a new offer to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#e9e6e1] text-[#a47d52]">
                  <tr>
                    <th className="px-6 py-4 text-right text-sm font-bold">#</th>
                    <th className="px-6 py-4 text-right text-sm font-bold">Reference</th>
                    <th className="px-6 py-4 text-right text-sm font-bold">Recipient</th>
                    <th className="px-6 py-4 text-right text-sm font-bold">Project</th>
                    <th className="px-6 py-4 text-right text-sm font-bold">Type</th>
                    <th className="px-6 py-4 text-right text-sm font-bold">Base Price</th>
                    <th className="px-6 py-4 text-right text-sm font-bold">Grand Total</th>
                    <th className="px-6 py-4 text-right text-sm font-bold">Date</th>
                    <th className="px-6 py-4 text-center text-sm font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOffers.map((o, index) => (
                    <tr
                      key={o.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 text-right text-sm text-gray-700">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-800">
                        {o.reference_no || "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700">
                        {o.recipient_name || "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700">
                        {o.project || "-"}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        {getTypeBadge(o.offer_type)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700">
                        {o.currency} {fmt(o.base_price)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-700">
                        {o.currency} {fmt(o.grand_total)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-600">
                        {o.date ? new Date(o.date).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleUpdate(o)}
                            className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-105"
                            title="Edit"
                          >
                            <CiEdit className="text-green-600" size="22" />
                          </button>
                          <button
                            onClick={() => handleDelete(o.id)}
                            className="px-2 py-2 cursor-pointer bg-white rounded-lg transition-all duration-200 hover:scale-105"
                            title="Delete"
                          >
                            <MdDeleteForever className="text-red-600" size="22" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <OfferSaleModal
          onClose={handleModalClose}
          offerData={selectedOffer}
          onSuccess={fetchOffers}
        />
      )}
    </div>
  );
};

export default OfferSales;