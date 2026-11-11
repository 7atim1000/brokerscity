import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import MainLayout from "./pages/MainLayout";
import { ToastContainer } from 'react-toastify';
import { Toaster } from 'react-hot-toast'; // ✅ NEW: needed to display toasts from react-hot-toast (used in AddCrmLead)
import PrivateRouter from './components/PrivateRouter';

// ==========================================
// ARABIC PAGES
// ==========================================
import ArLogin from './pages/ar/Login';
import ArDashboard from './pages/ar/Dashboard';
import ArBank from './pages/ar/Bank';
import ArCash from './pages/ar/Cash';
import ArPaymentMethod from './pages/ar/PaymentMethod';
import ArTransaction from './pages/ar/Transaction';
import ArAccounts from './pages/ar/Accounts';
import ArWhatsApp from './pages/ar/WhatsApp';

// Property Management
import ArOwner from './pages/ar/Owner';
import ArCategory from './pages/ar/Category';
import ArUnit from './pages/ar/Unit';
import ArRental from './pages/ar/Rental';
import ArRent from './pages/ar/RentList';
import ArMontlyPayment from './pages/ar/MonthlyPayment';

// Website
import ArWebSiteLink from './pages/ar/WebSiteLink';
import ArSlider from './pages/ar/Slider';

// Developers & Offers
import ArDeveloper from './pages/ar/Developer';
import ArDeveloperEmail from './pages/ar/DeveloperEmail';
import ArSaleOffer from './pages/ar/Developer'; 
import OfferSalesPDF from './pages/OfferSalePdf';

// Monitoring & Management
import ArMonitor from './pages/ar/Monitor';
import ArUsers from './pages/ar/Users';
import ArProfile from './pages/ar/Profile';
import ArAttendanceReport from './pages/ar/AttendanceReport';
import ArProperty from './pages/ar/Property';
import ArCalledCalls from './pages/ar/CalledCalles';
import ArArea from './pages/ar/WantedArea';
import ArPermissions from './pages/ar/Permissions';
import LeadsStagesGuide from './pages/ar/LeadsStagesGuide';

// Leads & Ads
import AdLandingPage from './pages/ar/AdLandingPage';
import AdCreatePage from './pages/ar/AdCreatePage';
import LeadsDashboard from './pages/ar/LeadsDashboard';
import OfferSales from './pages/ar/offersale/OfferSales';

// CRM Leads
import CrmLeads from './pages/ar/CrmLeads'; 

// ==========================================
// ENGLISH PAGES 
// ==========================================
import Login from './pages/en/Login';
import Signup from './pages/en/Signup';

// ✅ ADDED: Import the English Dashboard
import EnDashboard from './pages/en/Dashboard'; 
import EnLandLord from './pages/en/LandLord' ;
import EnListing from './pages/en/Listing' ;


function App() {
  return (
    <Router>
      {/* Existing: react-toastify container (used by the rest of the app) */}
      <ToastContainer />

      {/* ✅ NEW: react-hot-toast container (used by AddCrmLead).
          Without this, toast.error()/toast.success() from react-hot-toast are never displayed.
          zIndex is set above the modal (z-50) so toasts appear on top of it. */}
      <Toaster
        position="top-center"
        toastOptions={{ style: { zIndex: 99999, direction: "rtl" } }}
      />
      
      <Routes>
        {/* ========================================== */}
        {/* 1. PUBLIC PAGES (No Sidebar/Navbar)        */}
        {/* ========================================== */}
        <Route path="/ar/login" element={<ArLogin />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/ar-whatsapp" element={<ArWhatsApp />} />
        
        {/* Public Ads & Leads Dashboards */}
        <Route path="/ad-preview/:id" element={<AdLandingPage />} />
        <Route path="/ad/create" element={<AdCreatePage />} />
        <Route path="/leads" element={<LeadsDashboard />} />

        {/* Public Offer Sales */}
        <Route path="/offer-sales" element={<OfferSales />} />

        {/* ========================================== */}
        {/* 2. ARABIC ROUTES (Inside MainLayout)       */}
        {/* ========================================== */}
        {/*
          ✅ EXPLANATION: 
          This <Route> acts as a wrapper for all Arabic pages. 
          Because it has path="/ar", any child route inside it will automatically 
          be prefixed with "/ar". 
          It also passes lang="ar" to MainLayout, so the Navbar and Sidebar 
          will render on the RIGHT side and display in Arabic.
        */}
        <Route path="/ar" element={<MainLayout lang="ar" />}>
          
          <Route path="crm/leads" element={<CrmLeads />} />

          <Route path="dashboard" element={<ArDashboard />} />
          <Route path="users" element={<ArUsers />} />
          <Route path="permissions" element={<ArPermissions />} />
          <Route path="profile" element={<ArProfile />} />
          <Route path="attendance" element={<ArAttendanceReport />} />
          
          <Route path="bank" element={<ArBank />} />
          <Route path="cash" element={<ArCash />} />
          <Route path="paymethod" element={<ArPaymentMethod />} />
          <Route path="accounts" element={<ArAccounts />} />
          <Route path="transaction" element={<ArTransaction />} />

          <Route path="owner" element={<ArOwner />} />
          <Route path="unit" element={<ArUnit />} />
          <Route path="category" element={<ArCategory />} />
          <Route path="rentals" element={<ArRental />} />
          <Route path="rent" element={<ArRent />} />
          <Route path="monthly-payment" element={<ArMontlyPayment />} />

          <Route path="website" element={<ArWebSiteLink />} />
          <Route path="slider" element={<ArSlider />} />

          <Route path="developer" element={<ArDeveloper />} />
          <Route path="developer-email" element={<ArDeveloperEmail />} />
          
          <Route path="offer-sale" element={<OfferSalesPDF />} />
          <Route path="sale-offer" element={<ArSaleOffer />} />
          <Route path="leadstagesguide" element={<LeadsStagesGuide />} />

          <Route path="monitor" element={<ArMonitor />} />
          <Route path="property" element={<ArProperty />} />
          <Route path="calledcalls" element={<ArCalledCalls />} />
          <Route path="area" element={<ArArea />} />
        </Route>

        {/* ========================================== */}
        {/* 3. ENGLISH ROUTES (Inside MainLayout)      */}
        {/* ========================================== */}
        {/*
          ✅ EXPLANATION: 
          This <Route> acts as a wrapper for all English pages. 
          It has path="/en", so child routes automatically get "/en" prefix.
          It passes lang="en" to MainLayout, so the Navbar and Sidebar 
          will render on the LEFT side (LTR) and display in English.
        */}
        
        
        <Route path="/en" element={<MainLayout lang="en" />}>
    
        {/* ✅ ADDED: English Dashboard Route */}
        {/* URL will be: /en/dashboard */}
          <Route path="dashboard" element={<EnDashboard  />} />

          <Route path="landlord" element={<EnLandLord />} />
          <Route path="listing" element={<EnListing />} />

          {/* Uncomment these as you build the English pages */}
          {/* <Route path="leads" element={<EnLeads />} /> */}
        </Route>

        {/* ========================================== */}
        {/* 4. ROOT & CATCH-ALL (Must be at the bottom)*/}
        {/* ========================================== */}
        {/*
          ✅ EXPLANATION:
          If someone visits the root URL ("/") or types an invalid URL, 
          they are automatically redirected to the Arabic dashboard.
        */}
        <Route path="/" element={<Navigate to="/ar/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/ar/dashboard" replace />} />

      </Routes>
    </Router>
  );
}

export default App;


// import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
// import MainLayout from "./pages/MainLayout";
// import { ToastContainer } from 'react-toastify';
// import PrivateRouter from './components/PrivateRouter';

// // ==========================================
// // ARABIC PAGES
// // ==========================================
// import ArLogin from './pages/ar/Login';
// import ArDashboard from './pages/ar/Dashboard';
// import ArBank from './pages/ar/Bank';
// import ArCash from './pages/ar/Cash';
// import ArPaymentMethod from './pages/ar/PaymentMethod';
// import ArTransaction from './pages/ar/Transaction';
// import ArAccounts from './pages/ar/Accounts';
// import ArWhatsApp from './pages/ar/WhatsApp';

// // Property Management
// import ArOwner from './pages/ar/Owner';
// import ArCategory from './pages/ar/Category';
// import ArUnit from './pages/ar/Unit';
// import ArRental from './pages/ar/Rental';
// import ArRent from './pages/ar/RentList';
// import ArMontlyPayment from './pages/ar/MonthlyPayment';

// // Website
// import ArWebSiteLink from './pages/ar/WebSiteLink';
// import ArSlider from './pages/ar/Slider';

// // Developers & Offers
// import ArDeveloper from './pages/ar/Developer';
// import ArDeveloperEmail from './pages/ar/DeveloperEmail';
// import ArSaleOffer from './pages/ar/Developer'; 
// import OfferSalesPDF from './pages/OfferSalePdf';

// // Monitoring & Management
// import ArMonitor from './pages/ar/Monitor';
// import ArUsers from './pages/ar/Users';
// import ArProfile from './pages/ar/Profile';
// import ArAttendanceReport from './pages/ar/AttendanceReport';
// import ArProperty from './pages/ar/Property';
// import ArCalledCalls from './pages/ar/CalledCalles';
// import ArArea from './pages/ar/WantedArea';
// import ArPermissions from './pages/ar/Permissions';
// import LeadsStagesGuide from './pages/ar/LeadsStagesGuide';

// // Leads & Ads
// import AdLandingPage from './pages/ar/AdLandingPage';
// import AdCreatePage from './pages/ar/AdCreatePage';
// import LeadsDashboard from './pages/ar/LeadsDashboard';
// import OfferSales from './pages/ar/OfferSale/OfferSales';

// // CRM Leads
// import CrmLeads from './pages/ar/CrmLeads'; 

// // ==========================================
// // ENGLISH PAGES 
// // ==========================================
// import Login from './pages/en/Login';
// import Signup from './pages/en/Signup';

// // ✅ ADDED: Import the English Dashboard
// import EnDashboard from './pages/en/Dashboard'; 


// function App() {
//   return (
//     <Router>
//       <ToastContainer />
      
//       <Routes>
//         {/* ========================================== */}
//         {/* 1. PUBLIC PAGES (No Sidebar/Navbar)        */}
//         {/* ========================================== */}
//         <Route path="/ar/login" element={<ArLogin />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/signup" element={<Signup />} />
        
//         <Route path="/ar-whatsapp" element={<ArWhatsApp />} />
        
//         {/* Public Ads & Leads Dashboards */}
//         <Route path="/ad-preview/:id" element={<AdLandingPage />} />
//         <Route path="/ad/create" element={<AdCreatePage />} />
//         <Route path="/leads" element={<LeadsDashboard />} />

//         {/* Public Offer Sales */}
//         <Route path="/offer-sales" element={<OfferSales />} />

//         {/* ========================================== */}
//         {/* 2. ARABIC ROUTES (Inside MainLayout)       */}
//         {/* ========================================== */}
//         {/*
//           ✅ EXPLANATION: 
//           This <Route> acts as a wrapper for all Arabic pages. 
//           Because it has path="/ar", any child route inside it will automatically 
//           be prefixed with "/ar". 
//           It also passes lang="ar" to MainLayout, so the Navbar and Sidebar 
//           will render on the RIGHT side and display in Arabic.
//         */}
//         <Route path="/ar" element={<MainLayout lang="ar" />}>
          
//           <Route path="crm/leads" element={<CrmLeads />} />

//           <Route path="dashboard" element={<ArDashboard />} />
//           <Route path="users" element={<ArUsers />} />
//           <Route path="permissions" element={<ArPermissions />} />
//           <Route path="profile" element={<ArProfile />} />
//           <Route path="attendance" element={<ArAttendanceReport />} />
          
//           <Route path="bank" element={<ArBank />} />
//           <Route path="cash" element={<ArCash />} />
//           <Route path="paymethod" element={<ArPaymentMethod />} />
//           <Route path="accounts" element={<ArAccounts />} />
//           <Route path="transaction" element={<ArTransaction />} />

//           <Route path="owner" element={<ArOwner />} />
//           <Route path="unit" element={<ArUnit />} />
//           <Route path="category" element={<ArCategory />} />
//           <Route path="rentals" element={<ArRental />} />
//           <Route path="rent" element={<ArRent />} />
//           <Route path="monthly-payment" element={<ArMontlyPayment />} />

//           <Route path="website" element={<ArWebSiteLink />} />
//           <Route path="slider" element={<ArSlider />} />

//           <Route path="developer" element={<ArDeveloper />} />
//           <Route path="developer-email" element={<ArDeveloperEmail />} />
          
//           <Route path="offer-sale" element={<OfferSalesPDF />} />
//           <Route path="sale-offer" element={<ArSaleOffer />} />
//           <Route path="leadstagesguide" element={<LeadsStagesGuide />} />

//           <Route path="monitor" element={<ArMonitor />} />
//           <Route path="property" element={<ArProperty />} />
//           <Route path="calledcalls" element={<ArCalledCalls />} />
//           <Route path="area" element={<ArArea />} />
//         </Route>

//         {/* ========================================== */}
//         {/* 3. ENGLISH ROUTES (Inside MainLayout)      */}
//         {/* ========================================== */}
//         {/*
//           ✅ EXPLANATION: 
//           This <Route> acts as a wrapper for all English pages. 
//           It has path="/en", so child routes automatically get "/en" prefix.
//           It passes lang="en" to MainLayout, so the Navbar and Sidebar 
//           will render on the LEFT side (LTR) and display in English.
//         */}
//         <Route path="/en" element={<MainLayout lang="en" />}>
          
//           {/* ✅ ADDED: English Dashboard Route */}
//           {/* URL will be: /en/dashboard */}
//           <Route path="dashboard" element={<EnDashboard />} />

//           {/* Uncomment these as you build the English pages */}
//           {/* <Route path="leads" element={<EnLeads />} /> */}
//         </Route>

//         {/* ========================================== */}
//         {/* 4. ROOT & CATCH-ALL (Must be at the bottom)*/}
//         {/* ========================================== */}
//         {/*
//           ✅ EXPLANATION:
//           If someone visits the root URL ("/") or types an invalid URL, 
//           they are automatically redirected to the Arabic dashboard.
//         */}
//         <Route path="/" element={<Navigate to="/ar/dashboard" replace />} />
//         <Route path="*" element={<Navigate to="/ar/dashboard" replace />} />

//       </Routes>
//     </Router>
//   );
// }

// export default App;




// import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
// import MainLayout from "./pages/MainLayout";
// import { ToastContainer } from 'react-toastify';
// import PrivateRouter from './components/PrivateRouter';

// // ==========================================
// // ARABIC PAGES
// // ==========================================
// import ArLogin from './pages/ar/Login';
// import ArDashboard from './pages/ar/Dashboard';
// import ArBank from './pages/ar/Bank';
// import ArCash from './pages/ar/Cash';
// import ArPaymentMethod from './pages/ar/PaymentMethod';
// import ArTransaction from './pages/ar/Transaction';
// import ArAccounts from './pages/ar/Accounts';
// import ArWhatsApp from './pages/ar/WhatsApp';

// // Property Management
// import ArOwner from './pages/ar/Owner';
// import ArCategory from './pages/ar/Category';
// import ArUnit from './pages/ar/Unit';
// import ArRental from './pages/ar/Rental';
// import ArRent from './pages/ar/RentList';
// import ArMontlyPayment from './pages/ar/MonthlyPayment';

// // Website
// import ArWebSiteLink from './pages/ar/WebSiteLink';
// import ArSlider from './pages/ar/Slider';

// // Developers & Offers
// import ArDeveloper from './pages/ar/Developer';
// import ArDeveloperEmail from './pages/ar/DeveloperEmail';
// import ArSaleOffer from './pages/ar/Developer'; // Note: Make sure this is the correct file
// import OfferSalesPDF from './pages/OfferSalePdf';

// // Monitoring & Management
// import ArMonitor from './pages/ar/Monitor';
// import ArUsers from './pages/ar/Users';
// import ArProfile from './pages/ar/Profile';
// import ArAttendanceReport from './pages/ar/AttendanceReport';
// import ArProperty from './pages/ar/Property';
// import ArCalledCalls from './pages/ar/CalledCalles';
// import ArArea from './pages/ar/WantedArea';
// import ArPermissions from './pages/ar/Permissions';
// import LeadsStagesGuide from './pages/ar/LeadsStagesGuide';

// // Leads & Ads
// import AdLandingPage from './pages/ar/AdLandingPage';
// import AdCreatePage from './pages/ar/AdCreatePage';
// import LeadsDashboard from './pages/ar/LeadsDashboard';
// import OfferSales from './pages/ar/OfferSale/OfferSales';

// // CRM Leads
// import CrmLeads from './pages/ar/CrmLeads'; 




// // ==========================================
// // ENGLISH PAGES 
// // (Uncomment and import as you build them)
// // ==========================================
// import Login from './pages/en/Login';
// import Signup from './pages/en/Signup';




// function App() {
//   return (
//     <Router>
//       <ToastContainer />
      
//       <Routes>
//         {/* ========================================== */}
//         {/* 1. PUBLIC PAGES (No Sidebar/Navbar)        */}
//         {/* ========================================== */}
//         <Route path="/ar/login" element={<ArLogin />} />
//         <Route path="/login" element={<Login />} />
//         <Route path="/signup" element={<Signup />} />
        
//         <Route path="/ar-whatsapp" element={<ArWhatsApp />} />
        
//         {/* Public Ads & Leads Dashboards */}
//         <Route path="/ad-preview/:id" element={<AdLandingPage />} />
//         <Route path="/ad/create" element={<AdCreatePage />} />
//         <Route path="/leads" element={<LeadsDashboard />} />

       

//         {/* Public Offer Sales */}
//         <Route path="/offer-sales" element={<OfferSales />} />

//         {/* ========================================== */}
//         {/* 2. ARABIC ROUTES (Inside MainLayout)       */}
//         {/* ========================================== */}
//         <Route path="/ar" element={<MainLayout lang="ar" />}>
          
//           {/* Note: Paths here do NOT start with a slash (e.g., "dashboard" not "/ar/dashboard") */}
//             {/* Start CRM Leads */}
//           <Route path="crm/leads" element={<CrmLeads />} />
//             {/* End CRM Leads */}

//           <Route path="dashboard" element={<ArDashboard />} />
//           <Route path="users" element={<ArUsers />} />
//           <Route path="permissions" element={<ArPermissions />} />
//           <Route path="profile" element={<ArProfile />} />
//           <Route path="attendance" element={<ArAttendanceReport />} />
          
//           <Route path="bank" element={<ArBank />} />
//           <Route path="cash" element={<ArCash />} />
//           <Route path="paymethod" element={<ArPaymentMethod />} />
//           <Route path="accounts" element={<ArAccounts />} />
//           <Route path="transaction" element={<ArTransaction />} />

//           <Route path="owner" element={<ArOwner />} />
//           <Route path="unit" element={<ArUnit />} />
//           <Route path="category" element={<ArCategory />} />
//           <Route path="rentals" element={<ArRental />} />
//           <Route path="rent" element={<ArRent />} />
//           <Route path="monthly-payment" element={<ArMontlyPayment />} />

//           <Route path="website" element={<ArWebSiteLink />} />
//           <Route path="slider" element={<ArSlider />} />

//           <Route path="developer" element={<ArDeveloper />} />
//           <Route path="developer-email" element={<ArDeveloperEmail />} />
          
//           <Route path="offer-sale" element={<OfferSalesPDF />} />
//           <Route path="sale-offer" element={<ArSaleOffer />} />
//           <Route path="leadstagesguide" element={<LeadsStagesGuide />} />

//           <Route path="monitor" element={<ArMonitor />} />
//           <Route path="property" element={<ArProperty />} />
//           <Route path="calledcalls" element={<ArCalledCalls />} />
//           <Route path="area" element={<ArArea />} />
//         </Route>

//         {/* ========================================== */}
//         {/* 3. ENGLISH ROUTES (Inside MainLayout)      */}
//         {/* ========================================== */}
//         <Route path="/en" element={<MainLayout lang="en" />}>
//           {/* Uncomment these as you build the English pages */}
//           {/* <Route path="dashboard" element={<EnDashboard />} /> */}
//           {/* <Route path="leads" element={<EnLeads />} /> */}
//         </Route>

//         {/* ========================================== */}
//         {/* 4. ROOT & CATCH-ALL (Must be at the bottom)*/}
//         {/* ========================================== */}
//         {/* Redirect root to Arabic dashboard by default */}
//         <Route path="/" element={<Navigate to="/ar/dashboard" replace />} />
//         <Route path="*" element={<Navigate to="/ar/dashboard" replace />} />

//       </Routes>
//     </Router>
//   );
// }

// export default App;


