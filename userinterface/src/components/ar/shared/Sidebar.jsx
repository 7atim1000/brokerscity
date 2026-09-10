import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { SidebarMenuLinks } from "../../../assets/assets";

import { MdExpandCircleDown } from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa";

function Sidebar({ onHoverChange }) {
    const [expandedItems, setExpandedItems] = useState({});
    const [isHovered, setIsHovered] = useState(false);
    const location = useLocation();
    const sidebarRef = useRef(null);

    const toggleSubMenu = (index) => {
        setExpandedItems((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    // Detect screen size — expanded-on-hover only applies to md+ (>= 768px)
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

    // Notify parent whenever hover/expand state changes
    useEffect(() => {
        onHoverChange?.(isDesktop && isHovered);
    }, [isDesktop, isHovered, onHoverChange]);

    const isExpanded = isDesktop && isHovered;
    // from-[#3a2a1a]
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
                bg-gradient-to-b
                from-[#a47d52]
                via-[#a47d52]
                to-[#f8f7f5]
                border-l
                border-[#8a6a44]/40
                shadow-[0_0_25px_rgba(0,0,0,0.5)]
                z-50
                overflow-y-auto
                overflow-x-hidden
                transition-all
                duration-300
                ease-in-out
                ${isExpanded ? "w-64" : "w-16 sm:w-64 md:w-16"}
            `}
            style={{
                width: isDesktop ? (isHovered ? "16rem" : "4rem") : undefined,
            }}
        >
            {/* Sidebar Menu */}
            <nav className="p-2 sm:p-4 sm:pt-15 pt-8">
                <ul className="space-y-2">
                    {SidebarMenuLinks.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        const isExpandedItem =
                            expandedItems[index] ?? item.isExpanded ?? false;

                        const isWhatsApp = item.path === "/ar-whatsapp";

                        return (
                            <li key={index}>
                                {item.subItems ? (
                                    <button
                                        onClick={() => toggleSubMenu(index)}
                                        className={`
                                            w-full
                                            flex items-center
                                            ${isExpanded ? "justify-between" : "justify-center"}
                                            px-3
                                            py-3
                                            rounded-xl
                                            transition-all
                                            duration-200
                                            font-black
                                            text-sm sm:text-base
                                            cursor-pointer
                                            group
                                            text-white

                                            ${
                                                isExpandedItem
                                                    ? "bg-gradient-to-r from-[#d4a574] to-[#b88d63] text-white shadow-lg shadow-[#a47d52]/40"
                                                    : "bg-white/5 hover:bg-white/15 shadow-sm hover:shadow-md"
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3 justify-center">
                                            <Icon
                                                size={22}
                                                strokeWidth={2.5}
                                                className="
                                                    text-white
                                                    drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]
                                                    transition-colors
                                                    duration-200
                                                    shrink-0
                                                "
                                            />
                                            <span
                                                className={`
                                                    font-black
                                                    text-white
                                                    tracking-wide
                                                    whitespace-nowrap
                                                    transition-all
                                                    duration-300
                                                    ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}
                                                `}
                                            >
                                                {item.name}
                                            </span>
                                        </div>
                                        <span
                                            className={`
                                                transition-all
                                                duration-300
                                                ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}
                                            `}
                                        >
                                            <MdExpandCircleDown
                                                size={26}
                                                className={`
                                                    text-white
                                                    transition-transform
                                                    duration-300
                                                    ${
                                                        isExpandedItem
                                                            ? "rotate-180"
                                                            : "rotate-0"
                                                    }
                                                `}
                                            />
                                        </span>
                                    </button>
                                ) : (
                                    <Link
                                        to={item.path}
                                        className={`
                                            flex items-center
                                            ${isExpanded ? "justify-start" : "justify-center"}
                                            gap-3
                                            px-3
                                            py-3
                                            rounded-xl
                                            transition-all
                                            duration-200
                                            font-black
                                            text-sm sm:text-xl
                                            group

                                            ${
                                                isWhatsApp
                                                    ? isActive
                                                        ? "bg-gradient-to-r from-[#128C7E] to-[#0e6b5f] text-white shadow-lg shadow-green-500/40"
                                                        : "text-[#4ade80] bg-white/5 hover:bg-[#25D366]/20 hover:text-white shadow-sm hover:shadow-md hover:shadow-green-500/20"
                                                    : isActive
                                                        ? "bg-gradient-to-r from-[#d4a574] to-[#b88d63] text-white shadow-lg shadow-[#a47d52]/40"
                                                        : "bg-white/5 hover:bg-white/15 text-white shadow-sm hover:shadow-md"
                                            }
                                        `}
                                    >
                                        <Icon
                                            size={22}
                                            strokeWidth={1.1}
                                            className={`
                                                ${
                                                    isWhatsApp
                                                        ? isActive
                                                            ? "text-white"
                                                            : "text-[#4ade80] group-hover:text-white"
                                                        : "text-white"
                                                }
                                                drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]
                                                transition-colors
                                                duration-200
                                                shrink-0
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
                                                    isWhatsApp && !isActive
                                                        ? "text-[#4ade80] group-hover:text-white"
                                                        : "text-white"
                                                }
                                                ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}
                                            `}
                                        >
                                            {item.name}
                                        </span>
                                    </Link>
                                )}

                                {/* Sub Items */}
                                {item.subItems && isExpandedItem && isExpanded && (
                                    <ul
                                        className="
                                            mt-2 mr-2 space-y-1
                                            border-r-2 border-[#d4a574]/40
                                            pr-2
                                            bg-white/5
                                            rounded-l-xl
                                            py-1
                                            animate-[fadeIn_0.2s_ease-in]
                                        "
                                    >
                                        {item.subItems.map((subItem, subIndex) => {
                                            const SubIcon = subItem.icon;
                                            const isSubActive =
                                                location.pathname === subItem.path;
                                            return (
                                                <li key={subIndex}>
                                                    <Link
                                                        to={subItem.path}
                                                        className={`
                                                            flex items-center
                                                            justify-start
                                                            gap-3
                                                            px-4
                                                            py-2.5
                                                            rounded-lg
                                                            text-sm
                                                            transition-all
                                                            duration-200
                                                            font-black
                                                            ${
                                                                isSubActive
                                                                    ? "bg-gradient-to-r from-[#d4a574] to-[#b88d63] text-white shadow-md"
                                                                    : "text-white hover:bg-white/15 hover:shadow-sm"
                                                            }
                                                        `}
                                                    >
                                                        <SubIcon
                                                            size={18}
                                                            strokeWidth={2.5}
                                                            className="
                                                                text-white
                                                                drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]
                                                                transition-colors
                                                                duration-200
                                                                shrink-0
                                                            "
                                                        />
                                                        <span className="font-black tracking-wide text-white whitespace-nowrap">
                                                            {subItem.name}
                                                        </span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}

export default Sidebar;

// import { useState, useEffect, useRef } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { SidebarMenuLinks } from "../../../assets/assets";

// import { MdExpandCircleDown } from "react-icons/md";
// import { FaWhatsapp } from "react-icons/fa";

// function Sidebar() {
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

//     // Detect screen size — expanded-on-hover only applies to md+ (>= 768px)
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

//     const isExpanded = isDesktop && isHovered;
//     // from-[#3a2a1a]
//     return (
//         <aside
//             ref={sidebarRef}
//             dir="rtl"
//             onMouseEnter={() => isDesktop && setIsHovered(true)}
//             onMouseLeave={() => isDesktop && setIsHovered(false)}
//             className={`
//                 fixed
//                 right-0
//                 top-0
//                 h-screen
//                 bg-gradient-to-b
//                 from-[#a47d52]
//                 via-[#a47d52]
//                 to-[#f8f7f5]
//                 border-l
//                 border-[#8a6a44]/40
//                 shadow-[0_0_25px_rgba(0,0,0,0.5)]
//                 z-50
//                 overflow-y-auto
//                 overflow-x-hidden
//                 transition-all
//                 duration-300
//                 ease-in-out
//                 ${isExpanded ? "w-64" : "w-16 sm:w-64 md:w-16"}
//             `}
//             style={{
//                 width: isDesktop ? (isHovered ? "16rem" : "4rem") : undefined,
//             }}
//         >
//             {/* Sidebar Menu */}
//             <nav className="p-2 sm:p-4 sm:pt-15 pt-8">
//                 <ul className="space-y-2">
//                     {SidebarMenuLinks.map((item, index) => {
//                         const Icon = item.icon;
//                         const isActive = location.pathname === item.path;
//                         const isExpandedItem =
//                             expandedItems[index] ?? item.isExpanded ?? false;

//                         const isWhatsApp = item.path === "/ar-whatsapp";

//                         return (
//                             <li key={index}>
//                                 {item.subItems ? (
//                                     <button
//                                         onClick={() => toggleSubMenu(index)}
//                                         className={`
//                                             w-full
//                                             flex items-center
//                                             ${isExpanded ? "justify-between" : "justify-center"}
//                                             px-3
//                                             py-3
//                                             rounded-xl
//                                             transition-all
//                                             duration-200
//                                             font-black
//                                             text-sm sm:text-base
//                                             cursor-pointer
//                                             group
//                                             text-white

//                                             ${
//                                                 isExpandedItem
//                                                     ? "bg-gradient-to-r from-[#d4a574] to-[#b88d63] text-white shadow-lg shadow-[#a47d52]/40"
//                                                     : "bg-white/5 hover:bg-white/15 shadow-sm hover:shadow-md"
//                                             }
//                                         `}
//                                     >
//                                         <div className="flex items-center gap-3 justify-center">
//                                             <Icon
//                                                 size={22}
//                                                 strokeWidth={2.5}
//                                                 className="
//                                                     text-white
//                                                     drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]
//                                                     transition-colors
//                                                     duration-200
//                                                     shrink-0
//                                                 "
//                                             />
//                                             <span
//                                                 className={`
//                                                     font-black
//                                                     text-white
//                                                     tracking-wide
//                                                     whitespace-nowrap
//                                                     transition-all
//                                                     duration-300
//                                                     ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}
//                                                 `}
//                                             >
//                                                 {item.name}
//                                             </span>
//                                         </div>
//                                         <span
//                                             className={`
//                                                 transition-all
//                                                 duration-300
//                                                 ${isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}
//                                             `}
//                                         >
//                                             <MdExpandCircleDown
//                                                 size={26}
//                                                 className={`
//                                                     text-white
//                                                     transition-transform
//                                                     duration-300
//                                                     ${
//                                                         isExpandedItem
//                                                             ? "rotate-180"
//                                                             : "rotate-0"
//                                                     }
//                                                 `}
//                                             />
//                                         </span>
//                                     </button>
//                                 ) : (
//                                     <Link
//                                         to={item.path}
//                                         className={`
//                                             flex items-center
//                                             ${isExpanded ? "justify-start" : "justify-center"}
//                                             gap-3
//                                             px-3
//                                             py-3
//                                             rounded-xl
//                                             transition-all
//                                             duration-200
//                                             font-black
//                                             text-sm sm:text-xl
//                                             group

//                                             ${
//                                                 isWhatsApp
//                                                     ? isActive
//                                                         ? "bg-gradient-to-r from-[#128C7E] to-[#0e6b5f] text-white shadow-lg shadow-green-500/40"
//                                                         : "text-[#4ade80] bg-white/5 hover:bg-[#25D366]/20 hover:text-white shadow-sm hover:shadow-md hover:shadow-green-500/20"
//                                                     : isActive
//                                                         ? "bg-gradient-to-r from-[#d4a574] to-[#b88d63] text-white shadow-lg shadow-[#a47d52]/40"
//                                                         : "bg-white/5 hover:bg-white/15 text-white shadow-sm hover:shadow-md"
//                                             }
//                                         `}
//                                     >
//                                         <Icon
//                                             size={22}          // ← line: bigger icon
//                                             strokeWidth={1.1}  // ← line: thicker stroke (BOLD)
//                                             className={`
//                                                 ${
//                                                     isWhatsApp
//                                                         ? isActive
//                                                             ? "text-white"
//                                                             : "text-[#4ade80] group-hover:text-white"
//                                                         : "text-white"
//                                                 }
//                                                 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]
//                                                 transition-colors
//                                                 duration-200
//                                                 shrink-0
//                                             `}
//                                         />
//                                         <span
//                                             className={`
//                                                 font-black
//                                                 tracking-wide
//                                                 whitespace-nowrap
//                                                 transition-all
//                                                 duration-300
//                                                 ${
//                                                     isWhatsApp && !isActive
//                                                         ? "text-[#4ade80] group-hover:text-white"
//                                                         : "text-white"
//                                                 }
//                                                 ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}
//                                             `}
//                                         >
//                                             {item.name}
//                                         </span>
//                                     </Link>
//                                 )}

//                                 {/* Sub Items */}
//                                 {item.subItems && isExpandedItem && isExpanded && (
//                                     <ul
//                                         className="
//                                             mt-2 mr-2 space-y-1
//                                             border-r-2 border-[#d4a574]/40
//                                             pr-2
//                                             bg-white/5
//                                             rounded-l-xl
//                                             py-1
//                                             animate-[fadeIn_0.2s_ease-in]
//                                         "
//                                     >
//                                         {item.subItems.map((subItem, subIndex) => {
//                                             const SubIcon = subItem.icon;
//                                             const isSubActive =
//                                                 location.pathname === subItem.path;
//                                             return (
//                                                 <li key={subIndex}>
//                                                     <Link
//                                                         to={subItem.path}
//                                                         className={`
//                                                             flex items-center
//                                                             justify-start
//                                                             gap-3
//                                                             px-4
//                                                             py-2.5
//                                                             rounded-lg
//                                                             text-sm
//                                                             transition-all
//                                                             duration-200
//                                                             font-black
//                                                             ${
//                                                                 isSubActive
//                                                                     ? "bg-gradient-to-r from-[#d4a574] to-[#b88d63] text-white shadow-md"
//                                                                     : "text-white hover:bg-white/15 hover:shadow-sm"
//                                                             }
//                                                         `}
//                                                     >
//                                                         <SubIcon
//                                                             size={18}
//                                                             strokeWidth={2.5}
//                                                             className="
//                                                                 text-white
//                                                                 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]
//                                                                 transition-colors
//                                                                 duration-200
//                                                                 shrink-0
//                                                             "
//                                                         />
//                                                         <span className="font-black tracking-wide text-white whitespace-nowrap">
//                                                             {subItem.name}
//                                                         </span>
//                                                     </Link>
//                                                 </li>
//                                             );
//                                         })}
//                                     </ul>
//                                 )}
//                             </li>
//                         );
//                     })}
//                 </ul>
//             </nav>
//         </aside>
//     );
// }

// export default Sidebar;

// import { useState } from "react";
// import { Link, useLocation } from "react-router-dom";
// import { SidebarMenuLinks } from "../../../assets/assets";

// //import logo from '../../../assets/images/logo.png'
// import logo from '../../../assets/images/logogo-removebg.png'

// import { MdExpandCircleDown } from "react-icons/md";
// import { FaWhatsapp } from "react-icons/fa"; // Make sure this is imported

// function Sidebar() {
//     const [expandedItems, setExpandedItems] = useState({});
//     const location = useLocation();

//     const toggleSubMenu = (index) => {
//         setExpandedItems((prev) => ({
//             ...prev,
//             [index]: !prev[index],
//         }));
//     };

//     // Check if current path is WhatsApp
//     const isWhatsAppPath = location.pathname === "/ar-whatsapp";

//     return (
//         <aside
//             dir="rtl"
//             className="
//             fixed
//             right-0
//             top-0
//             h-screen
//             w-16
//             sm:w-64
//             bg-gradient-to-b from-[#f8f7f5] to-[#a47d52]
//             border-l
//             border-[#e9e6e1]
//             shadow-[0_0_15px_rgba(0,0,0,0.3)]
//             z-50
//             overflow-y-auto
//         "
//         >
//             {/* Logo / Title */}
//             <div
//                 className="
//                     flex flex-col items-center justify-center
//                     h-24
//                     border-b border-[#e9e6e1]
//                     px-2
//                     mt-15
//                     mb-10
//                     bg-gradient-to-r from-[#a47d52]/5 via-transparent to-[#a47d52]/5
//                 "
//             >
//                 <img
//                     src={logo}
//                     alt="Logo"
//                     className="
//                         object-cover
//                         mx-auto
//                         w-50
//                         h-50
                        
//                         rounded-xs
//                         shadow-xs
//                         p-1
//                         transition-transform
//                         hover:scale-105
//                         duration-300
//                     "
//                 />
             
//             </div>

//             {/* Sidebar Menu */}
//             <nav className="p-2 sm:p-4 mt-2">
//                 <ul className="space-y-1.5">
//                     {SidebarMenuLinks.map((item, index) => {
//                         const Icon = item.icon;
//                         const isActive = location.pathname === item.path;
//                         const isExpanded = expandedItems[index] ?? item.isExpanded ?? false;
                        
//                         // 🎯 Check if this is the WhatsApp item
//                         const isWhatsApp = item.path === "/ar-whatsapp";

//                         return (
//                             <li key={index}>
//                                 {item.subItems ? (
//                                     <button
//                                         onClick={() => toggleSubMenu(index)}
//                                         className={`
//                                             w-full
//                                             flex items-center
//                                             justify-center sm:justify-between
//                                             px-3 sm:px-4
//                                             py-3
//                                             rounded-xl
//                                             transition-all
//                                             duration-200
//                                             font-extrabold
//                                             text-sm sm:text-base
//                                             shadow-sm
//                                             hover:shadow-md

//                                             ${isExpanded
//                                                 ? "bg-gradient-to-r from-[#a47d52] to-[#b88d63] text-white shadow-md"
//                                                 : "text-[#5a4a3a] hover:bg-[#e9e6e1] hover:text-[#a47d52]"
//                                             }
//                                         `}
//                                     >
//                                         <div className="flex items-center gap-3 justify-center sm:justify-start">
//                                             <Icon 
//                                                 size={20} 
//                                                 className={`
//                                                     ${isExpanded ? "text-white" : "text-[#a47d52]"}
//                                                     transition-colors
//                                                     duration-200
//                                                 `}
//                                             />
//                                             <span className="hidden sm:block font-extrabold">
//                                                 {item.name}
//                                             </span>
//                                         </div>
//                                         <span className="hidden sm:block">
//                                             <MdExpandCircleDown 
//                                                 size={24}
//                                                 className={`
//                                                     transition-transform
//                                                     duration-300
//                                                     ${isExpanded ? "rotate-180" : "rotate-0"}
//                                                     ${isExpanded ? "text-white" : "text-[#a47d52]"}
//                                                 `}
//                                             />
//                                         </span>
//                                     </button>
//                                 ) : (
//                                     <Link
//                                         to={item.path}
//                                         className={`
//                                             flex items-center
//                                             justify-center sm:justify-start
//                                             gap-3
//                                             px-3 sm:px-4
//                                             py-3
//                                             rounded-xl
//                                             transition-all
//                                             duration-200
//                                             font-extrabold
//                                             text-sm sm:text-xl
//                                             shadow-sm
//                                             hover:shadow-md

//                                             ${isWhatsApp ? (
//                                                 // 🎯 WhatsApp Special Styles
//                                                 isActive 
//                                                     ? "bg-gradient-to-r from-[#128C7E] to-[#128C7E] text-white shadow-lg shadow-green-500/30" // Active: WhatsApp green
//                                                     : "text-[#128C7E] hover:bg-[#25D366]/10 hover:text-[#128C7E] hover:shadow-green-500/20" // Inactive: WhatsApp green
//                                             ) : (
//                                                 // Default styles for other items
//                                                 isActive
//                                                     ? "bg-gradient-to-r from-[#a47d52] to-[#b88d63] text-white shadow-md"
//                                                     : "text-[#5a4a3a] hover:bg-[#e9e6e1] hover:text-[#a47d52]"
//                                             )}
//                                         `}
//                                     >
//                                         <Icon 
//                                             size={20}
//                                             className={`
//                                                 ${isWhatsApp ? (
//                                                     isActive ? "text-white" : "text-[#128C7E]"
//                                                 ) : (
//                                                     isActive ? "text-white" : "text-[#128C7E]"
//                                                 )}
//                                                 transition-colors
//                                                 duration-200
//                                             `}
//                                         />
//                                         <span className="text-xl hidden sm:block font-extrabold">
//                                             {item.name}
//                                         </span>
//                                     </Link>
//                                 )}
//                                 {/* Sub Items */}
//                                 {item.subItems && isExpanded && (
//                                     <ul className="mt-2 mr-2 sm:mr-6 space-y-1 border-r-2 border-[#a47d52]/30 pr-2 sm:pr-4 bg-gradient-to-l from-[#a47d52]/5 to-transparent rounded-l-xl py-1">
//                                         {item.subItems.map((subItem, subIndex) => {
//                                             const SubIcon = subItem.icon;
//                                             const isSubActive = location.pathname === subItem.path;
//                                             return (
//                                                 <li key={subIndex} className='shadow-lg'>
//                                                     <Link
//                                                         to={subItem.path}
//                                                         className={`
//                                                             flex items-center
//                                                             justify-center sm:justify-start
//                                                             gap-3
//                                                             px-2 sm:px-4
//                                                             py-2.5
//                                                             rounded-lg
//                                                             text-xs sm:text-sm
//                                                             transition-all
//                                                             duration-200
//                                                             font-extrabold
//                                                             ${isSubActive
//                                                                 ? "bg-gradient-to-r from-[#a47d52] to-[#b88d63] text-white shadow-md"
//                                                                 : "text-[#6a5a4a] hover:bg-[#e9e6e1] hover:text-[#a47d52] hover:shadow-sm"
//                                                             }
//                                                         `}
//                                                     >
//                                                         <SubIcon 
//                                                             size={16}
//                                                             className={`
//                                                                 ${isSubActive ? "text-white" : "text-[#a47d52]"}
//                                                                 transition-colors
//                                                                 duration-200
//                                                             `}
//                                                         />
//                                                         <span className="hidden sm:block font-extrabold">
//                                                             {subItem.name}
//                                                         </span>
//                                                     </Link>
//                                                 </li>
//                                             );
//                                         })}
//                                     </ul>
//                                 )}
//                             </li>
//                         );
//                     })}
//                 </ul>
//             </nav>
//         </aside>
//     );
// }

// export default Sidebar;


