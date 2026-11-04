// src/components/OfferSaleForm.jsx
import React from "react";
import { OfferHeaderFields } from "./OfferHeaderFields";
import { OfferProjectFields } from "./OfferProjectFields";
import { InstallmentsEditor } from "./InstallmentsEditor";
import { FeesEditor } from "./FeesEditor";
import { feesTotal, grandTotal } from "../../../utils/OfferCalc";

export function OfferSaleForm({ offer, onChange }) {
  const patch = (p) => onChange({ ...offer, ...p });

  return (
    <div className="space-y-6">
      <OfferHeaderFields offer={offer} onChange={patch} />
      <OfferProjectFields offer={offer} onChange={patch} />

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Base Price</span>
          <input
            type="number"
            className="mt-1 w-full border rounded p-2"
            value={offer.base_price}
            onChange={(e) => patch({ base_price: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Grand Total (computed)</span>
          <input
            readOnly
            className="mt-1 w-full border rounded p-2 bg-slate-100"
            value={grandTotal(offer).toFixed(2)}
          />
        </label>
      </div>

      <InstallmentsEditor
        basePrice={offer.base_price}
        installments={offer.installments}
        onChange={(installments) => patch({ installments })}
      />

      <FeesEditor
        basePrice={offer.base_price}
        fees={offer.fees}
        onChange={(fees) =>
          patch({
            fees,
            grand_total: grandTotal({ ...offer, fees }).toFixed(2),
          })
        }
      />

      <div className="text-right text-lg font-semibold">
        Fees Total: AED {feesTotal(offer.fees).toLocaleString()}
      </div>
    </div>
  );
}