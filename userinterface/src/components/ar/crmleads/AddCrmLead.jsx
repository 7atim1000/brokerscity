import React, { useState, useEffect, useMemo, useRef } from "react";
import toast from "react-hot-toast";
import { FaUserPlus, FaSave, FaTimes, FaUserTie, FaPlus, FaMinus, FaChevronDown } from "react-icons/fa"; // ✅ UPDATED: added FaChevronDown (arrow for selects)

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// IMPORTANT: Change these IDs to match the actual IDs in your Django Source database!
const STATIC_SOURCES = [
    { id: 1, name: "مكالمة هاتفية Call" },
    { id: 2, name: "بريد إلكتروني E-Mail" },
    { id: 3, name: "فيسبوك FaceBook" },
    { id: 4, name: "إنستجرام Instagram" },
    { id: 5, name: "Data" },
    { id: 6, name: "Property Finder" },
    { id: 7, name: "Bayut/Dubizzle" },
    { id: 8, name: "مورجان Morjan" },
    { id: 9, name: "حجز Booking" },
    { id: 10, name: "Mr Mohsen" },
    { id: 11, name: "Mr Mohammed" }
];

// ✅ NEW: shared classes so every field looks and behaves the same (mobile-friendly sizes)
// text-base on mobile = 16px, which stops iOS from zooming in when a field is focused
const FIELD_BASE =
    "w-full px-4 py-3 sm:py-2.5 text-base sm:text-sm bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300";
// ✅ NEW: visible focus ring on the wrapper, so keyboard users can see which field is active
const FIELD_WRAPPER =
    "relative rounded-sm transition-shadow focus-within:ring-2 focus-within:ring-[#a47d52]/50";

const AddCrmLead = ({ onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [showExtraPhones, setShowExtraPhones] = useState(false);

    const formRef = useRef(null);

    const [formData, setFormData] = useState({
        name: "",
        phone: "+971",
        phone1: "+971",
        phone2: "+971",
        email: "",
        whatsapp_tracking_link: "",
        nationality: "",
        lead_type: "",
        type: "",
        service_type: "",
        off_plan_or_resale: "",
        property_type: "",
        furnishing_type: "",
        no_of_bedrooms: "",
        no_of_bathrooms: "",
        amenities: "",
        location: "",
        comment: "",
        source: "",
        responsible: "",
        observe: "",
    });

    // ==========================================
    // ✅ NEW: AUTO-FOCUS NAME FIELD ON OPEN
    // ==========================================
    useEffect(() => {
        // small delay so the modal is rendered/visible before focusing
        const t = setTimeout(() => {
            const nameInput = formRef.current?.querySelector('input[name="name"]');
            if (nameInput) nameInput.focus();
        }, 50);
        return () => clearTimeout(t);
    }, []);

    // ==========================================
    // ✅ NEW: ESC TO CLOSE + LOCK BACKGROUND SCROLL
    // ==========================================
    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === "Escape" && !loading && onClose) onClose();
        };
        document.addEventListener("keydown", onEsc);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onEsc);
            document.body.style.overflow = prevOverflow;
        };
    }, [loading, onClose]);

    // ==========================================
    // FETCH USERS
    // ==========================================
    useEffect(() => {
        const fetchUsers = async () => {
            const token = localStorage.getItem("access_token");
            try {
                const usersRes = await fetch(`${BASE}/api/users/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    const fetchedUsers = Array.isArray(usersData) ? usersData : usersData.users || [];
                    setUsers(fetchedUsers);
                }
            } catch (error) {
                console.error("Error fetching users:", error);
            }
        };
        fetchUsers();
    }, []);

    // ==========================================
    // HANDLE CHANGE
    // ==========================================
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ✅ NEW: phone fields only keep digits. The "+971" prefix is shown by the badge,
    // so the user types only the local number (e.g. 501234567); state still stores "+971501234567"
    const handlePhoneChange = (e) => {
        const { name, value } = e.target;
        const digits = value
            .replace(/\D/g, "")      // digits only
            .replace(/^971/, "")     // handle pasted full numbers
            .replace(/^0+/, "");     // drop leading 0 (050... -> 50...)
        setFormData((prev) => ({ ...prev, [name]: "+971" + digits }));
    };

    // ==========================================
    // ✅ UPDATED: ENTER KEY NAVIGATION (attached to the <form>, works for inputs, selects and textarea)
    // - Enter           → move to next field
    // - Enter on last   → submit the form
    // - Shift+Enter     → new line inside the comment textarea
    // ==========================================
    const handleFormKeyDown = (e) => {
        if (e.key !== "Enter") return;

        const tag = e.target.tagName;
        if (!["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return; // let buttons behave normally
        if (tag === "TEXTAREA" && e.shiftKey) return;               // allow new line

        e.preventDefault();

        const form = formRef.current;
        if (!form) return;

        // visible + enabled fields, in DOM order (disabled "Responsible" is skipped until service type is chosen)
        const elements = Array.from(
            form.querySelectorAll(
                'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])'
            )
        ).filter((el) => el.getClientRects().length > 0);

        const index = elements.indexOf(e.target);
        if (index === -1) return;

        if (index < elements.length - 1) {
            elements[index + 1].focus();
            if (elements[index + 1].select && elements[index + 1].tagName === "INPUT") {
                elements[index + 1].select(); // select existing text so typing replaces it
            }
        } else {
            form.requestSubmit(); // last field → submit
        }
    };

    // ==========================================
    // FILTER & SORT USERS
    // ==========================================
    const filteredAndSortedUsers = useMemo(() => {
        if (!formData.service_type) return [];

        const selectedService = String(formData.service_type).toLowerCase().trim();

        const isLeasing = selectedService === "leasing" || selectedService === "إيجار";
        const isSales = selectedService === "sales" || selectedService === "بيع";
        const isLeasingandSales = selectedService === "leasing - sales" || selectedService === "ايجار - بيع";

        if (!isLeasing && !isSales && !isLeasingandSales) return [];

        let filtered = users.filter((user) => {
            const role = String(user.role || "").toLowerCase().replace(/[\s_]/g, "");

            if (isLeasing) {
                return role === "leasingagent" || role === "testaccountleasing";
            }
            if (isSales) {
                return role === "salesagent" || role === "testaccountsales";
            }
            if (isLeasingandSales) {
                return (
                    role === "salesagent" ||
                    role === "leasingagent" ||
                    role === "testaccountleasing" ||
                    role === "testaccountsales"
                );
            }
            return false;
        });

        const statusWeight = { online: 1, pause: 2, offline: 3 };

        return filtered.sort((a, b) => {
            const weightA = statusWeight[a.status] || 4;
            const weightB = statusWeight[b.status] || 4;
            return weightA - weightB;
        });
    }, [users, formData.service_type]);

    // Status Helpers
    const getStatusEmoji = (status) => {
        switch (status) {
            case "online": return "🟢";
            case "pause": return "🔵";
            case "offline": return "🔴";
            default: return "⚪";
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "online": return "bg-green-500";
            case "pause": return "bg-blue-500";
            case "offline": return "bg-red-500";
            default: return "bg-gray-300";
        }
    };

    // ==========================================
    // DESIGN HELPERS (Red / Blue border)
    // ==========================================
    const isFilled = (val) => val !== undefined && val !== null && String(val).trim() !== "" && val !== "+971";

    const inputStyle = (filled) => ({
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftColor: "transparent",
        borderRightColor: filled ? "#3b82f6" : "#ef4444",
        borderWidth: "2px",
        borderStyle: "solid",
        boxShadow: filled
            ? "0 0 0 3px rgba(59, 130, 246, 0.1)"
            : "0 0 0 3px rgba(239, 68, 68, 0.1)",
    });

    const getFieldIndicatorColor = (filled) => (filled ? "bg-blue-500" : "bg-red-500");

    // ==========================================
    // SUBMIT FORM & VALIDATION
    // ==========================================
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        // 1. Validate FIRST
        // (name validation left disabled, as in your version)
        // if (!formData.name.trim()) {
        //     toast.error("الاسم مطلوب");
        //     return;
        // }

        if (!formData.phone || formData.phone.trim() === "+971") {
            toast.error("رقم الهاتف مطلوب");
            formRef.current?.querySelector('input[name="phone"]')?.focus(); // ✅ NEW: jump to the problem field
            return;
        }
        if (!formData.type) {
            toast.error("النوع (Type) مطلوب");
            formRef.current?.querySelector('[name="type"]')?.focus(); // ✅ NEW
            return;
        }
        if (!formData.service_type) {
            toast.error("طبيعة الخدمة (Service Type) مطلوبة");
            formRef.current?.querySelector('[name="service_type"]')?.focus(); // ✅ NEW
            return;
        }
        if (!formData.off_plan_or_resale) {
            toast.error("جديد أو إعادة بيع (Off Plan / Resale) مطلوب");
            formRef.current?.querySelector('[name="off_plan_or_resale"]')?.focus(); // ✅ NEW
            return;
        }
        if (!formData.source) {
            toast.error("المصدر (Source) مطلوب");
            formRef.current?.querySelector('[name="source"]')?.focus(); // ✅ NEW
            return;
        }
        if (!formData.responsible) {
            toast.error("المسؤول (Responsible) مطلوب");
            formRef.current?.querySelector('[name="responsible"]')?.focus(); // ✅ NEW
            return;
        }

        // 2. Only set loading AFTER validation passes
        setLoading(true);

        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                toast.error("يرجى تسجيل الدخول أولاً");
                setLoading(false);
                return;
            }

            const today = new Date().toISOString().split("T")[0];

            const payload = {
                ...formData,
                stage: "fresh_lead",
                phone: formData.phone.replace(/\s+/g, ""),
                phone1: showExtraPhones && formData.phone1.trim() !== "+971" ? formData.phone1.replace(/\s+/g, "") : null,
                phone2: showExtraPhones && formData.phone2.trim() !== "+971" ? formData.phone2.replace(/\s+/g, "") : null,
                last_communication_date: today,
                language: null,
            };

            // Clean up empty strings for optional fields
            Object.keys(payload).forEach((key) => {
                if (payload[key] === "" || payload[key] === null) {
                    if (!["responsible", "observe", "source", "stage"].includes(key)) {
                        delete payload[key];
                    }
                }
            });

            const res = await fetch(`${BASE}/api/lead/create/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const responseText = await res.text();
            let data;
            try { data = responseText ? JSON.parse(responseText) : null; } catch { data = null; }

            if (!res.ok) {
                let errorMessage = "حدث خطأ أثناء إضافة الليد";
                if (data && typeof data === "object") {
                    errorMessage =
                        data.error ||
                        data.detail ||
                        data.phone?.[0] ||
                        data.name?.[0] ||
                        data.source?.[0] ||
                        Object.entries(data).map(([f, m]) => `${f}: ${m}`).join("; ");
                }
                throw new Error(errorMessage);
            }

            toast.success("✅ تم إضافة العميل بنجاح");
            if (onSuccess) onSuccess(data);
            setTimeout(() => {
                if (onClose) onClose();
            }, 1000);
        } catch (error) {
            console.error("Submit Error:", error);
            toast.error(`❌ ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // RENDER HELPERS
    // ==========================================
    // ✅ UPDATED: added enterKeyHint (mobile keyboard shows "Next") and inputMode
    const renderInput = (label, name, type = "text", placeholder = "", isRequired = false, inputMode) => {
        const filled = isFilled(formData[name]);
        return (
            <div className="flex flex-col gap-1.5">
                <label htmlFor={name} className="text-sm font-bold text-gray-700">
                    {label} {isRequired && <span className="text-red-500">*</span>}
                </label>
                <div className={FIELD_WRAPPER}>
                    <input
                        id={name}
                        type={type}
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        placeholder={placeholder}
                        inputMode={inputMode}
                        enterKeyHint="next"
                        autoComplete="off"
                        className={`${FIELD_BASE} text-right`}
                        style={inputStyle(filled)}
                    />
                    <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(filled)}`} />
                </div>
            </div>
        );
    };

    // ✅ UPDATED: shows only the local number (prefix is the badge), numeric keypad on mobile
    const renderPhoneInput = (label, name, isPrimary = false, isRequired = false) => {
        const filled = isFilled(formData[name]);
        return (
            <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                    <label htmlFor={name} className="text-sm font-bold text-gray-700">
                        {label} {isRequired && <span className="text-red-500">*</span>}
                    </label>
                    {isPrimary && (
                        <button
                            type="button"
                            onClick={() => setShowExtraPhones(!showExtraPhones)}
                            aria-label="إضافة أرقام أخرى"
                            className="text-[#a47d52] hover:text-[#8a6a44] bg-[#a47d52]/10 hover:bg-[#a47d52]/20 p-2 rounded-md transition-all flex items-center gap-1 text-xs font-bold"
                        >
                            {showExtraPhones ? <FaMinus className="text-red-500" size={12} /> : <FaPlus className="text-blue-500" size={12} />}
                        </button>
                    )}
                </div>
                <div className={`flex ${FIELD_WRAPPER}`}>
                    <div className="absolute right-0 top-0 bottom-0 bg-[#f8f7f5] border-l border-gray-300 rounded-r-sm px-3 flex items-center justify-center gap-1.5 z-10">
                        <span>🇦🇪</span>
                        <span className="text-sm font-bold text-gray-600">+971</span>
                    </div>
                    <input
                        id={name}
                        type="tel"
                        inputMode="tel"
                        name={name}
                        value={formData[name].replace("+971", "")}
                        onChange={handlePhoneChange}
                        enterKeyHint="next"
                        autoComplete="off"
                        placeholder="50 123 4567"
                        className={`${FIELD_BASE} pr-[96px] text-left`}
                        style={inputStyle(filled)}
                        dir="ltr"
                    />
                    <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 pointer-events-none z-20 ${getFieldIndicatorColor(filled)}`} />
                </div>
            </div>
        );
    };

    // ✅ NEW: one reusable select (removes ~100 lines of repeated JSX, adds chevron arrow)
    const renderSelect = (label, name, children, { required = false, disabled = false, hint = null } = {}) => {
        const filled = isFilled(formData[name]);
        return (
            <div className="flex flex-col gap-1.5">
                <label htmlFor={name} className="text-sm font-bold text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                    {hint}
                </label>
                <div className={FIELD_WRAPPER}>
                    <select
                        id={name}
                        name={name}
                        value={formData[name]}
                        onChange={handleChange}
                        disabled={disabled}
                        className={`${FIELD_BASE} cursor-pointer appearance-none text-right pl-9 disabled:bg-gray-100 disabled:cursor-not-allowed`}
                        style={inputStyle(filled)}
                    >
                        {children}
                    </select>
                    <FaChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 pointer-events-none ${getFieldIndicatorColor(filled)}`} />
                </div>
            </div>
        );
    };

    const selectedResponsible = users.find((u) => String(u.profile_id) === String(formData.responsible));

    return (
        // ✅ UPDATED: bottom-sheet style on mobile (items-end), centered on larger screens
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
            dir="rtl"
        >
            {/* ✅ UPDATED: full width on mobile, rounded only at top; max-h uses dvh so mobile browser bars don't cut it */}
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-5xl relative flex flex-col max-h-[96dvh] sm:max-h-[95vh]">

                {/* HEADER */}
                <div className="flex justify-between items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-[#f8f7f5] rounded-t-2xl shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 shrink-0 rounded-xl bg-[#a47d52]/10 flex items-center justify-center text-[#a47d52]">
                            <FaUserPlus size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg sm:text-xl font-extrabold text-gray-800 truncate">إضافة عميل جديد (Lead)</h2>
                            {/* ✅ NEW: keyboard hint (hidden on small screens) */}
                            <p className="hidden sm:block text-xs text-gray-500">
                                اضغط Enter للانتقال للحقل التالي • Esc للإغلاق
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        aria-label="إغلاق"
                        className="shrink-0 text-gray-400 hover:text-red-500 transition-colors p-2.5 bg-white rounded-lg shadow-sm"
                    >
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* ✅ UPDATED: ref={formRef} attached (this was missing), onKeyDown handles Enter navigation, noValidate */}
                <form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    onKeyDown={handleFormKeyDown}
                    noValidate
                    className="flex flex-col flex-1 overflow-hidden"
                >
                    {/* FORM BODY (Scrollable) */}
                    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-y-auto custom-scrollbar flex-1">

                        {/* SECTION 1: LEAD DETAILS */}
                        <div>
                            <h3 className="text-blue-600 text-base sm:text-lg text-center font-extrabold mb-4 sm:mb-5 mx-auto w-fit border-b border-blue-200 pb-1">
                                تفاصيل العميل (LEAD DETAILS)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {renderInput("الاسم (Name)", "name", "text", "بدون")}
                                {renderPhoneInput("الهاتف الأساسي (Phone)", "phone", true, true)}
                                {showExtraPhones && (
                                    <>
                                        {renderPhoneInput("هاتف 1 (Phone 1)", "phone1")}
                                        {renderPhoneInput("هاتف 2 (Phone 2)", "phone2")}
                                    </>
                                )}
                                {renderInput("البريد الإلكتروني (E-mail)", "email", "email", "example@mail.com")}
                                {renderInput("رابط الواتساب (WhatsApp Link)", "whatsapp_tracking_link", "text", "بدون")}
                                {renderInput("الجنسية (Nationality)", "nationality", "text", "بدون")}
                            </div>
                        </div>

                        {/* SECTION 2: SERVICE TYPE */}
                        <div>
                            <h3 className="text-blue-600 text-base sm:text-lg text-center font-extrabold mb-4 sm:mb-5 mx-auto w-fit border-b border-blue-200 pb-1">
                                نوع الخدمة (SERVICE TYPE)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {renderSelect("النوع (Type)", "type", (
                                    <>
                                        <option value="">اختر...</option>
                                        <option value="Residential">سكني (Residential)</option>
                                        <option value="Commercial">تجاري (Commercial)</option>
                                    </>
                                ), { required: true })}

                                {renderSelect("طبيعة الخدمة (Service)", "service_type", (
                                    <>
                                        <option value="">اختر...</option>
                                        <option value="Leasing">إيجار (Leasing)</option>
                                        <option value="sales">بيع (Sales)</option>
                                        <option value="leasing - sales">إيجار - بيع (Leasing - Sales)</option>
                                    </>
                                ), { required: true })}

                                {renderSelect("جديد أو إعادة بيع (Off Plan/Resale)", "off_plan_or_resale", (
                                    <>
                                        <option value="">اختر...</option>
                                        <option value="off_plan">جديد (Off Plan)</option>
                                        <option value="resale">إعادة بيع (Resale)</option>
                                    </>
                                ), { required: true })}
                            </div>
                        </div>

                        {/* SECTION 3: PROPERTY FIELDS */}
                        <div>
                            <h3 className="text-blue-600 text-base sm:text-lg text-center font-extrabold mb-4 sm:mb-5 mx-auto w-fit border-b border-blue-200 pb-1">
                                تفاصيل العقار (PROPERTY FIELDS)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {renderSelect("نوع العقار (Property Type)", "property_type", (
                                    <>
                                        <option value="">اختر...</option>
                                        <option value="Apartment">شقة (Apartment)</option>
                                        <option value="Villa">فيلا (Villa)</option>
                                        <option value="Farm">مزرعة (Farm)</option>
                                    </>
                                ))}

                                {renderSelect("نوع التأثيث (Furnishing)", "furnishing_type", (
                                    <>
                                        <option value="">اختر...</option>
                                        <option value="Furnished">مفروش (Furnished)</option>
                                        <option value="Unfurnished">غير مفروش (Unfurnished)</option>
                                    </>
                                ))}

                                {renderInput("عدد الغرف (Bedrooms)", "no_of_bedrooms", "number", "", false, "numeric")}
                                {renderInput("عدد الحمامات (Bathrooms)", "no_of_bathrooms", "number", "", false, "numeric")}
                                {renderInput("المرافق (Amenities)", "amenities")}
                                {renderInput("الموقع (Location)", "location")}
                            </div>
                            <div className="mt-4">
                                <label htmlFor="comment" className="text-sm font-bold text-gray-700 mb-1.5 block">
                                    تعليق (Comment) <span className="text-xs font-normal text-gray-400">(Shift+Enter لسطر جديد)</span>
                                </label>
                                <div className={FIELD_WRAPPER}>
                                    <textarea
                                        id="comment"
                                        name="comment"
                                        value={formData.comment}
                                        onChange={handleChange}
                                        rows="3"
                                        enterKeyHint="next"
                                        className={`${FIELD_BASE} border border-gray-300 resize-y`}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: ASSIGNMENTS */}
                        <div className="bg-[#f8f7f5] p-4 sm:p-5 rounded-xl border border-gray-200">
                            <h3 className="text-gray-800 font-extrabold mb-4 flex items-center gap-2">
                                <FaUserTie className="text-[#a47d52]" /> التعيينات (ASSIGNMENTS)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                {/* SOURCE */}
                                {renderSelect("المصدر (Source)", "source", (
                                    <>
                                        <option value="">اختر...</option>
                                        {/* {STATIC_SOURCES.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))} */}
                                        {STATIC_SOURCES.map((s) => (
                                            <option key={s.id} value={s.name}>{s.name}</option> // ✅ UPDATED: value is the name, not the id
                                        ))}
                                    </>
                                ), { required: true })}

                                {/* RESPONSIBLE */}
                                <div className="flex flex-col gap-1.5">
                                    {renderSelect("المسؤول (Responsible)", "responsible", (
                                        <>
                                            <option value="">اختر المسؤول...</option>
                                            {filteredAndSortedUsers.map((user) => (
                                                <option key={user.profile_id} value={user.profile_id}>
                                                    {getStatusEmoji(user.status)} {user.first_name || user.username || user.email}
                                                </option>
                                            ))}
                                        </>
                                    ), {
                                        required: true,
                                        disabled: !formData.service_type,
                                        hint: !formData.service_type && (
                                            <span className="text-xs text-red-500 mr-2">(اختر نوع الخدمة أولاً)</span>
                                        ),
                                    })}
                                    {selectedResponsible && (
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500">حالة المسؤول:</span>
                                            <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 bg-white rounded-md shadow-sm border border-gray-100">
                                                <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(selectedResponsible.status)}`}></span>
                                                {selectedResponsible.status === "online"
                                                    ? "متصل (Online)"
                                                    : selectedResponsible.status === "pause"
                                                    ? "استراحة (Pause)"
                                                    : "غير متصل"}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* OBSERVER (last field: Enter here submits the form) */}
                                {renderSelect("المراقب (Observer)", "observe", (
                                    <>
                                        <option value="">اختر...</option>
                                        {users.map((u) => (
                                            <option key={u.profile_id} value={u.profile_id}>
                                                {u.first_name || u.username || u.email}
                                            </option>
                                        ))}
                                    </>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    {/* ✅ UPDATED: stacked on mobile (Save on top), side by side on larger screens; respects iPhone safe area */}
                    <div
                        className="flex flex-col-reverse sm:flex-row gap-3 px-4 sm:px-6 pt-4 border-t border-gray-200 bg-white sm:rounded-b-2xl shrink-0"
                        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 cursor-pointer font-extrabold bg-gray-300 text-red-600 px-6 py-3 rounded-lg transition-all duration-300 hover:bg-gray-400 disabled:opacity-50"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 cursor-pointer font-extrabold bg-[#a47d52] text-white px-6 py-3 rounded-lg transition-all duration-300 hover:bg-[#8a6a44] sm:hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FaSave size={18} />
                            {loading ? "جاري الحفظ..." : "حفظ العميل"}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #a47d52; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #8a6a44; }
            `}</style>
        </div>
    );
};

export default AddCrmLead;


// import React, { useState, useEffect, useMemo, useRef } from "react";
// import toast from "react-hot-toast"; // ✅ Using react-hot-toast (as requested)
// import { FaUserPlus, FaSave, FaTimes, FaUserTie, FaPlus, FaMinus } from "react-icons/fa";

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// // ✅ STATIC SOURCES LIST WITH IDs
// // IMPORTANT: Change these IDs (1, 2, 3...) to match the actual IDs in your Django Source database!
// const STATIC_SOURCES = [
//     { id: 1, name: "مكالمة هاتفية Call" },
//     { id: 2, name: "بريد إلكتروني E-Mail" },
//     { id: 3, name: "فيسبوك FaceBook" },
//     { id: 4, name: "إنستجرام Instagram" },
//     { id: 5, name: "Data" },
//     { id: 6, name: "Property Finder" },
//     { id: 7, name: "Bayut/Dubizzle" },
//     { id: 8, name: "مورجان Morjan" },
//     { id: 9, name: "حجز Booking" },
//     { id: 10, name: "Mr Mohsen" },
//     { id: 11, name: "Mr Mohammed" }
// ];

// const AddCrmLead = ({ onClose, onSuccess }) => {
//     const [loading, setLoading] = useState(false);
//     const [users, setUsers] = useState([]);
//     const [showExtraPhones, setShowExtraPhones] = useState(false);
    
//     const formRef = useRef(null);

//     const [formData, setFormData] = useState({
//         name: "",
//         phone: "+971",
//         phone1: "+971",
//         phone2: "+971",
//         email: "",
//         whatsapp_tracking_link: "",
//         nationality: "",
//         lead_type: "",
//         type: "", 
//         service_type: "", 
//         off_plan_or_resale: "",
//         property_type: "",
//         furnishing_type: "",
//         no_of_bedrooms: "",
//         no_of_bathrooms: "",
//         amenities: "",
//         location: "",
//         comment: "",
//         source: "",
//         responsible: "",
//         observe: "",
//     });

//     // ==========================================
//     // FETCH USERS
//     // ==========================================
//     useEffect(() => {
//         const fetchUsers = async () => {
//             const token = localStorage.getItem("access_token");
//             try {
//                 const usersRes = await fetch(`${BASE}/api/users/`, {
//                     headers: { Authorization: `Bearer ${token}` }
//                 });
//                 if (usersRes.ok) {
//                     const usersData = await usersRes.json();
//                     const fetchedUsers = Array.isArray(usersData) ? usersData : usersData.users || [];
//                     setUsers(fetchedUsers);
//                 }
//             } catch (error) {
//                 console.error("Error fetching users:", error);
//             }
//         };
//         fetchUsers();
//     }, []);

//     // ==========================================
//     // HANDLE CHANGE
//     // ==========================================
//     const handleChange = (e) => {
//         const { name, value } = e.target;
//         setFormData((prev) => ({ ...prev, [name]: value }));
//     };

//     // ==========================================
//     // ENTER KEY NAVIGATION
//     // ==========================================
//     const handleKeyDown = (e) => {
//         if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
//             e.preventDefault(); 
//             const form = formRef.current;
//             if (!form) return;

//             const elements = Array.from(
//                 form.querySelectorAll('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])')
//             ).filter(el => el.offsetParent !== null);
            
//             const index = elements.indexOf(e.target);
//             if (index > -1 && index < elements.length - 1) {
//                 elements[index + 1].focus();
//             }
//         }
//     };

//     // ==========================================
//     // FILTER & SORT USERS
//     // ==========================================
//     const filteredAndSortedUsers = useMemo(() => {
//         if (!formData.service_type) return [];

//         const selectedService = String(formData.service_type).toLowerCase().trim();
        
//         const isLeasing = selectedService === "leasing" || selectedService === "إيجار";
//         const isSales = selectedService === "sales" || selectedService === "بيع";
//         const isLeasingandSales = selectedService === "leasing - sales" || selectedService === "ايجار - بيع";

//         if (!isLeasing && !isSales && !isLeasingandSales) return [];

//         let filtered = users.filter((user) => {
//             const role = String(user.role || "").toLowerCase().replace(/[\s_]/g, ""); 

//             if (isLeasing) {
//                 return role === "leasingagent" || role === "testaccountleasing";
//             }
//             if (isSales) {
//                 return role === "salesagent" || role === "testaccountsales";
//             }
//             if (isLeasingandSales) {
//                 return (
//                     role === "salesagent" || 
//                     role === "leasingagent" || 
//                     role === "testaccountleasing" || 
//                     role === "testaccountsales"
//                 );
//             }
//             return false;
//         });

//         const statusWeight = { "online": 1, "pause": 2, "offline": 3 };

//         return filtered.sort((a, b) => {
//             const weightA = statusWeight[a.status] || 4;
//             const weightB = statusWeight[b.status] || 4;
//             return weightA - weightB;
//         });
//     }, [users, formData.service_type]);

//     // ✅ Status Helpers
//     const getStatusEmoji = (status) => {
//         switch (status) {
//             case "online": return "🟢";
//             case "pause": return "🔵";
//             case "offline": return "🔴";
//             default: return "⚪";
//         }
//     };

//     const getStatusColor = (status) => {
//         switch (status) {
//             case "online": return "bg-green-500";
//             case "pause": return "bg-blue-500";
//             case "offline": return "bg-red-500";
//             default: return "bg-gray-300";
//         }
//     };

//     // ==========================================
//     // ✅ DESIGN HELPERS (Red / Blue border)
//     // ==========================================
//     const isFilled = (val) => val !== undefined && val !== null && String(val).trim() !== "" && val !== "+971";

//     const inputStyle = (filled) => ({
//         borderTopColor: 'transparent',
//         borderBottomColor: 'transparent',
//         borderLeftColor: 'transparent',
//         borderRightColor: filled ? '#3b82f6' : '#ef4444', 
//         borderWidth: '2px',
//         borderStyle: 'solid',
//         boxShadow: filled
//             ? '0 0 0 3px rgba(59, 130, 246, 0.1)'
//             : '0 0 0 3px rgba(239, 68, 68, 0.1)',
//     });

//     const getFieldIndicatorColor = (filled) => filled ? 'bg-blue-500' : 'bg-red-500';

//     // ==========================================
//     // SUBMIT FORM & VALIDATION
//     // ==========================================
//     const handleSubmit = async (e) => {
//         if (e) e.preventDefault();

//         // 1. Validate FIRST (Using toast from react-hot-toast)
//         // if (!formData.name.trim()) {
//         //     toast.error("الاسم مطلوب");
//         //     return;
//         // }

//         if (!formData.phone || formData.phone.trim() === "+971") {
//             toast.error("رقم الهاتف مطلوب");
//             return;
//         }
//         if (!formData.type) {
//             toast.error("النوع (Type) مطلوب");
//             return;
//         }
//         if (!formData.service_type) {
//             toast.error("طبيعة الخدمة (Service Type) مطلوبة");
//             return;
//         }
//         if (!formData.off_plan_or_resale) {
//             toast.error("جديد أو إعادة بيع (Off Plan / Resale) مطلوب");
//             return;
//         }
//         if (!formData.source) {
//             toast.error("المصدر (Source) مطلوب");
//             return;
//         }
//         if (!formData.responsible) {
//             toast.error("المسؤول (Responsible) مطلوب");
//             return;
//         }

//         // 2. Only set loading AFTER validation passes
//         setLoading(true);

//         try {
//             const token = localStorage.getItem("access_token");
//             if (!token) {
//                 toast.error("يرجى تسجيل الدخول أولاً");
//                 setLoading(false);
//                 return;
//             }

//             const today = new Date().toISOString().split('T')[0];

//             const payload = {
//                 ...formData,
//                 stage: "fresh_lead",
//                 phone: formData.phone.replace(/\s+/g, ''),
//                 phone1: showExtraPhones && formData.phone1.trim() !== "+971" ? formData.phone1.replace(/\s+/g, '') : null,
//                 phone2: showExtraPhones && formData.phone2.trim() !== "+971" ? formData.phone2.replace(/\s+/g, '') : null,
//                 last_communication_date: today,
//                 language: null,
//             };

//             // Clean up empty strings for optional fields
//             Object.keys(payload).forEach(key => {
//                 if (payload[key] === "" || payload[key] === null) {
//                     if (!['responsible', 'observe', 'source', 'stage'].includes(key)) {
//                         delete payload[key]; 
//                     }
//                 }
//             });

//             const res = await fetch(`${BASE}/api/lead/create/`, {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     Authorization: `Bearer ${token}`,
//                 },
//                 body: JSON.stringify(payload),
//             });

//             const responseText = await res.text();
//             let data;
//             try { data = responseText ? JSON.parse(responseText) : null; } catch { data = null; }

//             if (!res.ok) {
//                 let errorMessage = "حدث خطأ أثناء إضافة الليد";
//                 if (data && typeof data === "object") {
//                     errorMessage = 
//                         data.error || 
//                         data.detail || 
//                         data.phone?.[0] || 
//                         data.name?.[0] || 
//                         data.source?.[0] ||
//                         Object.entries(data).map(([f, m]) => `${f}: ${m}`).join("; ");
//                 }
//                 throw new Error(errorMessage);
//             }

//             toast.success("✅ تم إضافة العميل بنجاح");
//             if (onSuccess) onSuccess(data);
//             setTimeout(() => {
//                 if (onClose) onClose();
//             }, 1000);

//         } catch (error) {
//             console.error("Submit Error:", error);
//             toast.error(`❌ ${error.message}`);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // ==========================================
//     // RENDER HELPERS
//     // ==========================================
//     const renderInput = (label, name, type = "text", placeholder = "", isRequired = false) => {
//         const filled = isFilled(formData[name]);
//         return (
//             <div className="flex flex-col gap-1.5">
//                 <label className="text-sm font-bold text-gray-700">
//                     {label} {isRequired && <span className="text-red-500">*</span>}
//                 </label>
//                 <div className="relative">
//                     <input
//                         type={type}
//                         name={name}
//                         value={formData[name]}
//                         onChange={handleChange}
//                         onKeyDown={handleKeyDown}
//                         placeholder={placeholder}
//                         className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                         style={inputStyle(filled)}
//                     />
//                     <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(filled)}`} />
//                 </div>
//             </div>
//         );
//     };

//     const renderPhoneInput = (label, name, isPrimary = false, isRequired = false) => {
//         const filled = isFilled(formData[name]);
//         return (
//             <div className="flex flex-col gap-1.5">
//                 <div className="flex justify-between items-center">
//                     <label className="text-sm font-bold text-gray-700">
//                         {label} {isRequired && <span className="text-red-500">*</span>}
//                     </label>
//                     {isPrimary && (
//                         <button
//                             type="button"
//                             onClick={() => setShowExtraPhones(!showExtraPhones)}
//                             className="text-[#a47d52] hover:text-[#8a6a44] bg-[#a47d52]/10 hover:bg-[#a47d52]/20 p-1 rounded-md transition-all flex items-center gap-1 text-xs font-bold"
//                         >
//                             {showExtraPhones ? <FaMinus className='text-red-500' size={12} /> : <FaPlus className='text-blue-500' size={12} />}
//                         </button>
//                     )}
//                 </div>
//                 <div className="flex relative">
//                     <div className="absolute right-0 top-0 bottom-0 bg-[#f8f7f5] border-l border-gray-300 rounded-r-sm px-3 flex items-center justify-center gap-1.5 z-10">
//                         <span>🇦🇪</span>
//                         <span className="text-sm font-bold text-gray-600">+971</span>
//                     </div>
//                     <input
//                         type="text"
//                         name={name}
//                         value={formData[name]}
//                         onChange={handleChange}
//                         onKeyDown={handleKeyDown}
//                         placeholder="50 123 4567"
//                         className="w-full pr-[90px] pl-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-left dir-ltr"
//                         style={inputStyle(filled)}
//                         dir="ltr"
//                     />
//                     <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(filled)}`} />
//                 </div>
//             </div>
//         );
//     };

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
//             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative flex flex-col max-h-[95vh]">
                
//                 {/* HEADER */}
//                 <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-[#f8f7f5] rounded-t-2xl shrink-0">
//                     <div className="flex items-center gap-3">
//                         <div className="w-10 h-10 rounded-xl bg-[#a47d52]/10 flex items-center justify-center text-[#a47d52]">
//                             <FaUserPlus size={20} />
//                         </div>
//                         <h2 className="text-xl font-extrabold text-gray-800">إضافة عميل جديد (Lead)</h2>
//                     </div>
//                     <button onClick={onClose} type="button" className="text-gray-400 hover:text-red-500 transition-colors p-2 bg-white rounded-lg shadow-sm">
//                         <FaTimes size={20} />
//                     </button>
//                 </div>

//                 {/* ✅ USING FORM LIKE AddOwner.jsx */}
//                 <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
//                     {/* FORM BODY (Scrollable) */}
//                     <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
//                         {/* SECTION 1: LEAD DETAILS */}
//                         <div>
//                             <h3 className="text-blue-600 text-lg text-center font-extrabold mb-5 mx-auto w-fit border-b border-blue-200 pb-1">تفاصيل العميل (LEAD DETAILS)</h3>
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                 {renderInput("الاسم (Name)", "name", "text", "بدون", true)}
//                                 {renderPhoneInput("الهاتف الأساسي (Phone)", "phone", true, true)}
//                                 {showExtraPhones && (
//                                     <>
//                                         {renderPhoneInput("هاتف 1 (Phone 1)", "phone1")}
//                                         {renderPhoneInput("هاتف 2 (Phone 2)", "phone2")}
//                                     </>
//                                 )}
//                                 {renderInput("البريد الإلكتروني (E-mail)", "email", "email", "example@mail.com")}
//                                 {renderInput("رابط الواتساب (WhatsApp Link)", "whatsapp_tracking_link", "text", "بدون")}
//                                 {renderInput("الجنسية (Nationality)", "nationality", "text", "بدون")}
//                             </div>
//                         </div>

//                         {/* SECTION 2: SERVICE TYPE */}
//                         <div>
//                             <h3 className="text-blue-600 text-lg text-center font-extrabold mb-5 mx-auto w-fit border-b border-blue-200 pb-1 ">نوع الخدمة (SERVICE TYPE)</h3>
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                 <div className="flex flex-col gap-1.5">
//                                     <label className="text-sm font-bold text-gray-700">النوع (Type) <span className="text-red-500">*</span></label>
//                                     <div className="relative">
//                                         <select
//                                             name="type"
//                                             value={formData.type}
//                                             onChange={handleChange}
//                                             onKeyDown={handleKeyDown}
//                                             className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 cursor-pointer appearance-none text-right"
//                                             style={inputStyle(isFilled(formData.type))}
//                                         >
//                                             <option value="">اختر...</option>
//                                             <option value="Residential">سكني (Residential)</option>
//                                             <option value="Commercial">تجاري (Commercial)</option>
//                                         </select>
//                                         <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(isFilled(formData.type))}`} />
//                                     </div>
//                                 </div>

//                                 <div className="flex flex-col gap-1.5">
//                                     <label className="text-sm font-bold text-gray-700">طبيعة الخدمة (Service) <span className="text-red-500">*</span></label>
//                                     <div className="relative">
//                                         <select
//                                             name="service_type"
//                                             value={formData.service_type}
//                                             onChange={handleChange}
//                                             onKeyDown={handleKeyDown}
//                                             className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 cursor-pointer appearance-none text-right"
//                                             style={inputStyle(isFilled(formData.service_type))}
//                                         >
//                                             <option value="">اختر...</option>
//                                             <option value="Leasing">إيجار (Leasing)</option>
//                                             <option value="sales">بيع (Sales)</option>
//                                             <option value="leasing - sales">إيجار - بيع (Leasing - Sales)</option>
//                                         </select>
//                                         <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(isFilled(formData.service_type))}`} />
//                                     </div>
//                                 </div>

//                                 <div className="flex flex-col gap-1.5">
//                                     <label className="text-sm font-bold text-gray-700">جديد أو إعادة بيع (Off Plan/Resale) <span className="text-red-500">*</span></label>
//                                     <div className="relative">
//                                         <select
//                                             name="off_plan_or_resale"
//                                             value={formData.off_plan_or_resale}
//                                             onChange={handleChange}
//                                             onKeyDown={handleKeyDown}
//                                             className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 cursor-pointer appearance-none text-right"
//                                             style={inputStyle(isFilled(formData.off_plan_or_resale))}
//                                         >
//                                             <option value="">اختر...</option>
//                                             <option value="off_plan">جديد (Off Plan)</option>
//                                             <option value="resale">إعادة بيع (Resale)</option>
//                                         </select>
//                                         <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(isFilled(formData.off_plan_or_resale))}`} />
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>

//                         {/* SECTION 3: PROPERTY FIELDS */}
//                         <div>
//                             <h3 className="text-blue-600 text-lg text-center font-extrabold mb-5 mx-auto w-fit border-b border-blue-200 pb-1">تفاصيل العقار (PROPERTY FIELDS)</h3>
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                                 <div className="flex flex-col gap-1.5">
//                                     <label className="text-sm font-bold text-gray-700">نوع العقار (Property Type)</label>
//                                     <div className="relative">
//                                         <select
//                                             name="property_type"
//                                             value={formData.property_type}
//                                             onChange={handleChange}
//                                             onKeyDown={handleKeyDown}
//                                             className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 cursor-pointer appearance-none text-right"
//                                             style={inputStyle(isFilled(formData.property_type))}
//                                         >
//                                             <option value="">اختر...</option>
//                                             <option value="Apartment">شقة (Apartment)</option>
//                                             <option value="Villa">فيلا (Villa)</option>
//                                             <option value="Farm">مزرعة (Farm)</option>
//                                         </select>
//                                         <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(isFilled(formData.property_type))}`} />
//                                     </div>
//                                 </div>

//                                 <div className="flex flex-col gap-1.5">
//                                     <label className="text-sm font-bold text-gray-700">نوع التأثيث (Furnishing)</label>
//                                     <div className="relative">
//                                         <select
//                                             name="furnishing_type"
//                                             value={formData.furnishing_type}
//                                             onChange={handleChange}
//                                             onKeyDown={handleKeyDown}
//                                             className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 cursor-pointer appearance-none text-right"
//                                             style={inputStyle(isFilled(formData.furnishing_type))}
//                                         >
//                                             <option value="">اختر...</option>
//                                             <option value="Furnished">مفروش (Furnished)</option>
//                                             <option value="Unfurnished">غير مفروش (Unfurnished)</option>
//                                         </select>
//                                         <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(isFilled(formData.furnishing_type))}`} />
//                                     </div>
//                                 </div>

//                                 {renderInput("عدد الغرف (Bedrooms)", "no_of_bedrooms", "number")}
//                                 {renderInput("عدد الحمامات (Bathrooms)", "no_of_bathrooms", "number")}
//                                 {renderInput("المرافق (Amenities)", "amenities")}
//                                 {renderInput("الموقع (Location)", "location")}
//                             </div>
//                             <div className="mt-4">
//                                 <label className="text-sm font-bold text-gray-700 mb-1.5 block">تعليق (Comment)</label>
//                                 <textarea
//                                     name="comment"
//                                     value={formData.comment}
//                                     onChange={handleChange}
//                                     rows="3"
//                                     className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 border border-gray-300"
//                                 />
//                             </div>
//                         </div>

//                         {/* SECTION 4: ASSIGNMENTS */}
//                         <div className="bg-[#f8f7f5] p-5 rounded-xl border border-gray-200">
//                             <h3 className="text-gray-800 font-extrabold mb-4 flex items-center gap-2">
//                                 <FaUserTie className="text-[#a47d52]" /> التعيينات (ASSIGNMENTS)
//                             </h3>
//                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                
//                                 {/* ✅ SOURCE DROPDOWN WITH IDs */}
//                                 <div className="flex flex-col gap-1.5">
//                                     <label className="text-sm font-bold text-gray-700">المصدر (Source) <span className="text-red-500">*</span></label>
//                                     <div className="relative">
//                                         <select
//                                             name="source"
//                                             value={formData.source}
//                                             onChange={handleChange}
//                                             onKeyDown={handleKeyDown}
//                                             className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 cursor-pointer appearance-none text-right"
//                                             style={inputStyle(isFilled(formData.source))}
//                                         >
//                                             <option value="">اختر...</option>
//                                             {STATIC_SOURCES.map((s) => (
//                                                 <option key={s.id} value={s.id}>{s.name}</option>
//                                             ))}
//                                         </select>
//                                         <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(isFilled(formData.source))}`} />
//                                     </div>
//                                 </div>

//                                 {/* RESPONSIBLE */}
//                                 <div className="flex flex-col gap-1.5">
//                                     <label className="text-sm font-bold text-gray-700">
//                                         المسؤول (Responsible) <span className="text-red-500">*</span>
//                                         {!formData.service_type && <span className="text-xs text-red-500 mr-2">(اختر نوع الخدمة أولاً)</span>}
//                                     </label>
//                                     <div className="relative">
//                                         <select
//                                             name="responsible"
//                                             value={formData.responsible}
//                                             onChange={handleChange}
//                                             onKeyDown={handleKeyDown}
//                                             disabled={!formData.service_type}
//                                             className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none appearance-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed text-right"
//                                             style={isFilled(formData.responsible) ? inputStyle(true) : inputStyle(false)}
//                                         >
//                                             <option value="">اختر المسؤول...</option>
//                                             {filteredAndSortedUsers.map((user) => (
//                                                 <option key={user.profile_id} value={user.profile_id}>
//                                                     {getStatusEmoji(user.status)} {user.first_name || user.username || user.email}
//                                                 </option>
//                                             ))}
//                                         </select>
//                                         <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(isFilled(formData.responsible))}`} />
//                                     </div>
//                                     {formData.responsible && (
//                                         <div className="flex items-center gap-2 mt-1">
//                                             <span className="text-xs text-gray-500">حالة المسؤول:</span>
//                                             {(() => {
//                                                 const selectedUser = users.find(u => String(u.profile_id) === String(formData.responsible));
//                                                 if (!selectedUser) return null;
//                                                 return (
//                                                     <span className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 bg-white rounded-md shadow-sm border border-gray-100">
//                                                         <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(selectedUser.status)}`}></span>
//                                                         {selectedUser.status === 'online' ? 'متصل (Online)' : 
//                                                          selectedUser.status === 'pause' ? 'استراحة (Pause)' : 'غير متصل'}
//                                                     </span>
//                                                 );
//                                             })()}
//                                         </div>
//                                     )}
//                                 </div>

//                                 {/* OBSERVER */}
//                                 <div className="flex flex-col gap-1.5">
//                                     <label className="text-sm font-bold text-gray-700">المراقب (Observer)</label>
//                                     <div className="relative">
//                                         <select
//                                             name="observe"
//                                             value={formData.observe}
//                                             onChange={handleChange}
//                                             onKeyDown={handleKeyDown}
//                                             className="w-full px-4 py-2.5 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 cursor-pointer appearance-none text-right"
//                                             style={inputStyle(isFilled(formData.observe))}
//                                         >
//                                             <option value="">اختر...</option>
//                                             {users.map((u) => (
//                                                 <option key={u.profile_id} value={u.profile_id}>{u.first_name || u.username || u.email}</option>
//                                             ))}
//                                         </select>
//                                         <div className={`absolute right-0 top-0 h-full w-1 rounded-r-lg transition-all duration-300 ${getFieldIndicatorColor(isFilled(formData.observe))}`} />
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     </div>

//                     {/* FOOTER */}
//                     <div className="flex gap-3 p-4 border-t border-gray-200 bg-white rounded-b-2xl shrink-0">
//                         <button
//                             type="submit"
//                             disabled={loading}
//                             className="flex-1 flex items-center justify-center gap-2 cursor-pointer font-extrabold bg-[#a47d52] text-white px-6 py-3 rounded-lg transition-all duration-300 hover:bg-[#8a6a44] hover:scale-105 disabled:opacity-50"
//                         >
//                             <FaSave size={18} />
//                             {loading ? "جاري الحفظ..." : "حفظ العميل"}
//                         </button>
//                         <button
//                             type="button"
//                             onClick={onClose}
//                             disabled={loading}
//                             className="flex-1 cursor-pointer font-extrabold bg-gray-300 text-red-600 px-6 py-3 rounded-lg transition-all duration-300 hover:bg-gray-400"
//                         >
//                             إلغاء
//                         </button>
//                     </div>
//                 </form>

//             </div>
            
//             <style>{`
//                 .custom-scrollbar::-webkit-scrollbar { width: 8px; }
//                 .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
//                 .custom-scrollbar::-webkit-scrollbar-thumb { background: #a47d52; border-radius: 4px; }
//                 .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #8a6a44; }
//             `}</style>
//         </div>
//     );
// };

// export default AddCrmLead;


