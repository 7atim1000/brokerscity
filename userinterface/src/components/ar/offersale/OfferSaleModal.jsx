// src/components/OfferSaleModal.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { OfferSaleForm } from "./OfferSaleForm";
import { OfferPreview } from "./OfferPreview";
// import { PdfDownloadButton } from "./PdfDownloadButton";
import { emptyOffer, grandTotal } from "../../../utils/OfferCalc";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const OfferSaleModal = ({ onClose, offerData, onSuccess }) => {
  const [offer, setOffer] = useState(emptyOffer());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (offerData) {
      // normalize: DRF returns nested installments & fees
      setOffer({
        ...emptyOffer(),
        ...offerData,
        base_price: String(offerData.base_price ?? "0"),
        grand_total: String(offerData.grand_total ?? "0"),
        installments: (offerData.installments || []).map((i) => ({
          ...i,
          percentage: String(i.percentage ?? "0"),
          amount: String(i.amount ?? "0"),
        })),
        fees: (offerData.fees || []).map((f) => ({
          ...f,
          percentage: f.percentage == null ? null : String(f.percentage),
          amount: String(f.amount ?? "0"),
        })),
      });
    }
  }, [offerData]);

  // ---------- Build FormData ----------
  const buildFormData = () => {
    const fd = new FormData();
    const { installments, fees, image, ...scalar } = offer;

    Object.entries(scalar).forEach(([k, v]) => {
      if (v === null || v === undefined || k === "id") return;
      fd.append(k, String(v));
    });

    if (image) fd.append("image", image);

    // DRF multipart: nested lists as JSON strings
    fd.append("installments", JSON.stringify(installments || []));
    fd.append("fees", JSON.stringify(fees || []));
    return fd;
  };

  // ---------- Save (create or update) ----------
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Please log in");
        setSaving(false);
        return;
      }

      const isUpdate = Boolean(offer.id);
      const url = isUpdate
        ? `${BASE}/api/offersales/${offer.id}/`
        : `${BASE}/api/offersales/`;
      const method = isUpdate ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          // do NOT set Content-Type for FormData; browser does it
        },
        body: buildFormData(),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Save errors:", data);
        toast.error(isUpdate ? "Failed to update offer" : "Failed to create offer");
        setSaving(false);
        return;
      }

      toast.success(isUpdate ? "✅ Offer updated" : "✅ Offer created");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("❌ Error while saving offer");
    } finally {
      setSaving(false);
    }
  };

  // Keep grand_total in sync before save
  useEffect(() => {
    const gt = grandTotal(offer).toFixed(2);
    if (String(offer.grand_total) !== gt) {
      setOffer((o) => ({ ...o, grand_total: gt }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer.base_price, offer.fees]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white w-full max-w-7xl rounded-xl shadow-2xl my-6">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b">
          <h3 className="text-xl font-bold text-gray-800">
            {offer.id ? "Edit Offer Sale" : "New Offer Sale"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body: 2-col — form | live preview */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 p-6">
          <div>
            <OfferSaleForm offer={offer} onChange={setOffer} />
          </div>
          <div>
            <h4 className="text-md font-semibold mb-2">Preview</h4>
            <div id="offer-preview" className="border rounded-lg overflow-auto">
              <OfferPreview offer={offer} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t bg-slate-50 rounded-b-xl">
          {/* <PdfDownloadButton
            elementId="offer-preview"
            fileName={`Offer-${(offer.project || "draft").replace(/\s+/g, "-")}.pdf`}
          /> */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded bg-[#a47d52] hover:bg-[#8a6a44] text-white font-bold disabled:opacity-50"
            >
              {saving ? "Saving..." : offer.id ? "Update" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferSaleModal;