// src/components/InstallmentsEditor.jsx
import React from "react";
import { installmentsTotal, recomputeInstallmentAmount } from "../../../utils/OfferCalc" ;


export function InstallmentsEditor({ basePrice, installments, onChange }) {
  const update = (idx, patch) => {
    const next = installments.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange(next);
  };

  const addRow = () =>
    onChange([
      ...installments,
      {
        order: installments.length,
        inst_no: installments.length + 1,
        milestone: "",
        percentage: "0",
        amount: "0",
      },
    ]);

  const removeRow = (idx) =>
    onChange(
      installments
        .filter((_, i) => i !== idx)
        .map((it, i) => ({ ...it, order: i, inst_no: i + 1 }))
    );

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Schedule of Installment Payments</h3>
        <button
          type="button"
          onClick={addRow}
          className="text-sm bg-blue-600 text-white px-3 py-1 rounded"
        >
          + Add Installment
        </button>
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-2 text-left">Inst.</th>
            <th className="p-2 text-left">Milestone</th>
            <th className="p-2 text-right">Percentage</th>
            <th className="p-2 text-right">Amount (AED)</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {installments.map((it, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">
                <input
                  type="number"
                  className="w-16 border rounded p-1"
                  value={it.inst_no}
                  onChange={(e) => update(idx, { inst_no: Number(e.target.value) })}
                />
              </td>
              <td className="p-2">
                <input
                  className="w-full border rounded p-1"
                  value={it.milestone}
                  onChange={(e) => update(idx, { milestone: e.target.value })}
                />
              </td>
              <td className="p-2">
                <input
                  type="number"
                  className="w-20 border rounded p-1 text-right"
                  value={it.percentage}
                  onChange={(e) => {
                    const pct = e.target.value;
                    update(idx, {
                      percentage: pct,
                      amount: recomputeInstallmentAmount(pct, basePrice).toFixed(2),
                    });
                  }}
                />
              </td>
              <td className="p-2">
                <input
                  type="number"
                  className="w-32 border rounded p-1 text-right"
                  value={it.amount}
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
              Total
            </td>
            <td className="p-2 text-right">
              {installmentsTotal(installments).toLocaleString()}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}