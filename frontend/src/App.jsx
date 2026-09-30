import { useEffect, useState } from 'react';
import { Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Header, { Logo } from './components/Header';
import HoldBanner from './components/HoldBanner';
import RequireRole from './components/RequireRole';
import DashboardLayout from './components/DashboardLayout';
import { api } from './api/client';

import Home from './pages/Home';
import EventPage from './pages/EventPage';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import MyTickets from './pages/MyTickets';
import NotFound from './pages/NotFound';
import { Login, Signup, AcceptInvite } from './pages/auth/AuthPages';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents, { AdminEventReview } from './pages/admin/AdminEvents';
import AdminOrganizers from './pages/admin/AdminOrganizers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBookings from './pages/admin/AdminBookings';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAudit from './pages/admin/AdminAudit';

import OrgDashboard from './pages/organizer/OrgDashboard';
import OrgEvents from './pages/organizer/OrgEvents';
import OrgEventForm from './pages/organizer/OrgEventForm';
import OrgEventDetail from './pages/organizer/OrgEventDetail';
import OrgCheckIn from './pages/organizer/OrgCheckIn';

function PublicLayout() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <HoldBanner />
      <main id="main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container">
          <span className="logo small"><Logo /></span>
          <p>Seats are held for you while you check out.</p>
        </div>
      </footer>
    </>
  );
}

function AdminShell() {
  const [pending, setPending] = useState(0);
  const { pathname } = useLocation();
  useEffect(() => {
    api.adminStats().then((s) => setPending(s.pending)).catch(() => {});
  }, [pathname]);
  return (
    <RequireRole roles={['ADMIN']}>
      <DashboardLayout
        role="ADMIN"
        nav={[
          { to: '/admin', end: true, icon: 'home', label: 'Overview' },
          { to: '/admin/events', icon: 'events', label: 'Events', badge: pending },
          { to: '/admin/organizers', icon: 'people', label: 'Organizers' },
          { to: '/admin/users', icon: 'users', label: 'Users' },
          { to: '/admin/bookings', icon: 'bookings', label: 'Bookings' },
          { to: '/admin/settings', icon: 'settings', label: 'Settings' },
          { to: '/admin/audit', icon: 'log', label: 'Activity log' },
        ]}
      />
    </RequireRole>
  );
}

function OrganizerShell() {
  return (
    <RequireRole roles={['ORGANIZER']}>
      <DashboardLayout
        role="ORGANIZER"
        nav={[
          { to: '/organizer', end: true, icon: 'home', label: 'Overview' },
          { to: '/organizer/events', icon: 'events', label: 'My events' },
          { to: '/organizer/events/new', icon: 'plus', label: 'New event' },
          { to: '/organizer/check-in', icon: 'scan', label: 'Check-in' },
        ]}
      />
    </RequireRole>
  );
}

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="/checkout" element={<RequireRole roles={['USER']}><Checkout /></RequireRole>} />
        <Route path="/confirmation/:bookingId" element={<RequireRole roles={['USER']}><Confirmation /></RequireRole>} />
        <Route path="/tickets" element={<RequireRole roles={['USER']}><MyTickets /></RequireRole>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/invite/:token" element={<AcceptInvite />} />

      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<AdminDashboard />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="events/:id" element={<AdminEventReview />} />
        <Route path="organizers" element={<AdminOrganizers />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="bookings" element={<AdminBookings />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="audit" element={<AdminAudit />} />
      </Route>

      <Route path="/organizer" element={<OrganizerShell />}>
        <Route index element={<OrgDashboard />} />
        <Route path="events" element={<OrgEvents />} />
        <Route path="events/new" element={<OrgEventForm />} />
        <Route path="events/:id" element={<OrgEventDetail />} />
        <Route path="events/:id/edit" element={<OrgEventForm />} />
        <Route path="check-in" element={<OrgCheckIn />} />
      </Route>
    </Routes>
  );
}
