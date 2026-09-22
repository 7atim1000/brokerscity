import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MdClose, MdCloudUpload } from 'react-icons/md';

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// 🔽 Change the max size here (in MB)
const MAX_IMAGE_MB = 10;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;

const EditSlider = ({ slider, onClose, onSuccess }) => {
    const [description, setDescription] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (slider) {
            setDescription(slider.description || '');
            setImagePreview(slider.image || null);
        }
    }, [slider]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('يرجى اختيار ملف صورة صالح');
            return;
        }

        if (file.size > MAX_IMAGE_BYTES) {
            toast.error(`حجم الصورة يجب أن يكون أقل من ${MAX_IMAGE_MB} ميجابايت`);
            return;
        }

        setImage(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!description.trim()) {
            toast.error('يرجى إدخال وصف السلايدر');
            return;
        }

        setSubmitting(true);

        try {
            const token = localStorage.getItem('access_token');
            if (!token) {
                toast.error('يرجى تسجيل الدخول أولاً');
                setSubmitting(false);
                return;
            }

            const formData = new FormData();
            formData.append('description', description.trim());
            if (image) {
                formData.append('image', image);
            }

            const response = await fetch(`${BASE}/api/sliders/${slider.id}/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                if (response.status === 401) {
                    toast.error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى');
                } else if (response.status === 404) {
                    toast.error('السلايدر غير موجود');
                } else {
                    const errData = await response.json().catch(() => ({}));
                    console.error('Server error:', errData);
                    toast.error('فشل تحديث السلايدر');
                }
                setSubmitting(false);
                return;
            }

            const data = await response.json();
            toast.success('✅ تم تحديث السلايدر بنجاح!');
            onSuccess?.(data);
            onClose?.();
        } catch (err) {
            console.error('Error updating slider:', err);
            toast.error('خطأ في الاتصال بالخادم');
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 rtl"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-extrabold text-gray-800">
                        تعديل السلايدر
                    </h2>
                    <button
                        onClick={onClose}
                        className="cursor-pointer p-2 rounded-full hover:bg-[#f8f7f5] transition-colors"
                        title="إغلاق"
                    >
                        <MdClose className="text-gray-500 text-2xl" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Description */}
                    <div>
                        <label className="block text-sm font-extrabold text-gray-700 mb-2">
                            وصف السلايدر <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="مثال: بانر الصفحة الرئيسية"
                            maxLength={100}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#a47d52] focus:ring-2 focus:ring-[#a47d52]/20 outline-none transition-all text-gray-800"
                            disabled={submitting}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-left">
                            {description.length}/100
                        </p>
                    </div>

                    {/* Image upload */}
                    <div>
                        <label className="block text-sm font-extrabold text-gray-700 mb-2">
                            صورة السلايدر
                        </label>

                        <label
                            htmlFor="edit-slider-image"
                            className="cursor-pointer block w-full aspect-video rounded-xl border-2 border-dashed border-[#e6cba8] hover:border-[#a47d52] bg-[#f8f7f5] hover:bg-[#f2ddc2]/30 transition-all overflow-hidden relative group"
                        >
                            {imagePreview ? (
                                <>
                                    <img
                                        src={imagePreview}
                                        alt="preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-extrabold text-sm">
                                            تغيير الصورة
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-4">
                                    <MdCloudUpload className="text-[#a47d52] text-5xl" />
                                    <p className="text-gray-600 font-extrabold text-sm">
                                        اضغط لاختيار صورة
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                        PNG, JPG, WEBP — بحد أقصى {MAX_IMAGE_MB} ميجابايت
                                    </p>
                                </div>
                            )}
                        </label>

                        <p className="text-xs text-gray-400 mt-2">
                            اتركها بدون تغيير للإبقاء على الصورة الحالية
                        </p>

                        <input
                            id="edit-slider-image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            disabled={submitting}
                            dir="ltr"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-extrabold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex-1 cursor-pointer bg-[#a47d52] hover:bg-[#8a6a44] text-white py-3 px-4 rounded-xl font-extrabold text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    جاري التحديث...
                                </>
                            ) : (
                                'حفظ التعديلات'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSlider;