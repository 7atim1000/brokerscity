// bg-gradient-to-l from-[#a47d52] via-[#f8f7f5] to-[#a47d52]
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import logo from '../../../assets/images/logogo-removebg.png';

import {
    clearTokens,
    getAccessToken,
    authFetch
} from "../../../utils/auth";

import { SlUserFollow } from "react-icons/sl";
import { MdDashboardCustomize } from "react-icons/md";
import { IoMdLogOut } from "react-icons/io";


const Navbar = () => {

    const navigate = useNavigate();
    const location = useLocation();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const isLoggedIn = !!getAccessToken();


    // Get logged-in user
    useEffect(() => {

        if (!isLoggedIn) {
            setLoading(false);
            return;
        }

        const fetchUser = async () => {

            try {

                const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

                const response = await authFetch(`${BASE}/api/me/`);

                if (!response.ok) {
                    throw new Error("Failed to get user information");
                }

                const data = await response.json();
                setUser(data);

            } catch (error) {

                console.error("Error fetching user:", error);
                clearTokens();
                navigate("/login");

            } finally {
                setLoading(false);
            }
        };

        fetchUser();

    }, [isLoggedIn, navigate]);


    // Logout
    const handleLogout = () => {
        clearTokens();
        navigate("/ar-login");
    };


    return (
    // via-[#e6d5c0]
        <nav
            dir="rtl"
            className="
                fixed
                top-0
                left-0
                right-0
                h-16
                bg-gradient-to-l
                from-[#f8f7f5]
                via-[#a47d52]
                to-[#a47d52]
                border-b
                border-[#a47d52]/30
                shadow-[0_4px_20px_rgba(164,125,82,0.25)]
                backdrop-blur-sm
                z-50
                px-4
                sm:px-6
                transition-all
                duration-300
            "
        >

            <div
                className="
                    h-full
                    flex
                    items-center
                    justify-between
                    gap-4
                "
            >

                {/* Logo */}
                {/* Logo */}
                <Link
                    to="/ar-dashboard"
                    className="
        flex
        items-center
        min-w-0
        shrink-0
        transition-transform
        duration-300
        hover:scale-110
    "
                >
                    <img
                        src={logo}
                        alt="Broker City"
                        className="
            h-16
            sm:h-20
            w-auto
            object-contain
            scale-130
            drop-shadow-[0_3px_8px_rgba(164,125,82,0.6)]
            contrast-125
            saturate-125
        "
                        style={{
                            filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.25)) drop-shadow(0 3px 8px rgba(164,125,82,0.6)) contrast(1.2) saturate(1.15)'
                        }}
                    />
                </Link>


                {/* User Information */}
                <div
                    className="
                        flex
                        items-center
                        gap-3
                        sm:gap-5
                    "
                >

                    {!isLoggedIn ? (

                        <>
                            <Link
                                to="/login"
                                className="
                                    px-4
                                    py-2
                                    rounded-lg
                                    text-[#a47d52]
                                    font-bold
                                    bg-white/70
                                    hover:bg-white
                                    shadow-sm
                                    hover:shadow-md
                                    border
                                    border-[#a47d52]/20
                                    transition-all
                                    duration-200
                                "
                            >
                                تسجيل الدخول
                            </Link>

                            <Link
                                to="/signup"
                                className="
                                    hidden
                                    sm:inline-block
                                    px-4
                                    py-2
                                    rounded-lg
                                    text-white
                                    font-bold
                                    bg-gradient-to-l
                                    from-[#a47d52]
                                    to-[#b88d63]
                                    hover:from-[#8a6a44]
                                    hover:to-[#a47d52]
                                    shadow-md
                                    hover:shadow-lg
                                    transition-all
                                    duration-200
                                "
                            >
                                إنشاء حساب
                            </Link>
                        </>

                    ) : (

                        <>

                            {/* User */}
                            {!loading && user && (

                                <div
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        px-2
                                        sm:px-3
                                        py-1
                                        rounded-full
                                        bg-white/20
                                        backdrop-blur-sm
                                        border
                                        border-white/30
                                        shadow-sm
                                        hover:bg-white/30
                                        transition-all
                                        duration-200
                                    "
                                >

                                    {/* User Image */}
                                    {user.image ? (

                                        <img
                                            src={`${import.meta.env.VITE_DJANGO_BASE_URL}${user.image}`}
                                            alt={user.username}
                                            className="
                                                w-9
                                                h-9
                                                sm:w-10
                                                sm:h-10
                                                rounded-full
                                                object-cover
                                                border-2
                                                border-white
                                                shadow-sm
                                            "
                                        />

                                    ) : (

                                        <div
                                            className="
                                                w-9
                                                h-9
                                                sm:w-10
                                                sm:h-10
                                                rounded-full
                                                bg-gradient-to-br
                                                from-[#a47d52]
                                                to-[#8a6a44]
                                                flex
                                                items-center
                                                justify-center
                                                border-2
                                                border-white
                                                shadow-sm
                                            "
                                        >
                                            <SlUserFollow
                                                size={20}
                                                className="text-white"
                                            />
                                        </div>

                                    )}


                                    {/* Username */}
                                    <span
                                        className="
                                            hidden
                                            sm:block
                                            font-bold
                                            text-[#5a4a3a]
                                            pl-1
                                        "
                                    >
                                        {user.username}
                                    </span>

                                </div>

                            )}


                            {/* Vendor Dashboard */}
                            {!loading && user?.role === "vendor" && (

                                <Link
                                    to="/ar-dashboard"
                                    className="
                                        flex
                                        items-center
                                        gap-2
                                        px-3
                                        py-2
                                        rounded-lg
                                        text-[#a47d52]
                                        font-bold
                                        bg-white/60
                                        hover:bg-white
                                        border
                                        border-[#a47d52]/20
                                        shadow-sm
                                        hover:shadow-md
                                        transition-all
                                        duration-200
                                    "
                                >

                                    <MdDashboardCustomize size={22} />

                                    <span className="hidden sm:block">
                                        الرئيسية
                                    </span>

                                </Link>

                            )}


                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="
                                    flex
                                    items-center
                                    justify-center
                                    p-2
                                    rounded-full
                                    text-white
                                    bg-[#a47d52]/80
                                    hover:bg-[#8a6a44]
                                    shadow-md
                                    hover:shadow-lg
                                    hover:scale-110
                                    active:scale-95
                                    transition-all
                                    duration-200
                                    cursor-pointer
                                "
                                title="تسجيل الخروج"
                            >

                                <IoMdLogOut size={22} />

                            </button>

                        </>

                    )}

                </div>

            </div>

        </nav>

    );
};


export default Navbar;
