// src/components/OfferHeaderFields.jsx
import React from "react";

export function OfferHeaderFields({ offer, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="block">
        <span className="text-sm font-medium">Reference No</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.reference_no}
          onChange={(e) => onChange({ reference_no: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Date</span>
        <input
          type="date"
          className="mt-1 w-full border rounded p-2"
          value={offer.date}
          onChange={(e) => onChange({ date: e.target.value })}
        />
      </label>

      <label className="block md:col-span-2">
        <span className="text-sm font-medium">Recipient Name</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.recipient_name}
          onChange={(e) => onChange({ recipient_name: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Offer Type</span>
        <select
          className="mt-1 w-full border rounded p-2"
          value={offer.offer_type}
          onChange={(e) => onChange({ offer_type: e.target.value })}
        >
          <option value="primary">Primary / Developer</option>
          <option value="resale">Resale</option>
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-medium">Developer</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.developer || ""}
          onChange={(e) => onChange({ developer: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Sales Agent</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.sales_agent || ""}
          onChange={(e) => onChange({ sales_agent: e.target.value })}
        />
      </label>
    </div>
  );
}