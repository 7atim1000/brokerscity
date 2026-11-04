// src/components/OfferProjectFields.jsx
import React from "react";

export function OfferProjectFields({ offer, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="block md:col-span-2">
        <span className="text-sm font-medium">Project</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.project}
          onChange={(e) => onChange({ project: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Unit No</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.unit_no || ""}
          onChange={(e) => onChange({ unit_no: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Unit Type</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.unit_type || ""}
          onChange={(e) => onChange({ unit_type: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Unit Model</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.unit_model || ""}
          onChange={(e) => onChange({ unit_model: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Bedrooms</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.bedrooms || ""}
          onChange={(e) => onChange({ bedrooms: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Handover Date</span>
        <input
          className="mt-1 w-full border rounded p-2"
          placeholder="1/1/2027"
          value={offer.estimated_completion_date || ""}
          onChange={(e) => onChange({ estimated_completion_date: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">Currency</span>
        <input
          className="mt-1 w-full border rounded p-2"
          value={offer.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
        />
      </label>
    </div>
  );
}