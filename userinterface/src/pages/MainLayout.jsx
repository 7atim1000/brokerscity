// MainLayout.jsx is exactly where you should combine the Sidebar, Navbar, and the currently selected page.

import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";

import Navbar from "../components/ar/shared/Navbar";
import Sidebar from "../components/ar/shared/Sidebar";

const MainLayout = () => {
    const [sidebarExpanded, setSidebarExpanded] = useState(false);

    // Stable callback so Sidebar's useEffect doesn't re-run unnecessarily
    const handleSidebarHover = useCallback((expanded) => {
        setSidebarExpanded(expanded);
    }, []);

    return (
        <div dir="rtl" className="min-h-screen">

            {/* Sidebar */}
            <Sidebar onHoverChange={handleSidebarHover} />

            {/* Main Content Area */}
            <div
                className={`
                    transition-all
                    duration-300
                    ease-in-out
                    ${sidebarExpanded ? "mr-64" : "mr-16 sm:mr-14 md:mr-16"}
                `}
            >

                {/* Navbar */}
                <Navbar />

                {/* Selected Page */}
                <main className="pt-12 p-4">
                    <Outlet />
                </main>

            </div>

        </div>
    );
};

export default MainLayout;


// import { Outlet } from "react-router-dom";

// import Navbar from "../components/ar/shared/Navbar";
// import Sidebar from "../components/ar/shared/Sidebar";

// const MainLayout = () => {
//     return (
//         <div dir="rtl" className="min-h-screen">

//             {/* Sidebar */}
//             <Sidebar />

//             {/* Main Content Area */}
//             <div className="mr-16 sm:mr-14">

//                 {/* Navbar */}
//                 <Navbar />

//                 {/* Selected Page */}
//                 <main className="pt-12 p-4">
//                     <Outlet />
//                 </main>

//             </div>

//         </div>
//     );
// };

// export default MainLayout;