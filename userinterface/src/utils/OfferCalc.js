// src/utils/offerCalc.js

export const n = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const x = typeof v === "number" ? v : parseFloat(v);
  return Number.isNaN(x) ? 0 : x;
};

export const installmentsTotal = (list = []) =>
  list.reduce((s, i) => s + n(i.amount), 0);

export const feesTotal = (list = []) =>
  list.reduce((s, f) => s + n(f.amount), 0);

export const grandTotal = (offer) =>
  n(offer?.base_price) + feesTotal(offer?.fees);

export const recomputeInstallmentAmount = (pct, basePrice) =>
  (n(basePrice) * n(pct)) / 100;

export const recomputeFeeAmount = (pct, basePrice) =>
  (n(basePrice) * n(pct)) / 100;

export const fmt = (v) =>
  Number(v ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const emptyOffer = () => ({
  reference_no: "",
  date: new Date().toISOString().slice(0, 10),
  recipient_name: "",
  offer_type: "primary",
  developer: "",
  sales_agent: "",

  project: "",
  unit_no: "",
  estimated_completion_date: "",

  unit_type: "",
  unit_model: "",
  bedrooms: "",

  currency: "AED",
  base_price: "0",
  grand_total: "0",

  installments: [
    { order: 0, inst_no: 1, milestone: "Down Payment", percentage: "20", amount: "0" },
    { order: 1, inst_no: 2, milestone: "Handover",     percentage: "80", amount: "0" },
  ],
  fees: [
    { order: 0, name: "Municipality Fee", fee_type: "percentage", percentage: "2", amount: "0" },
    { order: 1, name: "Office Fee",       fee_type: "percentage", percentage: "2", amount: "0" },
    { order: 2, name: "VAT (5%)",         fee_type: "percentage", percentage: "5", amount: "0", is_vat: true },
    { order: 3, name: "NOC",              fee_type: "fixed",      percentage: null, amount: "5000" },
  ],
});