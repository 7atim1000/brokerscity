// src/components/OfferPreview.jsx
import React from "react";
import {
  fmt,
  n,
  feesTotal,
  installmentsTotal,
  grandTotal,
} from "../../../utils/OfferCalc";


const safe = (v) => (v === null || v === undefined || v === "" ? "—" : v);

const OFFER_TYPE_LABEL = {
  primary: "Primary / Developer",
  resale: "Resale",
};

export function OfferPreview({ offer }) {
  if (!offer) {
    return (
      <div className="p-6 text-sm text-gray-500">No offer data to preview.</div>
    );
  }

  const currency = offer.currency || "AED";
  const installments = Array.isArray(offer.installments) ? offer.installments : [];
  const fees = Array.isArray(offer.fees) ? offer.fees : [];

  const basePrice = n(offer.base_price);
  const instTotal = installmentsTotal(installments);
  const feeTotal = feesTotal(fees);
  const grand = grandTotal(offer);

  // Warn (visually) if the installment schedule doesn't sum to base price
  const instMismatch = Math.abs(instTotal - basePrice) > 0.01;

  return (
    <div
      className="bg-white text-gray-900 p-8"
      style={{
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        lineHeight: 1.4,
      }}
    >
      {/* ---------- Header ---------- */}
      <div className="flex justify-between items-start border-b-2 border-gray-800 pb-3 mb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-wide">
            OFFER LETTER
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Schedule of Installment Payments
          </p>
        </div>
        <div className="text-right text-xs">
          <p>
            <span className="font-semibold">Ref:</span>{" "}
            {safe(offer.reference_no)}
          </p>
          <p>
            <span className="font-semibold">Date:</span>{" "}
            {offer.date ? new Date(offer.date).toLocaleDateString() : "—"}
          </p>
          <p>
            <span className="font-semibold">Type:</span>{" "}
            {OFFER_TYPE_LABEL[offer.offer_type] || safe(offer.offer_type)}
          </p>
        </div>
      </div>

      {/* ---------- Recipient / Agent ---------- */}
      <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
        <div>
          <p className="text-xs uppercase text-gray-500 mb-1">To</p>
          <p className="font-semibold">{safe(offer.recipient_name)}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500 mb-1">
            Developer / Agent
          </p>
          <p>{safe(offer.developer)}</p>
          <p className="text-gray-600">{safe(offer.sales_agent)}</p>
        </div>
      </div>

      {/* ---------- Project details ---------- */}
      <Section title="Project Details">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Field label="Project" value={offer.project} />
          <Field label="Unit No" value={offer.unit_no} />
          <Field label="Unit Type" value={offer.unit_type} />
          <Field label="Unit Model" value={offer.unit_model} />
          <Field label="Bedrooms" value={offer.bedrooms} />
          <Field
            label="Handover Date"
            value={offer.estimated_completion_date}
          />
        </div>
      </Section>

      {/* ---------- Pricing ---------- */}
      <Section title="Pricing">
        <div className="flex justify-between text-sm py-1">
          <span>Base Price</span>
          <span className="font-semibold">
            {currency} {fmt(basePrice)}
          </span>
        </div>
      </Section>

      {/* ---------- Installments ---------- */}
      <Section title="Schedule of Installment Payments">
        {installments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No installments added.</p>
        ) : (
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left border-b border-gray-300 w-14">
                  Inst.
                </th>
                <th className="p-2 text-left border-b border-gray-300">
                  Milestone
                </th>
                <th className="p-2 text-right border-b border-gray-300 w-20">
                  %
                </th>
                <th className="p-2 text-right border-b border-gray-300 w-32">
                  Amount ({currency})
                </th>
              </tr>
            </thead>
            <tbody>
              {installments.map((it, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="p-2">{safe(it.inst_no)}</td>
                  <td className="p-2">{safe(it.milestone)}</td>
                  <td className="p-2 text-right">
                    {it.percentage !== null && it.percentage !== undefined && it.percentage !== ""
                      ? `${n(it.percentage)}%`
                      : "—"}
                  </td>
                  <td className="p-2 text-right">{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="p-2" colSpan={3}>
                  Total Installments
                </td>
                <td className="p-2 text-right">{fmt(instTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}
        {instMismatch && (
          <p className="text-xs text-amber-700 mt-2">
            ⚠ Installments total ({currency} {fmt(instTotal)}) does not match
            base price ({currency} {fmt(basePrice)}).
          </p>
        )}
      </Section>

      {/* ---------- Fees ---------- */}
      <Section title="Additional Fees">
        {fees.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No additional fees.</p>
        ) : (
          <table className="w-full text-sm border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left border-b border-gray-300">
                  Fee Name
                </th>
                <th className="p-2 text-left border-b border-gray-300 w-24">
                  Type
                </th>
                <th className="p-2 text-right border-b border-gray-300 w-20">
                  %
                </th>
                <th className="p-2 text-right border-b border-gray-300 w-32">
                  Amount ({currency})
                </th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f, idx) => {
                const isPct = f.fee_type === "percentage";
                return (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="p-2">
                      {safe(f.name)}
                      {f.is_vat ? (
                        <span className="ml-2 text-xs text-gray-500">(VAT)</span>
                      ) : null}
                    </td>
                    <td className="p-2 capitalize">{safe(f.fee_type)}</td>
                    <td className="p-2 text-right">
                      {isPct && f.percentage !== null && f.percentage !== undefined && f.percentage !== ""
                        ? `${n(f.percentage)}%`
                        : "—"}
                    </td>
                    <td className="p-2 text-right">{fmt(f.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td className="p-2" colSpan={3}>
                  Fees Total
                </td>
                <td className="p-2 text-right">{fmt(feeTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Section>

      {/* ---------- Grand total ---------- */}
      <div className="mt-6 border-t-2 border-gray-800 pt-3 flex justify-between items-baseline">
        <span className="text-lg font-bold uppercase">Grand Total</span>
        <span className="text-xl font-extrabold">
          {currency} {fmt(grand)}
        </span>
      </div>

      {/* ---------- Signature ---------- */}
      <div className="mt-12 grid grid-cols-2 gap-8 text-xs">
        <div>
          <div className="border-t border-gray-500 pt-1 mt-10">
            Authorized Signature
          </div>
        </div>
        <div>
          <div className="border-t border-gray-500 pt-1 mt-10">
            Recipient Signature / Date
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-500 mt-8 text-center">
        This offer is generated electronically and is valid subject to the
        signed agreement between the parties.
      </p>
    </div>
  );
}

// ---------- small helpers ----------
function Section({ title, children }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700 mb-2 border-b border-gray-300 pb-1">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-xs uppercase text-gray-500">{label}</span>
      <p className="font-medium">{safe(value)}</p>
    </div>
  );
}

export default OfferPreview;