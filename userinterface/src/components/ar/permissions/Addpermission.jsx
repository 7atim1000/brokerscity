import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import {
    FaSave,
    FaUser,
    FaShieldAlt,
    FaCheck,
    FaBuilding,
    FaMoneyBillWave,
    FaUsers,
    FaUserShield,
    FaBullhorn,
    FaAddressCard,
    FaEye,
    FaUserTag,
    FaPlusCircle,
    FaEdit,
    FaExchangeAlt,
    FaTrashAlt,
    FaFileAlt,
    FaRegBuilding,
    FaArchive,
    FaMapMarkerAlt, // ✅ added for archive properties
} from 'react-icons/fa';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// =========================================================
// PERMISSION FIELDS CONFIG (moved outside component)
// =========================================================
const PERMISSION_FIELDS = [
    // Core
    { key: 'ListWorkLog', label: 'عرض سجل الحضور', description: 'السماح بعرض سجل الحضور', Icon: FaShieldAlt },
    { key: 'monitoring', label: 'عرض المراقبة', description: 'السماح بعرض سجلات المراقبة', Icon: FaShieldAlt },
    { key: 'add_monitor', label: 'إضافة مراقبة', description: 'السماح بإضافة مراقبة جديدة', Icon: FaShieldAlt },
    { key: 'property_management', label: 'إدارة العقارات', description: 'السماح بإدارة الإيجارات والعقارات', Icon: FaBuilding },
    { key: 'financials', label: 'الإدارة المالية', description: 'السماح بإدارة الشؤون المالية', Icon: FaMoneyBillWave },
    { key: 'can_view_users', label: 'عرض المستخدمين', description: 'السماح بعرض قائمة المستخدمين', Icon: FaUsers },
    { key: 'can_manage_users', label: 'إدارة المستخدمين', description: 'السماح بتعديل بيانات المستخدمين', Icon: FaUserShield },
    { key: 'can_manage_permissions', label: 'إدارة الصلاحيات', description: 'السماح بتعديل صلاحيات الآخرين', Icon: FaShieldAlt },
    { key: 'ads', label: 'إدارة الإعلانات', description: 'السماح بإدارة صفحات الهبوط للإعلانات', Icon: FaBullhorn },
    { key: 'leads', label: 'إدارة العملاء المحتملين (الرئيسية)', description: 'السماح بالوصول إلى قسم الليدز بالكامل', Icon: FaAddressCard },

    // CRM Leads
    { key: 'view_all_lead', label: 'عرض جميع الليدز', description: 'السماح للمستخدم بعرض جميع الليدز في النظام', Icon: FaEye },
    { key: 'view_my_lead', label: 'عرض ليدزي فقط', description: 'السماح للمستخدم بعرض الليدز المخصصة له فقط', Icon: FaUserTag },
    { key: 'create_new_lead', label: 'إنشاء ليد جديد', description: 'السماح للمستخدم بإنشاء ليد جديد', Icon: FaPlusCircle },
    { key: 'update_lead', label: 'تعديل بيانات الليد', description: 'السماح بتعديل جميع معلومات الليد', Icon: FaEdit },
    { key: 'update_lead_stage', label: 'تعديل مرحلة الليد', description: 'السماح بتغيير مرحلة الليد (Kanban)', Icon: FaExchangeAlt },
    { key: 'update_lead_responsible', label: 'تعديل المسؤول', description: 'السماح بتغيير الشخص المسؤول عن الليد', Icon: FaUserShield },
    { key: 'delete_lead', label: 'حذف الليد', description: 'السماح بحذف الليد نهائياً', Icon: FaTrashAlt },

    // CRM Listings
    { key: 'view_all_listing', label: 'عرض جميع العقارات', description: 'السماح بعرض جميع العقارات في النظام', Icon: FaFileAlt },
    { key: 'view_my_listing', label: 'عرض عقاراتي فقط', description: 'السماح بعرض العقارات المخصصة له فقط', Icon: FaUserTag },
    { key: 'create_new_listing', label: 'إضافة عقار جديد', description: 'السماح بإنشاء عقار جديد', Icon: FaPlusCircle },
    { key: 'update_listing', label: 'تعديل العقار', description: 'السماح بتعديل بيانات العقار', Icon: FaEdit },
    { key: 'delete_listing', label: 'حذف العقار', description: 'السماح بحذف العقار نهائياً', Icon: FaTrashAlt },
    { key: 'confirm_listing', label: 'تأكيد العقار', description: 'السماح بتأكيد حالة العقار', Icon: FaCheck },

    // CRM Listing Owners
    { key: 'view_all_listing_owners', label: 'عرض جميع الملاك', description: 'السماح بعرض جميع ملاك العقارات', Icon: FaRegBuilding },
    { key: 'view_my_listing_owners', label: 'عرض ملاكي فقط', description: 'السماح بعرض الملاك المخصصين له فقط', Icon: FaUserTag },
    { key: 'create_new_listing_owners', label: 'إضافة مالك جديد', description: 'السماح بإضافة مالك عقار جديد', Icon: FaPlusCircle },
    { key: 'update_listing_owners', label: 'تعديل بيانات المالك', description: 'السماح بتعديل بيانات مالك العقار', Icon: FaEdit },
    { key: 'delete_listing_owners', label: 'حذف المالك', description: 'السماح بحذف مالك العقار نهائياً', Icon: FaTrashAlt },

    // CRM Archive Owners
    { key: 'view_all_archive_owners', label: 'عرض جميع ملاك الأرشيف', description: 'السماح بعرض جميع ملاك الأرشيف في النظام', Icon: FaArchive },
    { key: 'view_my_archive_owners', label: 'عرض ملاك أرشيفي فقط', description: 'السماح بعرض ملاك الأرشيف المخصصين له فقط', Icon: FaUserTag },
    { key: 'create_bulk_archive_owners', label: 'إضافة ملاك الأرشيف', description: 'السماح بإضافة ملاك إلى الأرشيف بشكل جماعي', Icon: FaPlusCircle },
    { key: 'update_bulk_responsibility_archive_owners', label: 'تعديل مسؤولية الأرشيف', description: 'السماح بتعديل مسؤولية ملاك الأرشيف بشكل جماعي', Icon: FaExchangeAlt },
    { key: 'delete_bulk_archive_owners', label: 'حذف ملاك الأرشيف', description: 'السماح بحذف ملاك الأرشيف بشكل جماعي', Icon: FaTrashAlt },

    // ✅ ADDED: CRM Archive Properties
    { key: 'view_all_archive_properties', label: 'عرض جميع عقارات الأرشيف', description: 'السماح بعرض جميع عقارات الأرشيف في النظام', Icon: FaArchive },
    { key: 'view_my_archive_properties', label: 'عرض عقارات أرشيفي فقط', description: 'السماح بعرض عقارات الأرشيف المخصصة له فقط', Icon: FaUserTag },
    { key: 'create_bulk_archive_properties', label: 'إضافة عقارات الأرشيف', description: 'السماح بإضافة عقارات إلى الأرشيف بشكل جماعي', Icon: FaPlusCircle },
    { key: 'update_bulk_responsibility_archive_properties', label: 'تعديل مسؤولية عقارات الأرشيف', description: 'السماح بتعديل مسؤولية عقارات الأرشيف بشكل جماعي', Icon: FaExchangeAlt },
    { key: 'delete_bulk_archive_properties', label: 'حذف عقارات الأرشيف', description: 'السماح بحذف عقارات الأرشيف بشكل جماعي', Icon: FaTrashAlt },

    // ✅ ADDED: Permit Numbers
    { key: 'view_all_permit_numbers', label: 'عرض كل أرقام التراخيص', description: 'السماح بعرض جميع أرقام التراخيص', Icon: FaFileAlt },
    { key: 'create_new_permit_number', label: 'إضافة رقم ترخيص', description: 'السماح بإضافة رقم ترخيص جديد', Icon: FaPlusCircle },
    { key: 'update_permit_number', label: 'تعديل رقم ترخيص', description: 'السماح بتعديل بيانات رقم الترخيص', Icon: FaEdit },
    { key: 'delete_permit_number', label: 'حذف رقم ترخيص', description: 'السماح بحذف رقم الترخيص نهائياً', Icon: FaTrashAlt },
];

// =========================================================
// BUILD DEFAULT FORM DATA FROM CONFIG
// =========================================================
const buildDefaultFormData = () => {
    const base = { user: '' };
    PERMISSION_FIELDS.forEach((field) => {
        base[field.key] = false;
    });
    return base;
};

const DEFAULT_FORM_DATA = buildDefaultFormData();

// =========================================================
// SMALL TOGGLE SWITCH
// =========================================================
const SmallToggle = ({ checked, name, onChange, disabled }) => (
    <div
        className={`
            relative w-8 h-4 rounded-full
            transition-colors duration-200 shrink-0
            ${checked ? 'bg-green-600' : 'bg-slate-300'}
            ${disabled ? 'opacity-60' : ''}
        `}
    >
        <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            className="sr-only"
            disabled={disabled}
        />
        <span
            className={`
                absolute top-0.5
                w-3 h-3 bg-white rounded-full shadow
                transition-all duration-200
                ${checked ? 'right-0.5' : 'right-[calc(100%-0.875rem)]'}
            `}
        />
    </div>
);

const AddPermission = ({ onClose, permissionData, onSuccess }) => {
    const isEditMode = !!permissionData;

    // =========================================================
    // STATE
    // =========================================================
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [errors, setErrors] = useState({});

    const userRef = useRef(null);

    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

    // =========================================================
    // FIELD STATUS
    // =========================================================
    const isUserFilled = formData.user && formData.user !== '';

    // =========================================================
    // FIELD STYLING
    // =========================================================
    const getFieldBorderColor = (isFilled, error) => {
        if (error) return '#ef4444';
        if (isFilled) return '#a47d52';
        return '#ef4444';
    };

    const getFieldShadow = (isFilled, error) => {
        if (error) return '0 0 0 3px rgba(239, 68, 68, 0.15)';
        if (isFilled) return '0 0 0 3px rgba(164, 125, 82, 0.12)';
        return '0 0 0 3px rgba(239, 68, 68, 0.08)';
    };

    // =========================================================
    // FETCH USERS
    // =========================================================
    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                toast.error('يرجى تسجيل الدخول');
                return [];
            }

            const response = await fetch(`${BASE}/api/users/`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                console.error('Failed to fetch users:', response.status);
                toast.error('فشل تحميل قائمة المستخدمين');
                return [];
            }

            const data = await response.json();
            let list = [];
            if (Array.isArray(data)) list = data;
            else if (Array.isArray(data.users)) list = data.users;
            else if (Array.isArray(data.results)) list = data.results;
            else if (Array.isArray(data.data)) list = data.data;

            setUsers(list);
            return list;
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('حدث خطأ أثناء تحميل المستخدمين');
            return [];
        } finally {
            setLoadingUsers(false);
        }
    };

    // =========================================================
    // INITIAL LOAD / EDIT MODE POPULATION (config-driven)
    // =========================================================
    useEffect(() => {
        fetchUsers();

        if (permissionData) {
            const populated = {
                user:
                    typeof permissionData.user === 'object'
                        ? permissionData.user?.id || ''
                        : permissionData.user || '',
            };
            PERMISSION_FIELDS.forEach((field) => {
                populated[field.key] = !!permissionData[field.key];
            });
            setFormData(populated);
        } else {
            setFormData(buildDefaultFormData());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [permissionData]);

    // =========================================================
    // HANDLE CHANGE
    // =========================================================
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    // =========================================================
    // HANDLE SUBMIT (config-driven payload)
    // =========================================================
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setErrors({});

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                toast.error('يرجى تسجيل الدخول');
                setLoading(false);
                return;
            }

            const newErrors = {};
            if (!isEditMode && !formData.user) {
                newErrors.user = 'يرجى اختيار المستخدم';
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                toast.error('يرجى تصحيح الأخطاء في النموذج');
                setLoading(false);
                return;
            }

            const submitData = {};
            PERMISSION_FIELDS.forEach((field) => {
                submitData[field.key] = !!formData[field.key];
            });

            if (!isEditMode) {
                submitData.user = parseInt(formData.user, 10);
            }

            const url = isEditMode
                ? `${BASE}/api/permissions/${permissionData.id}/update/`
                : `${BASE}/api/permissions/create/`;

            const method = isEditMode ? 'PATCH' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(submitData),
            });

            if (!response.ok) {
                let errorData = null;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = null;
                }

                console.error('Permission error:', errorData);

                if (errorData) {
                    const errorMessages = [];
                    Object.keys(errorData).forEach((key) => {
                        const value = errorData[key];
                        if (Array.isArray(value)) {
                            errorMessages.push(`${key}: ${value.join(', ')}`);
                        } else if (typeof value === 'string') {
                            errorMessages.push(`${key}: ${value}`);
                        }
                    });
                    throw new Error(errorMessages.join('\n') || 'فشل حفظ الصلاحيات');
                }

                throw new Error('فشل حفظ الصلاحيات');
            }

            const result = await response.json();
            console.log('Permission saved:', result);

            toast.success(
                isEditMode
                    ? '✅ تم تحديث الصلاحيات بنجاح'
                    : '✅ تم إضافة الصلاحيات بنجاح'
            );

            onSuccess?.();
            onClose?.();
        } catch (error) {
            console.error('Error saving permission:', error);
            toast.error('❌ ' + (error?.message || 'حدث خطأ أثناء الحفظ'));
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // HANDLE CLOSE
    // =========================================================
    const handleClose = () => {
        if (loading) return;
        setFormData(buildDefaultFormData());
        setErrors({});
        onClose?.();
    };

    // =========================================================
    // RENDER
    // =========================================================
    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-md p-2 sm:p-4">
                <div
                    dir="rtl"
                    className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[92vh] overflow-hidden border border-white/60"
                >
                    {/* HEADER */}
                    <div className="flex justify-between items-center gap-4 px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-200 sticky top-0 z-20 bg-white/95 backdrop-blur-xl shadow-sm">
                        <div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
                                {isEditMode ? 'تعديل الصلاحيات' : 'إضافة صلاحيات جديدة'}
                            </h3>

                            {isEditMode && permissionData?.username && (
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                    المستخدم:{' '}
                                    <span className="font-bold text-[#a47d52] bg-[#a47d52]/10 px-2 py-0.5 rounded-md">
                                        {permissionData.user_full_name || permissionData.username}
                                    </span>
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            className="cursor-pointer shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 text-2xl font-light focus:outline-none focus:ring-2 focus:ring-[#a47d52]/30"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            ✕
                        </button>
                    </div>

                    {/* FORM */}
                    <form
                        onSubmit={handleSubmit}
                        className="p-4 sm:p-6 md:p-7 space-y-5 sm:space-y-6 bg-slate-50/70 overflow-y-auto max-h-[calc(95vh-76px)] sm:max-h-[calc(92vh-80px)] no-scrollbar"
                    >
                        {/* EDIT MODE INFO */}
                        {isEditMode && (
                            <div className="bg-white border border-[#a47d52]/20 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
                                <div className="flex gap-3 items-center text-sm bg-slate-50 rounded-xl px-3 py-2.5">
                                    <FaUser className="text-[#a47d52]" />
                                    <span className="text-gray-600">المستخدم:</span>
                                    <span className="font-semibold text-[#a47d52]">
                                        {permissionData?.user_full_name || permissionData?.username || '-'}
                                    </span>
                                </div>

                                {permissionData?.user_email && (
                                    <div className="flex gap-3 items-center text-sm bg-slate-50 rounded-xl px-3 py-2.5">
                                        <span className="text-gray-600">البريد الإلكتروني:</span>
                                        <span className="font-semibold text-[#a47d52]">
                                            {permissionData.user_email}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CREATE MODE — USER DROPDOWN */}
                        {!isEditMode && (
                            <div className="space-y-1.5">
                                <label className="block text-sm font-semibold text-slate-700">
                                    <span className="flex items-center gap-2">
                                        <FaUser className="text-[#a47d52] text-xs" />
                                        المستخدم <span className="text-red-500">*</span>
                                    </span>
                                </label>

                                <select
                                    ref={userRef}
                                    name="user"
                                    value={formData.user}
                                    onChange={handleChange}
                                    className="w-full cursor-pointer px-4 py-2.5 bg-white rounded-xl shadow-sm focus:outline-none transition-all duration-200 text-right hover:border-[#a47d52]/60"
                                    style={{
                                        borderTopColor: 'transparent',
                                        borderBottomColor: 'white',
                                        borderLeftColor: 'transparent',
                                        borderRightColor: getFieldBorderColor(isUserFilled, errors.user),
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        boxShadow: getFieldShadow(isUserFilled, errors.user),
                                    }}
                                    required
                                    disabled={loading || loadingUsers}
                                    autoFocus
                                >
                                    <option value="">
                                        {loadingUsers
                                            ? 'جاري تحميل المستخدمين...'
                                            : users.length === 0
                                            ? 'لا يوجد مستخدمون'
                                            : 'اختر المستخدم...'}
                                    </option>

                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.first_name || user.username}
                                            {user.last_name ? ` ${user.last_name}` : ''}
                                            {user.email ? ` — ${user.email}` : ''}
                                        </option>
                                    ))}
                                </select>

                                {errors.user && (
                                    <p className="text-red-500 text-sm mt-1">{errors.user}</p>
                                )}
                            </div>
                        )}

                        {/* PERMISSION TOGGLES */}
                        <div className="space-y-3 pt-2 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <FaShieldAlt className="text-[#a47d52] text-sm" />
                                <h4 className="text-sm font-bold text-slate-700">الصلاحيات</h4>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {PERMISSION_FIELDS.map((field) => {
                                    const Icon = field.Icon;

                                    return (
                                        <label
                                            key={field.key}
                                            className={`
                                                flex flex-col justify-between gap-2.5
                                                p-3.5 rounded-xl cursor-pointer
                                                border transition-all duration-200
                                                ${
                                                    formData[field.key]
                                                        ? 'border-[#a47d52] bg-[#a47d52]/5 shadow-sm'
                                                        : 'border-slate-200 bg-white hover:border-[#a47d52]/40'
                                                }
                                                ${loading ? 'opacity-60 cursor-not-allowed' : ''}
                                            `}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="w-8 h-8 shrink-0 rounded-lg bg-[#a47d52]/10 flex items-center justify-center">
                                                    <Icon className="text-[#a47d52] text-xs" />
                                                </div>

                                                <SmallToggle
                                                    checked={!!formData[field.key]}
                                                    name={field.key}
                                                    onChange={handleChange}
                                                    disabled={loading}
                                                />
                                            </div>

                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-semibold text-sm text-slate-800 leading-tight">
                                                    {field.label}
                                                </span>
                                                <span className="text-[11px] text-slate-500 leading-snug">
                                                    {field.description}
                                                </span>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* BUTTONS */}
                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5 border-t border-slate-200 sticky bottom-0 bg-slate-50/95 backdrop-blur-sm">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`
                                    cursor-pointer flex-1 min-h-12
                                    bg-[#a47d52] text-white px-6 py-3 rounded-xl font-bold
                                    shadow-md shadow-[#a47d52]/20
                                    transition-all duration-200
                                    hover:bg-[#8a6a44] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0
                                    ${loading ? 'opacity-70 cursor-not-allowed' : ''}
                                `}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                        جاري الحفظ...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <FaSave />
                                        {isEditMode ? 'تحديث' : 'حفظ'}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={loading}
                                className="cursor-pointer w-full sm:w-auto min-h-12 px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 hover:border-slate-400 transition-all duration-200"
                            >
                                إلغاء
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default AddPermission;


// import React, { useState, useEffect, useRef } from 'react';
// import { toast } from 'react-toastify';
// import {
//     FaSave,
//     FaUser,
//     FaShieldAlt,
//     FaCheck,
//     FaBuilding,
//     FaMoneyBillWave,
//     FaUsers,
//     FaUserShield,
//     FaBullhorn,
//     FaAddressCard,
//     FaEye,
//     FaUserTag,
//     FaPlusCircle,
//     FaEdit,
//     FaExchangeAlt,
//     FaTrashAlt,
//     FaFileAlt,
//     FaRegBuilding,
//     FaArchive,
// } from 'react-icons/fa';

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// // =========================================================
// // PERMISSION FIELDS CONFIG (moved outside component)
// // =========================================================
// const PERMISSION_FIELDS = [
//     // Core
//     { key: 'ListWorkLog', label: 'عرض سجل الحضور', description: 'السماح بعرض سجل الحضور', Icon: FaShieldAlt },
//     { key: 'monitoring', label: 'عرض المراقبة', description: 'السماح بعرض سجلات المراقبة', Icon: FaShieldAlt },
//     { key: 'add_monitor', label: 'إضافة مراقبة', description: 'السماح بإضافة مراقبة جديدة', Icon: FaShieldAlt },
//     { key: 'property_management', label: 'إدارة العقارات', description: 'السماح بإدارة الإيجارات والعقارات', Icon: FaBuilding },
//     { key: 'financials', label: 'الإدارة المالية', description: 'السماح بإدارة الشؤون المالية', Icon: FaMoneyBillWave },
//     { key: 'can_view_users', label: 'عرض المستخدمين', description: 'السماح بعرض قائمة المستخدمين', Icon: FaUsers },
//     { key: 'can_manage_users', label: 'إدارة المستخدمين', description: 'السماح بتعديل بيانات المستخدمين', Icon: FaUserShield },
//     { key: 'can_manage_permissions', label: 'إدارة الصلاحيات', description: 'السماح بتعديل صلاحيات الآخرين', Icon: FaShieldAlt },
//     { key: 'ads', label: 'إدارة الإعلانات', description: 'السماح بإدارة صفحات الهبوط للإعلانات', Icon: FaBullhorn },
//     { key: 'leads', label: 'إدارة العملاء المحتملين (الرئيسية)', description: 'السماح بالوصول إلى قسم الليدز بالكامل', Icon: FaAddressCard },

//     // CRM Leads
//     { key: 'view_all_lead', label: 'عرض جميع الليدز', description: 'السماح للمستخدم بعرض جميع الليدز في النظام', Icon: FaEye },
//     { key: 'view_my_lead', label: 'عرض ليدزي فقط', description: 'السماح للمستخدم بعرض الليدز المخصصة له فقط', Icon: FaUserTag },
//     { key: 'create_new_lead', label: 'إنشاء ليد جديد', description: 'السماح للمستخدم بإنشاء ليد جديد', Icon: FaPlusCircle },
//     { key: 'update_lead', label: 'تعديل بيانات الليد', description: 'السماح بتعديل جميع معلومات الليد', Icon: FaEdit },
//     { key: 'update_lead_stage', label: 'تعديل مرحلة الليد', description: 'السماح بتغيير مرحلة الليد (Kanban)', Icon: FaExchangeAlt },
//     { key: 'update_lead_responsible', label: 'تعديل المسؤول', description: 'السماح بتغيير الشخص المسؤول عن الليد', Icon: FaUserShield },
//     { key: 'delete_lead', label: 'حذف الليد', description: 'السماح بحذف الليد نهائياً', Icon: FaTrashAlt },

//     // CRM Listings
//     { key: 'view_all_listing', label: 'عرض جميع العقارات', description: 'السماح بعرض جميع العقارات في النظام', Icon: FaFileAlt },
//     { key: 'view_my_listing', label: 'عرض عقاراتي فقط', description: 'السماح بعرض العقارات المخصصة له فقط', Icon: FaUserTag },
//     { key: 'create_new_listing', label: 'إضافة عقار جديد', description: 'السماح بإنشاء عقار جديد', Icon: FaPlusCircle },
//     { key: 'update_listing', label: 'تعديل العقار', description: 'السماح بتعديل بيانات العقار', Icon: FaEdit },
//     { key: 'delete_listing', label: 'حذف العقار', description: 'السماح بحذف العقار نهائياً', Icon: FaTrashAlt },
//     { key: 'confirm_listing', label: 'تأكيد العقار', description: 'السماح بتأكيد حالة العقار', Icon: FaCheck },

//     // CRM Listing Owners
//     { key: 'view_all_listing_owners', label: 'عرض جميع الملاك', description: 'السماح بعرض جميع ملاك العقارات', Icon: FaRegBuilding },
//     { key: 'view_my_listing_owners', label: 'عرض ملاكي فقط', description: 'السماح بعرض الملاك المخصصين له فقط', Icon: FaUserTag },
//     { key: 'create_new_listing_owners', label: 'إضافة مالك جديد', description: 'السماح بإضافة مالك عقار جديد', Icon: FaPlusCircle },
//     { key: 'update_listing_owners', label: 'تعديل بيانات المالك', description: 'السماح بتعديل بيانات مالك العقار', Icon: FaEdit },
//     { key: 'delete_listing_owners', label: 'حذف المالك', description: 'السماح بحذف مالك العقار نهائياً', Icon: FaTrashAlt },

//     // ✅ ADDED: CRM Archive Owners
//     { key: 'view_all_archive_owners', label: 'عرض جميع ملاك الأرشيف', description: 'السماح بعرض جميع ملاك الأرشيف في النظام', Icon: FaArchive },
//     { key: 'view_my_archive_owners', label: 'عرض ملاك أرشيفي فقط', description: 'السماح بعرض ملاك الأرشيف المخصصين له فقط', Icon: FaUserTag },
//     { key: 'create_bulk_archive_owners', label: 'إضافة ملاك الأرشيف', description: 'السماح بإضافة ملاك إلى الأرشيف بشكل جماعي', Icon: FaPlusCircle },
//     { key: 'update_bulk_responsibility_archive_owners', label: 'تعديل مسؤولية الأرشيف', description: 'السماح بتعديل مسؤولية ملاك الأرشيف بشكل جماعي', Icon: FaExchangeAlt },
//     { key: 'delete_bulk_archive_owners', label: 'حذف ملاك الأرشيف', description: 'السماح بحذف ملاك الأرشيف بشكل جماعي', Icon: FaTrashAlt },
// ];

// // =========================================================
// // BUILD DEFAULT FORM DATA FROM CONFIG
// // =========================================================
// const buildDefaultFormData = () => {
//     const base = { user: '' };
//     PERMISSION_FIELDS.forEach((field) => {
//         base[field.key] = false;
//     });
//     return base;
// };

// const DEFAULT_FORM_DATA = buildDefaultFormData();

// // =========================================================
// // SMALL TOGGLE SWITCH (inline for the modal)
// // =========================================================
// const SmallToggle = ({ checked, name, onChange, disabled }) => (
//     <div
//         className={`
//             relative w-8 h-4 rounded-full
//             transition-colors duration-200 shrink-0
//             ${checked ? 'bg-green-600' : 'bg-slate-300'}
//             ${disabled ? 'opacity-60' : ''}
//         `}
//     >
//         <input
//             type="checkbox"
//             name={name}
//             checked={checked}
//             onChange={onChange}
//             className="sr-only"
//             disabled={disabled}
//         />
//         <span
//             className={`
//                 absolute top-0.5
//                 w-3 h-3 bg-white rounded-full shadow
//                 transition-all duration-200
//                 ${checked ? 'right-0.5' : 'right-[calc(100%-0.875rem)]'}
//             `}
//         />
//     </div>
// );

// const AddPermission = ({ onClose, permissionData, onSuccess }) => {
//     const isEditMode = !!permissionData;

//     // =========================================================
//     // STATE
//     // =========================================================
//     const [loading, setLoading] = useState(false);
//     const [users, setUsers] = useState([]);
//     const [loadingUsers, setLoadingUsers] = useState(false);
//     const [errors, setErrors] = useState({});

//     const userRef = useRef(null);

//     const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

//     // =========================================================
//     // FIELD STATUS
//     // =========================================================
//     const isUserFilled = formData.user && formData.user !== '';

//     // =========================================================
//     // FIELD STYLING
//     // =========================================================
//     const getFieldBorderColor = (isFilled, error) => {
//         if (error) return '#ef4444';
//         if (isFilled) return '#a47d52';
//         return '#ef4444';
//     };

//     const getFieldShadow = (isFilled, error) => {
//         if (error) return '0 0 0 3px rgba(239, 68, 68, 0.15)';
//         if (isFilled) return '0 0 0 3px rgba(164, 125, 82, 0.12)';
//         return '0 0 0 3px rgba(239, 68, 68, 0.08)';
//     };

//     // =========================================================
//     // FETCH USERS
//     // =========================================================
//     const fetchUsers = async () => {
//         setLoadingUsers(true);
//         try {
//             const token = localStorage.getItem('access_token');
//             if (!token) {
//                 toast.error('يرجى تسجيل الدخول');
//                 return [];
//             }

//             const response = await fetch(`${BASE}/api/users/`, {
//                 method: 'GET',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     Authorization: `Bearer ${token}`,
//                 },
//             });

//             if (!response.ok) {
//                 console.error('Failed to fetch users:', response.status);
//                 toast.error('فشل تحميل قائمة المستخدمين');
//                 return [];
//             }

//             const data = await response.json();
//             let list = [];
//             if (Array.isArray(data)) list = data;
//             else if (Array.isArray(data.users)) list = data.users;
//             else if (Array.isArray(data.results)) list = data.results;
//             else if (Array.isArray(data.data)) list = data.data;

//             setUsers(list);
//             return list;
//         } catch (error) {
//             console.error('Error fetching users:', error);
//             toast.error('حدث خطأ أثناء تحميل المستخدمين');
//             return [];
//         } finally {
//             setLoadingUsers(false);
//         }
//     };

//     // =========================================================
//     // INITIAL LOAD / EDIT MODE POPULATION (config-driven)
//     // =========================================================
//     useEffect(() => {
//         fetchUsers();

//         if (permissionData) {
//             const populated = {
//                 user:
//                     typeof permissionData.user === 'object'
//                         ? permissionData.user?.id || ''
//                         : permissionData.user || '',
//             };
//             PERMISSION_FIELDS.forEach((field) => {
//                 populated[field.key] = !!permissionData[field.key];
//             });
//             setFormData(populated);
//         } else {
//             setFormData(buildDefaultFormData());
//         }
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [permissionData]);

//     // =========================================================
//     // HANDLE CHANGE
//     // =========================================================
//     const handleChange = (e) => {
//         const { name, value, type, checked } = e.target;
//         setFormData((prev) => ({
//             ...prev,
//             [name]: type === 'checkbox' ? checked : value,
//         }));
//         setErrors((prev) => ({ ...prev, [name]: '' }));
//     };

//     // =========================================================
//     // HANDLE SUBMIT (config-driven payload)
//     // =========================================================
//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         if (loading) return;

//         setLoading(true);
//         setErrors({});

//         try {
//             const token = localStorage.getItem('access_token');
//             if (!token) {
//                 toast.error('يرجى تسجيل الدخول');
//                 setLoading(false);
//                 return;
//             }

//             const newErrors = {};
//             if (!isEditMode && !formData.user) {
//                 newErrors.user = 'يرجى اختيار المستخدم';
//             }

//             if (Object.keys(newErrors).length > 0) {
//                 setErrors(newErrors);
//                 toast.error('يرجى تصحيح الأخطاء في النموذج');
//                 setLoading(false);
//                 return;
//             }

//             // Build payload from config — no manual field listing needed
//             const submitData = {};
//             PERMISSION_FIELDS.forEach((field) => {
//                 submitData[field.key] = !!formData[field.key];
//             });

//             if (!isEditMode) {
//                 submitData.user = parseInt(formData.user, 10);
//             }

//             const url = isEditMode
//                 ? `${BASE}/api/permissions/${permissionData.id}/update/`
//                 : `${BASE}/api/permissions/create/`;

//             const method = isEditMode ? 'PATCH' : 'POST';

//             const response = await fetch(url, {
//                 method,
//                 headers: {
//                     'Content-Type': 'application/json',
//                     Authorization: `Bearer ${token}`,
//                 },
//                 body: JSON.stringify(submitData),
//             });

//             if (!response.ok) {
//                 let errorData = null;
//                 try {
//                     errorData = await response.json();
//                 } catch {
//                     errorData = null;
//                 }

//                 console.error('Permission error:', errorData);

//                 if (errorData) {
//                     const errorMessages = [];
//                     Object.keys(errorData).forEach((key) => {
//                         const value = errorData[key];
//                         if (Array.isArray(value)) {
//                             errorMessages.push(`${key}: ${value.join(', ')}`);
//                         } else if (typeof value === 'string') {
//                             errorMessages.push(`${key}: ${value}`);
//                         }
//                     });
//                     throw new Error(errorMessages.join('\n') || 'فشل حفظ الصلاحيات');
//                 }

//                 throw new Error('فشل حفظ الصلاحيات');
//             }

//             const result = await response.json();
//             console.log('Permission saved:', result);

//             toast.success(
//                 isEditMode
//                     ? '✅ تم تحديث الصلاحيات بنجاح'
//                     : '✅ تم إضافة الصلاحيات بنجاح'
//             );

//             onSuccess?.();
//             onClose?.();
//         } catch (error) {
//             console.error('Error saving permission:', error);
//             toast.error('❌ ' + (error?.message || 'حدث خطأ أثناء الحفظ'));
//         } finally {
//             setLoading(false);
//         }
//     };

//     // =========================================================
//     // HANDLE CLOSE
//     // =========================================================
//     const handleClose = () => {
//         if (loading) return;
//         setFormData(buildDefaultFormData());
//         setErrors({});
//         onClose?.();
//     };

//     // =========================================================
//     // RENDER
//     // =========================================================
//     return (
//         <>
//             <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-md p-2 sm:p-4">
//                 <div
//                     dir="rtl"
//                     className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[92vh] overflow-hidden border border-white/60"
//                 >
//                     {/* HEADER */}
//                     <div className="flex justify-between items-center gap-4 px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-200 sticky top-0 z-20 bg-white/95 backdrop-blur-xl shadow-sm">
//                         <div>
//                             <h3 className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
//                                 {isEditMode ? 'تعديل الصلاحيات' : 'إضافة صلاحيات جديدة'}
//                             </h3>

//                             {isEditMode && permissionData?.username && (
//                                 <p className="text-xs sm:text-sm text-slate-500 mt-1">
//                                     المستخدم:{' '}
//                                     <span className="font-bold text-[#a47d52] bg-[#a47d52]/10 px-2 py-0.5 rounded-md">
//                                         {permissionData.user_full_name || permissionData.username}
//                                     </span>
//                                 </p>
//                             )}
//                         </div>

//                         <button
//                             type="button"
//                             className="cursor-pointer shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all duration-200 text-2xl font-light focus:outline-none focus:ring-2 focus:ring-[#a47d52]/30"
//                             onClick={handleClose}
//                             disabled={loading}
//                         >
//                             ✕
//                         </button>
//                     </div>

//                     {/* FORM */}
//                     <form
//                         onSubmit={handleSubmit}
//                         className="p-4 sm:p-6 md:p-7 space-y-5 sm:space-y-6 bg-slate-50/70 overflow-y-auto max-h-[calc(95vh-76px)] sm:max-h-[calc(92vh-80px)] no-scrollbar"
//                     >
//                         {/* EDIT MODE INFO */}
//                         {isEditMode && (
//                             <div className="bg-white border border-[#a47d52]/20 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
//                                 <div className="flex gap-3 items-center text-sm bg-slate-50 rounded-xl px-3 py-2.5">
//                                     <FaUser className="text-[#a47d52]" />
//                                     <span className="text-gray-600">المستخدم:</span>
//                                     <span className="font-semibold text-[#a47d52]">
//                                         {permissionData?.user_full_name || permissionData?.username || '-'}
//                                     </span>
//                                 </div>

//                                 {permissionData?.user_email && (
//                                     <div className="flex gap-3 items-center text-sm bg-slate-50 rounded-xl px-3 py-2.5">
//                                         <span className="text-gray-600">البريد الإلكتروني:</span>
//                                         <span className="font-semibold text-[#a47d52]">
//                                             {permissionData.user_email}
//                                         </span>
//                                     </div>
//                                 )}
//                             </div>
//                         )}

//                         {/* CREATE MODE — USER DROPDOWN */}
//                         {!isEditMode && (
//                             <div className="space-y-1.5">
//                                 <label className="block text-sm font-semibold text-slate-700">
//                                     <span className="flex items-center gap-2">
//                                         <FaUser className="text-[#a47d52] text-xs" />
//                                         المستخدم <span className="text-red-500">*</span>
//                                     </span>
//                                 </label>

//                                 <select
//                                     ref={userRef}
//                                     name="user"
//                                     value={formData.user}
//                                     onChange={handleChange}
//                                     className="w-full cursor-pointer px-4 py-2.5 bg-white rounded-xl shadow-sm focus:outline-none transition-all duration-200 text-right hover:border-[#a47d52]/60"
//                                     style={{
//                                         borderTopColor: 'transparent',
//                                         borderBottomColor: 'white',
//                                         borderLeftColor: 'transparent',
//                                         borderRightColor: getFieldBorderColor(isUserFilled, errors.user),
//                                         borderWidth: '2px',
//                                         borderStyle: 'solid',
//                                         boxShadow: getFieldShadow(isUserFilled, errors.user),
//                                     }}
//                                     required
//                                     disabled={loading || loadingUsers}
//                                     autoFocus
//                                 >
//                                     <option value="">
//                                         {loadingUsers
//                                             ? 'جاري تحميل المستخدمين...'
//                                             : users.length === 0
//                                             ? 'لا يوجد مستخدمون'
//                                             : 'اختر المستخدم...'}
//                                     </option>

//                                     {users.map((user) => (
//                                         <option key={user.id} value={user.id}>
//                                             {user.first_name || user.username}
//                                             {user.last_name ? ` ${user.last_name}` : ''}
//                                             {user.email ? ` — ${user.email}` : ''}
//                                         </option>
//                                     ))}
//                                 </select>

//                                 {errors.user && (
//                                     <p className="text-red-500 text-sm mt-1">{errors.user}</p>
//                                 )}
//                             </div>
//                         )}

//                         {/* PERMISSION TOGGLES — config-driven */}
//                         <div className="space-y-3 pt-2 border-t border-slate-200">
//                             <div className="flex items-center gap-2 mb-3">
//                                 <FaShieldAlt className="text-[#a47d52] text-sm" />
//                                 <h4 className="text-sm font-bold text-slate-700">الصلاحيات</h4>
//                             </div>

//                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
//                                 {PERMISSION_FIELDS.map((field) => {
//                                     const Icon = field.Icon;

//                                     return (
//                                         <label
//                                             key={field.key}
//                                             className={`
//                                                 flex flex-col justify-between gap-2.5
//                                                 p-3.5 rounded-xl cursor-pointer
//                                                 border transition-all duration-200
//                                                 ${
//                                                     formData[field.key]
//                                                         ? 'border-[#a47d52] bg-[#a47d52]/5 shadow-sm'
//                                                         : 'border-slate-200 bg-white hover:border-[#a47d52]/40'
//                                                 }
//                                                 ${loading ? 'opacity-60 cursor-not-allowed' : ''}
//                                             `}
//                                         >
//                                             <div className="flex items-start justify-between gap-2">
//                                                 <div className="w-8 h-8 shrink-0 rounded-lg bg-[#a47d52]/10 flex items-center justify-center">
//                                                     <Icon className="text-[#a47d52] text-xs" />
//                                                 </div>

//                                                 <SmallToggle
//                                                     checked={!!formData[field.key]}
//                                                     name={field.key}
//                                                     onChange={handleChange}
//                                                     disabled={loading}
//                                                 />
//                                             </div>

//                                             <div className="flex flex-col gap-0.5">
//                                                 <span className="font-semibold text-sm text-slate-800 leading-tight">
//                                                     {field.label}
//                                                 </span>
//                                                 <span className="text-[11px] text-slate-500 leading-snug">
//                                                     {field.description}
//                                                 </span>
//                                             </div>
//                                         </label>
//                                     );
//                                 })}
//                             </div>
//                         </div>

//                         {/* BUTTONS */}
//                         <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5 border-t border-slate-200 sticky bottom-0 bg-slate-50/95 backdrop-blur-sm">
//                             <button
//                                 type="submit"
//                                 disabled={loading}
//                                 className={`
//                                     cursor-pointer flex-1 min-h-12
//                                     bg-[#a47d52] text-white px-6 py-3 rounded-xl font-bold
//                                     shadow-md shadow-[#a47d52]/20
//                                     transition-all duration-200
//                                     hover:bg-[#8a6a44] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0
//                                     ${loading ? 'opacity-70 cursor-not-allowed' : ''}
//                                 `}
//                             >
//                                 {loading ? (
//                                     <span className="flex items-center justify-center gap-2">
//                                         <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
//                                         جاري الحفظ...
//                                     </span>
//                                 ) : (
//                                     <span className="flex items-center justify-center gap-2">
//                                         <FaSave />
//                                         {isEditMode ? 'تحديث' : 'حفظ'}
//                                     </span>
//                                 )}
//                             </button>

//                             <button
//                                 type="button"
//                                 onClick={handleClose}
//                                 disabled={loading}
//                                 className="cursor-pointer w-full sm:w-auto min-h-12 px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-100 hover:border-slate-400 transition-all duration-200"
//                             >
//                                 إلغاء
//                             </button>
//                         </div>
//                     </form>
//                 </div>
//             </div>
//         </>
//     );
// };

// export default AddPermission;
