import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import Countdown from '../components/Countdown';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatINR, formatTime } from '../utils';

export default function Checkout() {
  const { hold, remainingMs, totalMs, expired, cancelHold, clearHold, fee: feeFor } = useBooking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!hold) {
    return (
      <div className="container section narrow">
        <h1>Nothing to check out</h1>
        <p>Choose seats for an event first.</p>
        <Link to="/" className="btn">Browse events</Link>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="container section narrow">
        <h1>Your hold has expired</h1>
        <p>Seats {hold.seatIds.join(', ')} have been released. They may still be available.</p>
        <Link to={`/events/${hold.eventId}`} className="btn" onClick={clearHold}>Choose seats again</Link>
      </div>
    );
  }

  const subtotal = hold.seats.reduce((s, x) => s + x.price, 0);
  const fee = feeFor(hold.seats.length);
  const pct = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const urgent = remainingMs < 60_000;

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Enter the name for the tickets.';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email, like name@example.com.';
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\D/g, '').slice(-10)))
      e.phone = 'Enter a 10-digit mobile number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate() || busy) return;
    setBusy(true);
    setSubmitError('');
    try {
      const booking = await api.createBooking({ holdId: hold.holdId, ...form });
      clearHold();
      navigate(`/confirmation/${booking.id}`, { state: { booking } });
    } catch (e) {
      setSubmitError(e.message);
      setBusy(false);
    }
  };

  const release = async () => {
    const eventId = hold.eventId;
    await cancelHold();
    navigate(`/events/${eventId}`);
  };

  const field = (name, label, type, autoComplete, extra = {}) => (
    <div className={`field ${errors[name] ? 'has-error' : ''}`}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        type={type}
        autoComplete={autoComplete}
        value={form[name]}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `${name}-err` : undefined}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        {...extra}
      />
      {errors[name] && <p id={`${name}-err`} className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="container section">
      <div className={`timer-bar ${urgent ? 'urgent' : ''}`} role="timer">
        <div className="timer-bar-text">
          <span>Seats held for</span>
          <Countdown ms={remainingMs} compact />
        </div>
        <div className="timer-track" aria-hidden="true">
          <div className="timer-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="booking-layout checkout">
        <form className="panel" onSubmit={submit} noValidate>
          <h1 className="h2">Your details</h1>
          <p className="muted">Tickets are sent to this email and phone.</p>
          {field('name', 'Full name', 'text', 'name')}
          {field('email', 'Email', 'email', 'email')}
          {field('phone', 'Mobile number', 'tel', 'tel', { inputMode: 'numeric', placeholder: '98765 43210' })}

          {submitError && <p className="alert" role="alert">{submitError}</p>}

          <button className="btn btn-block" disabled={busy}>
            {busy ? 'Confirming…' : `Pay ${formatINR(subtotal + fee)}`}
          </button>
          <button type="button" className="link-btn center" onClick={release}>
            Release seats and go back
          </button>
        </form>

        <aside className="panel summary">
          <h2>{hold.event.title}</h2>
          <p className="muted">
            {formatDate(hold.event.startsAt)}, {formatTime(hold.event.startsAt)} · {hold.event.venue}
          </p>
          <ul className="summary-seats">
            {hold.seats.map((s) => (
              <li key={s.id}>
                <span className="seat-tag">{s.id}</span>
                <span>{formatINR(s.price)}</span>
              </li>
            ))}
          </ul>
          <dl className="totals">
            <div><dt>Tickets</dt><dd>{formatINR(subtotal)}</dd></div>
            <div><dt>Booking fee</dt><dd>{formatINR(fee)}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{formatINR(subtotal + fee)}</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
