// src/components/FeesEditor.jsx
import React from "react";
import { feesTotal, recomputeFeeAmount } from "../../../utils/OfferCalc";

export function FeesEditor({ basePrice, fees, onChange }) {
  const update = (idx, patch) => {
    const next = fees.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    onChange(next);
  };

  const addRow = () =>
    onChange([
      ...fees,
      {
        order: fees.length,
        name: "",
        fee_type: "percentage",
        percentage: "0",
        amount: "0",
      },
    ]);

  const removeRow = (idx) =>
    onChange(
      fees.filter((_, i) => i !== idx).map((f, i) => ({ ...f, order: i }))
    );

  // When the fee type changes, reset percentage/amount appropriately
  const handleTypeChange = (idx, newType, fee) => {
    if (newType === "percentage") {
      // keep percentage, recompute amount
      const pct = fee.percentage ?? "0";
      update(idx, {
        fee_type: "percentage",
        percentage: pct,
        amount: recomputeFeeAmount(pct, basePrice).toFixed(2),
      });
    } else {
      // fixed: clear percentage, keep amount as-is (user enters it)
      update(idx, {
        fee_type: "fixed",
        percentage: null,
        amount: String(fee.amount ?? "0"),
      });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Additional Fees</h3>
        <button
          type="button"
          onClick={addRow}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
        >
          + Add Fee
        </button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-2 text-left">Fee Name</th>
            <th className="p-2 text-left">Type</th>
            <th className="p-2 text-right">Percentage</th>
            <th className="p-2 text-right">Amount (AED)</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {fees.map((f, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">
                <input
                  className="w-full border rounded p-1"
                  value={f.name || ""}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  placeholder="Fee name"
                />
              </td>
              <td className="p-2">
                <select
                  className="w-full border rounded p-1"
                  value={f.fee_type || "percentage"}
                  onChange={(e) =>
                    handleTypeChange(idx, e.target.value, f)
                  }
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </td>
              <td className="p-2">
                <input
                  type="number"
                  className="w-20 border rounded p-1 text-right disabled:bg-slate-100"
                  value={f.percentage ?? ""}
                  placeholder="—"
                  disabled={f.fee_type === "fixed"}
                  onChange={(e) => {
                    const pct = e.target.value;
                    update(idx, {
                      percentage: pct,
                      amount: recomputeFeeAmount(pct, basePrice).toFixed(2),
                    });
                  }}
                />
              </td>
              <td className="p-2">
                <input
                  type="number"
                  className="w-32 border rounded p-1 text-right disabled:bg-slate-100"
                  value={f.amount ?? "0"}
                  disabled={f.fee_type === "percentage"}
                  onChange={(e) => update(idx, { amount: e.target.value })}
                />
              </td>
              <td className="p-2">
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="text-red-600 text-xs"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 font-semibold">
            <td className="p-2" colSpan={3}>
              Fees Total
            </td>
            <td className="p-2 text-right">
              {feesTotal(fees).toLocaleString()}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}