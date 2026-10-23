// User logs in
//     ↓
// <PermissionsProvider> fetches GET /api/permissions/me/
//     ↓
// permissions = { ListWorkLog: true, financials: false, ... }
//     ↓
// <Sidebar> filters SidebarMenuLinks
//     ↓
// Only renders items where permissions[link.permission] === true
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { SidebarMenuLinks } from "../../../assets/assets";

import { MdExpandCircleDown } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";
import { SiGmail } from "react-icons/si";

// ✅ Permission hook
import { usePermissions } from "../../../pages/context/PermissionsContext";

// ✅ Single source of truth for bottom-pinned links
const BOTTOM_PATHS = ["/ar-whatsapp", "/email", "/crm", "/ar-website"];

function Sidebar({ onHoverChange }) {
    const [expandedItems, setExpandedItems] = useState({});
    const [isHovered, setIsHovered] = useState(false);
    const location = useLocation();
    const sidebarRef = useRef(null);

    const { permissions, loading: permissionsLoading } = usePermissions();

    // ✅ Safe permission check. Returns true when:
    //    - no key required  → always enabled
    //    - key required     → enabled only if permissions[key] === true
    const hasPermission = (permissionKey) => {
        if (!permissionKey) return true;
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

    // ✅ Build the full menu with `disabled` flags.
    //    NEVER filter items out — always render every link/icon.
    //
    //    While permissions are still loading (`permissionsLoading === true`),
    //    everything that requires a permission key is marked disabled.
    //    Items with no `permission` key stay enabled (e.g. dashboard).
    const linksWithPermissionState = SidebarMenuLinks.map((item) => {
        const parentDisabled =
            permissionsLoading || !hasPermission(item.permission);

        const subItemsWithState = item.subItems
            ? item.subItems.map((sub) => ({
                  ...sub,
                  disabled:
                      parentDisabled ||
                      permissionsLoading ||
                      !hasPermission(sub.permission),
              }))
            : undefined;

        return {
            ...item,
            disabled: parentDisabled,
            subItems: subItemsWithState,
        };
    });

    // ✅ Split into main / bottom using shared constant
    const mainLinks = linksWithPermissionState.filter(
        (item) => !BOTTOM_PATHS.includes(item.path)
    );

    const bottomLinks = linksWithPermissionState.filter((item) =>
        BOTTOM_PATHS.includes(item.path)
    );

    // ❌ REMOVED: the early `if (permissionsLoading) return <skeleton />` block.
    //    That was hiding the entire sidebar. Icons must always show.

    return (
        <aside
            ref={sidebarRef}
            dir="rtl"
            onMouseEnter={() => isDesktop && setIsHovered(true)}
            onMouseLeave={() => isDesktop && setIsHovered(false)}
            className={`
                fixed
                right-0
                top-5
                h-screen
                border-l
                border-[#8a6a44]/40
                shadow-[0_0_25px_rgba(0,0,0,0.5)]
                z-50
                overflow-hidden
                transition-all
                duration-300
                ease-in-out
                flex
                flex-col
                bg-gradient-to-b from-[#a47d52]/10 via-[#a47d52]/10 to-[#f8f7f5]/90
                ${isExpanded ? "w-64" : "w-16 sm:w-64 md:w-16"}
            `}
            style={{
                width: isDesktop ? (isHovered ? "16rem" : "4rem") : undefined,
                pointerEvents: "auto",
            }}
        >
            {/* Optional subtle "loading" indicator bar instead of full skeleton */}
            {permissionsLoading && (
                <div className="absolute top-0 right-0 left-0 h-0.5 bg-[#a47d52]/20 overflow-hidden z-10">
                    <div className="h-full w-1/2 bg-[#a47d52] animate-[slideBar_1.2s_ease-in-out_infinite]" />
                </div>
            )}

            {/* Scrollable nav area */}
            <nav
                className="flex-1 p-2 sm:p-1 pt-15 sm:pt-15 overflow-y-auto overflow-x-hidden"
                style={{ pointerEvents: "auto" }}
            >
                <ul className="space-y-1 ">
                    {mainLinks.map((item, index) => {
                        const Icon = item.icon;
                        const isActive =
                            !item.disabled && location.pathname === item.path;
                        const isExpandedItem =
                            !item.disabled &&
                            (expandedItems[index] ?? item.isExpanded ?? false);

                        return (
                            <li key={index}>
                                {item.subItems ? (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            !item.disabled && toggleSubMenu(index)
                                        }
                                        disabled={item.disabled}
                                        aria-disabled={item.disabled}
                                        title={
                                            item.disabled
                                                ? "ليس لديك صلاحية"
                                                : item.name
                                        }
                                        className={`
                                            border-b-3 border-[#a47d59]
                                            flex items-center
                                            ${
                                                isExpanded
                                                    ? "justify-between w-full px-3 py-2.5 rounded-xl"
                                                    : "justify-center w-10 h-10 mx-auto rounded-full p-0"
                                            }
                                            transition-all
                                            duration-300
                                            ease-in-out
                                            font-black
                                            ${
                                                isExpanded
                                                    ? "text-sm sm:text-base"
                                                    : "text-xs"
                                            }
                                            ${
                                                item.disabled
                                                    ? "cursor-not-allowed opacity-50 grayscale"
                                                    : "cursor-pointer"
                                            }
                                            group
                                            pointer-events-auto
                                            touch-manipulation
                                            ${
                                                isExpandedItem
                                                    ? "bg-[#f8f7f5] text-[#B9A58A] shadow-lg shadow-[#a47d52]/40"
                                                    : item.disabled
                                                    ? "bg-[#f8f7f5] text-[#a47d52] shadow-sm"
                                                    : "bg-[#f8f7f5] text-[#a47d52] hover:bg-white/60 shadow-sm hover:shadow-md"
                                            }
                                        `}
                                        style={{
                                            pointerEvents: "auto",
                                            touchAction: "manipulation",
                                            WebkitTapHighlightColor:
                                                "transparent",
                                        }}
                                    >
                                        <div
                                            className={`flex items-center ${
                                                isExpanded ? "gap-2" : "gap-0"
                                            } justify-center pointer-events-none`}
                                            style={{ pointerEvents: "none" }}
                                        >
                                            <Icon
                                                size={isExpanded ? 20 : 18}
                                                strokeWidth={2.5}
                                                className={`
                                                    ${
                                                        isExpandedItem
                                                            ? "text-[#B9A58A]"
                                                            : "text-[#a47d52]"
                                                    }
                                                    drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]
                                                    transition-all
                                                    duration-300
                                                    shrink-0
                                                    pointer-events-none
                                                `}
                                                style={{
                                                    pointerEvents: "none",
                                                }}
                                            />
                                            <span
                                                className={`
                                                    font-black
                                                    ${
                                                        isExpandedItem
                                                            ? "text-[#B9A58A]"
                                                            : "text-[#a47d52]"
                                                    }
                                                    tracking-wide
                                                    whitespace-nowrap
                                                    transition-all
                                                    duration-300
                                                    ${
                                                        isExpanded
                                                            ? "opacity-100 w-auto"
                                                            : "opacity-0 w-0 overflow-hidden"
                                                    }
                                                    pointer-events-none
                                                `}
                                                style={{
                                                    pointerEvents: "none",
                                                }}
                                            >
                                                {item.name}
                                            </span>
                                        </div>
                                        <span
                                            className={`
                                                transition-all
                                                duration-300
                                                ${
                                                    isExpanded
                                                        ? "opacity-100"
                                                        : "opacity-0 w-0 overflow-hidden"
                                                }
                                                pointer-events-none
                                            `}
                                            style={{ pointerEvents: "none" }}
                                        >
                                            <MdExpandCircleDown
                                                size={22}
                                                className={`
                                                    ${
                                                        isExpandedItem
                                                            ? "text-[#B9A58A]"
                                                            : "text-[#a47d52]"
                                                    }
                                                    transition-transform
                                                    duration-300
                                                    ${
                                                        isExpandedItem
                                                            ? "rotate-180"
                                                            : "rotate-0"
                                                    }
                                                    pointer-events-none
                                                `}
                                                style={{
                                                    pointerEvents: "none",
                                                }}
                                            />
                                        </span>
                                    </button>
                                ) : (
                                    <>
                                        {item.disabled ? (
                                            // ✅ Disabled link (visible but not clickable)
                                            <div
                                                title="ليس لديك صلاحية"
                                                aria-disabled="true"
                                                className={`
                                                    border-b-3 border-[#a47d59]
                                                    flex items-center
                                                    ${
                                                        isExpanded
                                                            ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base"
                                                            : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"
                                                    }
                                                    transition-all
                                                    duration-300
                                                    ease-in-out
                                                    font-black
                                                    cursor-not-allowed
                                                    opacity-50
                                                    grayscale
                                                    bg-[#f8f7f5]
                                                    text-[#a47d52]
                                                    shadow-sm
                                                    select-none
                                                `}
                                            >
                                                <Icon
                                                    size={isExpanded ? 20 : 18}
                                                    strokeWidth={1.1}
                                                    className="
                                                        text-[#a47d52]
                                                        drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]
                                                        transition-all
                                                        duration-300
                                                        shrink-0
                                                        pointer-events-none
                                                    "
                                                />
                                                <span
                                                    className={`
                                                        font-black
                                                        tracking-wide
                                                        whitespace-nowrap
                                                        transition-all
                                                        duration-300
                                                        text-[#a47d52]
                                                        ${
                                                            isExpanded
                                                                ? "opacity-100 w-auto"
                                                                : "opacity-0 w-0 overflow-hidden"
                                                        }
                                                    `}
                                                >
                                                    {item.name}
                                                </span>
                                            </div>
                                        ) : (
                                            <Link
                                                to={item.path}
                                                className={`
                                                    border-b-3 border-[#a47d59]
                                                    flex items-center
                                                    ${
                                                        isExpanded
                                                            ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base"
                                                            : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"
                                                    }
                                                    transition-all
                                                    duration-300
                                                    ease-in-out
                                                    font-black
                                                    group
                                                    ${
                                                        isActive
                                                            ? "bg-[#f8f7f5] text-[#B9A58A] shadow-lg shadow-[#a47d52]/40"
                                                            : "bg-[#f8f7f5] text-[#a47d52] hover:bg-white/60 shadow-sm hover:shadow-md"
                                                    }
                                                `}
                                                style={{
                                                    pointerEvents: "auto",
                                                }}
                                            >
                                                <Icon
                                                    size={isExpanded ? 20 : 18}
                                                    strokeWidth={1.1}
                                                    className={`
                                                        ${
                                                            isActive
                                                                ? "text-[#B9A58A]"
                                                                : "text-[#a47d52]"
                                                        }
                                                        drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]
                                                        transition-all
                                                        duration-300
                                                        shrink-0
                                                        pointer-events-none
                                                    `}
                                                />
                                                <span
                                                    className={`
                                                        font-black
                                                        tracking-wide
                                                        whitespace-nowrap
                                                        transition-all
                                                        duration-300
                                                        ${
                                                            isActive
                                                                ? "text-[#B9A58A]"
                                                                : "text-[#a47d52]"
                                                        }
                                                        ${
                                                            isExpanded
                                                                ? "opacity-100 w-auto"
                                                                : "opacity-0 w-0 overflow-hidden"
                                                        }
                                                    `}
                                                >
                                                    {item.name}
                                                </span>
                                            </Link>
                                        )}
                                    </>
                                )}

                                {item.subItems && isExpandedItem && (
                                    <ul
                                        className="
                                            mt-1 mr-1 space-y-1
                                            border-r-2 border-[#d4a574]/40
                                            pr-2
                                            bg-[#f8f7f5]
                                            rounded-l-xl
                                            py-1
                                            animate-[fadeIn_0.2s_ease-in]
                                            pointer-events-auto
                                        "
                                        style={{ pointerEvents: "auto" }}
                                    >
                                        {item.subItems.map(
                                            (subItem, subIndex) => {
                                                const SubIcon = subItem.icon;
                                                const isSubActive =
                                                    !subItem.disabled &&
                                                    location.pathname ===
                                                        subItem.path;

                                                return (
                                                    <li key={subIndex}>
                                                        {subItem.disabled ? (
                                                            <div
                                                                title="ليس لديك صلاحية"
                                                                aria-disabled="true"
                                                                className="
                                                                    flex items-center
                                                                    justify-start
                                                                    gap-2
                                                                    px-3
                                                                    py-2
                                                                    rounded-lg
                                                                    text-xs sm:text-sm
                                                                    font-black
                                                                    cursor-not-allowed
                                                                    opacity-50
                                                                    grayscale
                                                                    bg-[#f8f7f5]
                                                                    text-[#a47d52]
                                                                    select-none
                                                                "
                                                            >
                                                                <SubIcon
                                                                    size={16}
                                                                    strokeWidth={
                                                                        2.5
                                                                    }
                                                                    className="
                                                                        text-[#a47d52]
                                                                        drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]
                                                                        shrink-0
                                                                        pointer-events-none
                                                                    "
                                                                />
                                                                <span className="font-black tracking-wide whitespace-nowrap text-[#a47d52]">
                                                                    {
                                                                        subItem.name
                                                                    }
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Link
                                                                to={subItem.path}
                                                                onClick={() => {
                                                                    if (
                                                                        !isDesktop
                                                                    ) {
                                                                        setExpandedItems(
                                                                            {
                                                                                [index]: true,
                                                                            }
                                                                        );
                                                                    }
                                                                }}
                                                                className={`
                                                                    flex items-center
                                                                    justify-start
                                                                    gap-2
                                                                    px-3
                                                                    py-2
                                                                    rounded-lg
                                                                    text-xs sm:text-sm
                                                                    transition-all
                                                                    duration-200
                                                                    font-black
                                                                    pointer-events-auto
                                                                    touch-manipulation
                                                                    ${
                                                                        isSubActive
                                                                            ? "bg-[#f8f7f5] text-[#B9A58A] shadow-md"
                                                                            : "bg-[#f8f7f5] text-[#a47d52] hover:bg-white/60 hover:shadow-sm"
                                                                    }
                                                                `}
                                                                style={{
                                                                    pointerEvents:
                                                                        "auto",
                                                                    touchAction:
                                                                        "manipulation",
                                                                    WebkitTapHighlightColor:
                                                                        "transparent",
                                                                }}
                                                            >
                                                                <SubIcon
                                                                    size={16}
                                                                    strokeWidth={
                                                                        2.5
                                                                    }
                                                                    className={`
                                                                        ${
                                                                            isSubActive
                                                                                ? "text-[#B9A58A]"
                                                                                : "text-[#a47d52]"
                                                                        }
                                                                        drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]
                                                                        transition-colors
                                                                        duration-200
                                                                        shrink-0
                                                                        pointer-events-none
                                                                    `}
                                                                    style={{
                                                                        pointerEvents:
                                                                            "none",
                                                                    }}
                                                                />
                                                                <span
                                                                    className={`
                                                                        font-black
                                                                        tracking-wide
                                                                        whitespace-nowrap
                                                                        ${
                                                                            isSubActive
                                                                                ? "text-[#B9A58A]"
                                                                                : "text-[#a47d52]"
                                                                        }
                                                                        pointer-events-none
                                                                    `}
                                                                    style={{
                                                                        pointerEvents:
                                                                            "none",
                                                                    }}
                                                                >
                                                                    {
                                                                        subItem.name
                                                                    }
                                                                </span>
                                                            </Link>
                                                        )}
                                                    </li>
                                                );
                                            }
                                        )}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Bottom pinned section: WhatsApp + Email + CRM + Website */}
            <div
                className="p-2 space-y-1 pb-15 shrink-0"
                style={{ pointerEvents: "auto" }}
            >
                {bottomLinks.map((item, index) => {
                    const Icon = item.icon;
                    const isActive =
                        !item.disabled && location.pathname === item.path;

                    // ✅ FIXED: use the real path "/ar-website"
                    const isWhatsApp = item.path === "/ar-whatsapp";
                    const isCrm = item.path === "/crm";
                    const isWebsite = item.path === "/ar-website";

                    const iconColor = isWhatsApp
                        ? "text-[#25D366]"
                        : isCrm
                        ? "text-[#1D9BF0]"
                        : isWebsite
                        ? "text-[#4285F4]"
                        : "text-[#EA4335]";

                    const labelColor = isWhatsApp
                        ? "text-[#128C7E]"
                        : isCrm
                        ? "text-[#1D9BF0]"
                        : isWebsite
                        ? "text-[#4285F4]"
                        : "text-[#EA4335]";

                    return (
                        // ✅ FIXED: proper React.Fragment key to silence warning
                        <div key={index}>
                            {item.disabled ? (
                                // ✅ Disabled bottom link (visible, grayed)
                                <div
                                    title="ليس لديك صلاحية"
                                    aria-disabled="true"
                                    className={`
                                        border-b-3 border-white
                                        flex items-center
                                        bg-[#f8f7f5]
                                        ${
                                            isExpanded
                                                ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base"
                                                : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"
                                        }
                                        font-black
                                        cursor-not-allowed
                                        opacity-50
                                        grayscale
                                        shadow-sm
                                        select-none
                                    `}
                                >
                                    <Icon
                                        size={isExpanded ? 20 : 18}
                                        strokeWidth={1.1}
                                        className="
                                            shrink-0
                                            text-[#a47d52]
                                            pointer-events-none
                                        "
                                    />
                                    <span
                                        className={`
                                            font-black
                                            tracking-wide
                                            whitespace-nowrap
                                            transition-all
                                            duration-300
                                            text-[#a47d52]
                                            ${
                                                isExpanded
                                                    ? "opacity-100 w-auto"
                                                    : "opacity-0 w-0 overflow-hidden"
                                            }
                                        `}
                                    >
                                        {item.name}
                                    </span>
                                </div>
                            ) : (
                                <Link
                                    to={item.path}
                                    className={`
                                        border-b-3 border-white
                                        flex items-center
                                        bg-[#f8f7f5]
                                        ${
                                            isExpanded
                                                ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base"
                                                : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"
                                        }
                                        transition-all
                                        duration-300
                                        ease-in-out
                                        font-black
                                        group
                                        hover:bg-white/90
                                        shadow-sm
                                        hover:shadow-md
                                    `}
                                    style={{ pointerEvents: "auto" }}
                                >
                                    <Icon
                                        size={isExpanded ? 20 : 18}
                                        strokeWidth={1.1}
                                        className={`
                                            shrink-0
                                            transition-all
                                            duration-300
                                            ${iconColor}
                                            pointer-events-none
                                        `}
                                    />
                                    <span
                                        className={`
                                            font-black
                                            tracking-wide
                                            whitespace-nowrap
                                            transition-all
                                            duration-300
                                            ${labelColor}
                                            ${
                                                isExpanded
                                                    ? "opacity-100 w-auto"
                                                    : "opacity-0 w-0 overflow-hidden"
                                            }
                                        `}
                                    >
                                        {item.name}
                                    </span>
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Extra keyframes for the loading bar (safe to keep local) */}
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

// import { useState, useEffect, useRef } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { SidebarMenuLinks } from "../../../assets/assets";

// import { MdExpandCircleDown } from "react-icons/md";
// import { FaWhatsapp } from "react-icons/fa";
// import { SiGmail } from "react-icons/si";

// function Sidebar({ onHoverChange }) {
//     const [expandedItems, setExpandedItems] = useState({});
//     const [isHovered, setIsHovered] = useState(false);
//     const location = useLocation();
//     const sidebarRef = useRef(null);

//     const toggleSubMenu = (index) => {
//         setExpandedItems((prev) => ({
//             ...prev,
//             [index]: !prev[index],
//         }));
//     };

//     const [isDesktop, setIsDesktop] = useState(
//         typeof window !== "undefined" ? window.innerWidth >= 768 : true
//     );

//     useEffect(() => {
//         const handleResize = () => {
//             setIsDesktop(window.innerWidth >= 768);
//         };
//         window.addEventListener("resize", handleResize);
//         return () => window.removeEventListener("resize", handleResize);
//     }, []);

//     useEffect(() => {
//         onHoverChange?.(isDesktop && isHovered);
//     }, [isDesktop, isHovered, onHoverChange]);

//     const isExpanded = isDesktop && isHovered;

//     const mainLinks = SidebarMenuLinks.filter(
//         (item) =>
//             item.path !== "/ar-whatsapp" &&
//             item.path !== "/email" &&
//             item.path !== "/crm" &&
//             item.path !== "/ar-website"
//     );
//     const bottomLinks = SidebarMenuLinks.filter(
//         (item) =>
//             item.path === "/ar-whatsapp" ||
//             item.path === "/email" ||
//             item.path === "/crm" ||
//             item.path === "/ar-website"
//     );

//     return (
//         <aside
//             ref={sidebarRef}
//             dir="rtl"
//             onMouseEnter={() => isDesktop && setIsHovered(true)}
//             onMouseLeave={() => isDesktop && setIsHovered(false)}
//             className={`
//                 fixed
//                 right-0
//                 top-5
//                 h-screen
//                 border-l
//                 border-[#8a6a44]/40
//                 shadow-[0_0_25px_rgba(0,0,0,0.5)]
//                 z-50
//                 overflow-hidden
//                 transition-all
//                 duration-300
//                 ease-in-out
//                 flex
//                 flex-col
//                 bg-gradient-to-b from-[#a47d52]/10 via-[#a47d52]/10 to-[#f8f7f5]/90 
//                 ${isExpanded ? "w-64" : "w-16 sm:w-64 md:w-16"} 
//             `}
//             style={{
//                 width: isDesktop ? (isHovered ? "16rem" : "4rem") : undefined,
//                 pointerEvents: "auto",
//             }}
//         >
//             {/* Scrollable nav area */}
//             <nav
//                 className="flex-1 p-2 sm:p-1 pt-15 sm:pt-15 overflow-y-auto overflow-x-hidden"
//                 style={{ pointerEvents: "auto" }}
//             >
//                 <ul className="space-y-1 ">
//                     {mainLinks.map((item, index) => {
//                         const Icon = item.icon;
//                         const isActive = location.pathname === item.path;
//                         const isExpandedItem =
//                             expandedItems[index] ?? item.isExpanded ?? false;

//                         return (
//                             <li key={index}>
//                                 {item.subItems ? (
                                    
//                                     <button
//     type="button"
//     onClick={() => toggleSubMenu(index)}
//     className={`
//         border-b-3 border-[#a47d59]
//         flex items-center 
//         ${isExpanded ? "justify-between w-full px-3 py-2.5 rounded-xl" : "justify-center w-10 h-10 mx-auto rounded-full p-0"}
//         transition-all
//         duration-300
//         ease-in-out
//         font-black
//         ${isExpanded ? "text-sm sm:text-base" : "text-xs"}
//         cursor-pointer
//         group
//         pointer-events-auto
//         touch-manipulation
//         ${
//             isExpandedItem
//                 ? "bg-[#f8f7f5] text-[#B9A58A] shadow-lg shadow-[#a47d52]/40"
//                 : "bg-[#f8f7f5] text-[#a47d52] hover:bg-white/60 shadow-sm hover:shadow-md"
//         }
//     `}
//     style={{
//         pointerEvents: "auto",
//         touchAction: "manipulation",
//         WebkitTapHighlightColor: "transparent"
//     }}
// >
//     <div
//         className={`flex items-center ${isExpanded ? "gap-2" : "gap-0"} justify-center pointer-events-none`}
//         style={{ pointerEvents: "none" }}
//     >
//         <Icon
//             size={isExpanded ? 20 : 18}
//             strokeWidth={2.5}
//             className={`
//                 ${isExpandedItem ? "text-[#B9A58A]" : "text-[#a47d52]"}
//                 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]
//                 transition-all
//                 duration-300
//                 shrink-0
//                 pointer-events-none
//             `}
//             style={{ pointerEvents: "none" }}
//         />
//         <span
//             className={`
//                 font-black
//                 ${isExpandedItem ? "text-[#B9A58A]" : "text-[#a47d52]"}
//                 tracking-wide
//                 whitespace-nowrap
//                 transition-all
//                 duration-300
//                 ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}
//                 pointer-events-none
//             `}
//             style={{ pointerEvents: "none" }}
//         >
//             {item.name}
//         </span>
//     </div>
//     <span
//         className={`
//             transition-all
//             duration-300
//             ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}
//             pointer-events-none
//         `}
//         style={{ pointerEvents: "none" }}
//     >
//         <MdExpandCircleDown
//             size={22}
//             className={`
//                 ${isExpandedItem ? "text-[#B9A58A]" : "text-[#a47d52]"}
//                 transition-transform
//                 duration-300
//                 ${
//                     isExpandedItem
//                         ? "rotate-180"
//                         : "rotate-0"
//                 }
//                 pointer-events-none
//             `}
//             style={{ pointerEvents: "none" }}
//         />
//     </span>
// </button>



//                                 ) : (
//                                     <Link
//                                         to={item.path}
//                                         className={`
//                                             border-b-3 border-[#a47d59]
//                                             flex items-center
//                                             ${isExpanded ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base" : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"}
//                                             transition-all
//                                             duration-300
//                                             ease-in-out
//                                             font-black
//                                             group
//                                             ${
//                                                 isActive
//                                                     ? "bg-[#f8f7f5] text-[#B9A58A] shadow-lg shadow-[#a47d52]/40"
//                                                     : "bg-[#f8f7f5] text-[#a47d52] hover:bg-white/60 shadow-sm hover:shadow-md"
//                                             }
//                                         `}
//                                         style={{ pointerEvents: "auto" }}
//                                     >
//                                         <Icon
//                                             size={isExpanded ? 20 : 18}
//                                             strokeWidth={1.1}
//                                             className={`
//                                                 ${isActive ? "text-[#B9A58A]" : "text-[#a47d52]"}
//                                                 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]
//                                                 transition-all
//                                                 duration-300
//                                                 shrink-0
//                                                 pointer-events-none
//                                             `}
//                                         />
//                                         <span
//                                             className={`
//                                                 font-black
//                                                 tracking-wide
//                                                 whitespace-nowrap
//                                                 transition-all
//                                                 duration-300
//                                                 ${isActive ? "text-[#B9A58A]" : "text-[#a47d52]"}
//                                                 ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}
//                                             `}
//                                         >
//                                             {item.name}
//                                         </span>
//                                     </Link>
//                                 )}

                                
                                
//                                 {item.subItems && isExpandedItem && (
//     <ul
//         className="
//             mt-1 mr-1 space-y-1
//             border-r-2 border-[#d4a574]/40
//             pr-2
//             bg-[#f8f7f5]
//             rounded-l-xl
//             py-1
//             animate-[fadeIn_0.2s_ease-in]
//             pointer-events-auto
//         "
//         style={{ pointerEvents: "auto" }}
//     >
//         {item.subItems.map((subItem, subIndex) => {
//             const SubIcon = subItem.icon;
//             const isSubActive =
//                 location.pathname === subItem.path;
//             return (
//                 <li key={subIndex}>
//                     <Link
//                         to={subItem.path}
//                         onClick={() => {
//                             // Close other expanded menus on mobile so only one is open
//                             if (!isDesktop) {
//                                 setExpandedItems({ [index]: true });
//                             }
//                         }}
//                         className={`
//                             flex items-center
//                             justify-start
//                             gap-2
//                             px-3
//                             py-2
//                             rounded-lg
//                             text-xs sm:text-sm
//                             transition-all
//                             duration-200
//                             font-black
//                             pointer-events-auto
//                             touch-manipulation
//                             ${
//                                 isSubActive
//                                     ? "bg-[#f8f7f5] text-[#B9A58A] shadow-md"
//                                     : "bg-[#f8f7f5] text-[#a47d52] hover:bg-white/60 hover:shadow-sm"
//                             }
//                         `}
//                         style={{
//                             pointerEvents: "auto",
//                             touchAction: "manipulation",
//                             WebkitTapHighlightColor: "transparent"
//                         }}
//                     >
//                         <SubIcon
//                             size={16}
//                             strokeWidth={2.5}
//                             className={`
//                                 ${isSubActive ? "text-[#B9A58A]" : "text-[#a47d52]"}
//                                 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]
//                                 transition-colors
//                                 duration-200
//                                 shrink-0
//                                 pointer-events-none
//                             `}
//                             style={{ pointerEvents: "none" }}
//                         />
//                         <span
//                             className={`
//                                 font-black
//                                 tracking-wide
//                                 whitespace-nowrap
//                                 ${isSubActive ? "text-[#B9A58A]" : "text-[#a47d52]"}
//                                 pointer-events-none
//                             `}
//                             style={{ pointerEvents: "none" }}
//                         >
//                             {subItem.name}
//                         </span>
//                     </Link>
//                 </li>
//             );
//         })}
//     </ul>
// )}



//                             </li>
//                         );
//                     })}
//                 </ul>
//             </nav>

//             {/* Bottom pinned section: WhatsApp + Email + CRM + Website */}
//             <div
//                 className="p-2 space-y-1 pb-15 shrink-0"
//                 style={{ pointerEvents: "auto" }}
//             >
//                 {bottomLinks.map((item, index) => {
//                     const Icon = item.icon;
//                     const isActive = location.pathname === item.path;
//                     const isWhatsApp = item.path === "/ar-whatsapp";
//                     const isCrm = item.path === "/crm";
//                     const isWebsite = item.path === "/website";

//                     // Color resolution
//                     const iconColor = isWhatsApp
//                         ? "text-[#25D366]"
//                         : isCrm
//                             ? "text-[#1D9BF0]"
//                             : isWebsite
//                                 ? "text-[#4285F4]"
//                                 : "text-[#EA4335]";

//                     const labelColor = isWhatsApp
//                         ? "text-[#128C7E]"
//                         : isCrm
//                             ? "text-[#1D9BF0]"
//                             : isWebsite
//                                 ? "text-[#4285F4]"
//                                 : "text-[#EA4335]";

//                     return (
//                         <Link
//                             key={index}
//                             to={item.path}
//                             className={`
//                                 border-b-3 border-white
//                                 flex items-center
//                                 bg-[#f8f7f5]
//                                 ${isExpanded ? "justify-start w-full gap-2 px-3 py-2.5 rounded-xl text-sm sm:text-base" : "justify-center w-10 h-10 mx-auto rounded-full p-0 gap-0 text-xs"}
//                                 transition-all
//                                 duration-300
//                                 ease-in-out
//                                 font-black
//                                 group
//                                 hover:bg-white/90
//                                 shadow-sm
//                                 hover:shadow-md
//                             `}
//                             style={{ pointerEvents: "auto" }}
//                         >
//                             <Icon
//                                 size={isExpanded ? 20 : 18}
//                                 strokeWidth={1.1}
//                                 className={`
//                                     shrink-0
//                                     transition-all
//                                     duration-300
//                                     ${iconColor}
//                                     pointer-events-none
//                                 `}
//                             />
//                             <span
//                                 className={`
//                                     font-black
//                                     tracking-wide
//                                     whitespace-nowrap
//                                     transition-all
//                                     duration-300
//                                     ${labelColor}
//                                     ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}
//                                 `}
//                             >
//                                 {item.name}
//                             </span>
//                         </Link>
//                     );
//                 })}
//             </div>
//         </aside>
//     );
// }

// export default Sidebar;