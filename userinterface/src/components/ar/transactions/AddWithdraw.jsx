import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { FaSave, FaUniversity, FaMoneyBillWave, FaCheck, FaUpload, FaSignature } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { formatAmountInWords } from '../../../utils/numberToArabic';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const AddWithdraw = ({ onClose, transactionData, onSuccess, initialData, isEditMode: initialEditMode }) => {
    
    const [isEditMode, setIsEditMode] = useState(initialEditMode || false);
    const [transactionId, setTransactionId] = useState(initialData?.id || null);
    
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [banks, setBanks] = useState([]);
    const [cashboxes, setCashboxes] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState(null);
    const [errors, setErrors] = useState({});
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    const accountFromRef = useRef(null);
    const accountToRef = useRef(null);
    const amountRef = useRef(null);
    const statementRef = useRef(null);
    const personReceiptRef = useRef(null);
    const personDeliverRef = useRef(null);
    const notesRef = useRef(null);
    const documentNoRef = useRef(null);
    const checkNoRef = useRef(null);
    const checkBankRef = useRef(null);
    const checkDateRef = useRef(null);
    const currencyRef = useRef(null);
    const userSignatureRef = useRef(null);
    const managerSignatureRef = useRef(null);
    const secondPersonSignatureRef = useRef(null);

    const defaultFormData = {
        transaction_date: new Date().toISOString().split('T')[0],
        type: 'withdraw',
        amount: '',
        payment_method: '',
        account_from: '',
        account_to: '',
        bank: '',
        cashbox: '',
        statement: '',
        has_check: false,
        check_no: '',
        check_bank: '',
        check_date: '',
        person_receipt: '',
        person_deliver: '',
        notes: '',
        has_document: false,
        document: null,
        document_no: '-',
        currency: 'AED',
        amount_to_arabic: '',
        amount_to_english: '',
        transaction_no: '',
        transaction_user: null,
        user_signature: '',
        manager_signature: '',
        second_person_signature: '',
        created_at: '',
        updated_at: '',
    };

    const [formData, setFormData] = useState(defaultFormData);

    const currencyOptions = [
        { value: 'AED', label: 'درهم اماراتي' },
        { value: 'USD', label: 'دولار' },
        { value: 'EUR', label: 'يورو' },
        { value: 'SAR', label: 'ريال سعودي' },
    ];

    // ===== SWAPPED =====
    const isAccountFromFilled = formData.account_to && formData.account_to !== '';
    const isAmountFilled = formData.amount && parseFloat(formData.amount) > 0;
    const isStatementFilled = formData.statement && formData.statement.trim() !== '';
    const isPersonReceiptFilled = formData.person_receipt && formData.person_receipt.trim() !== '';
    const isUserSignatureFilled = formData.user_signature && formData.user_signature.trim() !== '';
    const isManagerSignatureFilled = formData.manager_signature && formData.manager_signature.trim() !== '';
    const isSecondPersonSignatureFilled = formData.second_person_signature && formData.second_person_signature.trim() !== '';

    const getAmountInWords = () => {
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            return '';
        }
        return formatAmountInWords(formData.amount);
    };

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

    const fetchAccounts = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return [];

            const response = await fetch(`${BASE}/api/accounts/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                const accountsData = data.results || data || [];
                setAccounts(accountsData);
                return accountsData;
            }
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
        return [];
    };

    const fetchBanks = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${BASE}/api/banks/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setBanks(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching banks:', error);
        }
    };

    const fetchCashboxes = async () => {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            const response = await fetch(`${BASE}/api/cashboxes/`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCashboxes(data.results || data || []);
            }
        } catch (error) {
            console.error('Error fetching cashboxes:', error);
        }
    };
    
    const findAccountIdByName = (accountName, accountsList) => {
        if (!accountName || !accountsList || accountsList.length === 0) {
            return '';
        }
        
        if (!isNaN(accountName) && accountName !== '') {
            return accountName;
        }
        
        let found = accountsList.find(acc => 
            acc.name === accountName || 
            acc.name?.trim() === accountName?.trim()
        );
        
        if (!found) {
            found = accountsList.find(acc => 
                acc.name?.toLowerCase() === accountName?.toLowerCase() ||
                acc.name?.toLowerCase().trim() === accountName?.toLowerCase().trim()
            );
        }
        
        if (!found) {
            console.warn('No matching account found for name:', accountName);
            console.warn('Available accounts:', accountsList.map(a => a.name));
            return '';
        }
        
        return found.id;
    };

    const handlePaymentMethodChange = (method) => {
        if (method !== 'banks' && method !== 'cash') return;

        setPaymentMethod(method);
        setFormData(prev => ({
            ...prev,
            payment_method: method,
            ...(method === 'banks' ? { cashbox: '' } : { bank: '' })
        }));

        setErrors(prev => ({
            ...prev,
            payment_method: '',
            ...(method === 'banks' ? { cashbox: '' } : { bank: '' })
        }));
    };

    const initialDataId = initialData?.id ?? null;

    useEffect(() => {
        let cancelled = false;

        if (!initialData || Object.keys(initialData).length === 0) {
            setIsEditMode(false);
            setTransactionId(null);
            setFormData(defaultFormData);
            setPaymentMethod(null);
            setErrors({});
            setIsDataLoaded(false);
        }

        const loadDataAndPopulate = async () => {
            const accountsData = await fetchAccounts();
            await fetchBanks();
            await fetchCashboxes();

            if (cancelled) return;
            
            if (initialData && Object.keys(initialData).length > 0) {
                console.log('Populating form with initialData:', initialData);
                
                setIsEditMode(true);
                setTransactionId(initialData.id);
                
                const bankId = typeof initialData.bank === 'object' 
                    ? initialData.bank?.id || '' 
                    : initialData.bank || '';
                
                const cashboxId = typeof initialData.cashbox === 'object' 
                    ? initialData.cashbox?.id || '' 
                    : initialData.cashbox || '';
                
                let accountFromValue = initialData.account_from || '';
                let accountToValue = initialData.account_to || '';
                
                if (accountsData && accountsData.length > 0) {
                    const foundAccountFromId = findAccountIdByName(accountFromValue, accountsData);
                    if (foundAccountFromId) {
                        accountFromValue = foundAccountFromId;
                    } else {
                        console.warn('Could not find account_from ID for:', accountFromValue);
                    }
                    
                    if (accountToValue && isNaN(accountToValue)) {
                        const foundAccountToId = findAccountIdByName(accountToValue, accountsData);
                        if (foundAccountToId) {
                            accountToValue = foundAccountToId;
                        }
                    }
                }
                
                setFormData({
                    ...defaultFormData,
                    ...initialData,
                    transaction_date: initialData.transaction_date || new Date().toISOString().split('T')[0],
                    amount: initialData.amount || '',
                    account_from: accountFromValue,
                    account_to: accountToValue,
                    bank: bankId,
                    cashbox: cashboxId,
                    statement: initialData.statement || '',
                    has_check: initialData.has_check || false,
                    check_no: initialData.check_no || '',
                    check_bank: initialData.check_bank || '',
                    check_date: initialData.check_date || '',
                    person_deliver: initialData.person_deliver || '',
                    person_receipt: initialData.person_receipt || '',
                    notes: initialData.notes || '',
                    has_document: !!initialData.document,
                    document_no: initialData.document_no || '',
                    currency: initialData.currency || 'AED',
                    amount_to_arabic: initialData.amount_to_arabic || '',
                    amount_to_english: initialData.amount_to_english || '',
                    transaction_no: initialData.transaction_no || '',
                    transaction_user: initialData.transaction_user || null,
                    user_signature: initialData.user_signature || '',
                    manager_signature: initialData.manager_signature || '',
                    second_person_signature: initialData.second_person_signature || '',
                    created_at: initialData.created_at || '',
                    updated_at: initialData.updated_at || '',
                });
                
                if (initialData.payment_method) {
                    setPaymentMethod(initialData.payment_method);
                } else if (bankId) {
                    setPaymentMethod('banks');
                } else if (cashboxId) {
                    setPaymentMethod('cash');
                } else {
                    setPaymentMethod(null);
                }
            }
            
            if (!cancelled) {
                setIsDataLoaded(true);
            }
        };
        
        loadDataAndPopulate();

        return () => {
            cancelled = true;
        };
    }, [initialDataId]);

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        
        if (type === 'file') {
            setFormData({ ...formData, [name]: files[0] });
            if (files[0]) {
                setErrors({ ...errors, [name]: '' });
            }
        } else if (type === 'checkbox') {
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
            setErrors({ ...errors, [name]: '' });
            
            if (name === 'amount' && value) {
                const amountNum = parseFloat(value);
                if (amountNum > 0) {
                    setFormData(prev => ({
                        ...prev,
                        [name]: value,
                        amount_to_arabic: formatAmountInWords(amountNum),
                        amount_to_english: formatAmountInWords(amountNum),
                    }));
                }
            }
        }
    };

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (nextRef && nextRef.current) {
                nextRef.current.focus();
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            // ===== SWAPPED: validate account_to (which is now the source) =====
            if (!formData.account_to) {
                newErrors.account_to = 'يرجى اختيار الحساب المصدر';
            }
            if (!formData.amount || parseFloat(formData.amount) <= 0) {
                newErrors.amount = 'يرجى إدخال مبلغ صحيح';
            }
            if (!formData.statement || formData.statement.trim() === '') {
                newErrors.statement = 'يرجى إدخال البيان';
            }
            if (!paymentMethod) {
                newErrors.payment_method = 'يرجى اختيار طريقة الدفع';
            }
            if (paymentMethod === 'banks' && !formData.bank) {
                newErrors.bank = 'يرجى اختيار البنك';
            }
            if (paymentMethod === 'cash' && !formData.cashbox) {
                newErrors.cashbox = 'يرجى اختيار الخزينة النقدية';
            }

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
                toast.error('يرجى تصحيح الأخطاء في النموذج');
                setLoading(false);
                return;
            }

            // ===== SWAPPED: account_from and account_to =====
            let submitData = {
                type: 'withdraw',
                transaction_date: formData.transaction_date,
                amount: parseFloat(formData.amount),
                payment_method: paymentMethod,
                account_from: '', // Let backend handle this
                account_to: formData.account_to, // ← source account now stored here
                statement: formData.statement,
                has_check: formData.has_check,
                currency: formData.currency || 'AED',
            };

            if (submitData.type === 'withdraw') {
                submitData.person_receipt = formData.person_receipt || '';
            } else if (submitData.type === 'deposit') {
                submitData.person_deliver = formData.person_deliver || '';
            }

            submitData.notes = formData.notes || '';
            submitData.user_signature = formData.user_signature || '';
            submitData.manager_signature = formData.manager_signature || '';
            submitData.second_person_signature = formData.second_person_signature || '';

            if (paymentMethod === 'banks') {
                submitData.bank = parseInt(formData.bank);
            } else if (paymentMethod === 'cash') {
                submitData.cashbox = parseInt(formData.cashbox);
            }

            if (formData.has_check) {
                submitData.check_no = formData.check_no || '';
                submitData.check_bank = formData.check_bank || '';
                submitData.check_date = formData.check_date || '';
            }

            let hasFileUpload = false;
            let actualFile = null;

            if (formData.has_document) {
                submitData.has_document = true;
                submitData.document_no = formData.document_no || '';
                
                if (formData.document instanceof File || formData.document instanceof Blob) {
                    hasFileUpload = true;
                    actualFile = formData.document;
                } else if (typeof formData.document === 'string' && formData.document.startsWith('http')) {
                    hasFileUpload = false;
                } else if (typeof formData.document === 'string' && formData.document !== '') {
                    hasFileUpload = true;
                    actualFile = formData.document;
                }
            } else {
                submitData.has_document = false;
            }

            const url = isEditMode 
                ? `${BASE}/api/transactions/${transactionId}/update/`
                : `${BASE}/api/transactions/create/`;
            
            const method = isEditMode ? 'PUT' : 'POST';

            let response;

            if (hasFileUpload && actualFile) {
                const formDataObj = new FormData();
                
                Object.keys(submitData).forEach(key => {
                    if (submitData[key] !== undefined && submitData[key] !== null) {
                        formDataObj.append(key, submitData[key]);
                    }
                });
                
                formDataObj.append('document', actualFile);

                response = await fetch(url, {
                    method: method,
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
                    body: formDataObj
                });
            } else {
                const cleanData = {};
                Object.keys(submitData).forEach(key => {
                    if (submitData[key] !== undefined) {
                        cleanData[key] = submitData[key];
                    }
                });
                
                response = await fetch(url, {
                    method: method,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(cleanData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error response:', errorData);
                
                if (errorData) {
                    const errorMessages = [];
                    Object.keys(errorData).forEach(key => {
                        if (Array.isArray(errorData[key])) {
                            errorMessages.push(`${key}: ${errorData[key].join(', ')}`);
                        } else if (typeof errorData[key] === 'string') {
                            errorMessages.push(`${key}: ${errorData[key]}`);
                        }
                    });
                    throw new Error(errorMessages.join('\n') || 'فشل حفظ المعاملة');
                }
                throw new Error('فشل حفظ المعاملة');
            }

            const result = await response.json();

            if (!isEditMode) {
                toast.success('✅ تم إضافة السحب بنجاح');
                const newTransactionId = result.id || result.data?.id;
                if (newTransactionId) {
                    setIsEditMode(true);
                    setTransactionId(newTransactionId);
                    if (result.data) {
                        if (result.data.payment_method) {
                            setPaymentMethod(result.data.payment_method);
                        }
                        setFormData(prev => ({
                            ...prev,
                            ...result.data,
                            bank: result.data.bank?.id || result.data.bank || prev.bank,
                            cashbox: result.data.cashbox?.id || result.data.cashbox || prev.cashbox,
                        }));
                    }
                    await fetchTransactionDetails(newTransactionId);
                    onSuccess?.();
                    toast.info('📝 يمكنك الآن إضافة التوقيعات');
                } else {
                    toast.success('تم الإضافة بنجاح');
                    onSuccess?.();
                    handleClose();
                }
            } else {
                toast.success('✅ تمت اضافه التوقيعات بنجاح');
                onSuccess?.();
                handleClose();
            }
            
        } catch (error) {
            console.error('Error saving transaction:', error);
            toast.error('❌ ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactionDetails = async (transactionId) => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${BASE}/api/transactions/${transactionId}/`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                let accountFromId = data.account_from || '';
                let accountToId = data.account_to || '';
                
                if (accountFromId && isNaN(accountFromId) && accounts.length > 0) {
                    const foundId = findAccountIdByName(accountFromId, accounts);
                    if (foundId) {
                        accountFromId = foundId;
                    }
                }
                
                if (accountToId && isNaN(accountToId) && accounts.length > 0) {
                    const foundId = findAccountIdByName(accountToId, accounts);
                    if (foundId) {
                        accountToId = foundId;
                    }
                }
                
                setFormData(prev => ({
                    ...prev,
                    ...data,
                    account_from: accountFromId,
                    account_to: accountToId,
                    bank: data.bank?.id || data.bank || prev.bank,
                    cashbox: data.cashbox?.id || data.cashbox || prev.cashbox,
                    transaction_user: data.transaction_user || prev.transaction_user,
                }));
                
                if (data.payment_method) {
                    setPaymentMethod(data.payment_method);
                } else if (data.bank) {
                    setPaymentMethod('banks');
                } else if (data.cashbox) {
                    setPaymentMethod('cash');
                }
                
                return data;
            }
        } catch (error) {
            console.error('Error fetching transaction details:', error);
        }
    };

    const handleClose = () => {
        setIsEditMode(false);
        setTransactionId(null);
        setFormData(defaultFormData);
        setPaymentMethod(null);
        setErrors({});
        setLoading(false);
        onClose();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getUserDisplayName = (user) => {
        if (!user) return 'غير معروف';
        if (typeof user === 'object') {
            return user.username || user.name || user.id || 'غير معروف';
        }
        return user;
    };

    const getAccountName = (accountId) => {
        if (!accountId) return '';
        const account = accounts.find(acc => acc.id === parseInt(accountId));
        return account ? account.name : accountId;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/1 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 z-10 bg-red-50 shadow-lg">
                    <div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-gray-800">
                            {isEditMode ? 'تحديث التوقيعات' : 'سحب جديد'}
                        </h3>
                        {isEditMode && formData.transaction_no && (
                            <p className="text-sm text-gray-500 mt-1">
                                رقم المعاملة: <span className="font-bold text-[#a47d52]">{formData.transaction_no}</span>
                            </p>
                        )}
                    </div>
                    <button 
                        className="cursor-pointer animate-spin text-gray-400 hover:text-gray-600 text-2xl font-light hover:rotate-90 transition-transform"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
                    
                    {isEditMode && (
                        <div className="bg-[#a47d52]/5 border border-[#a47d52]/20 rounded-lg p-4 space-y-3">
                            {formData.created_at && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">تاريخ الإنشاء:</span>
                                    <span className="font-medium text-gray-700">{formatDate(formData.created_at)}</span>
                                </div>
                            )}
                            
                            {formData.updated_at && formData.updated_at !== formData.created_at && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">آخر تحديث:</span>
                                    <span className="font-medium text-gray-700">{formatDate(formData.updated_at)}</span>
                                </div>
                            )}

                            {/* ===== SWAPPED display labels ===== */}
                            <div className="pt-3 border-t border-[#a47d52]/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-gray-600">من حساب:</span>
                                        <span className="font-medium text-[#a47d52]">
                                            {getAccountName(formData.account_to) || formData.account_to || '-'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-gray-600">الى حساب:</span>
                                        <span className="font-medium text-[#a47d52]">
                                            {getAccountName(formData.account_from) || formData.account_from || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-[#a47d52]/20">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-gray-600">المبلغ:</span>
                                        <span className="font-medium text-[#a47d52]">
                                            {formData.amount ? parseFloat(formData.amount).toFixed(2) : '-'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-gray-600">العملة:</span>
                                        <span className="font-medium text-[#a47d52]">
                                            {formData.currency || '-'}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-gray-600">طريقة الدفع:</span>
                                        <span className="font-medium text-[#a47d52]">
                                            {paymentMethod === 'banks' ? 'بنوك' : 
                                             paymentMethod === 'cash' ? 'نقدي' : 
                                             formData.payment_method || '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {getAmountInWords() && (
                                <div className="pt-3 border-t border-[#a47d52]/20">
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-gray-600">المبلغ كتابةً:</span>
                                        <span className="font-medium text-[#a47d52]">
                                            {getAmountInWords()}
                                        </span>
                                        <span className="text-sm text-gray-500">فقظ لاغير</span>
                                    </div>
                                </div>
                            )}

                            {formData.statement && (
                                <div className="pt-3 border-t border-[#a47d52]/20">
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-gray-600">البيان:</span>
                                        <span className="font-medium text-[#a47d52]">
                                            {formData.statement}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {formData.person_receipt && (
                                <div className="pt-3 border-t border-[#a47d52]/20">
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-gray-600">الشخص المستلم:</span>
                                        <span className="font-medium text-[#a47d52]">
                                            {formData.person_receipt}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {formData.has_check && (
                                <div className="pt-3 border-t border-[#a47d52]/20">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div className="flex gap-2 items-center text-sm">
                                            <span className="text-gray-600">رقم الشيك:</span>
                                            <span className="font-medium text-[#a47d52]">
                                                {formData.check_no || '-'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 items-center text-sm">
                                            <span className="text-gray-600">بنك الشيك:</span>
                                            <span className="font-medium text-[#a47d52]">
                                                {formData.check_bank || '-'}
                                            </span>
                                        </div>
                                        <div className="flex gap-2 items-center text-sm">
                                            <span className="text-gray-600">تاريخ الشيك:</span>
                                            <span className="font-medium text-[#a47d52]">
                                                {formData.check_date || '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formData.has_document && (
                                <div className="pt-3 border-t border-[#a47d52]/20">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="flex gap-2 items-center text-sm">
                                            <span className="text-gray-600">رقم المستند:</span>
                                            <span className="font-medium text-[#a47d52]">
                                                {formData.document_no || '-'}
                                            </span>
                                        </div>
                                        {formData.document && (
                                            <div className="flex gap-2 items-center text-sm">
                                                <span className="text-gray-600">المستند:</span>
                                                <span className="font-medium text-[#a47d52]">
                                                    {typeof formData.document === 'string' ? formData.document : formData.document?.name || 'مرفق'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {formData.notes && (
                                <div className="pt-3 border-t border-[#a47d52]/20">
                                    <div className="flex gap-2 items-center text-sm">
                                        <span className="text-gray-600">ملاحظات:</span>
                                        <span className="font-medium text-[#a47d52]">
                                            {formData.notes}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 border-t-2 border-[#a47d52]/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <FaSignature className="text-[#a47d52] text-sm" />
                                    <h4 className="text-sm font-bold text-gray-700">التوقيعات</h4>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-gray-600">
                                            توقيع المستخدم
                                        </label>
                                        <input
                                            ref={userSignatureRef}
                                            type="text"
                                            name="user_signature"
                                            value={formData.user_signature || ''}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-right text-sm"
                                            style={{
                                                borderTopColor: 'transparent',
                                                borderBottomColor: 'white',
                                                borderLeftColor: 'transparent',
                                                borderRightColor: formData.user_signature ? '#a47d52' : '#ef4444',
                                                borderWidth: '2px',
                                                borderStyle: 'solid',
                                                boxShadow: formData.user_signature ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : 'none'
                                            }}
                                            placeholder="توقيع المستخدم..."
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-gray-600">
                                            توقيع المدير
                                        </label>
                                        <input
                                            ref={managerSignatureRef}
                                            type="text"
                                            name="manager_signature"
                                            value={formData.manager_signature || ''}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-right text-sm"
                                            style={{
                                                borderTopColor: 'transparent',
                                                borderBottomColor: 'white',
                                                borderLeftColor: 'transparent',
                                                borderRightColor: formData.manager_signature ? '#a47d52' : '#ef4444',
                                                borderWidth: '2px',
                                                borderStyle: 'solid',
                                                boxShadow: formData.manager_signature ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : 'none'
                                            }}
                                            placeholder="توقيع المدير..."
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-xs font-medium text-gray-600">
                                            توقيع الشخص المستلم
                                        </label>
                                        <input
                                            ref={secondPersonSignatureRef}
                                            type="text"
                                            name="second_person_signature"
                                            value={formData.second_person_signature || ''}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-right text-sm"
                                            style={{
                                                borderTopColor: 'transparent',
                                                borderBottomColor: 'white',
                                                borderLeftColor: 'transparent',
                                                borderRightColor: formData.second_person_signature ? '#a47d52' : '#ef4444',
                                                borderWidth: '2px',
                                                borderStyle: 'solid',
                                                boxShadow: formData.second_person_signature ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : 'none'
                                            }}
                                            placeholder="توقيع الشخص المستلم..."
                                            disabled={loading}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isEditMode && (
                        <>
                            {/* Currency Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    العملة <span className="text-red-500">*</span>
                                </label>
                                <select
                                    ref={currencyRef}
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    onKeyDown={(e) => handleKeyDown(e, accountFromRef)}
                                    className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                    style={{
                                        borderTopColor: 'transparent',
                                        borderBottomColor: 'white',
                                        borderLeftColor: 'transparent',
                                        borderRightColor: formData.currency ? '#a47d52' : '#ef4444',
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        boxShadow: formData.currency ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
                                    }}
                                    disabled={loading}
                                >
                                    {currencyOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label} ({option.value})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Payment Method Selection */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">
                                    طريقة الدفع <span className="text-red-500">*</span>
                                </label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <button
                                        type="button"
                                        aria-pressed={paymentMethod === 'banks'}
                                        onClick={() => handlePaymentMethodChange('banks')}
                                        disabled={loading}
                                        className={`group relative w-full min-h-[72px] px-4 py-3 sm:px-5 rounded-xl cursor-pointer border-2 transition-all duration-200 flex items-center justify-center gap-3 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a47d52]/40 ${
                                            paymentMethod === 'banks'
                                                ? 'border-[#a47d52] bg-[#a47d52]/5 shadow-md ring-1 ring-[#a47d52]/10'
                                                : 'border-gray-200 bg-[#f8f7f5] hover:border-[#a47d52]/60 hover:bg-white hover:shadow-md active:scale-[0.99]'
                                        } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                                            paymentMethod === 'banks' ? 'bg-[#a47d52]/10' : 'bg-gray-100 group-hover:bg-[#a47d52]/10'
                                        }`}>
                                            <FaUniversity className={`text-lg sm:text-xl transition-colors ${
                                                paymentMethod === 'banks' ? 'text-[#a47d52]' : 'text-gray-400 group-hover:text-[#a47d52]'
                                            }`} />
                                        </span>
                                        <span className={`font-semibold text-sm sm:text-base ${
                                            paymentMethod === 'banks' ? 'text-[#a47d52]' : 'text-gray-700'
                                        }`}>
                                            بنوك
                                        </span>
                                        {paymentMethod === 'banks' && (
                                            <span className="mr-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#a47d52] text-white shadow-sm">
                                                <FaCheck className="text-xs" />
                                            </span>
                                        )}
                                    </button>

                                    <button
                                        type="button"
                                        aria-pressed={paymentMethod === 'cash'}
                                        onClick={() => handlePaymentMethodChange('cash')}
                                        disabled={loading}
                                        className={`group relative w-full min-h-[72px] px-4 py-3 sm:px-5 rounded-xl cursor-pointer border-2 transition-all duration-200 flex items-center justify-center gap-3 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a47d52]/40 ${
                                            paymentMethod === 'cash'
                                                ? 'border-[#a47d52] bg-[#a47d52]/5 shadow-md ring-1 ring-[#a47d52]/10'
                                                : 'border-gray-200 bg-[#f8f7f5] hover:border-[#a47d52]/60 hover:bg-white hover:shadow-md active:scale-[0.99]'
                                        } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                                            paymentMethod === 'cash' ? 'bg-[#a47d52]/10' : 'bg-gray-100 group-hover:bg-[#a47d52]/10'
                                        }`}>
                                            <FaMoneyBillWave className={`text-lg sm:text-xl transition-colors ${
                                                paymentMethod === 'cash' ? 'text-[#a47d52]' : 'text-gray-400 group-hover:text-[#a47d52]'
                                            }`} />
                                        </span>
                                        <span className={`font-semibold text-sm sm:text-base ${
                                            paymentMethod === 'cash' ? 'text-[#a47d52]' : 'text-gray-700'
                                        }`}>
                                            نقدي
                                        </span>
                                        {paymentMethod === 'cash' && (
                                            <span className="mr-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#a47d52] text-white shadow-sm">
                                                <FaCheck className="text-xs" />
                                            </span>
                                        )}
                                    </button>
                                </div>

                                {errors.payment_method && (
                                    <p className="text-red-500 text-sm mt-1">{errors.payment_method}</p>
                                )}
                            </div>

                            {/* ===== SWAPPED: Source of Funds (Bank or Cashbox) - First Column ===== */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               
                                {/* Account From */}
                                {paymentMethod === 'banks' ? (
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            البنك <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="bank"
                                            value={formData.bank || ''}
                                            onChange={handleChange}
                                            onKeyDown={(e) => handleKeyDown(e, amountRef)}
                                            className="w-full cursor-pointer px-4 py-2.5 bg-white rounded-xl shadow-sm focus:outline-none transition-all duration-200 text-right hover:border-[#a47d52]/60"
                                            style={{
                                                borderTopColor: 'transparent',
                                                borderBottomColor: 'white',
                                                borderLeftColor: 'transparent',
                                                borderRightColor: getFieldBorderColor(!!formData.bank, errors.bank),
                                                borderWidth: '2px',
                                                borderStyle: 'solid',
                                                boxShadow: getFieldShadow(!!formData.bank, errors.bank)
                                            }}
                                            required
                                            disabled={loading}
                                        >
                                            <option value="">اختر البنك...</option>
                                            {banks.map((bank) => (
                                                <option key={bank.id} value={bank.id}>
                                                    {bank.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.bank && (
                                            <p className="text-red-500 text-sm mt-1">{errors.bank}</p>
                                        )}
                                    </div>
                                ) : paymentMethod === 'cash' ? (
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            الخزينة النقدية <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            name="cashbox"
                                            value={formData.cashbox || ''}
                                            onChange={handleChange}
                                            onKeyDown={(e) => handleKeyDown(e, amountRef)}
                                            className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:outline-none transition-all duration-200 text-right hover:border-[#a47d52]/60"
                                            style={{
                                                borderTopColor: 'transparent',
                                                borderBottomColor: 'white',
                                                borderLeftColor: 'transparent',
                                                borderRightColor: getFieldBorderColor(!!formData.cashbox, errors.cashbox),
                                                borderWidth: '2px',
                                                borderStyle: 'solid',
                                                boxShadow: getFieldShadow(!!formData.cashbox, errors.cashbox)
                                            }}
                                            required
                                            disabled={loading}
                                        >
                                            <option value="">اختر الخزينة...</option>
                                            {cashboxes.map((cashbox) => (
                                                <option key={cashbox.id} value={cashbox.id}>
                                                    {cashbox.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.cashbox && (
                                            <p className="text-red-500 text-sm mt-1">{errors.cashbox}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            الى حساب - البنك / الخزينة <span className="text-red-500">*</span>
                                        </label>
                                        <div className="w-full px-4 py-3 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-slate-500 text-right">
                                            اختر طريقة الدفع أولاً
                                        </div>
                                    </div>
                                )}

                                {/* Account To */}
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        الى حساب <span className="text-red-500">*</span>
                                    </label>
                                    {/* ===== SWAPPED: now bound to account_to ===== */}
                                    <select
                                        ref={accountToRef}
                                        name="account_to"
                                        value={formData.account_to}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, amountRef)}
                                        className="w-full cursor-pointer px-4 py-2.5 bg-white rounded-xl shadow-sm focus:outline-none transition-all duration-200 text-right hover:border-[#a47d52]/60"
                                        style={{
                                            borderTopColor: 'transparent',
                                            borderBottomColor: 'white',
                                            borderLeftColor: 'transparent',
                                            borderRightColor: getFieldBorderColor(isAccountFromFilled, errors.account_to),
                                            borderWidth: '2px',
                                            borderStyle: 'solid',
                                            boxShadow: getFieldShadow(isAccountFromFilled, errors.account_to)
                                        }}
                                        required
                                        disabled={loading}
                                        autoFocus
                                    >
                                        <option value="">اختر الحساب...</option>
                                        {accounts.map((account) => (
                                            <option key={account.id} value={account.id}>
                                                {account.name} {account.category_name ? `- ${account.category_name}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.account_to && (
                                        <p className="text-red-500 text-sm mt-1">{errors.account_to}</p>
                                    )}
                                </div>


                                
                            </div>

                            {/* Amount with Words Display */}
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-gray-700">
                                    المبلغ <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        ref={amountRef}
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, statementRef)}
                                        className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                        style={{
                                            borderTopColor: 'transparent',
                                            borderBottomColor: 'white',
                                            borderLeftColor: 'transparent',
                                            borderRightColor: getFieldBorderColor(isAmountFilled, errors.amount),
                                            borderWidth: '2px',
                                            borderStyle: 'solid',
                                            boxShadow: getFieldShadow(isAmountFilled, errors.amount)
                                        }}
                                        placeholder="أدخل المبلغ..."
                                        step="0.01"
                                        min="0.01"
                                        required
                                        disabled={loading}
                                    />
                                    {getAmountInWords() && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-1 bg-[#a47d52]/10 rounded-l-sm border-r-2 border-[#a47d52] text-[#a47d52] text-sm font-semibold whitespace-nowrap max-w-[200px] truncate">
                                            {getAmountInWords()}
                                        </div>
                                    )}
                                </div>
                                {errors.amount && (
                                    <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                                )}
                                {getAmountInWords() && (
                                    <div className="mt-2 p-3 bg-[#a47d52]/5 border border-[#a47d52]/20 rounded-lg text-right">
                                        <span className="text-sm font-medium text-gray-700">المبلغ كتابةً: </span>
                                        <span className="text-sm font-bold text-[#a47d52]">{getAmountInWords()}</span>
                                        <span> </span>
                                        <span>فقظ لاغير</span>
                                    </div>
                                )}
                            </div>

                            {/* Date + Statement */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        التاريخ <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        name="transaction_date"
                                        value={formData.transaction_date}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, statementRef)}
                                        className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                        style={{
                                            borderTopColor: 'transparent',
                                            borderBottomColor: 'white',
                                            borderLeftColor: 'transparent',
                                            borderRightColor: formData.transaction_date ? '#a47d52' : '#ef4444',
                                            borderWidth: '2px',
                                            borderStyle: 'solid',
                                            boxShadow: formData.transaction_date ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
                                        }}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-sm font-semibold text-gray-700">
                                        البيان <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        ref={statementRef}
                                        type="text"
                                        name="statement"
                                        value={formData.statement}
                                        onChange={handleChange}
                                        onKeyDown={(e) => handleKeyDown(e, personReceiptRef)}
                                        className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                        style={{
                                            borderTopColor: 'transparent',
                                            borderBottomColor: 'white',
                                            borderLeftColor: 'transparent',
                                            borderRightColor: getFieldBorderColor(isStatementFilled, errors.statement),
                                            borderWidth: '2px',
                                            borderStyle: 'solid',
                                            boxShadow: getFieldShadow(isStatementFilled, errors.statement)
                                        }}
                                        placeholder="وصف المعاملة..."
                                        required
                                        disabled={loading}
                                    />
                                    {errors.statement && (
                                        <p className="text-red-500 text-sm mt-1">{errors.statement}</p>
                                    )}
                                </div>
                            </div>

                            {/* Person Receipt */}
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-gray-700">
                                    الشخص المستلم
                                </label>
                                <input
                                    ref={personReceiptRef}
                                    type="text"
                                    name="person_receipt"
                                    value={formData.person_receipt}
                                    onChange={handleChange}
                                    onKeyDown={(e) => handleKeyDown(e, personDeliverRef)}
                                    className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                    style={{
                                        borderTopColor: 'transparent',
                                        borderBottomColor: 'white',
                                        borderLeftColor: 'transparent',
                                        borderRightColor: getFieldBorderColor(isPersonReceiptFilled, errors.person_receipt),
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        boxShadow: getFieldShadow(isPersonReceiptFilled, errors.person_receipt)
                                    }}
                                    placeholder="اسم الشخص المستلم..."
                                    disabled={loading}
                                />
                            </div>

                            {/* Person Deliver - hidden */}
                            <div className="space-y-1 hidden">
                                <label className="block text-sm font-semibold text-gray-700">
                                    الشخص المسلم
                                </label>
                                <input
                                    ref={personReceiptRef}
                                    type="text"
                                    name="person_deliver"
                                    value={formData.person_deliver}
                                    onChange={handleChange}
                                    onKeyDown={(e) => handleKeyDown(e, notesRef)}
                                    className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                    style={{
                                        borderTopColor: 'transparent',
                                        borderBottomColor: 'white',
                                        borderLeftColor: 'transparent',
                                        borderRightColor: formData.person_deliver ? '#a47d52' : '#ef4444',
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        boxShadow: formData.person_deliver ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
                                    }}
                                    placeholder="اسم الشخص المسلم..."
                                    disabled={loading}
                                />
                            </div>

                            {/* Check Section */}
                            <div className="space-y-3 pt-2 border-t border-gray-200">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        name="has_check"
                                        checked={formData.has_check}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-gray-300 text-[#a47d52] focus:ring-[#a47d52]"
                                    />
                                    <label className="text-sm font-semibold text-gray-700">
                                        يوجد شيك ؟
                                    </label>
                                </div>

                                {formData.has_check && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-6 border-r-2 border-[#a47d52]/30 pl-2">
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-gray-600">
                                                رقم الشيك
                                            </label>
                                            <input
                                                ref={checkNoRef}
                                                type="text"
                                                name="check_no"
                                                value={formData.check_no}
                                                onChange={handleChange}
                                                onKeyDown={(e) => handleKeyDown(e, checkBankRef)}
                                                className="w-full px-4 py-2 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                                style={{
                                                    borderTopColor: 'transparent',
                                                    borderBottomColor: 'white',
                                                    borderLeftColor: 'transparent',
                                                    borderRightColor: formData.check_no ? '#a47d52' : '#ef4444',
                                                    borderWidth: '2px',
                                                    borderStyle: 'solid',
                                                    boxShadow: formData.check_no ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
                                                }}
                                                placeholder="رقم الشيك..."
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-gray-600">
                                                بنك الشيك
                                            </label>
                                            <select
                                                name="check_bank"
                                                value={formData.check_bank}
                                                onChange={handleChange}
                                                onKeyDown={(e) => handleKeyDown(e, checkDateRef)}
                                                className="w-full cursor-pointer px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                                style={{
                                                    borderTopColor: 'transparent',
                                                    borderBottomColor: 'white',
                                                    borderLeftColor: 'transparent',
                                                    borderRightColor: getFieldBorderColor(!!formData.check_bank, errors.check_bank),
                                                    borderWidth: '2px',
                                                    borderStyle: 'solid',
                                                    boxShadow: getFieldShadow(!!formData.check_bank, errors.check_bank)
                                                }}
                                                disabled={loading}
                                            >
                                                <option value="">اختر البنك...</option>
                                                {banks.map((bank) => (
                                                    <option key={bank.id} value={bank.id}>
                                                        {bank.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.check_bank && (
                                                <p className="text-red-500 text-sm mt-1">{errors.check_bank}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-gray-600">
                                                تاريخ الشيك
                                            </label>
                                            <input
                                                ref={checkDateRef}
                                                type="date"
                                                name="check_date"
                                                value={formData.check_date}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                                style={{
                                                    borderTopColor: 'transparent',
                                                    borderBottomColor: 'white',
                                                    borderLeftColor: 'transparent',
                                                    borderRightColor: formData.check_date ? '#a47d52' : '#ef4444',
                                                    borderWidth: '2px',
                                                    borderStyle: 'solid',
                                                    boxShadow: formData.check_date ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
                                                }}
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Document Section */}
                            <div className="space-y-3 pt-2 border-t border-gray-200">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        name="has_document"
                                        checked={formData.has_document}
                                        onChange={handleChange}
                                        className="w-5 h-5 rounded border-gray-300 text-[#a47d52] focus:ring-[#a47d52]"
                                    />
                                    <label className="text-sm font-semibold text-gray-700">
                                        يوجد مستند ؟
                                    </label>
                                </div>

                                {formData.has_document && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-6 border-r-2 border-[#a47d52]/30 pl-2">
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-gray-600">
                                                رقم المستند
                                            </label>
                                            <input
                                                ref={documentNoRef}
                                                type="text"
                                                name="document_no"
                                                value={formData.document_no}
                                                onChange={handleChange}
                                                onKeyDown={(e) => handleKeyDown(e, notesRef)}
                                                className="w-full px-4 py-2 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
                                                style={{
                                                    borderTopColor: 'transparent',
                                                    borderBottomColor: 'white',
                                                    borderLeftColor: 'transparent',
                                                    borderRightColor: formData.document_no ? '#a47d52' : '#ef4444',
                                                    borderWidth: '2px',
                                                    borderStyle: 'solid',
                                                    boxShadow: formData.document_no ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
                                                }}
                                                placeholder="رقم المستند..."
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-sm font-medium text-gray-600">
                                                تحميل المستند
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    name="document"
                                                    onChange={handleChange}
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    disabled={loading}
                                                />
                                                <div className="w-full px-4 py-2 bg-white rounded-sm shadow-lg flex items-center justify-between text-right"
                                                    style={{
                                                        borderTopColor: 'transparent',
                                                        borderBottomColor: 'white',
                                                        borderLeftColor: 'transparent',
                                                        borderRightColor: formData.document ? '#a47d52' : '#ef4444',
                                                        borderWidth: '2px',
                                                        borderStyle: 'solid',
                                                        boxShadow: formData.document ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
                                                    }}
                                                >
                                                    <span className={`text-sm ${formData.document ? 'text-[#a47d52]' : 'text-red-400'}`}>
                                                        {formData.document ? formData.document.name : 'اختر ملف...'}
                                                    </span>
                                                    <FaUpload className={`${formData.document ? 'text-[#a47d52]' : 'text-red-400'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="space-y-1">
                                <label className="block text-sm font-semibold text-gray-700">
                                    ملاحظات
                                </label>
                                <textarea
                                    ref={notesRef}
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right resize-none"
                                    style={{
                                        borderTopColor: 'transparent',
                                        borderBottomColor: 'white',
                                        borderLeftColor: 'transparent',
                                        borderRightColor: formData.notes ? '#a47d52' : '#ef4444',
                                        borderWidth: '2px',
                                        borderStyle: 'solid',
                                        boxShadow: formData.notes ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
                                    }}
                                    placeholder="ملاحظات إضافية..."
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        {isEditMode ? (
                            <>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`cursor-pointer flex-1 bg-[#a47d52] text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] active:scale-95 ${
                                        loading ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                            جاري الحفظ...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <FaSave />
                                            تحديث التوقيعات
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="cursor-pointer px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-all duration-200"
                                    disabled={loading}
                                >
                                    إلغاء
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`cursor-pointer flex-1 bg-[#a47d52] text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] active:scale-95 ${
                                        loading ? 'opacity-70 cursor-not-allowed' : ''
                                    }`}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                            جاري الحفظ...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            <FaSave /> 
                                            حفظ
                                        </span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="cursor-pointer px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-all duration-200"
                                    disabled={loading}
                                >
                                    إلغاء
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddWithdraw;



// import React, { useState, useEffect, useRef } from 'react';
// import { toast } from 'react-toastify';
// import { FaSave, FaUniversity, FaMoneyBillWave, FaCheck, FaUpload, FaSignature } from 'react-icons/fa';
// import { MdClose } from 'react-icons/md';
// import { formatAmountInWords } from '../../../utils/numberToArabic';

// const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// const AddWithdraw = ({ onClose, transactionData, onSuccess, initialData, isEditMode: initialEditMode }) => {
    
//     // Add state for edit mode - single declaration
//     const [isEditMode, setIsEditMode] = useState(initialEditMode || false);
//     const [transactionId, setTransactionId] = useState(initialData?.id || null);
    
//     // ... other state declarations
//     const [loading, setLoading] = useState(false);
//     const [accounts, setAccounts] = useState([]);
//     const [banks, setBanks] = useState([]);
//     const [cashboxes, setCashboxes] = useState([]);
//     const [paymentMethod, setPaymentMethod] = useState(null);
//     const [errors, setErrors] = useState({});
//     const [isDataLoaded, setIsDataLoaded] = useState(false);
    
//     // Refs for keyboard navigation
//     const accountFromRef = useRef(null);
//     const accountToRef = useRef(null);
//     const amountRef = useRef(null);
//     const statementRef = useRef(null);
//     const personReceiptRef = useRef(null);
//     const personDeliverRef = useRef(null);
//     const notesRef = useRef(null);
//     const documentNoRef = useRef(null);
//     const checkNoRef = useRef(null);
//     const checkBankRef = useRef(null);
//     const checkDateRef = useRef(null);
//     const currencyRef = useRef(null);
//     const userSignatureRef = useRef(null);
//     const managerSignatureRef = useRef(null);
//     const secondPersonSignatureRef = useRef(null);

//     // Default form data
//     const defaultFormData = {
//         transaction_date: new Date().toISOString().split('T')[0],
//         type: 'withdraw',
//         amount: '',
//         payment_method: '',
//         account_from: '',
//         account_to: '',
//         bank: '',
//         cashbox: '',
//         statement: '',
//         has_check: false,
//         check_no: '',
//         check_bank: '',
//         check_date: '',
//         person_receipt: '',
//         person_deliver: '',
//         notes: '',
//         has_document: false,
//         document: null,
//         document_no: '-',
//         currency: 'AED',
//         amount_to_arabic: '',
//         amount_to_english: '',
//         transaction_no: '',
//         transaction_user: null,
//         user_signature: '',
//         manager_signature: '',
//         second_person_signature: '',
//         created_at: '',
//         updated_at: '',
//     };

//     // Form fields
//     const [formData, setFormData] = useState(defaultFormData);

//     // Currency options
//     const currencyOptions = [
//         { value: 'AED', label: 'درهم اماراتي' },
//         { value: 'USD', label: 'دولار' },
//         { value: 'EUR', label: 'يورو' },
//         { value: 'SAR', label: 'ريال سعودي' },
//     ];

//     // Check if fields are filled
//     const isAccountFromFilled = formData.account_from && formData.account_from !== '';
//     const isAmountFilled = formData.amount && parseFloat(formData.amount) > 0;
//     const isStatementFilled = formData.statement && formData.statement.trim() !== '';
//     const isPersonReceiptFilled = formData.person_receipt && formData.person_receipt.trim() !== '';
//     const isUserSignatureFilled = formData.user_signature && formData.user_signature.trim() !== '';
//     const isManagerSignatureFilled = formData.manager_signature && formData.manager_signature.trim() !== '';
//     const isSecondPersonSignatureFilled = formData.second_person_signature && formData.second_person_signature.trim() !== '';
//     // const isAccountToFilled = formData.account_to && formData.account_to !== '';
//     // const isAmountFilled = formData.amount && parseFloat(formData.amount) > 0;
//     // const isStatementFilled = formData.statement && formData.statement.trim() !== '';
//     // const isPersonReceiptFilled = formData.person_receipt && formData.person_receipt.trim() !== '';
//     // const isUserSignatureFilled = formData.user_signature && formData.user_signature.trim() !== '';
//     // const isManagerSignatureFilled = formData.manager_signature && formData.manager_signature.trim() !== '';
//     // const isSecondPersonSignatureFilled = formData.second_person_signature && formData.second_person_signature.trim() !== '';

//     // Get amount in words (Arabic)
//     const getAmountInWords = () => {
//         if (!formData.amount || parseFloat(formData.amount) <= 0) {
//             return '';
//         }
//         return formatAmountInWords(formData.amount);
//     };

//     // Get field border color
//     const getFieldBorderColor = (isFilled, error) => {
//         if (error) return '#ef4444';
//         if (isFilled) return '#a47d52';
//         return '#ef4444';
//     };

//     // Get field shadow
//     const getFieldShadow = (isFilled, error) => {
//         if (error) return '0 0 0 3px rgba(239, 68, 68, 0.15)';
//         if (isFilled) return '0 0 0 3px rgba(164, 125, 82, 0.12)';
//         return '0 0 0 3px rgba(239, 68, 68, 0.08)';
//     };

//     // Find account ID by name
//     // const findAccountIdByName = (accountName, accountsList) => {
//     //     if (!accountName || !accountsList || accountsList.length === 0) {
//     //         return '';
//     //     }
        
//     //     // If it's already a number or numeric string, return it
//     //     if (!isNaN(accountName) && accountName !== '') {
//     //         return accountName;
//     //     }
        
//     //     // Try to find by exact name match
//     //     let found = accountsList.find(acc => 
//     //         acc.name === accountName || 
//     //         acc.name?.trim() === accountName?.trim()
//     //     );
        
//     //     // If not found, try case-insensitive match
//     //     if (!found) {
//     //         found = accountsList.find(acc => 
//     //             acc.name?.toLowerCase() === accountName?.toLowerCase() ||
//     //             acc.name?.toLowerCase().trim() === accountName?.toLowerCase().trim()
//     //         );
//     //     }
        
//     //     // If still not found, log warning
//     //     if (!found) {
//     //         console.warn('No matching account found for name:', accountName);
//     //         return '';
//     //     }
        
//     //     return found.id;
//     // };

//     // Fetch accounts
//     const fetchAccounts = async () => {
//         try {
//             const token = localStorage.getItem('access_token');
//             if (!token) return [];

//             const response = await fetch(`${BASE}/api/accounts/`, {
//                 method: "GET",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 }
//             });

//             if (response.ok) {
//                 const data = await response.json();
//                 const accountsData = data.results || data || [];
//                 setAccounts(accountsData);
//                 return accountsData;
//             }
//         } catch (error) {
//             console.error('Error fetching accounts:', error);
//         }
//         return [];
//     };

//     // Fetch banks
//     const fetchBanks = async () => {
//         try {
//             const token = localStorage.getItem('access_token');
//             if (!token) return;

//             const response = await fetch(`${BASE}/api/banks/`, {
//                 method: "GET",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 }
//             });

//             if (response.ok) {
//                 const data = await response.json();
//                 setBanks(data.results || data || []);
//             }
//         } catch (error) {
//             console.error('Error fetching banks:', error);
//         }
//     };

//     // Fetch cashboxes
//     const fetchCashboxes = async () => {
//         try {
//             const token = localStorage.getItem('access_token');
//             if (!token) return;

//             const response = await fetch(`${BASE}/api/cashboxes/`, {
//                 method: "GET",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${token}`
//                 }
//             });

//             if (response.ok) {
//                 const data = await response.json();
//                 setCashboxes(data.results || data || []);
//             }
//         } catch (error) {
//             console.error('Error fetching cashboxes:', error);
//         }
//     };
    
//     // Find account ID by name
//     const findAccountIdByName = (accountName, accountsList) => {
//         if (!accountName || !accountsList || accountsList.length === 0) {
//             return '';
//         }
        
//         // If it's already a number or numeric string, return it
//         if (!isNaN(accountName) && accountName !== '') {
//             return accountName;
//         }
        
//         // Try to find by exact name match
//         let found = accountsList.find(acc => 
//             acc.name === accountName || 
//             acc.name?.trim() === accountName?.trim()
//         );
        
//         // If not found, try case-insensitive match
//         if (!found) {
//             found = accountsList.find(acc => 
//                 acc.name?.toLowerCase() === accountName?.toLowerCase() ||
//                 acc.name?.toLowerCase().trim() === accountName?.toLowerCase().trim()
//             );
//         }
        
//         // If still not found, log warning
//         if (!found) {
//             console.warn('No matching account found for name:', accountName);
//             console.warn('Available accounts:', accountsList.map(a => a.name));
//             return '';
//         }
        
//         return found.id;
//     };


//     // ===== FIXED: Payment method selection =====
//     // Keep the selection in both paymentMethod and formData so a parent re-render
//     // cannot immediately reset the visual selection after the first click.
//     const handlePaymentMethodChange = (method) => {
//         if (method !== 'banks' && method !== 'cash') return;

//         setPaymentMethod(method);
//         setFormData(prev => ({
//             ...prev,
//             payment_method: method,
//             ...(method === 'banks' ? { cashbox: '' } : { bank: '' })
//         }));

//         setErrors(prev => ({
//             ...prev,
//             payment_method: '',
//             ...(method === 'banks' ? { cashbox: '' } : { bank: '' })
//         }));
//     };

//     // Many parent components recreate initialData on every render. Depending on
//     // [initialData] would then restart this effect and could reset paymentMethod
//     // immediately after the user clicks Banks/Cash.
//     const initialDataId = initialData?.id ?? null;

//     // ===== DEBUG: Monitor paymentMethod changes Old have Issue =====
//     // useEffect(() => {
//     //     console.log('🔄 Payment Method State:', {
//     //         paymentMethod,
//     //         'formData.bank': formData.bank,
//     //         'formData.cashbox': formData.cashbox,
//     //         'isEditMode': isEditMode,
//     //         'transactionId': transactionId
//     //     });
//     // }, [paymentMethod, formData.bank, formData.cashbox, isEditMode, transactionId]);

//     // Effect to handle form population when component opens or initialData changes
//     // useEffect(() => {
//     //     const loadDataAndPopulate = async () => {
//     //         // Fetch accounts first
//     //         const accountsData = await fetchAccounts();
//     //         await fetchBanks();
//     //         await fetchCashboxes();
            
//     //         if (initialData && Object.keys(initialData).length > 0) {
//     //             console.log('Populating form with initialData:', initialData);
                
//     //             // EDIT MODE: Populate form with existing data
//     //             setIsEditMode(true);
//     //             setTransactionId(initialData.id);
                
//     //             // Get the bank/cashbox ID from the transaction data
//     //             const bankId = typeof initialData.bank === 'object' 
//     //                 ? initialData.bank?.id || '' 
//     //                 : initialData.bank || '';
                
//     //             const cashboxId = typeof initialData.cashbox === 'object' 
//     //                 ? initialData.cashbox?.id || '' 
//     //                 : initialData.cashbox || '';
                
//     //             // IMPORTANT: Find account ID by name
//     //             let accountFromValue = initialData.account_from || '';
//     //             let accountToValue = initialData.account_to || '';
                
//     //             // If accounts are loaded, find the matching IDs
//     //             if (accountsData && accountsData.length > 0) {
//     //                 // For account_from - find by name
//     //                 const foundAccountFromId = findAccountIdByName(accountFromValue, accountsData);
//     //                 if (foundAccountFromId) {
//     //                     accountFromValue = foundAccountFromId;
//     //                     console.log('Found account_from ID:', foundAccountFromId, 'for name:', initialData.account_from);
//     //                 }
                    
//     //                 // For account_to - find by name
//     //                 const foundAccountToId = findAccountIdByName(accountToValue, accountsData);
//     //                 if (foundAccountToId) {
//     //                     accountToValue = foundAccountToId;
//     //                     console.log('Found account_to ID:', foundAccountToId, 'for name:', initialData.account_to);
//     //                 }
//     //             }
                
//     //             // Populate form with initial data
//     //             setFormData({
//     //                 ...defaultFormData,
//     //                 ...initialData,
//     //                 transaction_date: initialData.transaction_date || new Date().toISOString().split('T')[0],
//     //                 amount: initialData.amount || '',
//     //                 account_from: accountFromValue,
//     //                 account_to: accountToValue,
//     //                 bank: bankId,
//     //                 cashbox: cashboxId,
//     //                 statement: initialData.statement || '',
//     //                 has_check: initialData.has_check || false,
//     //                 check_no: initialData.check_no || '',
//     //                 check_bank: initialData.check_bank || '',
//     //                 check_date: initialData.check_date || '',
//     //                 person_receipt: initialData.person_receipt || '',
//     //                 person_deliver: initialData.person_deliver || '',
//     //                 notes: initialData.notes || '',
//     //                 has_document: !!initialData.document,
//     //                 document_no: initialData.document_no || '',
//     //                 currency: initialData.currency || 'AED',
//     //                 amount_to_arabic: initialData.amount_to_arabic || '',
//     //                 amount_to_english: initialData.amount_to_english || '',
//     //                 transaction_no: initialData.transaction_no || '',
//     //                 transaction_user: initialData.transaction_user || null,
//     //                 user_signature: initialData.user_signature || '',
//     //                 manager_signature: initialData.manager_signature || '',
//     //                 second_person_signature: initialData.second_person_signature || '',
//     //                 created_at: initialData.created_at || '',
//     //                 updated_at: initialData.updated_at || '',
//     //             });
                
//     //             // ===== CRITICAL FIX: Set payment method from data =====
//     //             if (initialData.payment_method) {
//     //                 console.log('🎯 Setting payment method from data:', initialData.payment_method);
//     //                 setPaymentMethod(initialData.payment_method);
//     //             } else if (bankId) {
//     //                 console.log('🎯 Setting payment method from bank ID');
//     //                 setPaymentMethod('banks');
//     //             } else if (cashboxId) {
//     //                 console.log('🎯 Setting payment method from cashbox ID');
//     //                 setPaymentMethod('cash');
//     //             } else {
//     //                 // Default to null if no payment method found
//     //                 console.log('🎯 No payment method found, setting to null');
//     //                 setPaymentMethod(null);
//     //             }
//     //         } else {
//     //             // ADD MODE: Reset form to default values
//     //             console.log('Resetting form to default (ADD MODE)');
//     //             setIsEditMode(false);
//     //             setTransactionId(null);
//     //             setFormData(defaultFormData);
//     //             // ===== CRITICAL FIX: Reset payment method to null =====
//     //             setPaymentMethod(null);
//     //             setErrors({});
//     //         }
            
//     //         setIsDataLoaded(true);
//     //     };
        
//     //     loadDataAndPopulate();
//     // }, [initialData]);

//     // Effect to handle form population when the transaction changes.
//         // For ADD mode (initialDataId === null), this runs once for the mounted
//         // component and will NOT run again just because the parent re-renders.
//         useEffect(() => {
//             let cancelled = false;
    
//             // ADD MODE must be initialized BEFORE any async fetch.
//             // This prevents a late async completion from overwriting the user's
//             // first payment-method click.
//             if (!initialData || Object.keys(initialData).length === 0) {
//                 setIsEditMode(false);
//                 setTransactionId(null);
//                 setFormData(defaultFormData);
//                 setPaymentMethod(null);
//                 setErrors({});
//                 setIsDataLoaded(false);
//             }
    
//             const loadDataAndPopulate = async () => {
//                 // Fetch accounts first
//                 const accountsData = await fetchAccounts();
//                 await fetchBanks();
//                 await fetchCashboxes();
    
//                 // The component/transaction may have changed while the requests
//                 // were running. Never apply stale async results.
//                 if (cancelled) return;
                
//                 if (initialData && Object.keys(initialData).length > 0) {
//                     console.log('Populating form with initialData:', initialData);
                    
//                     // EDIT MODE: Populate form with existing data
//                     setIsEditMode(true);
//                     setTransactionId(initialData.id);
                    
//                     // Get the bank/cashbox ID from the transaction data
//                     const bankId = typeof initialData.bank === 'object' 
//                         ? initialData.bank?.id || '' 
//                         : initialData.bank || '';
                    
//                     const cashboxId = typeof initialData.cashbox === 'object' 
//                         ? initialData.cashbox?.id || '' 
//                         : initialData.cashbox || '';
                    
//                     // IMPORTANT: Find account ID by name
//                     let accountFromValue = initialData.account_from || '';
//                     let accountToValue = initialData.account_to || '';
                    
//                     // If accounts are loaded, find the matching IDs
//                     if (accountsData && accountsData.length > 0) {
//                         // For account_from - find by name
//                         const foundAccountFromId = findAccountIdByName(accountFromValue, accountsData);
//                         if (foundAccountFromId) {
//                             accountFromValue = foundAccountFromId;
//                             console.log('Found account_from ID:', foundAccountFromId, 'for name:', initialData.account_from);
//                         } else {
//                             // If not found, keep the original value (might be ID or name)
//                             console.warn('Could not find account_from ID for:', accountFromValue);
//                         }
                        
//                         // For account_to - find by name (if it's a name)
//                         if (accountToValue && isNaN(accountToValue)) {
//                             const foundAccountToId = findAccountIdByName(accountToValue, accountsData);
//                             if (foundAccountToId) {
//                                 accountToValue = foundAccountToId;
//                                 console.log('Found account_to ID:', foundAccountToId, 'for name:', initialData.account_to);
//                             }
//                         }
//                     }
                    
//                     // Populate form with initial data
//                     setFormData({
//                         ...defaultFormData,
//                         ...initialData,
//                         transaction_date: initialData.transaction_date || new Date().toISOString().split('T')[0],
//                         amount: initialData.amount || '',
//                         account_from: accountFromValue,
//                         account_to: accountToValue,
//                         bank: bankId,
//                         cashbox: cashboxId,
//                         statement: initialData.statement || '',
//                         has_check: initialData.has_check || false,
//                         check_no: initialData.check_no || '',
//                         check_bank: initialData.check_bank || '',
//                         check_date: initialData.check_date || '',
//                         person_deliver: initialData.person_deliver || '',
//                         person_receipt: initialData.person_receipt || '',
//                         notes: initialData.notes || '',
//                         has_document: !!initialData.document,
//                         document_no: initialData.document_no || '',
//                         currency: initialData.currency || 'AED',
//                         amount_to_arabic: initialData.amount_to_arabic || '',
//                         amount_to_english: initialData.amount_to_english || '',
//                         transaction_no: initialData.transaction_no || '',
//                         transaction_user: initialData.transaction_user || null,
//                         user_signature: initialData.user_signature || '',
//                         manager_signature: initialData.manager_signature || '',
//                         second_person_signature: initialData.second_person_signature || '',
//                         created_at: initialData.created_at || '',
//                         updated_at: initialData.updated_at || '',
//                     });
                    
//                     // ===== CRITICAL FIX: Set payment method from data =====
//                     if (initialData.payment_method) {
//                         console.log('🎯 Setting payment method from data:', initialData.payment_method);
//                         setPaymentMethod(initialData.payment_method);
//                     } else if (bankId) {
//                         console.log('🎯 Setting payment method from bank ID');
//                         setPaymentMethod('banks');
//                     } else if (cashboxId) {
//                         console.log('🎯 Setting payment method from cashbox ID');
//                         setPaymentMethod('cash');
//                     } else {
//                         // Default to null if no payment method found
//                         console.log('🎯 No payment method found, setting to null');
//                         setPaymentMethod(null);
//                     }
//                 }
                
//                 if (!cancelled) {
//                     setIsDataLoaded(true);
//                 }
//             };
            
//             loadDataAndPopulate();
    
//             return () => {
//                 cancelled = true;
//             };
//         }, [initialDataId]);
//         // End useEffect
    

//     // Handle input change
//     const handleChange = (e) => {
//             const { name, value, type, checked, files } = e.target;
            
//             if (type === 'file') {
//                 setFormData({ ...formData, [name]: files[0] });
//                 if (files[0]) {
//                     setErrors({ ...errors, [name]: '' });
//                 }
//             } else if (type === 'checkbox') {
//                 setFormData({ ...formData, [name]: checked });
//             } else {
//                 setFormData({ ...formData, [name]: value });
//                 setErrors({ ...errors, [name]: '' });
                
//                 // Auto-generate amount words when amount changes
//                 if (name === 'amount' && value) {
//                     const amountNum = parseFloat(value);
//                     if (amountNum > 0) {
//                         setFormData(prev => ({
//                             ...prev,
//                             [name]: value,
//                             amount_to_arabic: formatAmountInWords(amountNum),
//                             amount_to_english: formatAmountInWords(amountNum),
//                         }));
//                     }
//                 }
//             }
//         };
    
//     // Handle Enter key - move to next field
//     const handleKeyDown = (e, nextRef) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (nextRef && nextRef.current) {
//                 nextRef.current.focus();
//             }
//         }
//     };

//     // ===== FIXED: handleSubmit with proper payment method handling =====
//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         setLoading(true);
//         setErrors({});

//         try {
//             const token = localStorage.getItem('access_token');
//             if (!token) {
//                 toast.error('يرجى تسجيل الدخول');
//                 setLoading(false);
//                 return;
//             }

//             // Validate
//             const newErrors = {};
//             // if (!formData.account_to) {
//             //     newErrors.account_to = 'يرجى اختيار الحساب المستهدف';
//             // }
//             if (!formData.account_from) {
//                 newErrors.account_from = 'يرجى اختيار الحساب المصدر';
//             }
//             if (!formData.amount || parseFloat(formData.amount) <= 0) {
//                 newErrors.amount = 'يرجى إدخال مبلغ صحيح';
//             }
//             if (!formData.statement || formData.statement.trim() === '') {
//                 newErrors.statement = 'يرجى إدخال البيان';
//             }
//             if (!paymentMethod) {
//                 newErrors.payment_method = 'يرجى اختيار طريقة الدفع';
//             }
//             if (paymentMethod === 'banks' && !formData.bank) {
//                 newErrors.bank = 'يرجى اختيار البنك';
//             }
//             if (paymentMethod === 'cash' && !formData.cashbox) {
//                 newErrors.cashbox = 'يرجى اختيار الخزينة النقدية';
//             }

//             if (Object.keys(newErrors).length > 0) {
//                 setErrors(newErrors);
//                 toast.error('يرجى تصحيح الأخطاء في النموذج');
//                 setLoading(false);
//                 return;
//             }

//             // ===== FIX: Prepare data with proper payment method =====
//             let submitData = {
//                 type: 'withdraw',
//                 transaction_date: formData.transaction_date,
//                 amount: parseFloat(formData.amount),
//                 payment_method: paymentMethod, // ← Use state, not formData
//                 // account_from: '', // Let backend handle this
//                 // account_to: formData.account_to,
//                 account_from: formData.account_from,
//                 account_to: '', // Let backend handle this
//                 statement: formData.statement,
//                 has_check: formData.has_check,
//                 currency: formData.currency || 'AED',
//             };

//             // ===== FIX: Handle person fields based on transaction type =====
//             if (submitData.type === 'withdraw') {
//                 submitData.person_receipt = formData.person_receipt || '';
//                 // Don't send person_deliver for withdraw
//             } else if (submitData.type === 'deposit') {
//                 submitData.person_deliver = formData.person_deliver || '';
//                 // Don't send person_receipt for deposit
//             }

//             // Optional fields - use empty string, not null
//             submitData.notes = formData.notes || '';
//             submitData.user_signature = formData.user_signature || '';
//             submitData.manager_signature = formData.manager_signature || '';
//             submitData.second_person_signature = formData.second_person_signature || '';

//             // ===== FIX: Add bank or cashbox based on payment method =====
//             if (paymentMethod === 'banks') {
//                 submitData.bank = parseInt(formData.bank);
//             } else if (paymentMethod === 'cash') {
//                 submitData.cashbox = parseInt(formData.cashbox);
//             }

//             // Add check fields if has_check
//             if (formData.has_check) {
//                 submitData.check_no = formData.check_no || '';
//                 submitData.check_bank = formData.check_bank || '';
//                 submitData.check_date = formData.check_date || '';
//             }

//             // ===== FIX: Handle document upload properly =====
//             let hasFileUpload = false;
//             let actualFile = null;

//             if (formData.has_document) {
//                 submitData.has_document = true;
//                 submitData.document_no = formData.document_no || '';
                
//                 // Check if document is a File object (new upload)
//                 if (formData.document instanceof File || formData.document instanceof Blob) {
//                     hasFileUpload = true;
//                     actualFile = formData.document;
//                 } else if (typeof formData.document === 'string' && formData.document.startsWith('http')) {
//                     // This is an existing document URL - DON'T upload again
//                     hasFileUpload = false;
//                     // Keep has_document and document_no
//                 } else if (typeof formData.document === 'string' && formData.document !== '') {
//                     // Could be a base64 or other string - treat as new file
//                     hasFileUpload = true;
//                     actualFile = formData.document;
//                 }
//             } else {
//                 submitData.has_document = false;
//             }

//             const url = isEditMode 
//                 ? `${BASE}/api/transactions/${transactionId}/update/`
//                 : `${BASE}/api/transactions/create/`;
            
//             const method = isEditMode ? 'PUT' : 'POST';

//             let response;

//             // ===== DEBUG: Log request for UPDATE =====
//             if (isEditMode) {
//                 console.log('═══════════════════════════════════════');
//                 console.log('🔍 DEBUG - UPDATE TRANSACTION');
//                 console.log('═══════════════════════════════════════');
//                 console.log('📌 Transaction ID:', transactionId);
//                 console.log('📌 Method:', method);
//                 console.log('📌 URL:', url);
//                 console.log('📌 Payment Method:', paymentMethod);
//                 console.log('📌 Has File Upload:', hasFileUpload);
//                 console.log('📌 Form Data being sent:', JSON.stringify(submitData, null, 2));
//                 console.log('═══════════════════════════════════════\n');
//             }

//             if (hasFileUpload && actualFile) {
//                 // Use FormData for file upload
//                 const formDataObj = new FormData();
                
//                 // Append all fields, skipping undefined
//                 Object.keys(submitData).forEach(key => {
//                     if (submitData[key] !== undefined && submitData[key] !== null) {
//                         formDataObj.append(key, submitData[key]);
//                     }
//                 });
                
//                 // Append the actual file
//                 formDataObj.append('document', actualFile);

//                 response = await fetch(url, {
//                     method: method,
//                     headers: {
//                         "Authorization": `Bearer ${token}`
//                         // Content-Type is automatically set by browser for FormData
//                     },
//                     body: formDataObj
//                 });
//             } else {
//                 // Use JSON for non-file updates
//                 const cleanData = {};
//                 Object.keys(submitData).forEach(key => {
//                     if (submitData[key] !== undefined) {
//                         cleanData[key] = submitData[key];
//                     }
//                 });
                
//                 response = await fetch(url, {
//                     method: method,
//                     headers: {
//                         "Content-Type": "application/json",
//                         "Authorization": `Bearer ${token}`
//                     },
//                     body: JSON.stringify(cleanData)
//                 });
//             }

//             // ===== DEBUG: Response Details =====
//             if (isEditMode) {
//                 console.log('📡 RESPONSE STATUS:', response.status, response.statusText);
//                 const clonedResponse = response.clone();
//                 try {
//                     const responseText = await clonedResponse.text();
//                     console.log('📌 Response Body:', responseText);
//                 } catch (e) {
//                     console.warn('Could not read response');
//                 }
//             }

//             if (!response.ok) {
//                 const errorData = await response.json();
//                 console.error('Error response:', errorData);
                
//                 if (errorData) {
//                     const errorMessages = [];
//                     Object.keys(errorData).forEach(key => {
//                         if (Array.isArray(errorData[key])) {
//                             errorMessages.push(`${key}: ${errorData[key].join(', ')}`);
//                         } else if (typeof errorData[key] === 'string') {
//                             errorMessages.push(`${key}: ${errorData[key]}`);
//                         }
//                     });
//                     throw new Error(errorMessages.join('\n') || 'فشل حفظ المعاملة');
//                 }
//                 throw new Error('فشل حفظ المعاملة');
//             }

//             const result = await response.json();
//             console.log('Transaction saved:', result);

//             if (!isEditMode) {
//                 toast.success('✅ تم إضافة السحب بنجاح');
//                 const newTransactionId = result.id || result.data?.id;
//                 if (newTransactionId) {
//                     setIsEditMode(true);
//                     setTransactionId(newTransactionId);
//                     if (result.data) {
//                         // ===== FIX: Preserve payment method after create =====
//                         if (result.data.payment_method) {
//                             setPaymentMethod(result.data.payment_method);
//                         }
//                         setFormData(prev => ({
//                             ...prev,
//                             ...result.data,
//                             bank: result.data.bank?.id || result.data.bank || prev.bank,
//                             cashbox: result.data.cashbox?.id || result.data.cashbox || prev.cashbox,
//                         }));
//                     }
//                     await fetchTransactionDetails(newTransactionId);
//                     onSuccess?.();
//                     toast.info('📝 يمكنك الآن إضافة التوقيعات');
//                 } else {
//                     toast.success('تم الإضافة بنجاح');
//                     onSuccess?.();
//                     handleClose();
//                 }
//             } else {
//                 toast.success('✅ تمت اضافه التوقيعات بنجاح');
//                 onSuccess?.();
//                 handleClose();
//             }
            
//         } catch (error) {
//             console.error('Error saving transaction:', error);
//             toast.error('❌ ' + error.message);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Helper function to fetch transaction details
//     const fetchTransactionDetails = async (transactionId) => {
//         try {
//             const token = localStorage.getItem('access_token');
//             const response = await fetch(`${BASE}/api/transactions/${transactionId}/`, {
//                 headers: {
//                     "Authorization": `Bearer ${token}`
//                 }
//             });
            
//             if (response.ok) {
//                 const data = await response.json();
                
//                 // Find account IDs by name if needed
//                 let accountFromId = data.account_from || '';
//                 let accountToId = data.account_to || '';
                
//                 // if (accounts.length > 0) {
//                 //     if (accountFromId && isNaN(accountFromId)) {
//                 //         const foundId = findAccountIdByName(accountFromId, accounts);
//                 //         if (foundId) accountFromId = foundId;
//                 //     }
//                 //     if (accountToId && isNaN(accountToId)) {
//                 //         const foundId = findAccountIdByName(accountToId, accounts);
//                 //         if (foundId) accountToId = foundId;
//                 //     }
//                 // }
//                 if (accountFromId && isNaN(accountFromId) && accounts.length > 0) {
//                     const foundId = findAccountIdByName(accountFromId, accounts);
//                     if (foundId) {
//                         accountFromId = foundId;
//                     }
//                 }
                
//                 // If account_to is a name (string), find the ID
//                 if (accountToId && isNaN(accountToId) && accounts.length > 0) {
//                     const foundId = findAccountIdByName(accountToId, accounts);
//                     if (foundId) {
//                         accountToId = foundId;
//                     }
//                 }
                
//                 setFormData(prev => ({
//                     ...prev,
//                     ...data,
//                     account_from: accountFromId,
//                     account_to: accountToId,
//                     bank: data.bank?.id || data.bank || prev.bank,
//                     cashbox: data.cashbox?.id || data.cashbox || prev.cashbox,
//                     transaction_user: data.transaction_user || prev.transaction_user,
//                 }));
                
//                 // ===== FIX: Set payment method from fetched data =====
//                 if (data.payment_method) {
//                     console.log('🎯 Setting payment method from fetch:', data.payment_method);
//                     setPaymentMethod(data.payment_method);
//                 } else if (data.bank) {
//                     setPaymentMethod('banks');
//                 } else if (data.cashbox) {
//                     setPaymentMethod('cash');
//                 }
                
//                 return data;
//             }
//         } catch (error) {
//             console.error('Error fetching transaction details:', error);
//         }
//     };

//     // Close handler to reset edit mode
//     const handleClose = () => {
//         setIsEditMode(false);
//         setTransactionId(null);
//         setFormData(defaultFormData);
//         // ===== FIX: Reset payment method on close =====
//         setPaymentMethod(null);
//         setErrors({});
//         setLoading(false);
//         onClose();
//     };

//     // Format date for display
//     const formatDate = (dateString) => {
//         if (!dateString) return '';
//         const date = new Date(dateString);
//         return date.toLocaleDateString('ar-EG', {
//             year: 'numeric',
//             month: 'long',
//             day: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit'
//         });
//     };

//     // Get user display name
//     const getUserDisplayName = (user) => {
//         if (!user) return 'غير معروف';
//         if (typeof user === 'object') {
//             return user.username || user.name || user.id || 'غير معروف';
//         }
//         return user;
//     };

//     // Get account name by ID for display
//     const getAccountName = (accountId) => {
//         if (!accountId) return '';
//         const account = accounts.find(acc => acc.id === parseInt(accountId));
//         return account ? account.name : accountId;
//     };

//     return (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/1 backdrop-blur-sm p-4">
//             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
//                 {/* Header */}
//                 <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 z-10 bg-red-50 shadow-lg">
//                     <div>
//                         <h3 className="text-xl md:text-2xl font-extrabold text-gray-800">
//                             {isEditMode ? 'تحديث التوقيعات' : 'سحب جديد'}
//                         </h3>
//                         {isEditMode && formData.transaction_no && (
//                             <p className="text-sm text-gray-500 mt-1">
//                                 رقم المعاملة: <span className="font-bold text-[#a47d52]">{formData.transaction_no}</span>
//                             </p>
//                         )}
//                     </div>
//                     <button 
//                         className="cursor-pointer animate-spin text-gray-400 hover:text-gray-600 text-2xl font-light hover:rotate-90 transition-transform"
//                         onClick={handleClose}
//                         disabled={loading}
//                     >
//                         ✕
//                     </button>
//                 </div>

//                 {/* Form */}
//                 <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white">
                    
//                     {/* Update Info - Only visible in edit mode */}
//                     {isEditMode && (
//                         <div className="bg-[#a47d52]/5 border border-[#a47d52]/20 rounded-lg p-4 space-y-3">
//                             {/* Created at */}
//                             {formData.created_at && (
//                                 <div className="flex justify-between items-center text-sm">
//                                     <span className="text-gray-600">تاريخ الإنشاء:</span>
//                                     <span className="font-medium text-gray-700">{formatDate(formData.created_at)}</span>
//                                 </div>
//                             )}
                            
//                             {/* Updated at */}
//                             {formData.updated_at && formData.updated_at !== formData.created_at && (
//                                 <div className="flex justify-between items-center text-sm">
//                                     <span className="text-gray-600">آخر تحديث:</span>
//                                     <span className="font-medium text-gray-700">{formatDate(formData.updated_at)}</span>
//                                 </div>
//                             )}

//                             {/* Account From and Account To Display */}
//                             <div className="pt-3 border-t border-[#a47d52]/20">
//                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                                     <div className="flex gap-2 items-center text-sm">
//                                         <span className="text-gray-600">من حساب:</span>
//                                         <span className="font-medium text-[#a47d52]">
//                                             {getAccountName(formData.account_from) || formData.account_from || '-'}
//                                         </span>
//                                     </div>
//                                     <div className="flex gap-2 items-center text-sm">
//                                         <span className="text-gray-600">الى حساب:</span>
//                                         <span className="font-medium text-[#a47d52]">
//                                             {getAccountName(formData.account_to) || formData.account_to || '-'}
//                                         </span>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Transaction Details */}
//                             <div className="pt-3 border-t border-[#a47d52]/20">
//                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                                     <div className="flex gap-2 items-center text-sm">
//                                         <span className="text-gray-600">المبلغ:</span>
//                                         <span className="font-medium text-[#a47d52]">
//                                             {formData.amount ? parseFloat(formData.amount).toFixed(2) : '-'}
//                                         </span>
//                                     </div>
//                                     <div className="flex gap-2 items-center text-sm">
//                                         <span className="text-gray-600">العملة:</span>
//                                         <span className="font-medium text-[#a47d52]">
//                                             {formData.currency || '-'}
//                                         </span>
//                                     </div>
//                                     <div className="flex gap-2 items-center text-sm">
//                                         <span className="text-gray-600">طريقة الدفع:</span>
//                                         <span className="font-medium text-[#a47d52]">
//                                             {paymentMethod === 'banks' ? 'بنوك' : 
//                                              paymentMethod === 'cash' ? 'نقدي' : 
//                                              formData.payment_method || '-'}
//                                         </span>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* Amount in Words */}
//                             {getAmountInWords() && (
//                                 <div className="pt-3 border-t border-[#a47d52]/20">
//                                     <div className="flex gap-2 items-center text-sm">
//                                         <span className="text-gray-600">المبلغ كتابةً:</span>
//                                         <span className="font-medium text-[#a47d52]">
//                                             {getAmountInWords()}
//                                         </span>
//                                         <span className="text-sm text-gray-500">فقظ لاغير</span>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Statement */}
//                             {formData.statement && (
//                                 <div className="pt-3 border-t border-[#a47d52]/20">
//                                     <div className="flex gap-2 items-center text-sm">
//                                         <span className="text-gray-600">البيان:</span>
//                                         <span className="font-medium text-[#a47d52]">
//                                             {formData.statement}
//                                         </span>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Person Receipt */}
//                             {formData.person_receipt && (
//                                 <div className="pt-3 border-t border-[#a47d52]/20">
//                                     <div className="flex gap-2 items-center text-sm">
//                                         <span className="text-gray-600">الشخص المستلم:</span>
//                                         <span className="font-medium text-[#a47d52]">
//                                             {formData.person_receipt}
//                                         </span>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Check Details */}
//                             {formData.has_check && (
//                                 <div className="pt-3 border-t border-[#a47d52]/20">
//                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                                         <div className="flex gap-2 items-center text-sm">
//                                             <span className="text-gray-600">رقم الشيك:</span>
//                                             <span className="font-medium text-[#a47d52]">
//                                                 {formData.check_no || '-'}
//                                             </span>
//                                         </div>
//                                         <div className="flex gap-2 items-center text-sm">
//                                             <span className="text-gray-600">بنك الشيك:</span>
//                                             <span className="font-medium text-[#a47d52]">
//                                                 {formData.check_bank || '-'}
//                                             </span>
//                                         </div>
//                                         <div className="flex gap-2 items-center text-sm">
//                                             <span className="text-gray-600">تاريخ الشيك:</span>
//                                             <span className="font-medium text-[#a47d52]">
//                                                 {formData.check_date || '-'}
//                                             </span>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Document Details */}
//                             {formData.has_document && (
//                                 <div className="pt-3 border-t border-[#a47d52]/20">
//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
//                                         <div className="flex gap-2 items-center text-sm">
//                                             <span className="text-gray-600">رقم المستند:</span>
//                                             <span className="font-medium text-[#a47d52]">
//                                                 {formData.document_no || '-'}
//                                             </span>
//                                         </div>
//                                         {formData.document && (
//                                             <div className="flex gap-2 items-center text-sm">
//                                                 <span className="text-gray-600">المستند:</span>
//                                                 <span className="font-medium text-[#a47d52]">
//                                                     {typeof formData.document === 'string' ? formData.document : formData.document?.name || 'مرفق'}
//                                                 </span>
//                                             </div>
//                                         )}
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Notes */}
//                             {formData.notes && (
//                                 <div className="pt-3 border-t border-[#a47d52]/20">
//                                     <div className="flex gap-2 items-center text-sm">
//                                         <span className="text-gray-600">ملاحظات:</span>
//                                         <span className="font-medium text-[#a47d52]">
//                                             {formData.notes}
//                                         </span>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* ===== SIGNATURES SECTION - EDITABLE ===== */}
//                             <div className="pt-3 border-t-2 border-[#a47d52]/30">
//                                 <div className="flex items-center gap-2 mb-3">
//                                     <FaSignature className="text-[#a47d52] text-sm" />
//                                     <h4 className="text-sm font-bold text-gray-700">التوقيعات</h4>
//                                 </div>
                                
//                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
//                                     {/* User Signature - Editable */}
//                                     <div className="space-y-1">
//                                         <label className="block text-xs font-medium text-gray-600">
//                                             توقيع المستخدم
//                                         </label>
//                                         <input
//                                             ref={userSignatureRef}
//                                             type="text"
//                                             name="user_signature"
//                                             value={formData.user_signature || ''}
//                                             onChange={handleChange}
//                                             className="w-full px-3 py-2 bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-right text-sm"
//                                             style={{
//                                                 borderTopColor: 'transparent',
//                                                 borderBottomColor: 'white',
//                                                 borderLeftColor: 'transparent',
//                                                 borderRightColor: formData.user_signature ? '#a47d52' : '#ef4444',
//                                                 borderWidth: '2px',
//                                                 borderStyle: 'solid',
//                                                 boxShadow: formData.user_signature ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : 'none'
//                                             }}
//                                             placeholder="توقيع المستخدم..."
//                                             disabled={loading}
//                                         />
//                                     </div>

//                                     {/* Manager Signature - Editable */}
//                                     <div className="space-y-1">
//                                         <label className="block text-xs font-medium text-gray-600">
//                                             توقيع المدير
//                                         </label>
//                                         <input
//                                             ref={managerSignatureRef}
//                                             type="text"
//                                             name="manager_signature"
//                                             value={formData.manager_signature || ''}
//                                             onChange={handleChange}
//                                             className="w-full px-3 py-2 bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-right text-sm"
//                                             style={{
//                                                 borderTopColor: 'transparent',
//                                                 borderBottomColor: 'white',
//                                                 borderLeftColor: 'transparent',
//                                                 borderRightColor: formData.manager_signature ? '#a47d52' : '#ef4444',
//                                                 borderWidth: '2px',
//                                                 borderStyle: 'solid',
//                                                 boxShadow: formData.manager_signature ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : 'none'
//                                             }}
//                                             placeholder="توقيع المدير..."
//                                             disabled={loading}
//                                         />
//                                     </div>

//                                     {/* Second Person Signature - Editable */}
//                                     <div className="space-y-1">
//                                         <label className="block text-xs font-medium text-gray-600">
//                                             توقيع الشخص المستلم
//                                         </label>
//                                         <input
//                                             ref={secondPersonSignatureRef}
//                                             type="text"
//                                             name="second_person_signature"
//                                             value={formData.second_person_signature || ''}
//                                             onChange={handleChange}
//                                             className="w-full px-3 py-2 bg-white rounded-sm shadow-sm focus:outline-none transition-all duration-300 text-right text-sm"
//                                             style={{
//                                                 borderTopColor: 'transparent',
//                                                 borderBottomColor: 'white',
//                                                 borderLeftColor: 'transparent',
//                                                 borderRightColor: formData.second_person_signature ? '#a47d52' : '#ef4444',
//                                                 borderWidth: '2px',
//                                                 borderStyle: 'solid',
//                                                 boxShadow: formData.second_person_signature ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : 'none'
//                                             }}
//                                             placeholder="توقيع الشخص المستلم..."
//                                             disabled={loading}
//                                         />
//                                     </div>
//                                 </div>
//                             </div>
//                         </div>
//                     )}

//                     {/* ===== ALL FORM FIELDS - HIDDEN IN EDIT MODE ===== */}
//                     {!isEditMode && (
//                         <>
//                             {/* Currency Selection */}
//                             <div>
//                                 <label className="block text-sm font-semibold text-gray-700 mb-1">
//                                     العملة <span className="text-red-500">*</span>
//                                 </label>
//                                 <select
//                                     ref={currencyRef}
//                                     name="currency"
//                                     value={formData.currency}
//                                     onChange={handleChange}
//                                     // onKeyDown={(e) => handleKeyDown(e, accountToRef)}
//                                      onKeyDown={(e) => handleKeyDown(e, accountFromRef)}
//                                     className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                     style={{
//                                         borderTopColor: 'transparent',
//                                         borderBottomColor: 'white',
//                                         borderLeftColor: 'transparent',
//                                         borderRightColor: formData.currency ? '#a47d52' : '#ef4444',
//                                         borderWidth: '2px',
//                                         borderStyle: 'solid',
//                                         boxShadow: formData.currency ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
//                                     }}
//                                     disabled={loading}
//                                 >
//                                     {currencyOptions.map((option) => (
//                                         <option key={option.value} value={option.value}>
//                                             {option.label} ({option.value})
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>

//                             {/* Payment Method Selection */}
//                             {/* Payment Method Selection */}
//                                                         <div className="space-y-2">
//                                                             <label className="block text-sm font-semibold text-slate-700">
//                                                                 طريقة الدفع <span className="text-red-500">*</span>
//                                                             </label>
                            
//                                                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
//                                                                 <button
//                                                                     type="button"
//                                                                     aria-pressed={paymentMethod === 'banks'}
//                                                                     onClick={() => handlePaymentMethodChange('banks')}
//                                                                     disabled={loading}
//                                                                     className={`group relative w-full min-h-[72px] px-4 py-3 sm:px-5 rounded-xl cursor-pointer border-2 transition-all duration-200 flex items-center justify-center gap-3 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a47d52]/40 ${
//                                                                         paymentMethod === 'banks'
//                                                                             ? 'border-[#a47d52] bg-[#a47d52]/5 shadow-md ring-1 ring-[#a47d52]/10'
//                                                                             : 'border-gray-200 bg-[#f8f7f5] hover:border-[#a47d52]/60 hover:bg-white hover:shadow-md active:scale-[0.99]'
//                                                                     } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
//                                                                     <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
//                                                                         paymentMethod === 'banks' ? 'bg-[#a47d52]/10' : 'bg-gray-100 group-hover:bg-[#a47d52]/10'
//                                                                     }`}>
//                                                                         <FaUniversity className={`text-lg sm:text-xl transition-colors ${
//                                                                             paymentMethod === 'banks' ? 'text-[#a47d52]' : 'text-gray-400 group-hover:text-[#a47d52]'
//                                                                         }`} />
//                                                                     </span>
//                                                                     <span className={`font-semibold text-sm sm:text-base ${
//                                                                         paymentMethod === 'banks' ? 'text-[#a47d52]' : 'text-gray-700'
//                                                                     }`}>
//                                                                         بنوك
//                                                                     </span>
//                                                                     {paymentMethod === 'banks' && (
//                                                                         <span className="mr-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#a47d52] text-white shadow-sm">
//                                                                             <FaCheck className="text-xs" />
//                                                                         </span>
//                                                                     )}
//                                                                 </button>
                            
//                                                                 <button
//                                                                     type="button"
//                                                                     aria-pressed={paymentMethod === 'cash'}
//                                                                     onClick={() => handlePaymentMethodChange('cash')}
//                                                                     disabled={loading}
//                                                                     className={`group relative w-full min-h-[72px] px-4 py-3 sm:px-5 rounded-xl cursor-pointer border-2 transition-all duration-200 flex items-center justify-center gap-3 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a47d52]/40 ${
//                                                                         paymentMethod === 'cash'
//                                                                             ? 'border-[#a47d52] bg-[#a47d52]/5 shadow-md ring-1 ring-[#a47d52]/10'
//                                                                             : 'border-gray-200 bg-[#f8f7f5] hover:border-[#a47d52]/60 hover:bg-white hover:shadow-md active:scale-[0.99]'
//                                                                     } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}>
//                                                                     <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
//                                                                         paymentMethod === 'cash' ? 'bg-[#a47d52]/10' : 'bg-gray-100 group-hover:bg-[#a47d52]/10'
//                                                                     }`}>
//                                                                         <FaMoneyBillWave className={`text-lg sm:text-xl transition-colors ${
//                                                                             paymentMethod === 'cash' ? 'text-[#a47d52]' : 'text-gray-400 group-hover:text-[#a47d52]'
//                                                                         }`} />
//                                                                     </span>
//                                                                     <span className={`font-semibold text-sm sm:text-base ${
//                                                                         paymentMethod === 'cash' ? 'text-[#a47d52]' : 'text-gray-700'
//                                                                     }`}>
//                                                                         نقدي
//                                                                     </span>
//                                                                     {paymentMethod === 'cash' && (
//                                                                         <span className="mr-auto flex h-6 w-6 items-center justify-center rounded-full bg-[#a47d52] text-white shadow-sm">
//                                                                             <FaCheck className="text-xs" />
//                                                                         </span>
//                                                                     )}
//                                                                 </button>
//                                                             </div>
                            
//                                                             {errors.payment_method && (
//                                                                 <p className="text-red-500 text-sm mt-1">{errors.payment_method}</p>
//                                                             )}
//                                                         </div>
                            
//                                                         {/* ===== FIX: Source of Funds (Bank or Cashbox) - First Column ===== */}
//                                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                                             <div className="space-y-1.5">
//                                                                 <label className="block text-sm font-semibold text-slate-700">
//                                                                     من حساب <span className="text-red-500">*</span>
//                                                                 </label>
//                                                                 <select
//                                                                     ref={accountFromRef}
//                                                                     name="account_from"
//                                                                     value={formData.account_from}
//                                                                     onChange={handleChange}
//                                                                     onKeyDown={(e) => handleKeyDown(e, amountRef)}
//                                                                     className="w-full cursor-pointer px-4 py-2.5 bg-white rounded-xl shadow-sm focus:outline-none transition-all duration-200 text-right hover:border-[#a47d52]/60"
//                                                                     style={{
//                                                                         borderTopColor: 'transparent',
//                                                                         borderBottomColor: 'white',
//                                                                         borderLeftColor: 'transparent',
//                                                                         borderRightColor: getFieldBorderColor(isAccountFromFilled, errors.account_from),
//                                                                         borderWidth: '2px',
//                                                                         borderStyle: 'solid',
//                                                                         boxShadow: getFieldShadow(isAccountFromFilled, errors.account_from)
//                                                                     }}
//                                                                     required
//                                                                     disabled={loading}
//                                                                     autoFocus
//                                                                 >
//                                                                     <option value="">اختر الحساب...</option>
//                                                                     {accounts.map((account) => (
//                                                                         <option key={account.id} value={account.id}>
//                                                                             {account.name} {account.category_name ? `- ${account.category_name}` : ''}
//                                                                         </option>
//                                                                     ))}
//                                                                 </select>
//                                                                 {errors.account_from && (
//                                                                     <p className="text-red-500 text-sm mt-1">{errors.account_from}</p>
//                                                                 )}
//                                                             </div>
                            
//                                                             {paymentMethod === 'banks' ? (
//                                                                 <div className="space-y-1.5">
//                                                                     <label className="block text-sm font-semibold text-slate-700">
//                                                                         البنك <span className="text-red-500">*</span>
//                                                                     </label>
//                                                                     <select
//                                                                         name="bank"
//                                                                         value={formData.bank || ''}
//                                                                         onChange={handleChange}
//                                                                         onKeyDown={(e) => handleKeyDown(e, amountRef)}
//                                                                         className="w-full cursor-pointer px-4 py-2.5 bg-white rounded-xl shadow-sm focus:outline-none transition-all duration-200 text-right hover:border-[#a47d52]/60"
//                                                                         style={{
//                                                                             borderTopColor: 'transparent',
//                                                                             borderBottomColor: 'white',
//                                                                             borderLeftColor: 'transparent',
//                                                                             borderRightColor: getFieldBorderColor(!!formData.bank, errors.bank),
//                                                                             borderWidth: '2px',
//                                                                             borderStyle: 'solid',
//                                                                             boxShadow: getFieldShadow(!!formData.bank, errors.bank)
//                                                                         }}
//                                                                         required
//                                                                         disabled={loading}
//                                                                     >
//                                                                         <option value="">اختر البنك...</option>
//                                                                         {banks.map((bank) => (
//                                                                             <option key={bank.id} value={bank.id}>
//                                                                                 {bank.name}
//                                                                             </option>
//                                                                         ))}
//                                                                     </select>
//                                                                     {errors.bank && (
//                                                                         <p className="text-red-500 text-sm mt-1">{errors.bank}</p>
//                                                                     )}
//                                                                 </div>
//                                                             ) : paymentMethod === 'cash' ? (
//                                                                 <div className="space-y-1.5">
//                                                                     <label className="block text-sm font-semibold text-slate-700">
//                                                                         الخزينة النقدية <span className="text-red-500">*</span>
//                                                                     </label>
//                                                                     <select
//                                                                         name="cashbox"
//                                                                         value={formData.cashbox || ''}
//                                                                         onChange={handleChange}
//                                                                         onKeyDown={(e) => handleKeyDown(e, amountRef)}
//                                                                         className="w-full px-4 py-3 bg-white rounded-xl shadow-sm focus:outline-none transition-all duration-200 text-right hover:border-[#a47d52]/60"
//                                                                         style={{
//                                                                             borderTopColor: 'transparent',
//                                                                             borderBottomColor: 'white',
//                                                                             borderLeftColor: 'transparent',
//                                                                             borderRightColor: getFieldBorderColor(!!formData.cashbox, errors.cashbox),
//                                                                             borderWidth: '2px',
//                                                                             borderStyle: 'solid',
//                                                                             boxShadow: getFieldShadow(!!formData.cashbox, errors.cashbox)
//                                                                         }}
//                                                                         required
//                                                                         disabled={loading}
//                                                                     >
//                                                                         <option value="">اختر الخزينة...</option>
//                                                                         {cashboxes.map((cashbox) => (
//                                                                             <option key={cashbox.id} value={cashbox.id}>
//                                                                                 {cashbox.name}
//                                                                             </option>
//                                                                         ))}
//                                                                     </select>
//                                                                     {errors.cashbox && (
//                                                                         <p className="text-red-500 text-sm mt-1">{errors.cashbox}</p>
//                                                                     )}
//                                                                 </div>
//                                                             ) : (
//                                                                 <div className="space-y-1.5">
//                                                                     <label className="block text-sm font-semibold text-slate-700">
//                                                                         الى حساب - البنك / الخزينة <span className="text-red-500">*</span>
//                                                                     </label>
//                                                                     <div className="w-full px-4 py-3 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-slate-500 text-right">
//                                                                         اختر طريقة الدفع أولاً
//                                                                     </div>
//                                                                 </div>
//                                                             )}
//                                                         </div>

//                             {/* Amount with Words Display */}
//                             <div className="space-y-1">
//                                 <label className="block text-sm font-semibold text-gray-700">
//                                     المبلغ <span className="text-red-500">*</span>
//                                 </label>
//                                 <div className="relative">
//                                     <input
//                                         ref={amountRef}
//                                         type="number"
//                                         name="amount"
//                                         value={formData.amount}
//                                         onChange={handleChange}
//                                         onKeyDown={(e) => handleKeyDown(e, statementRef)}
//                                         className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                         style={{
//                                             borderTopColor: 'transparent',
//                                             borderBottomColor: 'white',
//                                             borderLeftColor: 'transparent',
//                                             borderRightColor: getFieldBorderColor(isAmountFilled, errors.amount),
//                                             borderWidth: '2px',
//                                             borderStyle: 'solid',
//                                             boxShadow: getFieldShadow(isAmountFilled, errors.amount)
//                                         }}
//                                         placeholder="أدخل المبلغ..."
//                                         step="0.01"
//                                         min="0.01"
//                                         required
//                                         disabled={loading}
//                                     />
//                                     {getAmountInWords() && (
//                                         <div className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-1 bg-[#a47d52]/10 rounded-l-sm border-r-2 border-[#a47d52] text-[#a47d52] text-sm font-semibold whitespace-nowrap max-w-[200px] truncate">
//                                             {getAmountInWords()}
//                                         </div>
//                                     )}
//                                 </div>
//                                 {errors.amount && (
//                                     <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
//                                 )}
//                                 {getAmountInWords() && (
//                                     <div className="mt-2 p-3 bg-[#a47d52]/5 border border-[#a47d52]/20 rounded-lg text-right">
//                                         <span className="text-sm font-medium text-gray-700">المبلغ كتابةً: </span>
//                                         <span className="text-sm font-bold text-[#a47d52]">{getAmountInWords()}</span>
//                                         <span> </span>
//                                         <span>فقظ لاغير</span>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Date + Statement */}
//                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                                 <div className="space-y-1">
//                                     <label className="block text-sm font-semibold text-gray-700">
//                                         التاريخ <span className="text-red-500">*</span>
//                                     </label>
//                                     <input
//                                         type="date"
//                                         name="transaction_date"
//                                         value={formData.transaction_date}
//                                         onChange={handleChange}
//                                         onKeyDown={(e) => handleKeyDown(e, statementRef)}
//                                         className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                         style={{
//                                             borderTopColor: 'transparent',
//                                             borderBottomColor: 'white',
//                                             borderLeftColor: 'transparent',
//                                             borderRightColor: formData.transaction_date ? '#a47d52' : '#ef4444',
//                                             borderWidth: '2px',
//                                             borderStyle: 'solid',
//                                             boxShadow: formData.transaction_date ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
//                                         }}
//                                         required
//                                         disabled={loading}
//                                     />
//                                 </div>

//                                 <div className="space-y-1">
//                                     <label className="block text-sm font-semibold text-gray-700">
//                                         البيان <span className="text-red-500">*</span>
//                                     </label>
//                                     <input
//                                         ref={statementRef}
//                                         type="text"
//                                         name="statement"
//                                         value={formData.statement}
//                                         onChange={handleChange}
//                                         onKeyDown={(e) => handleKeyDown(e, personReceiptRef)}
//                                         className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                         style={{
//                                             borderTopColor: 'transparent',
//                                             borderBottomColor: 'white',
//                                             borderLeftColor: 'transparent',
//                                             borderRightColor: getFieldBorderColor(isStatementFilled, errors.statement),
//                                             borderWidth: '2px',
//                                             borderStyle: 'solid',
//                                             boxShadow: getFieldShadow(isStatementFilled, errors.statement)
//                                         }}
//                                         placeholder="وصف المعاملة..."
//                                         required
//                                         disabled={loading}
//                                     />
//                                     {errors.statement && (
//                                         <p className="text-red-500 text-sm mt-1">{errors.statement}</p>
//                                     )}
//                                 </div>
//                             </div>

//                             {/* Person Receipt */}
//                             <div className="space-y-1">
//                                 <label className="block text-sm font-semibold text-gray-700">
//                                     الشخص المستلم
//                                 </label>
//                                 <input
//                                     ref={personReceiptRef}
//                                     type="text"
//                                     name="person_receipt"
//                                     value={formData.person_receipt}
//                                     onChange={handleChange}
//                                     onKeyDown={(e) => handleKeyDown(e, personDeliverRef)}
//                                     className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                     style={{
//                                         borderTopColor: 'transparent',
//                                         borderBottomColor: 'white',
//                                         borderLeftColor: 'transparent',
//                                         borderRightColor: getFieldBorderColor(isPersonReceiptFilled, errors.person_receipt),
//                                         borderWidth: '2px',
//                                         borderStyle: 'solid',
//                                         boxShadow: getFieldShadow(isPersonReceiptFilled, errors.person_receipt)
//                                     }}
//                                     placeholder="اسم الشخص المستلم..."
//                                     disabled={loading}
//                                 />
//                             </div>

//                             {/* Person Deliver - hidden */}
//                             <div className="space-y-1 hidden">
//                                 <label className="block text-sm font-semibold text-gray-700">
//                                     الشخص المسلم
//                                 </label>
//                                 <input
//                                     ref={personDeliverRef}
//                                     type="text"
//                                     name="person_deliver"
//                                     value={formData.person_deliver}
//                                     onChange={handleChange}
//                                     onKeyDown={(e) => handleKeyDown(e, notesRef)}
//                                     className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                     style={{
//                                         borderTopColor: 'transparent',
//                                         borderBottomColor: 'white',
//                                         borderLeftColor: 'transparent',
//                                         borderRightColor: formData.person_deliver ? '#a47d52' : '#ef4444',
//                                         borderWidth: '2px',
//                                         borderStyle: 'solid',
//                                         boxShadow: formData.person_deliver ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
//                                     }}
//                                     placeholder="اسم الشخص المسلم..."
//                                     disabled={loading}
//                                 />
//                             </div>

//                             {/* Check Section */}
//                             <div className="space-y-3 pt-2 border-t border-gray-200">
//                                 <div className="flex items-center gap-3">
//                                     <input
//                                         type="checkbox"
//                                         name="has_check"
//                                         checked={formData.has_check}
//                                         onChange={handleChange}
//                                         className="w-5 h-5 rounded border-gray-300 text-[#a47d52] focus:ring-[#a47d52]"
//                                     />
//                                     <label className="text-sm font-semibold text-gray-700">
//                                         يوجد شيك ؟
//                                     </label>
//                                 </div>

//                                 {formData.has_check && (
//                                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pr-6 border-r-2 border-[#a47d52]/30 pl-2">
//                                         <div className="space-y-1">
//                                             <label className="block text-sm font-medium text-gray-600">
//                                                 رقم الشيك
//                                             </label>
//                                             <input
//                                                 ref={checkNoRef}
//                                                 type="text"
//                                                 name="check_no"
//                                                 value={formData.check_no}
//                                                 onChange={handleChange}
//                                                 onKeyDown={(e) => handleKeyDown(e, checkBankRef)}
//                                                 className="w-full px-4 py-2 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                                 style={{
//                                                     borderTopColor: 'transparent',
//                                                     borderBottomColor: 'white',
//                                                     borderLeftColor: 'transparent',
//                                                     borderRightColor: formData.check_no ? '#a47d52' : '#ef4444',
//                                                     borderWidth: '2px',
//                                                     borderStyle: 'solid',
//                                                     boxShadow: formData.check_no ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
//                                                 }}
//                                                 placeholder="رقم الشيك..."
//                                                 disabled={loading}
//                                             />
//                                         </div>
//                                         <div className="space-y-1">
//                                             <label className="block text-sm font-medium text-gray-600">
//                                                 بنك الشيك
//                                             </label>
//                                             <select
//                                                 name="check_bank"
//                                                 value={formData.check_bank}
//                                                 onChange={handleChange}
//                                                 onKeyDown={(e) => handleKeyDown(e, checkDateRef)}
//                                                 className="w-full cursor-pointer px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                                 style={{
//                                                     borderTopColor: 'transparent',
//                                                     borderBottomColor: 'white',
//                                                     borderLeftColor: 'transparent',
//                                                     borderRightColor: getFieldBorderColor(!!formData.check_bank, errors.check_bank),
//                                                     borderWidth: '2px',
//                                                     borderStyle: 'solid',
//                                                     boxShadow: getFieldShadow(!!formData.check_bank, errors.check_bank)
//                                                 }}
//                                                 disabled={loading}
//                                             >
//                                                 <option value="">اختر البنك...</option>
//                                                 {banks.map((bank) => (
//                                                     <option key={bank.id} value={bank.id}>
//                                                         {bank.name}
//                                                     </option>
//                                                 ))}
//                                             </select>
//                                             {errors.check_bank && (
//                                                 <p className="text-red-500 text-sm mt-1">{errors.check_bank}</p>
//                                             )}
//                                         </div>
//                                         <div className="space-y-1">
//                                             <label className="block text-sm font-medium text-gray-600">
//                                                 تاريخ الشيك
//                                             </label>
//                                             <input
//                                                 ref={checkDateRef}
//                                                 type="date"
//                                                 name="check_date"
//                                                 value={formData.check_date}
//                                                 onChange={handleChange}
//                                                 className="w-full px-4 py-2 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                                 style={{
//                                                     borderTopColor: 'transparent',
//                                                     borderBottomColor: 'white',
//                                                     borderLeftColor: 'transparent',
//                                                     borderRightColor: formData.check_date ? '#a47d52' : '#ef4444',
//                                                     borderWidth: '2px',
//                                                     borderStyle: 'solid',
//                                                     boxShadow: formData.check_date ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
//                                                 }}
//                                                 disabled={loading}
//                                             />
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Document Section */}
//                             <div className="space-y-3 pt-2 border-t border-gray-200">
//                                 <div className="flex items-center gap-3">
//                                     <input
//                                         type="checkbox"
//                                         name="has_document"
//                                         checked={formData.has_document}
//                                         onChange={handleChange}
//                                         className="w-5 h-5 rounded border-gray-300 text-[#a47d52] focus:ring-[#a47d52]"
//                                     />
//                                     <label className="text-sm font-semibold text-gray-700">
//                                         يوجد مستند ؟
//                                     </label>
//                                 </div>

//                                 {formData.has_document && (
//                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-6 border-r-2 border-[#a47d52]/30 pl-2">
//                                         <div className="space-y-1">
//                                             <label className="block text-sm font-medium text-gray-600">
//                                                 رقم المستند
//                                             </label>
//                                             <input
//                                                 ref={documentNoRef}
//                                                 type="text"
//                                                 name="document_no"
//                                                 value={formData.document_no}
//                                                 onChange={handleChange}
//                                                 onKeyDown={(e) => handleKeyDown(e, notesRef)}
//                                                 className="w-full px-4 py-2 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right"
//                                                 style={{
//                                                     borderTopColor: 'transparent',
//                                                     borderBottomColor: 'white',
//                                                     borderLeftColor: 'transparent',
//                                                     borderRightColor: formData.document_no ? '#a47d52' : '#ef4444',
//                                                     borderWidth: '2px',
//                                                     borderStyle: 'solid',
//                                                     boxShadow: formData.document_no ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
//                                                 }}
//                                                 placeholder="رقم المستند..."
//                                                 disabled={loading}
//                                             />
//                                         </div>
//                                         <div className="space-y-1">
//                                             <label className="block text-sm font-medium text-gray-600">
//                                                 تحميل المستند
//                                             </label>
//                                             <div className="relative">
//                                                 <input
//                                                     type="file"
//                                                     name="document"
//                                                     onChange={handleChange}
//                                                     accept=".pdf,.jpg,.jpeg,.png"
//                                                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
//                                                     disabled={loading}
//                                                 />
//                                                 <div className="w-full px-4 py-2 bg-white rounded-sm shadow-lg flex items-center justify-between text-right"
//                                                     style={{
//                                                         borderTopColor: 'transparent',
//                                                         borderBottomColor: 'white',
//                                                         borderLeftColor: 'transparent',
//                                                         borderRightColor: formData.document ? '#a47d52' : '#ef4444',
//                                                         borderWidth: '2px',
//                                                         borderStyle: 'solid',
//                                                         boxShadow: formData.document ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
//                                                     }}
//                                                 >
//                                                     <span className={`text-sm ${formData.document ? 'text-[#a47d52]' : 'text-red-400'}`}>
//                                                         {formData.document ? formData.document.name : 'اختر ملف...'}
//                                                     </span>
//                                                     <FaUpload className={`${formData.document ? 'text-[#a47d52]' : 'text-red-400'}`} />
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>

//                             {/* Notes */}
//                             <div className="space-y-1">
//                                 <label className="block text-sm font-semibold text-gray-700">
//                                     ملاحظات
//                                 </label>
//                                 <textarea
//                                     ref={notesRef}
//                                     name="notes"
//                                     value={formData.notes}
//                                     onChange={handleChange}
//                                     rows="2"
//                                     className="w-full px-4 py-3 bg-white rounded-sm shadow-lg focus:outline-none transition-all duration-300 text-right resize-none"
//                                     style={{
//                                         borderTopColor: 'transparent',
//                                         borderBottomColor: 'white',
//                                         borderLeftColor: 'transparent',
//                                         borderRightColor: formData.notes ? '#a47d52' : '#ef4444',
//                                         borderWidth: '2px',
//                                         borderStyle: 'solid',
//                                         boxShadow: formData.notes ? '0 0 0 3px rgba(164, 125, 82, 0.12)' : '0 0 0 3px rgba(239, 68, 68, 0.08)'
//                                     }}
//                                     placeholder="ملاحظات إضافية..."
//                                     disabled={loading}
//                                 />
//                             </div>
//                         </>
//                     )}

//                     {/* Buttons */}
//                     <div className="flex gap-3 pt-4 border-t border-gray-200">
//                         {isEditMode ? (
//                             // In edit mode, show Update Signatures and Close buttons
//                             <>
//                                 <button
//                                     type="submit"
//                                     disabled={loading}
//                                     className={`cursor-pointer flex-1 bg-[#a47d52] text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] active:scale-95 ${
//                                         loading ? 'opacity-70 cursor-not-allowed' : ''
//                                     }`}
//                                 >
//                                     {loading ? (
//                                         <span className="flex items-center justify-center gap-2">
//                                             <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
//                                             جاري الحفظ...
//                                         </span>
//                                     ) : (
//                                         <span className="flex items-center justify-center gap-2">
//                                             <FaSave />
//                                             تحديث التوقيعات
//                                         </span>
//                                     )}
//                                 </button>
//                                 <button
//                                     type="button"
//                                     onClick={handleClose}
//                                     className="cursor-pointer px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-all duration-200"
//                                     disabled={loading}
//                                 >
//                                     إلغاء
//                                 </button>
//                             </>
//                         ) : (
//                             // In add mode, show Save and Cancel buttons
//                             <>
//                                 <button
//                                     type="submit"
//                                     disabled={loading}
//                                     className={`cursor-pointer flex-1 bg-[#a47d52] text-white px-6 py-3 rounded-lg font-bold transition-all duration-300 hover:bg-[#8a6a44] hover:scale-[1.02] active:scale-95 ${
//                                         loading ? 'opacity-70 cursor-not-allowed' : ''
//                                     }`}
//                                 >
//                                     {loading ? (
//                                         <span className="flex items-center justify-center gap-2">
//                                             <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
//                                             جاري الحفظ...
//                                         </span>
//                                     ) : (
//                                         <span className="flex items-center justify-center gap-2">
//                                             <FaSave /> 
//                                             حفظ
//                                         </span>
//                                     )}
//                                 </button>
//                                 <button
//                                     type="button"
//                                     onClick={handleClose}
//                                     className="cursor-pointer px-6 py-3 rounded-lg border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-all duration-200"
//                                     disabled={loading}
//                                 >
//                                     إلغاء
//                                 </button>
//                             </>
//                         )}
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// export default AddWithdraw;
