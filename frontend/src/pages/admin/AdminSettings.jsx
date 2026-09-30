import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, IS_MOCK } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { ConfirmButton } from '../../components/ui';
import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { Field } from '../auth/AuthPages';

export default function AdminSettings() {
  const { refreshSettings } = useBooking();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getSettings().then(setForm);
  }, []);

  if (!form) return <div className="loader" aria-label="Loading" />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api.updateSettings(form);
      await refreshSettings();
      setMsg('Settings saved. New bookings use these values.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Settings" sub="Rules that apply to every event on FlashTix." />
      <form className="panel form-panel narrow-panel" onSubmit={save} noValidate>
        <Field id="s-fee" label="Booking fee per ticket (₹)" type="number" min="0" value={form.bookingFee} onChange={set('bookingFee')} hint="Added on top of the ticket price at checkout." />
        <Field id="s-max" label="Maximum tickets per person" type="number" min="1" max="20" value={form.maxPerUser} onChange={set('maxPerUser')} hint="Organizers can set a lower limit for their event, never a higher one." />
        <Field id="s-hold" label="Seat hold time (minutes)" type="number" min="1" max="15" value={form.holdMinutes} onChange={set('holdMinutes')} hint="How long seats stay reserved while a buyer pays." />
        {error && <p className="alert" role="alert">{error}</p>}
        {msg && <p className="notice good" role="status">{msg}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
      </form>

      {IS_MOCK && (
        <section className="panel narrow-panel danger-zone">
          <h2>Demo data</h2>
          <p className="muted">Put every event, booking and account back to how the demo started. You'll be signed out.</p>
          <ConfirmButton
            label="Reset demo data"
            question="Erase all changes?"
            confirmLabel="Reset"
            onConfirm={async () => {
              await api.resetDemo();
              logout();
              navigate('/login');
            }}
          />
        </section>
      )}
    </>
  );
}
