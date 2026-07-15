import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import SearchResultsPage from './pages/SearchResultsPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import BookingConfirmPage from './pages/BookingConfirmPage';
import DashboardPage from './pages/DashboardPage';
import TicketPage from './pages/TicketPage';
import AgencyLayout from './pages/agency/AgencyLayout';
import AgencyDashboard from './pages/agency/AgencyDashboard';
import AgencyDepartures from './pages/agency/AgencyDepartures';
import AgencyVehicles from './pages/agency/AgencyVehicles';
import AgencyValidate from './pages/agency/AgencyValidate';
import AgencyPassengers from './pages/agency/AgencyPassengers';
import AgencyRefunds from './pages/agency/AgencyRefunds';
import LuggageSettings from './pages/agency/LuggageSettings'; 
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPayments from './pages/admin/AdminPayments';
import SendParcelPage from './pages/SendParcelPage';
import TrackParcelPage from './pages/TrackParcelPage';
import AgencyParcels from './pages/agency/AgencyParcels';
import AdminCities from './pages/admin/AdminCities';
import AgencyUsers from './pages/agency/AgencyUsers';
import AdminRoutes from './pages/admin/AdminRoutes';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import ParcelSettings from './pages/agency/ParcelSettings';
import AgencyPayments from './pages/agency/AgencyPayments';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Traveler routes */}
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/search" element={<Layout><SearchResultsPage /></Layout>} />
        <Route path="/seats/:departureId" element={<Layout><SeatSelectionPage /></Layout>} />
        <Route path="/confirm/:departureId" element={<Layout><BookingConfirmPage /></Layout>} />
        <Route path="/dashboard" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/ticket/:bookingId" element={<Layout><TicketPage /></Layout>} />
        <Route path="/send-parcel" element={<Layout><SendParcelPage /></Layout>} />
        <Route path="/track" element={<Layout><TrackParcelPage /></Layout>} />
        <Route path="/agency/users" element={<AgencyLayout><AgencyUsers /></AgencyLayout>} />

        {/* Agency routes */}
        <Route path="/agency" element={<AgencyLayout><AgencyDashboard /></AgencyLayout>} />
        <Route path="/agency/departures" element={<AgencyLayout><AgencyDepartures /></AgencyLayout>} />
        <Route path="/agency/vehicles" element={<AgencyLayout><AgencyVehicles /></AgencyLayout>} />
        <Route path="/agency/validate" element={<AgencyLayout><AgencyValidate /></AgencyLayout>} />
        <Route path="/agency/passengers/:departureId" element={<AgencyLayout><AgencyPassengers /></AgencyLayout>} />
        <Route path="/agency/parcels" element={<AgencyLayout><AgencyParcels /></AgencyLayout>} />
        <Route path="/agency/refunds" element={<AgencyLayout><AgencyRefunds /></AgencyLayout>} />
        {/* NOUVELLE ROUTE CONFIG BAGAGES */}
        <Route path="/agency/luggage-settings" element={<AgencyLayout><LuggageSettings /></AgencyLayout>} />
        <Route path="/agency/parcel-settings" element={<AgencyLayout><ParcelSettings /></AgencyLayout>} />
        <Route path="/agency/payments" element={<AgencyLayout><AgencyPayments /></AgencyLayout>} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/companies" element={<AdminLayout><AdminCompanies /></AdminLayout>} />
        <Route path="/admin/routes" element={<AdminLayout><AdminRoutes /></AdminLayout>} />
        <Route path="/admin/cities" element={<AdminLayout><AdminCities /></AdminLayout>} />
        <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
        <Route path="/admin/payments" element={<AdminLayout><AdminPayments /></AdminLayout>} />

        {/* Conditions d'utilisation */}
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}