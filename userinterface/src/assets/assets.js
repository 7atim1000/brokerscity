import { BsCalendar2DateFill } from "react-icons/bs";
import { GrTransaction } from "react-icons/gr";
import { PiBankBold } from "react-icons/pi";
import { GiMoneyStack } from "react-icons/gi";
import { FaAmazonPay } from "react-icons/fa";
import { CiCircleList } from "react-icons/ci";

import { ImCalculator } from "react-icons/im";
import { CiCalculator2 } from "react-icons/ci";

import { CgTwilio } from "react-icons/cg";
import { FaWhatsapp } from "react-icons/fa";
import { RiDashboardFill } from "react-icons/ri";
import { SiGmail } from "react-icons/si";
import { FaRegBuilding } from "react-icons/fa";
import { FaUsers } from "react-icons/fa";
import { ImUsers } from "react-icons/im";
import { GiTempleGate } from "react-icons/gi";
import { FaCalculator } from "react-icons/fa6";
import { GrVmMaintenance } from "react-icons/gr";
import { TbBuildingCommunity } from "react-icons/tb";
import { RiConnectorFill } from "react-icons/ri";
import { BsBrowserEdge } from "react-icons/bs";
import { SiGooglechrome } from "react-icons/si";

import ChromeLogo from "../components/ar/shared/ChromeLogo";
import { MdOutlineMarkEmailUnread } from "react-icons/md";
import { MdLocalOffer } from "react-icons/md";

import { MdOutlineMonitor } from "react-icons/md";
import { FaUsersGear } from "react-icons/fa6";
import { RiCustomerService2Line } from "react-icons/ri";
import { VscCopilotInProgress } from "react-icons/vsc";
import { MdOutlineRealEstateAgent } from "react-icons/md";
import { TbBuildingSkyscraper } from "react-icons/tb";

import { FaIdCard } from "react-icons/fa6";

import { FaUserTie, FaBuilding } from "react-icons/fa"; 

export const SidebarMenuLinks = [
    // ==========================================
    // ✅ MOVED TO TOP: CRM & LISTING
    // ==========================================
    {
        name: "CRM",
        path: "", 
        icon: RiCustomerService2Line,
        isExpanded: false,
        permission: "leads", // Shows the group if user has the main "leads" permission
        subItems: [
            {
                name: "جميع الليدز", 
                path: "/ar/crm/leads", // ✅ Updated to match App.jsx routes
                icon: FaUsers, 
                permission: "view_all_lead",
            },
            {
                name: "الليدز الخاصة بي",
                path: "/ar/crm/my-leads", // ✅ Updated to match App.jsx routes
                icon: FaUsersGear,
                permission: "view_my_lead",
            },
            {
                name: "إدارة الصلاحيات", 
                path: "/ar/permissions",
                icon: FaUsersGear,
                permission: "can_manage_permissions",
            }
        ]
    },

       {
        name: "PM listing",
        path: "", 
        icon: TbBuildingSkyscraper,
        isExpanded: false,
        // ✅ Added the "my" permissions here as well
        permission: ["view_all_listing", "view_my_listing", "view_all_listing_owners", "view_my_listing_owners"], 
        subItems: [
            {
                name: "اداره الملاك", 
                path: "/ar/landlord", 
                icon: FaUserTie, 
                permission: ["view_all_listing_owners", "view_my_listing_owners"],
            },
            {
                name: "اداره العقارات",
                path: "/ar/listing", 
                icon: TbBuildingSkyscraper,
                permission: ["view_all_listing", "view_my_listing"],
            },
        ]
    },
    

    


    {
        name: "PRO",
        path: "/pro", 
        icon: FaIdCard,
        permission: "monitoring",
    },

    // ==========================================
    // STANDARD SECTIONS
    // ==========================================
    {
        name: "الرئيسية",
        path: "/ar/dashboard", 
        icon: RiDashboardFill,
    },
    {
        name: "ادارة المستخدمين",
        path: "/ar/users", 
        icon: FaUsersGear,
        permission: "can_view_users", 
    },
    {
        name: "شؤون الموظفين",
        path: "/ar/attendance", 
        icon: FaUsers,
        permission: "ListWorkLog", 
    },
    {
        name: "إدارة العقارات",
        path: "",
        icon: FaRegBuilding,
        isExpanded: false,
        permission: "property_management", 
        subItems: [
            {
                name: "ادارة الملاك",
                path: "/ar/owner", 
                icon: TbBuildingCommunity,
                permission: "property_management",
            },
            {
                name: "ادارة الوحدات",
                path: "/ar/unit", 
                icon: TbBuildingCommunity,
                permission: "property_management",
            },
            {
                name: "المستأجرين",
                path: "/ar/rentals", 
                icon: ImUsers,
                permission: "property_management",
            },
            {
                name: "إدارةالعقود",
                path: "/ar/rent", 
                icon: BsCalendar2DateFill,
                permission: "property_management",
            },
            {
                name: "إدارة التحصيل",
                path: "/ar/monthly-payment", 
                icon: FaCalculator,
                permission: "property_management",
            },
            {
                name: "الصيانة",
                path: "/ar-maintenance", 
                icon: GrVmMaintenance,
                permission: "property_management",
            },
        ],
    },
    {
        name: "الشئون المالية",
        path: "#",
        icon: CiCalculator2,
        isExpanded: false,
        permission: "financials",
        subItems: [
            {
                name: "الحركه اليوميه",
                path: "/ar/transaction", 
                icon: GrTransaction,
                permission: "financials",
            },
            {
                name: "إدارة تعريف الحسابات",
                path: "/ar/accounts", 
                icon: CiCircleList,
                permission: "financials",
            },
            {
                name: "إدارة البنوك",
                path: "/ar/bank", 
                icon: PiBankBold,
                permission: "financials",
            },
            {
                name: "الخزينه النقديه",
                path: "/ar/cash", 
                icon: GiMoneyStack,
                permission: "financials",
            },
        ],
    },
    {
        name: "قسم المراقبة",
        path: "/ar/monitor", 
        icon: MdOutlineMonitor,
        permission: "monitoring",
    },
    {
        name: "الموقع اللاكتروني",
        path: "/ar/website", 
        icon: ChromeLogo,
        permission: "can_manage_permissions",
    },
    {
        name: "WhatsApp",
        path: "/ar-whatsapp", 
        icon: FaWhatsapp,
    },
    {
        name: "Email",
        path: "/email",
        icon: SiGmail,
    },
];

