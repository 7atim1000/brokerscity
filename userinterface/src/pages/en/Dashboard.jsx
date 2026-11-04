import { useState, useEffect } from "react";
import logo from '../../assets/images/logogo-removebg-old.png';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate loading delay (remove this in production)
        const timer = setTimeout(() => {
            setLoading(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="
                min-h-screen
                flex flex-col items-center justify-center
                bg-gradient-to-br from-[#f8f7f5] to-[#e9e6e1]
                p-6
                relative overflow-hidden
            "
            dir="ltr" // ✅ English Direction
            >
                {/* Background Decorative Blur */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#a47d52]/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#b88d63]/10 rounded-full blur-3xl animate-pulse delay-700"></div>

                <div className="relative z-10 flex flex-col items-center">
                    {/* Logo in Loading Screen */}
                    <img 
                        src={logo} 
                        alt="Broker City Logo" 
                        className="w-32 md:w-40 object-contain mb-8 animate-bounce"
                    />

                    {/* Loading Spinner */}
                    <div className="relative flex justify-center items-center">
                        <div className="
                            w-24 h-24
                            border-4 border-[#e9e6e1]
                            border-t-[#a47d52]
                            rounded-full
                            animate-spin
                            shadow-xl
                        "></div>
                        
                        {/* Pulsing ring effect */}
                        <div className="
                            absolute inset-0
                            w-24 h-24
                            border-4 border-[#a47d52]/30
                            rounded-full
                            animate-ping
                        "></div>
                    </div>

                    {/* Loading Text */}
                    <div className="mt-10 text-center">
                        <h2 className="text-2xl font-extrabold text-[#a47d52] animate-pulse tracking-wide">
                            Loading...
                        </h2>
                        <p className="mt-2 text-sm text-[#8a7e6f] font-medium">
                            Please wait a moment
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="
            min-h-screen
            bg-gradient-to-br from-[#f8f7f5] via-[#f4efe9] to-[#e9e6e1]
            p-4 md:p-10
            flex items-center justify-center
            relative overflow-hidden
            font-sans
        "
        dir="ltr" // ✅ English Direction
        >
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#a47d52]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#b88d63]/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

            {/* Main Card */}
            <div className="
                relative z-10
                w-full max-w-5xl
                bg-white/90 backdrop-blur-xl
                rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(164,125,82,0.2)]
                border border-white
                p-6 md:p-12
                text-center
                transform transition-all duration-500
            ">
                
                {/* ✅ Logo Added at Header */}
                <div className="flex justify-center mb-8">
                    <img 
                        src={logo} 
                        alt="Broker City Logo" 
                        className="w-40 md:w-56 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                    />
                </div>

                {/* Decorative Line */}
                <div className="w-24 h-1.5 bg-gradient-to-r from-[#a47d52] to-[#b88d63] rounded-full mx-auto mb-8"></div>

                {/* ✅ Enhanced Main Title (Fixed Size) */}
                <h1 className="
                    text-3xl sm:text-4xl md:text-5xl lg:text-6xl
                    font-black
                    text-transparent bg-clip-text bg-gradient-to-r from-[#a47d52] to-[#8a6a44]
                    mb-6
                    leading-tight
                    tracking-tight
                ">
                    Welcome to the <br className="block md:hidden" /> Broker City Real Estate Platform
                </h1>

                {/* Subtitle with animation */}
                <div className="text-base md:text-xl font-bold text-[#8a7e6f] mb-10 flex items-center justify-center gap-3">
                    <span className="inline-block animate-pulse text-2xl">🏗️</span>
                    <span>Building a better digital future</span>
                </div>

                {/* Main Content Card */}
                <div className="
                    bg-gradient-to-br from-white to-[#f8f7f5]
                    rounded-2xl
                    border border-[#e9e6e1]
                    shadow-sm
                    p-6 md:p-10
                    mb-10
                    text-left // ✅ LTR text alignment
                ">
                    <div className="space-y-6">
                        {/* English Message */}
                        <p className="text-base md:text-lg text-[#5a4a3a] leading-relaxed font-semibold flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <span>
                                Sorry, the system is currently under design and construction. We are currently building the database and designing the operational functions with high professionalism.
                            </span>
                        </p>

                        {/* Divider */}
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#a47d52]/20 to-transparent"></div>

                        {/* Arabic Message */}
                        <p className="text-sm md:text-base text-[#8a7e6f] leading-relaxed font-medium flex items-start gap-3" dir="rtl">
                            <span className="text-xl">📊</span>
                            <span>
                                يتم حالياً بناء قاعدة البيانات وتصميم الدوال التشغيلية في قسم الواجهة الخلفية لضمان أفضل أداء.
                            </span>
                        </p>
                    </div>
                </div>

                {/* Status Indicators */}
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-10">
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-[#f8f7f5] rounded-full border border-[#e9e6e1] shadow-sm">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        <span className="text-xs md:text-sm text-[#5a4a3a] font-bold">Under Development</span>
                    </div>

                    <div className="flex items-center gap-2 px-5 py-2.5 bg-[#f8f7f5] rounded-full border border-[#e9e6e1] shadow-sm">
                        <span className="w-2.5 h-2.5 bg-[#a47d52] rounded-full animate-bounce"></span>
                        <span className="text-xs md:text-sm text-[#5a4a3a] font-bold">قيد التطوير</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-bold text-[#8a7e6f]">Progress</span>
                        <span className="text-xs font-black text-[#a47d52]">35%</span>
                    </div>
                    <div className="w-full h-3 bg-[#e9e6e1] rounded-full overflow-hidden shadow-inner">
                        <div className="
                            h-full
                            bg-gradient-to-r from-[#a47d52] to-[#b88d63]
                            rounded-full
                            animate-[progress_3s_ease-in-out_infinite]
                            w-[35%]
                            shadow-[0_0_10px_rgba(164,125,82,0.5)]
                        "></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;