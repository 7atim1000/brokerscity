import React, { useState } from "react";
import toast from "react-hot-toast";
import { FaSave } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

const AdminCreatePage = () => {
    const navigate = useNavigate();
    const [config, setConfig] = useState({
        title: "ALAIN العين",
        address: "Saadiyat Beach, Abu Dhabi",
        description: "Learn more by providing your info below.",
        show_budget_field: true,
        show_bedrooms_field: true,
    });
    
    // ✅ ADDED: State to store the uploaded file
    const [heroImageFile, setHeroImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setConfig({ ...config, [e.target.name]: value });
    };

    // ✅ ADDED: Handle file selection from PC
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setHeroImageFile(file);
            setImagePreview(URL.createObjectURL(file)); // Creates a local preview link
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("access_token");
            
            // ✅ ADDED: Use FormData instead of JSON
            const formData = new FormData();
            formData.append("title", config.title);
            formData.append("address", config.address);
            formData.append("description", config.description);
            formData.append("show_budget_field", config.show_budget_field);
            formData.append("show_bedrooms_field", config.show_bedrooms_field);
            
            if (heroImageFile) {
                formData.append("hero_image", heroImageFile);
            }

            const res = await fetch(`${BASE}/api/landing-configs/create/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                    // 🛑 DO NOT set Content-Type here! The browser sets it automatically for FormData.
                },
                body: formData, 
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Configuration Saved!");
                navigate(`/ad-preview/${data.id}`); 
            } else {
                toast.error("Failed to save.");
            }
        } catch (err) {
            toast.error("Network error.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Create Ad Landing Page</h2>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-bold mb-1">Page Title</label>
                    <input type="text" name="title" value={config.title} onChange={handleChange} className="w-full border rounded p-2" />
                </div>

                {/* ✅ CHANGED: File Upload Input */}
                <div>
                    <label className="block text-sm font-bold mb-1">Upload Hero Image (From PC)</label>
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange} 
                        className="w-full border rounded p-2 bg-gray-50" 
                    />
                    
                    {/* ✅ ADDED: Show local preview before saving */}
                    {imagePreview && (
                        <img src={imagePreview} alt="Preview" className="mt-3 h-40 object-cover rounded border" />
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold mb-1">Address / Location</label>
                    <input type="text" name="address" value={config.address} onChange={handleChange} className="w-full border rounded p-2" />
                </div>

                <div className="flex gap-4 items-center">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="show_budget_field" checked={config.show_budget_field} onChange={handleChange} />
                        Show Budget Question
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" name="show_bedrooms_field" checked={config.show_bedrooms_field} onChange={handleChange} />
                        Show Bedrooms Question
                    </label>
                </div>

                <button onClick={handleSave} disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded mt-4 hover:bg-blue-700 flex items-center justify-center gap-2">
                    <FaSave /> {loading ? "Uploading & Saving..." : "Save & Preview"}
                </button>
            </div>
        </div>
    );
};
    
export default AdminCreatePage;