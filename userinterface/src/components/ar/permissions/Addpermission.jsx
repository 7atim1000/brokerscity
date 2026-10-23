import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import {
    FaSave,
    FaUser,
    FaShieldAlt,
    FaCheck,
    FaBuilding,
    FaMoneyBillWave,
    FaUsers,          // ✅ ADDED — used in permissionFields for can_view_users
    FaUserShield,     // ✅ ADDED — used in permissionFields for can_manage_users
} from 'react-icons/fa';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

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

    const defaultFormData = {
        user: '',
        ListWorkLog: false,
        monitoring: false,
        add_monitor: false,
        property_management: false,
        financials: false,

        can_view_users: false,          // ✅ ADD
        can_manage_users: false,        // ✅ ADD
        can_manage_permissions: false,  // ✅ ADD
    };

    const [formData, setFormData] = useState(defaultFormData);

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
            console.log('Users API response:', data);

            let list = [];
            if (Array.isArray(data)) {
                list = data;
            } else if (Array.isArray(data.users)) {
                list = data.users;
            } else if (Array.isArray(data.results)) {
                list = data.results;
            } else if (Array.isArray(data.data)) {
                list = data.data;
            } else {
                console.warn('Unexpected users response shape:', data);
            }

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
    // INITIAL LOAD / EDIT MODE POPULATION
    // =========================================================
    useEffect(() => {
        fetchUsers();

        if (permissionData) {
            setFormData({
                user:
                    typeof permissionData.user === 'object'
                        ? permissionData.user?.id || ''
                        : permissionData.user || '',
                ListWorkLog: permissionData.ListWorkLog || false,
                monitoring: permissionData.monitoring || false,
                add_monitor: permissionData.add_monitor || false,
                property_management:
                    permissionData.property_management || false,
                financials: permissionData.financials || false,

                // ✅ ADD:
                can_view_users: permissionData.can_view_users || false,
                can_manage_users: permissionData.can_manage_users || false,
                can_manage_permissions:
                    permissionData.can_manage_permissions || false,
            });
        } else {
            setFormData(defaultFormData);
        }
    }, [permissionData]);

    // =========================================================
    // HANDLE CHANGE
    // =========================================================
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }

        setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    // =========================================================
    // HANDLE SUBMIT
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

            // -----------------------------------------
            // VALIDATION
            // -----------------------------------------
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

            // -----------------------------------------
            // BUILD PAYLOAD
            // -----------------------------------------
            const submitData = {
                ListWorkLog: formData.ListWorkLog,
                monitoring: formData.monitoring,
                add_monitor: formData.add_monitor,
                property_management: formData.property_management,
                financials: formData.financials,
                // ✅ ADD:
                can_view_users: formData.can_view_users,
                can_manage_users: formData.can_manage_users,
                can_manage_permissions: formData.can_manage_permissions,
            };

            if (!isEditMode) {
                submitData.user = parseInt(formData.user, 10);
            }

            // -----------------------------------------
            // URL + METHOD
            // -----------------------------------------
            const url = isEditMode
                ? `${BASE}/api/permissions/${permissionData.id}/update/`
                : `${BASE}/api/permissions/create/`;

            const method = isEditMode ? 'PATCH' : 'POST';

            // -----------------------------------------
            // SEND
            // -----------------------------------------
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(submitData),
            });

            // -----------------------------------------
            // HANDLE ERROR
            // -----------------------------------------
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
                    throw new Error(
                        errorMessages.join('\n') || 'فشل حفظ الصلاحيات'
                    );
                }

                throw new Error('فشل حفظ الصلاحيات');
            }

            // -----------------------------------------
            // SUCCESS
            // -----------------------------------------
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
        setFormData(defaultFormData);
        setErrors({});
        onClose?.();
    };

    // =========================================================
    // PERMISSION FIELDS — 8 total
    // =========================================================
    const permissionFields = [
        {
            key: 'ListWorkLog',
            label: 'عرض سجل الحضور',
            description: 'السماح بعرض سجل الحض ور',
            Icon: FaShieldAlt,
        },
        {
            key: 'monitoring',
            label: 'عرض المراقبة',
            description: 'السماح بعرض سجلات المراقبة',
            Icon: FaShieldAlt,
        },
        {
            key: 'add_monitor',
            label: 'إضافة مراقبة',
            description: 'السماح بإضافة مراقبة جديدة',
            Icon: FaShieldAlt,
        },
        {
            key: 'property_management',
            label: 'إدارة العقارات',
            description: 'السماح بإدارة الإيجارات والعقارات',
            Icon: FaBuilding,
        },
        {
            key: 'financials',
            label: 'الإدارة المالية',
            description: 'السماح بإدارة الشؤون المالية',
            Icon: FaMoneyBillWave,
        },
        // ✅ ADD:
        {
            key: 'can_view_users',
            label: 'عرض المستخدمين',
            description: 'السماح بعرض قائمة المستخدمين',
            Icon: FaUsers,
        },
        {
            key: 'can_manage_users',
            label: 'إدارة المستخدمين',
            description: 'السماح بتعديل بيانات المستخدمين',
            Icon: FaUserShield,
        },
        {
            key: 'can_manage_permissions',
            label: 'إدارة الصلاحيات',
            description: 'السماح بتعديل صلاحيات الآخرين',
            Icon: FaShieldAlt,
        },
    ];

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
                                {isEditMode
                                    ? 'تعديل الصلاحيات'
                                    : 'إضافة صلاحيات جديدة'}
                            </h3>

                            {isEditMode && permissionData?.username && (
                                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                    المستخدم:{' '}
                                    <span className="font-bold text-[#a47d52] bg-[#a47d52]/10 px-2 py-0.5 rounded-md">
                                        {permissionData.user_full_name ||
                                            permissionData.username}
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
                                    <span className="text-gray-600">
                                        المستخدم:
                                    </span>
                                    <span className="font-semibold text-[#a47d52]">
                                        {permissionData?.user_full_name ||
                                            permissionData?.username ||
                                            '-'}
                                    </span>
                                </div>

                                {permissionData?.user_email && (
                                    <div className="flex gap-3 items-center text-sm bg-slate-50 rounded-xl px-3 py-2.5">
                                        <span className="text-gray-600">
                                            البريد الإلكتروني:
                                        </span>
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
                                        المستخدم{' '}
                                        <span className="text-red-500">*</span>
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
                                        borderRightColor: getFieldBorderColor(
                                            isUserFilled,
                                            errors.user
                                        ),
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        boxShadow: getFieldShadow(
                                            isUserFilled,
                                            errors.user
                                        ),
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
                                            {user.last_name
                                                ? ` ${user.last_name}`
                                                : ''}
                                            {user.email
                                                ? ` — ${user.email}`
                                                : ''}
                                        </option>
                                    ))}
                                </select>

                                {errors.user && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {errors.user}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* PERMISSION TOGGLES — 4 cols on large screens */}
                        <div className="space-y-3 pt-2 border-t border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <FaShieldAlt className="text-[#a47d52] text-sm" />
                                <h4 className="text-sm font-bold text-slate-700">
                                    الصلاحيات
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {permissionFields.map((field) => {
                                    const Icon = field.Icon;

                                    return (
                                        <label
                                            key={field.key}
                                            className={`
                                                flex flex-col justify-between gap-3
                                                p-4 rounded-xl cursor-pointer
                                                border-1 transition-all duration-200
                                                ${
                                                    formData[field.key]
                                                        ? 'border-[#a47d52] bg-[#a47d52]/5 shadow-sm'
                                                        : 'border-slate-200 bg-white hover:border-[#a47d52]/40'
                                                }
                                                ${
                                                    loading
                                                        ? 'opacity-60 cursor-not-allowed'
                                                        : ''
                                                }
                                            `}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="w-9 h-9 shrink-0 rounded-lg bg-[#a47d52]/10 flex items-center justify-center">
                                                    <Icon className="text-[#a47d52] text-sm" />
                                                </div>

                                                <div
                                                    className={`
                                                        relative w-12 h-6 rounded-full
                                                        transition-colors duration-300 shrink-0
                                                        ${
                                                            formData[field.key]
                                                                ? 'bg-green-600'
                                                                : 'bg-slate-300'
                                                        }
                                                    `}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        name={field.key}
                                                        checked={
                                                            formData[field.key]
                                                        }
                                                        onChange={handleChange}
                                                        className="sr-only"
                                                        disabled={loading}
                                                    />
                                                    <span
                                                        className={`
                                                            absolute top-0.5
                                                            w-5 h-5 bg-white rounded-full shadow-md
                                                            transition-all duration-300
                                                            flex items-center justify-center
                                                            ${
                                                                formData[
                                                                    field.key
                                                                ]
                                                                    ? 'right-0.5'
                                                                    : 'right-[calc(100%-1.375rem)]'
                                                            }
                                                        `}
                                                    >
                                                        {formData[
                                                            field.key
                                                        ] && (
                                                            <FaCheck className="text-green-500 text-[8px]" />
                                                        )}
                                                    </span>
                                                </div>
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