import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import {
    FaSave,
    FaUserTie,
    FaBuilding,
    FaCalendarAlt,
    FaMoneyBillWave,
    FaSearch,
    FaCheck,
    FaUser,
    FaPhone,
    FaEnvelope,
    FaMapMarkerAlt,
    FaHashtag,
    FaCalculator,
} from "react-icons/fa";

import { MdClose } from "react-icons/md";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const RentAddEdit = ({ rent = null, onClose, onSuccess }) => {
    const isEditMode = Boolean(rent?.id);

    /* =========================================================
       STATE
    ========================================================= */

    const [formData, setFormData] = useState({
        rental_name: rent?.rental_name?.id ?? rent?.rental_name ?? "",
        unit_name: rent?.unit_name?.id ?? rent?.unit_name ?? "",
        start_date: rent?.start_date ?? "",
        end_date: rent?.end_date ?? "",
        installment_no: rent?.installment_no ?? "",
        // Total contract value sent to backend
        installment_amount: rent?.installment_amount ?? "",
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // Data lists
    const [rentals, setRentals] = useState([]);
    const [units, setUnits] = useState([]);

    const [loadingRentals, setLoadingRentals] = useState(true);
    const [loadingUnits, setLoadingUnits] = useState(true);

    // Search inputs
    const [rentalSearch, setRentalSearch] = useState("");
    const [unitSearch, setUnitSearch] = useState("");

    /* =========================================================
       FETCH RENTALS
    ========================================================= */

    useEffect(() => {
        let cancelled = false;

        const fetchRentals = async () => {
            setLoadingRentals(true);

            try {
                const token = localStorage.getItem("access_token");

                const res = await fetch(`${BASE}/api/rentals/`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error("فشل تحميل المستأجرين");

                const data = await res.json();

                let list = [];
                if (Array.isArray(data)) list = data;
                else if (Array.isArray(data.results)) list = data.results;
                else if (Array.isArray(data.rentals)) list = data.rentals;

                if (!cancelled) setRentals(list);
            } catch (err) {
                console.error("Fetch rentals error:", err);
                if (!cancelled)
                    toast.error("❌ فشل تحميل قائمة المستأجرين");
            } finally {
                if (!cancelled) setLoadingRentals(false);
            }
        };

        fetchRentals();

        return () => {
            cancelled = true;
        };
    }, []);

    /* =========================================================
       FETCH UNITS
    ========================================================= */

    useEffect(() => {
        let cancelled = false;

        const fetchUnits = async () => {
            setLoadingUnits(true);

            try {
                const token = localStorage.getItem("access_token");

                const res = await fetch(`${BASE}/api/units/`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) throw new Error("فشل تحميل الوحدات");

                const data = await res.json();

                let list = [];
                if (Array.isArray(data)) list = data;
                else if (Array.isArray(data.results)) list = data.results;
                else if (Array.isArray(data.units)) list = data.units;

                if (!cancelled) setUnits(list);
            } catch (err) {
                console.error("Fetch units error:", err);
                if (!cancelled)
                    toast.error("❌ فشل تحميل قائمة الوحدات");
            } finally {
                if (!cancelled) setLoadingUnits(false);
            }
        };

        fetchUnits();

        return () => {
            cancelled = true;
        };
    }, []);

    /* =========================================================
       HELPERS — RENTAL / UNIT / BUILDING / OWNER
    ========================================================= */

    const getRentalName = (r) =>
        r?.name ||
        r?.rental_name ||
        r?.tenant_name ||
        `#${r?.id ?? "-"}`;

    const getRentalNationality = (r) =>
        r?.nationality || r?.nationality_name || "-";

    const getRentalPhone = (r) => r?.phone_1 || r?.phone || "-";

    const getRentalEmail = (r) => r?.email || "-";

    const getUnitName = (u) => u?.name || `Unit #${u?.id ?? "-"}`;

    const getUnitPrice = (u) => u?.price;

    const getUnitSecurityDeposit = (u) => u?.security_deposit;

    const getUnitBuilding = (u) => {
        const category = u?.category_details || u?.category;
        if (!category) return null;
        if (typeof category === "string") return { name: category };
        return category;
    };

    const getBuildingName = (u) => {
        const b = getUnitBuilding(u);
        if (!b) return "-";
        return b.name || `Building #${b.id ?? "-"}`;
    };

    const getBuildingType = (u) => {
        const b = getUnitBuilding(u);
        if (!b) return "-";
        const map = { building: "عمارة", vila: "فيلا" };
        return map[b.type] || b.type || "-";
    };

    const getBuildingStatus = (u) => {
        const b = getUnitBuilding(u);
        if (!b) return "-";
        const map = { residential: "سكني", commercial: "تجاري" };
        return map[b.status] || b.status || "-";
    };

    const getBuildingLocation = (u) => {
        const b = getUnitBuilding(u);
        if (!b) return "-";
        return b.location || "-";
    };

    const getBuildingArea = (u) => {
        const b = getUnitBuilding(u);
        if (!b) return "-";
        return b.area || "-";
    };

    const getBuildingOwner = (u) => {
        const b = getUnitBuilding(u);
        if (!b) return null;
        const owner = b.owner_details || b.owner;
        if (!owner) return null;
        if (typeof owner === "string") return { name: owner };
        return owner;
    };

    const getOwnerName = (u) => {
        const o = getBuildingOwner(u);
        if (!o) return "-";
        return o.name || o.full_name || o.owner_name || "-";
    };

    const getOwnerPhone = (u) => {
        const o = getBuildingOwner(u);
        if (!o) return "-";
        return o.phone || o.phone_1 || o.mobile || "-";
    };

    const getOwnerAddress = (u) => {
        const o = getBuildingOwner(u);
        if (!o) return "-";
        return o.address || "-";
    };

    /* =========================================================
       SELECTED OBJECTS
    ========================================================= */

    const selectedRental = useMemo(() => {
        if (!formData.rental_name) return null;
        return (
            rentals.find(
                (r) => String(r.id) === String(formData.rental_name)
            ) || null
        );
    }, [rentals, formData.rental_name]);

    const selectedUnit = useMemo(() => {
        if (!formData.unit_name) return null;
        return (
            units.find(
                (u) => String(u.id) === String(formData.unit_name)
            ) || null
        );
    }, [units, formData.unit_name]);

    /* =========================================================
       LIVE COMPUTED PREVIEWS
    ========================================================= */

    // Total months between start_date and end_date
    const computedTotalMonths = useMemo(() => {
        if (!formData.start_date || !formData.end_date) return null;

        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        if (isNaN(start) || isNaN(end) || end < start) return null;

       
        const months =
            (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth()) +1;

        return Math.max(months, 0);
    }, [formData.start_date, formData.end_date]);

    // Per-installment preview (what backend will store)
    const computedPerInstallment = useMemo(() => {
        const total = Number(formData.installment_amount);
        const count = Number(formData.installment_no);
        if (!total || !count || count <= 0) return null;
        return (total / count).toFixed(2);
    }, [formData.installment_amount, formData.installment_no]);

    /* =========================================================
       FILTERED LISTS
    ========================================================= */

    const filteredRentals = useMemo(() => {
        const s = rentalSearch.trim().toLowerCase();
        if (!s) return rentals;

        return rentals.filter((r) => {
            return (
                String(getRentalName(r)).toLowerCase().includes(s) ||
                String(getRentalNationality(r)).toLowerCase().includes(s) ||
                String(getRentalPhone(r)).toLowerCase().includes(s) ||
                String(getRentalEmail(r)).toLowerCase().includes(s)
            );
        });
    }, [rentals, rentalSearch]);

    const filteredUnits = useMemo(() => {
        const s = unitSearch.trim().toLowerCase();
        if (!s) return units;

        return units.filter((u) => {
            return (
                String(getUnitName(u)).toLowerCase().includes(s) ||
                String(getBuildingName(u)).toLowerCase().includes(s) ||
                String(getBuildingLocation(u)).toLowerCase().includes(s)
            );
        });
    }, [units, unitSearch]);

    /* =========================================================
       CHANGE HANDLERS
    ========================================================= */

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleSelectRental = (rental) => {
        setFormData((prev) => ({
            ...prev,
            rental_name: rental.id,
        }));
        setErrors((prev) => ({ ...prev, rental_name: "" }));
    };

    const handleSelectUnit = (unit) => {
        setFormData((prev) => ({
            ...prev,
            unit_name: unit.id,
            // Auto-fill the TOTAL contract value from the unit price
            installment_amount:
                unit?.price ?? prev.installment_amount ?? "",
        }));
        setErrors((prev) => ({
            ...prev,
            unit_name: "",
            installment_amount: "",
        }));
    };

    const handleClearRental = () => {
        setFormData((prev) => ({ ...prev, rental_name: "" }));
    };

    const handleClearUnit = () => {
        setFormData((prev) => ({
            ...prev,
            unit_name: "",
            installment_amount: "",
        }));
    };

    /* =========================================================
       VALIDATION
    ========================================================= */

    const validateForm = () => {
        const newErrors = {};

        if (!formData.rental_name) {
            newErrors.rental_name = "يرجى اختيار المستأجر.";
        }

        if (!formData.unit_name) {
            newErrors.unit_name = "يرجى اختيار الوحدة.";
        }

        if (!formData.start_date) {
            newErrors.start_date = "تاريخ البداية مطلوب.";
        }

        if (!formData.end_date) {
            newErrors.end_date = "تاريخ النهاية مطلوب.";
        }

        if (
            formData.start_date &&
            formData.end_date &&
            formData.end_date < formData.start_date
        ) {
            newErrors.end_date =
                "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.";
        }

        if (
            formData.installment_no === "" ||
            Number(formData.installment_no) <= 0
        ) {
            newErrors.installment_no =
                "عدد الأقساط يجب أن يكون أكبر من صفر.";
        }

        if (
            formData.installment_amount === "" ||
            Number(formData.installment_amount) < 0
        ) {
            newErrors.installment_amount =
                "قيمة العقد الإجمالية لا يمكن أن تكون سالبة.";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            toast.error("يرجى مراجعة البيانات المدخلة.");
            return false;
        }

        return true;
    };

    /* =========================================================
       SUBMIT
    ========================================================= */

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);

        try {
            const token = localStorage.getItem("access_token");

            const url = isEditMode
                ? `${BASE}/api/rents/${rent.id}/update/`
                : `${BASE}/api/rents/create/`;

            const method = isEditMode ? "PATCH" : "POST";

            // Build payload — the backend handles total_months + division.
            const payload = {
                rental_name: formData.rental_name,
                unit_name: formData.unit_name,
                start_date: formData.start_date,
                end_date: formData.end_date,
                installment_no: Number(formData.installment_no),
                installment_amount: String(formData.installment_amount),
            };

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            let responseData = {};
            try {
                responseData = await response.json();
            } catch {
                responseData = {};
            }

            if (!response.ok) {
                console.error("Save rent error:", responseData);

                const backendErrors = responseData?.errors;
                if (backendErrors && typeof backendErrors === "object") {
                    const formatted = {};
                    Object.entries(backendErrors).forEach(([k, v]) => {
                        formatted[k] = Array.isArray(v)
                            ? v.join(" ")
                            : String(v);
                    });
                    setErrors(formatted);
                }

                throw new Error(
                    responseData?.message || "فشل حفظ العقد."
                );
            }

            toast.success(
                responseData?.message ||
                    (isEditMode
                        ? "تم تحديث العقد بنجاح."
                        : "تم إنشاء العقد بنجاح.")
            );

            if (onSuccess) onSuccess(responseData?.rent || responseData);
            if (onClose) onClose();
        } catch (err) {
            console.error("Save rent failed:", err);
            toast.error(err.message || "حدث خطأ أثناء حفظ العقد.");
        } finally {
            setLoading(false);
        }
    };

    /* =========================================================
       STYLE HELPERS
    ========================================================= */

    const inputClass = (fieldName) => {
        const hasError = Boolean(errors[fieldName]);
        return `
            w-full rounded-lg border border-gray-200 border-r-4
            ${hasError ? "border-r-red-500" : "border-r-[#a47d52]"}
            bg-white px-4 py-3 outline-none transition-all duration-200
            focus:border-[#a47d52] focus:ring-2 focus:ring-[#a47d52]/10
        `;
    };

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <div
            dir="rtl"
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
            <div className="w-full max-w-5xl max-h-[95vh] bg-[#f8f7f5] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* HEADER */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                            <FaBuilding size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-800">
                                {isEditMode
                                    ? "تعديل عقد الإيجار"
                                    : "إضافة عقد إيجار جديد"}
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                بيانات المستأجر والوحدة وتفاصيل العقد
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                    >
                        <MdClose size={24} />
                    </button>
                </div>

                {/* FORM */}
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col flex-1 min-h-0"
                >
                    <div className="overflow-y-auto p-6 flex-1 space-y-6">
                        {/* ============ RENTAL SECTION ============ */}
                        <section className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                                    <FaUserTie size={16} />
                                </div>
                                <h3 className="font-extrabold text-gray-800">
                                    المستأجر
                                </h3>
                            </div>

                            {selectedRental ? (
                                <div className="rounded-lg bg-[#a47d52]/10 border border-[#a47d52]/30 p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <InfoRow
                                                icon={<FaUser />}
                                                label="الاسم"
                                                value={getRentalName(
                                                    selectedRental
                                                )}
                                            />
                                            <InfoRow
                                                icon={<FaMapMarkerAlt />}
                                                label="الجنسية"
                                                value={getRentalNationality(
                                                    selectedRental
                                                )}
                                            />
                                            <InfoRow
                                                icon={<FaPhone />}
                                                label="الهاتف"
                                                value={getRentalPhone(
                                                    selectedRental
                                                )}
                                            />
                                            <InfoRow
                                                icon={<FaEnvelope />}
                                                label="البريد"
                                                value={getRentalEmail(
                                                    selectedRental
                                                )}
                                            />
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleClearRental}
                                            disabled={loading}
                                            className="text-red-500 hover:text-red-700 cursor-pointer font-bold text-xs"
                                        >
                                            تغيير
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <RentalPicker
                                    search={rentalSearch}
                                    setSearch={setRentalSearch}
                                    loading={loadingRentals}
                                    list={filteredRentals}
                                    onSelect={handleSelectRental}
                                    getName={getRentalName}
                                    getNat={getRentalNationality}
                                    getPhone={getRentalPhone}
                                    getEmail={getRentalEmail}
                                />
                            )}

                            {errors.rental_name && (
                                <p className="text-red-500 text-xs mt-2">
                                    {errors.rental_name}
                                </p>
                            )}
                        </section>

                        {/* ============ UNIT SECTION ============ */}
                        <section className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                                    <FaBuilding size={16} />
                                </div>
                                <h3 className="font-extrabold text-gray-800">
                                    الوحدة
                                </h3>
                            </div>

                            {selectedUnit ? (
                                <div className="space-y-4">
                                    {/* Unit info */}
                                    <div className="rounded-lg bg-[#a47d52]/10 border border-[#a47d52]/30 p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <InfoRow
                                                    label="اسم الوحدة"
                                                    value={getUnitName(
                                                        selectedUnit
                                                    )}
                                                />
                                                <InfoRow
                                                    label="السعر"
                                                    value={
                                                        getUnitPrice(
                                                            selectedUnit
                                                        ) ?? "-"
                                                    }
                                                />
                                                <InfoRow
                                                    label="مبلغ التأمين"
                                                    value={
                                                        getUnitSecurityDeposit(
                                                            selectedUnit
                                                        ) ?? "-"
                                                    }
                                                />
                                                <InfoRow
                                                    label="الحالة"
                                                    value={
                                                        selectedUnit.status ||
                                                        "-"
                                                    }
                                                />
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleClearUnit}
                                                disabled={loading}
                                                className="text-red-500 hover:text-red-700 cursor-pointer font-bold text-xs"
                                            >
                                                تغيير
                                            </button>
                                        </div>
                                    </div>

                                    {/* Building / Owner info (read-only) */}
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <h4 className="font-extrabold text-gray-700 mb-3 text-sm">
                                            بيانات البناية والمالك
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <InfoRow
                                                label="البناية"
                                                value={getBuildingName(
                                                    selectedUnit
                                                )}
                                            />
                                            <InfoRow
                                                label="النوع"
                                                value={getBuildingType(
                                                    selectedUnit
                                                )}
                                            />
                                            <InfoRow
                                                label="التصنيف"
                                                value={getBuildingStatus(
                                                    selectedUnit
                                                )}
                                            />
                                            <InfoRow
                                                label="الموقع"
                                                value={getBuildingLocation(
                                                    selectedUnit
                                                )}
                                            />
                                            <InfoRow
                                                label="المنطقة"
                                                value={getBuildingArea(
                                                    selectedUnit
                                                )}
                                            />
                                            <InfoRow
                                                label="المالك"
                                                value={getOwnerName(
                                                    selectedUnit
                                                )}
                                            />
                                            <InfoRow
                                                label="هاتف المالك"
                                                value={getOwnerPhone(
                                                    selectedUnit
                                                )}
                                            />
                                            <InfoRow
                                                label="عنوان المالك"
                                                value={getOwnerAddress(
                                                    selectedUnit
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <UnitPicker
                                    search={unitSearch}
                                    setSearch={setUnitSearch}
                                    loading={loadingUnits}
                                    list={filteredUnits}
                                    onSelect={handleSelectUnit}
                                    getName={getUnitName}
                                    getPrice={getUnitPrice}
                                    getBuilding={getBuildingName}
                                    getLocation={getBuildingLocation}
                                />
                            )}

                            {errors.unit_name && (
                                <p className="text-red-500 text-xs mt-2">
                                    {errors.unit_name}
                                </p>
                            )}
                        </section>

                        {/* ============ CONTRACT DETAILS ============ */}
                        <section className="bg-white border border-gray-200 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
                                    <FaCalendarAlt size={16} />
                                </div>
                                <h3 className="font-extrabold text-gray-800">
                                    تفاصيل العقد
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block mb-2 font-bold text-gray-700">
                                        تاريخ البداية
                                    </label>
                                    <input
                                        type="date"
                                        name="start_date"
                                        value={formData.start_date}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className={inputClass("start_date")}
                                    />
                                    {errors.start_date && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.start_date}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block mb-2 font-bold text-gray-700">
                                        تاريخ النهاية
                                    </label>
                                    <input
                                        type="date"
                                        name="end_date"
                                        value={formData.end_date}
                                        onChange={handleChange}
                                        disabled={loading}
                                        className={inputClass("end_date")}
                                    />
                                    {errors.end_date && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.end_date}
                                        </p>
                                    )}
                                </div>

                                {/* TOTAL MONTHS (auto) */}
                                <div className="md:col-span-2">
                                    <label className="block mb-2 font-bold text-gray-700">
                                        عدد الأشهر (يُحسب تلقائياً)
                                    </label>
                                    <div className="relative">
                                        <FaCalendarAlt className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47d52]" />
                                        <input
                                            type="text"
                                            value={
                                                computedTotalMonths ?? ""
                                            }
                                            readOnly
                                            disabled
                                            placeholder="—"
                                            className="w-full rounded-lg border border-gray-200 border-r-4 border-r-[#a47d52] bg-gray-50 px-4 py-3 pr-12 outline-none text-gray-600"
                                        />
                                    </div>
                                </div>

                                {/* INSTALLMENT_NO */}
                                <div>
                                    <label className="block mb-2 font-bold text-gray-700">
                                        عدد الأقساط
                                    </label>
                                    <div className="relative">
                                        <FaHashtag className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47d52]" />
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            name="installment_no"
                                            value={formData.installment_no}
                                            onChange={handleChange}
                                            disabled={loading}
                                            placeholder="مثال: 12"
                                            className={`${inputClass(
                                                "installment_no"
                                            )} pr-12`}
                                        />
                                    </div>
                                    {errors.installment_no && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.installment_no}
                                        </p>
                                    )}
                                </div>

                                {/* INSTALLMENT_AMOUNT (Total input) */}
                                <div>
                                    <label className="block mb-2 font-bold text-gray-700">
                                        إجمالي قيمة العقد
                                    </label>
                                    <div className="relative">
                                        <FaMoneyBillWave className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47d52]" />
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            name="installment_amount"
                                            value={
                                                formData.installment_amount
                                            }
                                            onChange={handleChange}
                                            disabled={loading}
                                            placeholder="0.00"
                                            className={`${inputClass(
                                                "installment_amount"
                                            )} pr-12`}
                                        />
                                    </div>
                                    {errors.installment_amount && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors.installment_amount}
                                        </p>
                                    )}
                                </div>

                                {/* PER-INSTALLMENT PREVIEW */}
                                <div className="md:col-span-2">
                                    <div className="rounded-lg border border-[#a47d52]/30 bg-[#a47d52]/5 p-4 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[#a47d52]/20 text-[#a47d52] flex items-center justify-center">
                                                <FaCalculator />
                                            </div>
                                            <div>
                                                <p className="font-extrabold text-gray-800 text-sm">
                                                    قيمة القسط الواحد
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    تُحسب تلقائياً: إجمالي
                                                    القيمة ÷ عدد الأقساط
                                                </p>
                                            </div>
                                        </div>
                                        <div
                                            className="text-2xl font-extrabold text-[#a47d52]"
                                            dir="ltr"
                                        >
                                            {computedPerInstallment ??
                                                "—"}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">
                                        💡 عند اختيار الوحدة، يتم تعبئة
                                        إجمالي القيمة تلقائياً من سعر
                                        الوحدة، ويمكنك تعديلها.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* FOOTER */}
                    <div className="flex flex-col md:flex-row gap-3 border-t border-gray-200 p-6 bg-white shrink-0">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 cursor-pointer font-extrabold bg-[#a47d52] text-white px-6 py-3 rounded-lg transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FaSave size={18} />
                            {loading
                                ? "جاري الحفظ..."
                                : isEditMode
                                ? "حفظ التعديلات"
                                : "حفظ العقد"}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 cursor-pointer font-extrabold bg-gray-300 text-red-600 px-6 py-3 rounded-lg transition-all duration-300 hover:bg-gray-400 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <MdClose size={20} />
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ============================================================
   SMALL PRESENTATIONAL SUB-COMPONENTS
   ============================================================ */

const InfoRow = ({ icon, label, value }) => (
    <div className="flex items-center gap-2">
        {icon && <span className="text-[#a47d52]">{icon}</span>}
        <span className="text-xs text-gray-500 font-bold">{label}:</span>
        <span className="text-sm text-gray-800 font-bold truncate" dir="auto">
            {value || "-"}
        </span>
    </div>
);

const RentalPicker = ({
    search,
    setSearch,
    loading,
    list,
    onSelect,
    getName,
    getNat,
    getPhone,
    getEmail,
}) => (
    <>
        <div className="relative mb-3">
            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث بالاسم أو الجنسية أو الهاتف أو البريد..."
                disabled={loading}
                className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52]"
            />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            {loading ? (
                <p className="text-center py-8 text-gray-500">
                    جاري التحميل...
                </p>
            ) : list.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                    لا توجد نتائج
                </p>
            ) : (
                <ul>
                    {list.map((r) => (
                        <li
                            key={r.id}
                            onClick={() => onSelect(r)}
                            className="cursor-pointer border-t border-gray-100 hover:bg-[#f8f7f5] p-3 flex items-center justify-between gap-3"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-extrabold text-gray-800 truncate">
                                    {getName(r)}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-1">
                                    {getNat(r)} — {getPhone(r)} — {getEmail(r)}
                                </p>
                            </div>
                            <FaCheck className="text-[#a47d52]" />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </>
);

const UnitPicker = ({
    search,
    setSearch,
    loading,
    list,
    onSelect,
    getName,
    getPrice,
    getBuilding,
    getLocation,
}) => (
    <>
        <div className="relative mb-3">
            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث باسم الوحدة أو البناية أو الموقع..."
                disabled={loading}
                className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52]"
            />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
            {loading ? (
                <p className="text-center py-8 text-gray-500">
                    جاري التحميل...
                </p>
            ) : list.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                    لا توجد نتائج
                </p>
            ) : (
                <ul>
                    {list.map((u) => (
                        <li
                            key={u.id}
                            onClick={() => onSelect(u)}
                            className="cursor-pointer border-t border-gray-100 hover:bg-[#f8f7f5] p-3 flex items-center justify-between gap-3"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-extrabold text-gray-800 truncate">
                                    {getName(u)}
                                </p>
                                <p className="text-xs text-gray-500 truncate mt-1">
                                    {getBuilding(u)} — {getLocation(u)}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span
                                    className="text-xs font-bold text-green-700"
                                    dir="ltr"
                                >
                                    {getPrice(u) ?? "-"}
                                </span>
                                <FaCheck className="text-[#a47d52]" />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    </>
);


export default RentAddEdit;


// import React, { useEffect, useMemo, useState } from "react";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// import {
//     FaSave,
//     FaUserTie,
//     FaBuilding,
//     FaCalendarAlt,
//     FaMoneyBillWave,
//     FaSearch,
//     FaCheck,
//     FaUser,
//     FaPhone,
//     FaEnvelope,
//     FaMapMarkerAlt,
// } from "react-icons/fa";

// import { MdClose } from "react-icons/md";

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// const RentAddEdit = ({ rent = null, onClose, onSuccess }) => {
//     const isEditMode = Boolean(rent?.id);

//     /* =========================================================
//        STATE
//     ========================================================= */

//     const [formData, setFormData] = useState({
//         rental_name: rent?.rental_name?.id ?? rent?.rental_name ?? "",
//         unit_name: rent?.unit_name?.id ?? rent?.unit_name ?? "",
//         start_date: rent?.start_date ?? "",
//         end_date: rent?.end_date ?? "",
//         installment_no: rent?.installment_no ?? "",
//     });

//     const [errors, setErrors] = useState({});
//     const [loading, setLoading] = useState(false);

//     // Data lists
//     const [rentals, setRentals] = useState([]);
//     const [units, setUnits] = useState([]);

//     const [loadingRentals, setLoadingRentals] = useState(true);
//     const [loadingUnits, setLoadingUnits] = useState(true);

//     // Search inputs
//     const [rentalSearch, setRentalSearch] = useState("");
//     const [unitSearch, setUnitSearch] = useState("");

//     /* =========================================================
//        FETCH RENTALS
//     ========================================================= */

//     useEffect(() => {
//         let cancelled = false;

//         const fetchRentals = async () => {
//             setLoadingRentals(true);

//             try {
//                 const token = localStorage.getItem("access_token");

//                 const res = await fetch(`${BASE}/api/rentals/`, {
//                     method: "GET",
//                     headers: {
//                         "Content-Type": "application/json",
//                         Authorization: `Bearer ${token}`,
//                     },
//                 });

//                 if (!res.ok) throw new Error("فشل تحميل المستأجرين");

//                 const data = await res.json();

//                 let list = [];
//                 if (Array.isArray(data)) list = data;
//                 else if (Array.isArray(data.results)) list = data.results;
//                 else if (Array.isArray(data.rentals)) list = data.rentals;

//                 if (!cancelled) setRentals(list);
//             } catch (err) {
//                 console.error("Fetch rentals error:", err);
//                 if (!cancelled)
//                     toast.error("❌ فشل تحميل قائمة المستأجرين");
//             } finally {
//                 if (!cancelled) setLoadingRentals(false);
//             }
//         };

//         fetchRentals();

//         return () => {
//             cancelled = true;
//         };
//     }, []);

//     /* =========================================================
//        FETCH UNITS
//     ========================================================= */

//     useEffect(() => {
//         let cancelled = false;

//         const fetchUnits = async () => {
//             setLoadingUnits(true);

//             try {
//                 const token = localStorage.getItem("access_token");

//                 const res = await fetch(`${BASE}/api/units/`, {
//                     method: "GET",
//                     headers: {
//                         "Content-Type": "application/json",
//                         Authorization: `Bearer ${token}`,
//                     },
//                 });

//                 if (!res.ok) throw new Error("فشل تحميل الوحدات");

//                 const data = await res.json();

//                 let list = [];
//                 if (Array.isArray(data)) list = data;
//                 else if (Array.isArray(data.results)) list = data.results;
//                 else if (Array.isArray(data.units)) list = data.units;

//                 if (!cancelled) setUnits(list);
//             } catch (err) {
//                 console.error("Fetch units error:", err);
//                 if (!cancelled)
//                     toast.error("❌ فشل تحميل قائمة الوحدات");
//             } finally {
//                 if (!cancelled) setLoadingUnits(false);
//             }
//         };

//         fetchUnits();

//         return () => {
//             cancelled = true;
//         };
//     }, []);

//     /* =========================================================
//        HELPERS — RENTAL / UNIT / BUILDING / OWNER
//     ========================================================= */

//     const getRentalName = (r) =>
//         r?.name ||
//         r?.rental_name ||
//         r?.tenant_name ||
//         `#${r?.id ?? "-"}`;

//     const getRentalNationality = (r) =>
//         r?.nationality || r?.nationality_name || "-";

//     const getRentalPhone = (r) => r?.phone_1 || r?.phone || "-";

//     const getRentalEmail = (r) => r?.email || "-";

//     const getUnitName = (u) => u?.name || `Unit #${u?.id ?? "-"}`;

//     const getUnitPrice = (u) => u?.price;

//     const getUnitSecurityDeposit = (u) => u?.security_deposit;

//     const getUnitBuilding = (u) => {
//         // Unit.category is a Building
//         const category = u?.category_details || u?.category;

//         if (!category) return null;

//         if (typeof category === "string") return { name: category };

//         return category;
//     };

//     const getBuildingName = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";
//         return b.name || `Building #${b.id ?? "-"}`;
//     };

//     const getBuildingType = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";

//         const map = { building: "عمارة", vila: "فيلا" };
//         return map[b.type] || b.type || "-";
//     };

//     const getBuildingStatus = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";

//         const map = { residential: "سكني", commercial: "تجاري" };
//         return map[b.status] || b.status || "-";
//     };

//     const getBuildingLocation = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";
//         return b.location || "-";
//     };

//     const getBuildingArea = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return "-";
//         return b.area || "-";
//     };

//     const getBuildingOwner = (u) => {
//         const b = getUnitBuilding(u);
//         if (!b) return null;

//         const owner = b.owner_details || b.owner;
//         if (!owner) return null;
//         if (typeof owner === "string") return { name: owner };
//         return owner;
//     };

//     const getOwnerName = (u) => {
//         const o = getBuildingOwner(u);
//         if (!o) return "-";
//         return o.name || o.full_name || o.owner_name || "-";
//     };

//     const getOwnerPhone = (u) => {
//         const o = getBuildingOwner(u);
//         if (!o) return "-";
//         return o.phone || o.phone_1 || o.mobile || "-";
//     };

//     const getOwnerAddress = (u) => {
//         const o = getBuildingOwner(u);
//         if (!o) return "-";
//         return o.address || "-";
//     };

//     /* =========================================================
//        SELECTED OBJECTS
//     ========================================================= */

//     const selectedRental = useMemo(() => {
//         if (!formData.rental_name) return null;
//         return (
//             rentals.find(
//                 (r) => String(r.id) === String(formData.rental_name)
//             ) || null
//         );
//     }, [rentals, formData.rental_name]);

//     const selectedUnit = useMemo(() => {
//         if (!formData.unit_name) return null;
//         return (
//             units.find(
//                 (u) => String(u.id) === String(formData.unit_name)
//             ) || null
//         );
//     }, [units, formData.unit_name]);

//     /* =========================================================
//        FILTERED LISTS
//     ========================================================= */

//     const filteredRentals = useMemo(() => {
//         const s = rentalSearch.trim().toLowerCase();
//         if (!s) return rentals;

//         return rentals.filter((r) => {
//             return (
//                 String(getRentalName(r)).toLowerCase().includes(s) ||
//                 String(getRentalNationality(r)).toLowerCase().includes(s) ||
//                 String(getRentalPhone(r)).toLowerCase().includes(s) ||
//                 String(getRentalEmail(r)).toLowerCase().includes(s)
//             );
//         });
//     }, [rentals, rentalSearch]);

//     const filteredUnits = useMemo(() => {
//         const s = unitSearch.trim().toLowerCase();
//         if (!s) return units;

//         return units.filter((u) => {
//             return (
//                 String(getUnitName(u)).toLowerCase().includes(s) ||
//                 String(getBuildingName(u)).toLowerCase().includes(s) ||
//                 String(getBuildingLocation(u)).toLowerCase().includes(s)
//             );
//         });
//     }, [units, unitSearch]);

//     /* =========================================================
//        CHANGE HANDLERS
//     ========================================================= */

//     const handleChange = (e) => {
//         const { name, value } = e.target;

//         // When the unit changes, auto-fill installment_no with the unit price
//         if (name === "unit_name") {
//             const unit = units.find(
//                 (u) => String(u.id) === String(value)
//             );

//             setFormData((prev) => ({
//                 ...prev,
//                 unit_name: value,
//                 installment_no:
//                     unit?.price ?? prev.installment_no ?? "",
//             }));

//             setErrors((prev) => ({ ...prev, unit_name: "", installment_no: "" }));
//             return;
//         }

//         setFormData((prev) => ({ ...prev, [name]: value }));
//         setErrors((prev) => ({ ...prev, [name]: "" }));
//     };

//     const handleSelectRental = (rental) => {
//         setFormData((prev) => ({
//             ...prev,
//             rental_name: rental.id,
//         }));
//         setErrors((prev) => ({ ...prev, rental_name: "" }));
//     };

//     const handleSelectUnit = (unit) => {
//         setFormData((prev) => ({
//             ...prev,
//             unit_name: unit.id,
//             installment_no:
//                 unit?.price ?? prev.installment_no ?? "",
//         }));
//         setErrors((prev) => ({
//             ...prev,
//             unit_name: "",
//             installment_no: "",
//         }));
//     };

//     const handleClearRental = () => {
//         setFormData((prev) => ({ ...prev, rental_name: "" }));
//     };

//     const handleClearUnit = () => {
//         setFormData((prev) => ({
//             ...prev,
//             unit_name: "",
//             installment_no: "",
//         }));
//     };

//     /* =========================================================
//        VALIDATION
//     ========================================================= */

//     const validateForm = () => {
//         const newErrors = {};

//         if (!formData.rental_name) {
//             newErrors.rental_name = "يرجى اختيار المستأجر.";
//         }

//         if (!formData.unit_name) {
//             newErrors.unit_name = "يرجى اختيار الوحدة.";
//         }

//         if (!formData.start_date) {
//             newErrors.start_date = "تاريخ البداية مطلوب.";
//         }

//         if (!formData.end_date) {
//             newErrors.end_date = "تاريخ النهاية مطلوب.";
//         }

//         if (
//             formData.start_date &&
//             formData.end_date &&
//             formData.end_date < formData.start_date
//         ) {
//             newErrors.end_date =
//                 "تاريخ النهاية يجب أن يكون بعد تاريخ البداية.";
//         }

//         if (
//             formData.installment_no !== "" &&
//             Number(formData.installment_no) < 0
//         ) {
//             newErrors.installment_no =
//                 "قيمة القسط لا يمكن أن تكون سالبة.";
//         }

//         setErrors(newErrors);

//         if (Object.keys(newErrors).length > 0) {
//             toast.error("يرجى مراجعة البيانات المدخلة.");
//             return false;
//         }

//         return true;
//     };

//     /* =========================================================
//        SUBMIT
//     ========================================================= */

//     const handleSubmit = async (e) => {
//         e.preventDefault();

//         if (!validateForm()) return;

//         setLoading(true);

//         try {
//             const token = localStorage.getItem("access_token");

//             const url = isEditMode
//                 ? `${BASE}/api/rents/${rent.id}/update/`
//                 : `${BASE}/api/rents/create/`;

//             const method = isEditMode ? "PATCH" : "POST";

//             const response = await fetch(url, {
//                 method,
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`,
//                 },
//                 body: JSON.stringify(formData),
//             });

//             let responseData = {};
//             try {
//                 responseData = await response.json();
//             } catch {
//                 responseData = {};
//             }

//             if (!response.ok) {
//                 console.error("Save rent error:", responseData);

//                 const backendErrors = responseData?.errors;
//                 if (backendErrors && typeof backendErrors === "object") {
//                     const formatted = {};
//                     Object.entries(backendErrors).forEach(([k, v]) => {
//                         formatted[k] = Array.isArray(v)
//                             ? v.join(" ")
//                             : String(v);
//                     });
//                     setErrors(formatted);
//                 }

//                 throw new Error(
//                     responseData?.message || "فشل حفظ العقد."
//                 );
//             }

//             toast.success(
//                 responseData?.message ||
//                     (isEditMode
//                         ? "تم تحديث العقد بنجاح."
//                         : "تم إنشاء العقد بنجاح.")
//             );

//             if (onSuccess) onSuccess(responseData?.rent || responseData);
//             if (onClose) onClose();
//         } catch (err) {
//             console.error("Save rent failed:", err);
//             toast.error(err.message || "حدث خطأ أثناء حفظ العقد.");
//         } finally {
//             setLoading(false);
//         }
//     };

//     /* =========================================================
//        STYLE HELPERS
//     ========================================================= */

//     const inputClass = (fieldName) => {
//         const hasError = Boolean(errors[fieldName]);
//         return `
//             w-full rounded-lg border border-gray-200 border-r-4
//             ${hasError ? "border-r-red-500" : "border-r-[#a47d52]"}
//             bg-white px-4 py-3 outline-none transition-all duration-200
//             focus:border-[#a47d52] focus:ring-2 focus:ring-[#a47d52]/10
//         `;
//     };

//     /* =========================================================
//        RENDER
//     ========================================================= */

//     return (
//         <div
//             dir="rtl"
//             className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
//         >
//             <div className="w-full max-w-5xl max-h-[95vh] bg-[#f8f7f5] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
//                 {/* HEADER */}
//                 <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
//                     <div className="flex items-center gap-3">
//                         <div className="w-12 h-12 rounded-xl bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
//                             <FaBuilding size={22} />
//                         </div>
//                         <div>
//                             <h2 className="text-xl font-extrabold text-gray-800">
//                                 {isEditMode
//                                     ? "تعديل عقد الإيجار"
//                                     : "إضافة عقد إيجار جديد"}
//                             </h2>
//                             <p className="text-sm text-gray-500 mt-1">
//                                 بيانات المستأجر والوحدة وتفاصيل العقد
//                             </p>
//                         </div>
//                     </div>
//                     <button
//                         type="button"
//                         onClick={onClose}
//                         disabled={loading}
//                         className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 text-gray-500 cursor-pointer hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
//                     >
//                         <MdClose size={24} />
//                     </button>
//                 </div>

//                 {/* FORM */}
//                 <form
//                     onSubmit={handleSubmit}
//                     className="flex flex-col flex-1 min-h-0"
//                 >
//                     <div className="overflow-y-auto p-6 flex-1 space-y-6">
//                         {/* ============ RENTAL SECTION ============ */}
//                         <section className="bg-white border border-gray-200 rounded-xl p-5">
//                             <div className="flex items-center gap-3 mb-4">
//                                 <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
//                                     <FaUserTie size={16} />
//                                 </div>
//                                 <h3 className="font-extrabold text-gray-800">
//                                     المستأجر
//                                 </h3>
//                             </div>

//                             {selectedRental ? (
//                                 <div className="rounded-lg bg-[#a47d52]/10 border border-[#a47d52]/30 p-4">
//                                     <div className="flex items-start justify-between gap-4">
//                                         <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
//                                             <InfoRow
//                                                 icon={<FaUser />}
//                                                 label="الاسم"
//                                                 value={getRentalName(
//                                                     selectedRental
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 icon={<FaMapMarkerAlt />}
//                                                 label="الجنسية"
//                                                 value={getRentalNationality(
//                                                     selectedRental
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 icon={<FaPhone />}
//                                                 label="الهاتف"
//                                                 value={getRentalPhone(
//                                                     selectedRental
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 icon={<FaEnvelope />}
//                                                 label="البريد"
//                                                 value={getRentalEmail(
//                                                     selectedRental
//                                                 )}
//                                             />
//                                         </div>

//                                         <button
//                                             type="button"
//                                             onClick={handleClearRental}
//                                             disabled={loading}
//                                             className="text-red-500 hover:text-red-700 cursor-pointer font-bold text-xs"
//                                         >
//                                             تغيير
//                                         </button>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <RentalPicker
//                                     search={rentalSearch}
//                                     setSearch={setRentalSearch}
//                                     loading={loadingRentals}
//                                     list={filteredRentals}
//                                     onSelect={handleSelectRental}
//                                     getName={getRentalName}
//                                     getNat={getRentalNationality}
//                                     getPhone={getRentalPhone}
//                                     getEmail={getRentalEmail}
//                                 />
//                             )}

//                             {errors.rental_name && (
//                                 <p className="text-red-500 text-xs mt-2">
//                                     {errors.rental_name}
//                                 </p>
//                             )}
//                         </section>

//                         {/* ============ UNIT SECTION ============ */}
//                         <section className="bg-white border border-gray-200 rounded-xl p-5">
//                             <div className="flex items-center gap-3 mb-4">
//                                 <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
//                                     <FaBuilding size={16} />
//                                 </div>
//                                 <h3 className="font-extrabold text-gray-800">
//                                     الوحدة
//                                 </h3>
//                             </div>

//                             {selectedUnit ? (
//                                 <div className="space-y-4">
//                                     {/* Unit info */}
//                                     <div className="rounded-lg bg-[#a47d52]/10 border border-[#a47d52]/30 p-4">
//                                         <div className="flex items-start justify-between gap-4">
//                                             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
//                                                 <InfoRow
//                                                     label="اسم الوحدة"
//                                                     value={getUnitName(
//                                                         selectedUnit
//                                                     )}
//                                                 />
//                                                 <InfoRow
//                                                     label="السعر"
//                                                     value={
//                                                         getUnitPrice(
//                                                             selectedUnit
//                                                         ) ?? "-"
//                                                     }
//                                                 />
//                                                 <InfoRow
//                                                     label="مبلغ التأمين"
//                                                     value={
//                                                         getUnitSecurityDeposit(
//                                                             selectedUnit
//                                                         ) ?? "-"
//                                                     }
//                                                 />
//                                                 <InfoRow
//                                                     label="الحالة"
//                                                     value={
//                                                         selectedUnit.status ||
//                                                         "-"
//                                                     }
//                                                 />
//                                             </div>

//                                             <button
//                                                 type="button"
//                                                 onClick={handleClearUnit}
//                                                 disabled={loading}
//                                                 className="text-red-500 hover:text-red-700 cursor-pointer font-bold text-xs"
//                                             >
//                                                 تغيير
//                                             </button>
//                                         </div>
//                                     </div>

//                                     {/* Building / Owner info (read-only) */}
//                                     <div className="rounded-lg border border-gray-200 p-4">
//                                         <h4 className="font-extrabold text-gray-700 mb-3 text-sm">
//                                             بيانات البناية والمالك
//                                         </h4>
//                                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                                             <InfoRow
//                                                 label="البناية"
//                                                 value={getBuildingName(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="النوع"
//                                                 value={getBuildingType(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="التصنيف"
//                                                 value={getBuildingStatus(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="الموقع"
//                                                 value={getBuildingLocation(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="المنطقة"
//                                                 value={getBuildingArea(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="المالك"
//                                                 value={getOwnerName(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="هاتف المالك"
//                                                 value={getOwnerPhone(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                             <InfoRow
//                                                 label="عنوان المالك"
//                                                 value={getOwnerAddress(
//                                                     selectedUnit
//                                                 )}
//                                             />
//                                         </div>
//                                     </div>
//                                 </div>
//                             ) : (
//                                 <UnitPicker
//                                     search={unitSearch}
//                                     setSearch={setUnitSearch}
//                                     loading={loadingUnits}
//                                     list={filteredUnits}
//                                     onSelect={handleSelectUnit}
//                                     getName={getUnitName}
//                                     getPrice={getUnitPrice}
//                                     getBuilding={getBuildingName}
//                                     getLocation={getBuildingLocation}
//                                 />
//                             )}

//                             {errors.unit_name && (
//                                 <p className="text-red-500 text-xs mt-2">
//                                     {errors.unit_name}
//                                 </p>
//                             )}
//                         </section>

//                         {/* ============ CONTRACT DETAILS ============ */}
//                         <section className="bg-white border border-gray-200 rounded-xl p-5">
//                             <div className="flex items-center gap-3 mb-4">
//                                 <div className="w-9 h-9 rounded-full bg-[#e9e6e1] text-[#a47d52] flex items-center justify-center">
//                                     <FaCalendarAlt size={16} />
//                                 </div>
//                                 <h3 className="font-extrabold text-gray-800">
//                                     تفاصيل العقد
//                                 </h3>
//                             </div>

//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//                                 <div>
//                                     <label className="block mb-2 font-bold text-gray-700">
//                                         تاريخ البداية
//                                     </label>
//                                     <input
//                                         type="date"
//                                         name="start_date"
//                                         value={formData.start_date}
//                                         onChange={handleChange}
//                                         disabled={loading}
//                                         className={inputClass("start_date")}
//                                     />
//                                     {errors.start_date && (
//                                         <p className="text-red-500 text-xs mt-1">
//                                             {errors.start_date}
//                                         </p>
//                                     )}
//                                 </div>

//                                 <div>
//                                     <label className="block mb-2 font-bold text-gray-700">
//                                         تاريخ النهاية
//                                     </label>
//                                     <input
//                                         type="date"
//                                         name="end_date"
//                                         value={formData.end_date}
//                                         onChange={handleChange}
//                                         disabled={loading}
//                                         className={inputClass("end_date")}
//                                     />
//                                     {errors.end_date && (
//                                         <p className="text-red-500 text-xs mt-1">
//                                             {errors.end_date}
//                                         </p>
//                                     )}
//                                 </div>

//                                 <div className="md:col-span-2">
//                                     <label className="block mb-2 font-bold text-gray-700">
//                                         قيمة القسط (Installment)
//                                     </label>
//                                     <div className="relative">
//                                         <FaMoneyBillWave className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a47d52]" />
//                                         <input
//                                             type="number"
//                                             min="0"
//                                             step="0.01"
//                                             name="installment_no"
//                                             value={formData.installment_no}
//                                             onChange={handleChange}
//                                             disabled={loading}
//                                             placeholder="0.00"
//                                             className={`${inputClass(
//                                                 "installment_no"
//                                             )} pr-12`}
//                                         />
//                                     </div>
//                                     {errors.installment_no && (
//                                         <p className="text-red-500 text-xs mt-1">
//                                             {errors.installment_no}
//                                         </p>
//                                     )}
//                                     <p className="text-xs text-gray-400 mt-1">
//                                         يتم تعبئتها تلقائياً من سعر الوحدة،
//                                         ويمكنك تعديلها.
//                                     </p>
//                                 </div>
//                             </div>
//                         </section>
//                     </div>

//                     {/* FOOTER */}
//                     <div className="flex flex-col md:flex-row gap-3 border-t border-gray-200 p-6 bg-white shrink-0">
//                         <button
//                             type="submit"
//                             disabled={loading}
//                             className="flex-1 flex items-center justify-center gap-2 cursor-pointer font-extrabold bg-[#a47d52] text-white px-6 py-3 rounded-lg transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
//                         >
//                             <FaSave size={18} />
//                             {loading
//                                 ? "جاري الحفظ..."
//                                 : isEditMode
//                                 ? "حفظ التعديلات"
//                                 : "حفظ العقد"}
//                         </button>

//                         <button
//                             type="button"
//                             onClick={onClose}
//                             disabled={loading}
//                             className="flex-1 cursor-pointer font-extrabold bg-gray-300 text-red-600 px-6 py-3 rounded-lg transition-all duration-300 hover:bg-gray-400 disabled:opacity-50 flex items-center justify-center gap-2"
//                         >
//                             <MdClose size={20} />
//                             إلغاء
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// /* ============================================================
//    SMALL PRESENTATIONAL SUB-COMPONENTS
//    ============================================================ */

// const InfoRow = ({ icon, label, value }) => (
//     <div className="flex items-center gap-2">
//         {icon && <span className="text-[#a47d52]">{icon}</span>}
//         <span className="text-xs text-gray-500 font-bold">{label}:</span>
//         <span className="text-sm text-gray-800 font-bold truncate" dir="auto">
//             {value || "-"}
//         </span>
//     </div>
// );

// const RentalPicker = ({
//     search,
//     setSearch,
//     loading,
//     list,
//     onSelect,
//     getName,
//     getNat,
//     getPhone,
//     getEmail,
// }) => (
//     <>
//         <div className="relative mb-3">
//             <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
//             <input
//                 type="text"
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="بحث بالاسم أو الجنسية أو الهاتف أو البريد..."
//                 disabled={loading}
//                 className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52]"
//             />
//         </div>

//         <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
//             {loading ? (
//                 <p className="text-center py-8 text-gray-500">
//                     جاري التحميل...
//                 </p>
//             ) : list.length === 0 ? (
//                 <p className="text-center py-8 text-gray-500">
//                     لا توجد نتائج
//                 </p>
//             ) : (
//                 <ul>
//                     {list.map((r) => (
//                         <li
//                             key={r.id}
//                             onClick={() => onSelect(r)}
//                             className="cursor-pointer border-t border-gray-100 hover:bg-[#f8f7f5] p-3 flex items-center justify-between gap-3"
//                         >
//                             <div className="flex-1 min-w-0">
//                                 <p className="font-extrabold text-gray-800 truncate">
//                                     {getName(r)}
//                                 </p>
//                                 <p className="text-xs text-gray-500 truncate mt-1">
//                                     {getNat(r)} — {getPhone(r)} — {getEmail(r)}
//                                 </p>
//                             </div>
//                             <FaCheck className="text-[#a47d52]" />
//                         </li>
//                     ))}
//                 </ul>
//             )}
//         </div>
//     </>
// );

// const UnitPicker = ({
//     search,
//     setSearch,
//     loading,
//     list,
//     onSelect,
//     getName,
//     getPrice,
//     getBuilding,
//     getLocation,
// }) => (
//     <>
//         <div className="relative mb-3">
//             <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
//             <input
//                 type="text"
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//                 placeholder="بحث باسم الوحدة أو البناية أو الموقع..."
//                 disabled={loading}
//                 className="w-full bg-white border border-gray-200 border-r-4 border-r-[#a47d52] rounded-lg py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-[#a47d52]/10 focus:border-[#a47d52]"
//             />
//         </div>

//         <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
//             {loading ? (
//                 <p className="text-center py-8 text-gray-500">
//                     جاري التحميل...
//                 </p>
//             ) : list.length === 0 ? (
//                 <p className="text-center py-8 text-gray-500">
//                     لا توجد نتائج
//                 </p>
//             ) : (
//                 <ul>
//                     {list.map((u) => (
//                         <li
//                             key={u.id}
//                             onClick={() => onSelect(u)}
//                             className="cursor-pointer border-t border-gray-100 hover:bg-[#f8f7f5] p-3 flex items-center justify-between gap-3"
//                         >
//                             <div className="flex-1 min-w-0">
//                                 <p className="font-extrabold text-gray-800 truncate">
//                                     {getName(u)}
//                                 </p>
//                                 <p className="text-xs text-gray-500 truncate mt-1">
//                                     {getBuilding(u)} — {getLocation(u)}
//                                 </p>
//                             </div>
//                             <div className="flex items-center gap-3">
//                                 <span
//                                     className="text-xs font-bold text-green-700"
//                                     dir="ltr"
//                                 >
//                                     {getPrice(u) ?? "-"}
//                                 </span>
//                                 <FaCheck className="text-[#a47d52]" />
//                             </div>
//                         </li>
//                     ))}
//                 </ul>
//             )}
//         </div>
//     </>
// );


// export default RentAddEdit;