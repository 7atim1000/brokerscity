import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";

// ✅ Import Arabic Components
import NavbarAr from "../components/ar/shared/Navbar";
import SidebarAr from "../components/ar/shared/Sidebar";

// ✅ Import English Components (Adjust paths if your folders differ)
import NavbarEn from "../components/en/shared/Navbar";
import SidebarEn from "../components/en/shared/Sidebar";

import bgImage from '../assets/images/background1.jpeg';

const MainLayout = ({ lang = "ar" }) => {
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    
    // ✅ Dynamically determine direction and margin classes
    const isRTL = lang === "ar";
    const dirAttr = isRTL ? "rtl" : "ltr";
    
    const marginClass = sidebarExpanded 
        ? (isRTL ? "mr-64" : "ml-64") 
        : (isRTL ? "mr-16 sm:mr-14 md:mr-16" : "ml-16 sm:ml-14 md:ml-16");

    const handleSidebarHover = useCallback((expanded) => {
        setSidebarExpanded(expanded);
    }, []);

    return (
        <div dir={dirAttr} className="relative min-h-screen">
            
            {/* ===== FIXED BACKGROUND LAYER ===== */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url(${bgImage})`,
                }}
            />

            {/* ===== OPTIONAL TRANSPARENT OVERLAY ===== */}
            <div className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />

            {/* ===== CONDITIONAL SIDEBAR ===== */}
            {lang === "ar" ? (
                <SidebarAr onHoverChange={handleSidebarHover} lang={lang} />
            ) : (
                <SidebarEn onHoverChange={handleSidebarHover} lang={lang} />
            )}

            {/* Main Content Area */}
            <div
                className={`
                    relative
                    transition-all
                    duration-300
                    ease-in-out
                    ${marginClass} 
                `}
            >
                {/* ===== CONDITIONAL NAVBAR ===== */}
                {lang === "ar" ? (
                    <NavbarAr lang={lang} />
                ) : (
                    <NavbarEn lang={lang} />
                )}

                {/* Selected Page */}
                <main className="pt-12 p-4">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default MainLayout;


// Summary of Changes:
// Imports: Added imports for NavbarEn and SidebarEn from your components/en/shared/ directory.

// Conditional Rendering:

// {lang === "ar" ? <SidebarAr /> : <SidebarEn />}

// {lang === "ar" ? <NavbarAr /> : <NavbarEn />}

// Margins: The marginClass already dynamically switches between mr-64 (Arabic / right side) and ml-64 (English / left side), which will correctly push the content away from the English sidebar.



// // // MainLayout.jsx is exactly where you should combine the Sidebar, Navbar, and the currently selected page.
// import { useState, useCallback } from "react";
// import { Outlet } from "react-router-dom";
// import Navbar from "../components/ar/shared/Navbar";
// import Sidebar from "../components/ar/shared/Sidebar";

// import bgImage from '../assets/images/background1.jpeg';

// // ✅ ADDED: `lang` prop with a default of 'ar'
// const MainLayout = ({ lang = "ar" }) => {
//     const [sidebarExpanded, setSidebarExpanded] = useState(false);
    
//     // ✅ ADDED: Dynamically determine direction and margin classes based on language
//     const isRTL = lang === "ar";
//     const dirAttr = isRTL ? "rtl" : "ltr";
    
//     // In RTL, we use `mr` (margin-right) to push content away from the right sidebar.
//     // In LTR, we use `ml` (margin-left) to push content away from the left sidebar.
//     const marginClass = sidebarExpanded 
//         ? (isRTL ? "mr-64" : "ml-64") 
//         : (isRTL ? "mr-16 sm:mr-14 md:mr-16" : "ml-16 sm:ml-14 md:ml-16");

//     const handleSidebarHover = useCallback((expanded) => {
//         setSidebarExpanded(expanded);
//     }, []);

//     return (
//         // ✅ UPDATED: Dynamic dir attribute
//         <div dir={dirAttr} className="relative min-h-screen">
            
//             {/* ===== FIXED BACKGROUND LAYER ===== */}
//             <div
//                 className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
//                 style={{
//                     backgroundImage: `url(${bgImage})`,
//                 }}
//             />

//             {/* ===== OPTIONAL TRANSPARENT OVERLAY ===== */}
//             <div className="fixed inset-0 -z-10 bg-black/40 backdrop-blur-sm" />

//             {/* Sidebar */}
//             <Sidebar onHoverChange={handleSidebarHover} lang={lang} />

//             {/* Main Content Area */}
//             <div
//                 className={`
//                     relative
//                     transition-all
//                     duration-300
//                     ease-in-out
//                     ${marginClass} 
//                 `}
//             >
//                 {/* Navbar */}
//                 <Navbar lang={lang} />

//                 {/* Selected Page */}
//                 <main className="pt-12 p-4">
//                     <Outlet />
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default MainLayout;

