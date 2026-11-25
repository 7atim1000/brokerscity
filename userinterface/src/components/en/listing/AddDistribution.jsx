import React, { useState, useRef } from "react";
import toast from "react-hot-toast";
import {
    FaFileExcel,
    FaCloudUploadAlt,
    FaDownload,
    FaTimes,
    FaTrash,
    FaCheckCircle,
    FaExclamationTriangle,
} from "react-icons/fa";

const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

// ✅ Same theme color as AddOwnersArchive
const THEME_COLOR = "#a47d52";
const THEME_HOVER = "#172554";

// Safety net only — the optimized backend imports thousands of rows in a few seconds
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

const AddDistribution = ({ onClose, onSuccess }) => {
    // =========================================================
    // STATE
    // =========================================================
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [result, setResult] = useState(null);

    const fileInputRef = useRef(null);

    // =========================================================
    // HANDLERS
    // =========================================================
    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        validateAndSetFile(selectedFile);
    };

    const validateAndSetFile = (selectedFile) => {
        if (!selectedFile) return;

        const validTypes = [".xlsx", ".xls", ".csv"];
        const fileExtension = selectedFile.name
            .substring(selectedFile.name.lastIndexOf("."))
            .toLowerCase();

        if (!validTypes.includes(fileExtension)) {
            toast.error("Invalid file format. Please upload .xlsx, .xls, or .csv");
            return;
        }

        setFile(selectedFile);
        setResult(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        validateAndSetFile(droppedFile);
    };

    const removeFile = () => {
        setFile(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const downloadTemplate = () => {
        // ✅ Headers match the ArchiveProperty model fields
        const headers =
            "owner_type,name,company,phone,property_type,property_category,property_offer,plot_size,sale_price,rent_price,municipality,zone,sector,road_name,land_no,plot_no,plot_address,description,remarks,listing_source\n";
        const sampleRow =
            "individual,John Doe,Acme LLC,+971501234567,Residential,Villa,Sale,500.00,1500000.00,0.00,Dubai,Marina,Marina Walk,Marina Road,123,45,Plot 45 - Marina Walk,Beautiful 5BR villa,Prime location,Website\n";
        const csvContent = "data:text/csv;charset=utf-8," + headers + sampleRow;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "Archive_Properties_Template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        if (!file) {
            toast.error("Please select a file to upload");
            return;
        }

        setLoading(true);
        setResult(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                toast.error("Please login to continue");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            // ✅ Correct endpoint for archive properties
            const response = await fetch(`${BASE}/api/archive-properties/bulk-create/`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
                signal: controller.signal,
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    data?.error || data?.detail || `Server responded with status ${response.status}`
                );
            }
            if (!data) {
                throw new Error("Invalid response received from the server");
            }

            setResult(data);

            const { success_count = 0, error_count = 0 } = data;

            if (success_count > 0 && error_count === 0) {
                toast.success(`✅ ${success_count} properties imported successfully!`);
            } else if (success_count > 0) {
                toast.success(
                    `Imported ${success_count}, failed ${error_count}. See the report below.`,
                    { icon: "⚠️" }
                );
            } else if (error_count > 0) {
                toast.error("Import failed. Please check the error report below.");
            } else {
                toast.error("No importable rows were found in the file.");
            }

            if (success_count > 0 && onSuccess) onSuccess();
        } catch (error) {
            if (error.name === "AbortError") {
                toast.error(
                    "The server is taking longer than expected. The import may still be running — check the properties list before uploading again.",
                    { duration: 8000 }
                );
            } else {
                console.error("Upload error:", error);
                toast.error(error.message || "An error occurred during upload");
            }
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    const reportErrors = result?.errors || [];
    const hiddenErrors = result
        ? Math.max((result.error_count || 0) - reportErrors.length, 0)
        : 0;

    // =========================================================
    // MAIN RENDER
    // =========================================================
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6"
            dir="ltr"
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden animate-fadeIn">
                {/* HEADER */}
                <div className="relative flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-white sticky top-0 z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0"
                            style={{
                                backgroundColor: `${THEME_COLOR}10`,
                                borderColor: `${THEME_COLOR}30`,
                            }}
                        >
                            <FaFileExcel size={18} style={{ color: THEME_COLOR }} />
                        </div>
                        <h3 className="text-lg font-extrabold text-gray-800 whitespace-nowrap">
                            Bulk Import Archive Properties
                        </h3>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* FORM BODY */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#f8f7f5]/30">
                        {/* INSTRUCTIONS & TEMPLATE */}
                        <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <h4 className="text-sm font-bold text-gray-800 mb-2">Instructions</h4>
                            <ul className="text-xs text-gray-600 list-disc pl-5 mb-3 space-y-1">
                                <li>Upload an Excel (.xlsx, .xls) or CSV (.csv) file.</li>
                                <li>
                                    Individual owners (default) require a <strong>phone</strong>.
                                </li>
                                <li>
                                    Owners with <strong>owner_type = company</strong> require a{" "}
                                    <strong>company</strong> name.
                                </li>
                                <li>
                                    Optional columns:{" "}
                                    <em>
                                        name, property_type, property_category, property_offer,
                                        plot_size, sale_price, rent_price, municipality, zone,
                                        sector, road_name, land_no, plot_no, plot_address,
                                        description, remarks, listing_source
                                    </em>
                                    .
                                </li>
                                <li>Completely empty rows are skipped automatically.</li>
                                <li>
                                    <strong>Duplicates are allowed</strong>. Records will be inserted
                                    even if the phone or name already exists in the database.
                                </li>
                                <li>
                                    A name that is just <em>0</em>, <em>-</em> or <em>N/A</em> is
                                    ignored (treated as empty).
                                </li>
                            </ul>
                            <button
                                type="button"
                                onClick={downloadTemplate}
                                className="text-xs font-bold flex items-center gap-1 hover:underline"
                                style={{ color: THEME_COLOR }}
                            >
                                <FaDownload /> Download Sample Template
                            </button>
                        </div>

                        {/* UPLOAD ZONE */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`relative flex flex-col items-center justify-center w-full h-56 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer
                                ${isDragging ? "bg-blue-50/50 scale-[1.02]" : "bg-white hover:bg-gray-50"}
                                ${loading ? "opacity-60 pointer-events-none" : ""}
                            `}
                            style={{
                                borderColor: isDragging ? THEME_COLOR : "#d1d5db",
                                boxShadow: isDragging ? `0 0 0 4px ${THEME_COLOR}20` : "none",
                            }}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                            />

                            {file ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div
                                        className="w-16 h-16 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: `${THEME_COLOR}15` }}
                                    >
                                        <FaFileExcel size={28} style={{ color: THEME_COLOR }} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-gray-800">{file.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile();
                                        }}
                                        className="mt-2 text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors"
                                    >
                                        <FaTrash size={10} /> Remove File
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3 pointer-events-none">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                                        <FaCloudUploadAlt size={32} className="text-gray-400" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-gray-700">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            XLSX, XLS, or CSV (max. 10MB)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* PROGRESS HINT */}
                        {loading && (
                            <div
                                className="mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-xs font-semibold animate-fadeIn"
                                style={{
                                    backgroundColor: `${THEME_COLOR}08`,
                                    borderColor: `${THEME_COLOR}30`,
                                    color: THEME_COLOR,
                                }}
                            >
                                <div
                                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin shrink-0"
                                    style={{
                                        borderColor: THEME_COLOR,
                                        borderTopColor: "transparent",
                                    }}
                                ></div>
                                Importing properties… large files can take a little while. Please keep
                                this window open.
                            </div>
                        )}

                        {/* RESULTS DISPLAY */}
                        {result && (
                            <div className="mt-6 border rounded-xl overflow-hidden animate-fadeIn">
                                <div className="p-4 bg-gray-50 border-b flex flex-wrap justify-between items-center gap-2">
                                    <h4 className="text-sm font-bold text-gray-800">
                                        Import Report
                                        {typeof result.total_rows === "number" && (
                                            <span className="ml-2 text-xs font-semibold text-gray-400">
                                                ({result.total_rows} rows in file)
                                            </span>
                                        )}
                                    </h4>
                                    <div className="flex flex-wrap gap-4 text-xs font-bold">
                                        <span className="text-green-600 flex items-center gap-1">
                                            <FaCheckCircle /> {result.success_count} Imported
                                        </span>
                                        <span className="text-red-500 flex items-center gap-1">
                                            <FaExclamationTriangle /> {result.error_count} Failed
                                        </span>
                                        {result.skipped_count > 0 && (
                                            <span className="text-gray-500">
                                                {result.skipped_count} Empty rows skipped
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {result.error_summary?.length > 0 && (
                                    <div className="px-4 py-3 bg-red-50/60 border-b text-xs text-gray-700">
                                        <p className="font-bold text-red-600 mb-1">
                                            Most common reasons
                                        </p>
                                        <ul className="space-y-1">
                                            {result.error_summary.map((item, i) => (
                                                <li key={i} className="break-words">
                                                    <span className="font-bold">{item.count}×</span>{" "}
                                                    {item.error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {reportErrors.length > 0 && (
                                    <>
                                        <div className="max-h-52 overflow-y-auto custom-scrollbar bg-white">
                                            <table className="w-full text-left border-collapse">
                                                <thead className="bg-[#f8f7f5] sticky top-0 text-xs text-gray-600 border-b">
                                                    <tr>
                                                        <th className="px-4 py-2 font-bold w-20">Row</th>
                                                        <th className="px-4 py-2 font-bold w-40">
                                                            Owner
                                                        </th>
                                                        <th className="px-4 py-2 font-bold">
                                                            Error Description
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-xs">
                                                    {reportErrors.map((err, idx) => (
                                                        <tr
                                                            key={idx}
                                                            className="border-b last:border-0 hover:bg-red-50/30"
                                                        >
                                                            <td className="px-4 py-2 text-red-600 font-bold">
                                                                #{err.row}
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-700 font-semibold break-words">
                                                                {err.owner || "—"}
                                                            </td>
                                                            <td className="px-4 py-2 text-gray-700">
                                                                {err.error}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {hiddenErrors > 0 && (
                                            <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t">
                                                Showing the first {reportErrors.length} errors —{" "}
                                                {hiddenErrors} more not shown. Fix these and re-upload
                                                the failed rows.
                                            </div>
                                        )}
                                    </>
                                )}

                                {result.error_count === 0 && result.success_count > 0 && (
                                    <div className="p-6 text-center text-sm text-green-600 font-bold bg-green-50">
                                        <FaCheckCircle className="mx-auto text-2xl mb-2" />
                                        Perfect! All records were imported without errors.
                                    </div>
                                )}

                                {result.error_count === 0 && result.success_count === 0 && (
                                    <div className="p-6 text-center text-sm text-amber-700 font-bold bg-amber-50">
                                        <FaExclamationTriangle className="mx-auto text-2xl mb-2" />
                                        No importable rows were found. Check that the file has a
                                        header row and data.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-6 py-2.5 rounded-sm border border-gray-300 text-gray-700 font-bold hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            {result ? "Close" : "Cancel"}
                        </button>

                        <button
                            type="submit"
                            disabled={loading || !file}
                            className="flex items-center gap-2 px-8 py-2.5 rounded-sm text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor:
                                    loading || !file ? `${THEME_COLOR}80` : THEME_COLOR,
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && file)
                                    e.currentTarget.style.backgroundColor = THEME_HOVER;
                            }}
                            onMouseLeave={(e) => {
                                if (!loading && file)
                                    e.currentTarget.style.backgroundColor = THEME_COLOR;
                            }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <FaCloudUploadAlt />
                            )}
                            {loading ? "Processing..." : "Start Import"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDistribution;