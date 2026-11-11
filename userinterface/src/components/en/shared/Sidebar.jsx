import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";

// ✅ IMPORTANT: Adjust this import path to point to your English assets file
// If you are sharing the same assets file, keep it as is.
import { SidebarMenuLinks } from "../../../assets/assets"; 

import { MdExpandCircleDown } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { SiGmail } from "react-icons/si";

// ✅ IMPORTANT: Adjust this import path to your PermissionsContext
import { usePermissions } from "../../../pages/context/PermissionsContext";

// ✅ English paths for the bottom pinned section
const BOTTOM_PATHS = ["/en/whatsapp", "/email", "/en/crm", "/en/website"];

function Sidebar({ onHoverChange }) {
    const [expandedItems, setExpandedItems] = useState({});
    const [isHovered, setIsHovered] = useState(false);
    const location = useLocation();
    const sidebarRef = useRef(null);

    const { permissions, loading: permissionsLoading } = usePermissions();

    // const hasPermission = (permissionKey) => {
    //     if (!permissionKey) return true;
    //     return permissions?.[permissionKey] === true;
    // };

    // Updated to be can read and handle arrays. on assets.js
        const hasPermission = (permissionKey) => {
        if (!permissionKey) return true;

        // ✅ NEW: Check if permissionKey is an array
        if (Array.isArray(permissionKey)) {
            // Returns true if the user has AT LEAST ONE of the permissions in the array
            return permissionKey.some((key) => permissions?.[key] === true);
        }

        // Standard single string check
        return permissions?.[permissionKey] === true;
    }; 

    const toggleSubMenu = (index) => {
        setExpandedItems((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const [isDesktop, setIsDesktop] = useState(
        typeof window !== "undefined" ? window.innerWidth >= 768 : true
    );

    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        onHoverChange?.(isDesktop && isHovered);
    }, [isDesktop, isHovered, onHoverChange]);

    const isExpanded = isDesktop && isHovered;

    // ✅ English translations mapping
    const getEnglishName = (name) => {
        const translations = {
            "CRM": "CRM",
            "PM Listing": "PM Listing",
            "PRO": "PRO",
            "الرئيسية": "Dashboard",
            "ادارة المستخدمين": "User Management",
            "شؤون الموظفين": "HR / Attendance",
            "إدارة العقارات": "Property Management",
            "الشئون المالية": "Financials",
            "قسم المراقبة": "Monitoring",
            "الموقع اللاكتروني": "Website",
            "WhatsApp": "WhatsApp",
            "Email": "Email",
            "جميع الليدز": "All Leads",
            "الليدز الخاصة بي": "My Leads",
            "إدارة الصلاحيات": "Permissions Management",
            "ادارة الملاك": "Owner Management",
            "ادارة الوحدات": "Unit Management",
            "المستأجرين": "Tenants",
            "إدارةالعقود": "Contracts",
            "إدارة التحصيل": "Collections",
            "الصيانة": "Maintenance",
            "الحركه اليوميه": "Daily Transactions",
            "إدارة تعريف الحسابات": "Account Definitions",
            "إدارة البنوك": "Bank Management",
            "الخزينه النقديه": "Cash",
            "اداره الملاك": "Owners",
            "اداره العقارات": "Listing",
        };
        return translations[name] || name;
    };

    const linksWithPermissionState = SidebarMenuLinks.map((item) => {
        const parentDisabled =
            permissionsLoading || !hasPermission(item.permission);

        const subItemsWithState = item.subItems
            ? item.subItems.map((sub) => ({
                  ...sub,
                  name: getEnglishName(sub.name), // Translate sub-items
                  disabled:
                      parentDisabled ||
                      permissionsLoading ||
                      !hasPermission(sub.permission),
              }))
            : undefined;

        // Update paths for English routing (replace /ar/ with /en/)
        const englishPath = item.path.replace("/ar/", "/en/").replace("/ar-", "/en/");

        return {
            ...item,
            name: getEnglishName(item.name), // Translate main items
            path: englishPath, // Use the English path
            disabled: parentDisabled,
            subItems: subItemsWithState,
        };
    });

    const mainLinks = linksWithPermissionState.filter(
        (item) => !BOTTOM_PATHS.includes(item.path)
    );

    const bottomLinks = linksWithPermissionState.filter((item) =>
        BOTTOM_PATHS.includes(item.path)
    );

    const getCustomColors = (itemName) => {
        switch (itemName) {
            case "CRM":
                return { icon: "text-blue-500", text: "text-blue-500", hoverBg: "hover:bg-blue-50" };
            case "PM Listing":
                return { icon: "text-green-500", text: "text-green-500", hoverBg: "hover:bg-green-50" };
            case "PRO":
                return { icon: "text-red-600", text: "text-red-600", hoverBg: "hover:bg-red-50" };
            default:
                return { icon: "text-[#a47d52]", text: "text-[#a47d52]", hoverBg: "hover:bg-white/60" };
        }
    };

    return (
        <aside
            ref={sidebarRef}
            dir="ltr" // ✅ English is LTR
            onMouseEnter={() => isDesktop && setIsHovered(true)}
            onMouseLeave={() => isDesktop && setIsHovered(false)}
            className={`
                fixed left-0 top-5 h-screen border-r border-[#8a6a44]/40 /* ✅ left-0 and border-r */
                shadow-[0_0_25px_rgba(0,0,0,0.5)] z-50 overflow-hidden
                transition-all duration-300 ease-in-out flex flex-col
                bg-gradient-to-b from-[#a47d52]/10 via-[#a47d52]/10 to-[#f8f7f5]/90
                ${isExpanded ? "w-64" : "w-16 sm:w-64 md:w-16"}
            `}
            style={{
                width: isDesktop ? (isHovered ? "16rem" : "4rem") : undefined,
                pointerEvents: "auto",
            }}
        >
            {permissionsLoading && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#a47d52]/20 overflow-hidden z-10">
                    <div className="h-full w-1/2 bg-[#a47d52] animate-[slideBar_1.2s_ease-in-out_infinite]" />
                </div>
            )}

            <nav
                className="flex-1 p-2 sm:p-1 pt-15 sm:pt-15 overflow-y-auto overflow-x-hidden"
                style={{ pointerEvents: "auto" }}
            >
                <ul className="space-y-1 ">
                    {mainLinks.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = !item.disabled && location.pathname === item.path;
                        const isExpandedItem = !item.disabled && (expandedItems[index] ?? item.isExpanded ?? false);
                        
                        const colors = getCustomColors(item.name);
                        const finalIconColor = isExpandedItem ? "text-[#B9A58A]" : (item.disabled ? "text-[#a47d52]" : colors.icon);
                        const finalTextColor = isExpandedItem ? "text-[#B9A58A]" : (item.disabled ? "text-[#a47d52]" : colors.text);

                        return (
                            <li key={index}>
                                {item.subItems ? (
                                    <button
                                        type="button"
                                        onClick={() => !item.disabled && toggleSubMenu(index)}
                                        disabled={item.disabled}
                                        aria-disabled={item.disabled}
                                        title={item.disabled ? "No Permission" : item.name}
                                        className={`
                                            border-b-3 border-[#a47d59] flex items-center
                                            ${isExpanded ? "justify-between w-full px-3 py-2.5 rounded-xl" : "justify-center w-10 h-10 mx-auto rounded-full p-0"}
                                            transition-all duration-300 ease-in-out font-black
                                            ${isExpanded ? "text-sm sm:text-base" : "text-xs"}
                                            ${item.disabled ? "cursor-not-allowed opacity-50 grayscale" : "cursor-pointer"}
                                            group pointer-events-auto touch-manipulation
                                            ${isExpandedItem
                                                ? "bg-[#f8f7f5] shadow-lg shadow-[#a47d52]/40"
                                                : item.disabled
                                                ? "bg-[#f8f7f5] shadow-sm"
                                                : `bg-[#f8f7f5] shadow-sm hover:shadow-md ${colors.hoverBg}`
                                            }
                                        `}
                                        style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                                    >
                                        <div className={`flex items-center ${isExpanded ? "gap-2" : "gap-0"} justify-center pointer-events-none`} style={{ pointerEvents: "none" }}>
                                            <Icon
                                                size={isExpanded ? 20 : 18}
                                                strokeWidth={2.5}
                                                className={`${finalIconColor} drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-300 shrink-0 pointer-events-none`}
                                                style={{ pointerEvents: "none" }}
                                            />
                                            <span className={`font-black ${finalTextColor} tracking-wide whitespace-nowrap transition-all duration-300 ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"} pointer-events-none`} style={{ pointerEvents: "none" }}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className={`transition-all duration-300 ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"} pointer-events-none`} style={{ pointerEvents: "none" }}>
                                            <MdExpandCircleDown
                                                size={22}
                                                className={`${finalIconColor} transition-transform duration-300 ${isExpandedItem ? "rotate-180" : "rotate-0"} pointer-events-none`}
                                                style={{ pointerEvents: "none" }}
                                            />
                                        </span>
                                    </button>
                                ) : (
                                    <>
                                        {item.disabled ? (
                                            <div
                                                title="No Permission"
                                                aria-disabled="true"
                                                className={`
                                                    border-b-3 border-[#a47d59] flex items-center
                                                    ${isExpanded ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base" : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"}
                                                    transition-all duration-300 ease-in-out font-black cursor-not-allowed opacity-50 grayscale
                                                    bg-[#f8f7f5] text-[#a47d52] shadow-sm select-none
                                                `}
                                            >
                                                <Icon size={isExpanded ? 20 : 18} strokeWidth={1.1} className="text-[#a47d52] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-300 shrink-0 pointer-events-none" />
                                                <span className={`font-black tracking-wide whitespace-nowrap transition-all duration-300 text-[#a47d52] ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <Link
                                                to={item.path}
                                                className={`
                                                    border-b-3 border-[#a47d59] flex items-center
                                                    ${isExpanded ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base" : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"}
                                                    transition-all duration-300 ease-in-out font-black group
                                                    ${isActive
                                                        ? "bg-[#f8f7f5] text-[#B9A58A] shadow-lg shadow-[#a47d52]/40"
                                                        : `bg-[#f8f7f5] shadow-sm hover:shadow-md ${colors.hoverBg}`
                                                    }
                                                `}
                                                style={{ pointerEvents: "auto" }}
                                            >
                                                <Icon
                                                    size={isExpanded ? 20 : 18}
                                                    strokeWidth={1.1}
                                                    className={`${isActive ? "text-[#B9A58A]" : colors.icon} drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-300 shrink-0 pointer-events-none`}
                                                />
                                                <span className={`font-black tracking-wide whitespace-nowrap transition-all duration-300 ${isActive ? "text-[#B9A58A]" : colors.text} ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}>
                                                    {item.name}
                                                </span>
                                            </Link>
                                        )}
                                    </>
                                )}

                                {item.subItems && isExpandedItem && (
                                    <ul className="mt-1 ml-1 space-y-1 border-l-2 border-[#d4a574]/40 pl-2 bg-[#f8f7f5] rounded-r-xl py-1 animate-[fadeIn_0.2s_ease-in] pointer-events-auto" style={{ pointerEvents: "auto" }}>
                                        {item.subItems.map((subItem, subIndex) => {
                                            const SubIcon = subItem.icon;
                                            // Update sub-item path for English
                                            const englishSubPath = subItem.path.replace("/ar/", "/en/").replace("/ar-", "/en/");
                                            const isSubActive = !subItem.disabled && location.pathname === englishSubPath;

                                            return (
                                                <li key={subIndex}>
                                                    {subItem.disabled ? (
                                                        <div title="No Permission" aria-disabled="true" className="flex items-center justify-start gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-black cursor-not-allowed opacity-50 grayscale bg-[#f8f7f5] text-[#a47d52] select-none">
                                                            <SubIcon size={16} strokeWidth={2.5} className="text-[#a47d52] drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] shrink-0 pointer-events-none" />
                                                            <span className="font-black tracking-wide whitespace-nowrap text-[#a47d52]">{subItem.name}</span>
                                                        </div>
                                                    ) : (
                                                        <Link
                                                            to={englishSubPath}
                                                            onClick={() => { if (!isDesktop) setExpandedItems({ [index]: true }); }}
                                                            className={`
                                                                flex items-center justify-start gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm
                                                                transition-all duration-200 font-black pointer-events-auto touch-manipulation
                                                                ${isSubActive ? "bg-[#f8f7f5] text-[#B9A58A] shadow-md" : "bg-[#f8f7f5] text-[#a47d52] hover:bg-white/60 hover:shadow-sm"}
                                                            `}
                                                            style={{ pointerEvents: "auto", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                                                        >
                                                            <SubIcon size={16} strokeWidth={2.5} className={`${isSubActive ? "text-[#B9A58A]" : "text-[#a47d52]"} drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-colors duration-200 shrink-0 pointer-events-none`} />
                                                            <span className={`font-black tracking-wide whitespace-nowrap ${isSubActive ? "text-[#B9A58A]" : "text-[#a47d52]"} pointer-events-none`}>{subItem.name}</span>
                                                        </Link>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}

                                {index === 2 && (
                                    <hr className="my-3 border-t-2 border-gray-300/50 mx-2" />
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-2 space-y-1 pb-15 shrink-0" style={{ pointerEvents: "auto" }}>
                {bottomLinks.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = !item.disabled && location.pathname === item.path;

                    const isWhatsApp = item.path.includes("whatsapp");
                    const isCrm = item.path.includes("crm");
                    const isWebsite = item.path.includes("website");

                    const iconColor = isWhatsApp ? "text-[#25D366]" : isCrm ? "text-[#1D9BF0]" : isWebsite ? "text-[#4285F4]" : "text-[#EA4335]";
                    const labelColor = isWhatsApp ? "text-[#128C7E]" : isCrm ? "text-[#1D9BF0]" : isWebsite ? "text-[#4285F4]" : "text-[#EA4335]";

                    return (
                        <div key={index}>
                            {item.disabled ? (
                                <div title="No Permission" aria-disabled="true" className={`border-b-3 border-white flex items-center bg-[#f8f7f5] ${isExpanded ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base" : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"} font-black cursor-not-allowed opacity-50 grayscale shadow-sm select-none`}>
                                    <Icon size={isExpanded ? 20 : 18} strokeWidth={1.1} className="shrink-0 text-[#a47d52] pointer-events-none" />
                                    <span className={`font-black tracking-wide whitespace-nowrap transition-all duration-300 text-[#a47d52] ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}>{item.name}</span>
                                </div>
                            ) : (
                                <Link to={item.path} className={`border-b-3 border-white flex items-center bg-[#f8f7f5] ${isExpanded ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base" : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"} transition-all duration-300 ease-in-out font-black group hover:bg-white/90 shadow-sm hover:shadow-md`} style={{ pointerEvents: "auto" }}>
                                    <Icon size={isExpanded ? 20 : 18} strokeWidth={1.1} className={`shrink-0 transition-all duration-300 ${iconColor} pointer-events-none`} />
                                    <span className={`font-black tracking-wide whitespace-nowrap transition-all duration-300 ${labelColor} ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}>{item.name}</span>
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes slideBar {
                    0%   { transform: translateX(-100%); }
                    50%  { transform: translateX(100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </aside>
    );
}

export default Sidebar;