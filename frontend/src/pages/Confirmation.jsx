import { Link, useLocation, useParams } from 'react-router-dom';
import Barcode from '../components/Barcode';
import { ROW_LETTERS, tierForRow } from '../data/mockData';
import { formatDate, formatINR, formatTime } from '../utils';

export default function Confirmation() {
  const { bookingId } = useParams();
  const { state } = useLocation();
  const booking = state?.booking;

  return (
    <div className="container section confirm">
      <div className="confirm-copy">
        <div className="confirm-icon" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24">
            <path d="m5 12 5 5 9-10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1>You're going!</h1>
        <p className="muted">
          Booking <strong>{bookingId}</strong> is confirmed.
          {booking && <> We've sent your tickets to {booking.email}.</>}
        </p>
        <p className="muted">Show the barcode at the gate. Each seat on the pass lets one person in.</p>
        <div className="row-actions">
          <Link to="/tickets" className="btn btn-dark">View my tickets</Link>
          <Link to="/" className="btn btn-ghost">Find more events</Link>
        </div>
      </div>

      {booking && <TicketStub booking={booking} />}
    </div>
  );
}

// Boarding-pass style ticket.
export function TicketStub({ booking, actions }) {
  const { event } = booking;
  const gates = new Date(new Date(event.startsAt).getTime() - 60 * 60 * 1000).toISOString();
  const tiers = [...new Set(booking.seats.map((id) => tierForRow(event.layout, ROW_LETTERS.indexOf(id.replace(/\d+/g, ''))).name))].join(', ');
  const row = [...new Set(booking.seats.map((s) => s.replace(/\d+/g, '')))].join(', ');

  return (
    <article className={`pass ${booking.status !== 'CONFIRMED' ? 'void' : ''}`} style={{ '--hue': event.hue }}>
      <header className="pass-head">
        <div className="pass-head-top">
          <span className="pill on-dark">{event.category}</span>
          <span className="pass-brand">FlashTix</span>
        </div>
        <h2>{event.title}</h2>
        <p>{event.venue}, {event.city}</p>
      </header>

      <div className="pass-body">
        <div className="pass-route">
          <div>
            <span className="pass-label">Row</span>
            <span className="pass-big">{row}</span>
          </div>
          <svg className="pass-bolt" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="currentColor" />
          </svg>
          <div className="right">
            <span className="pass-label">Show</span>
            <span className="pass-big">{formatTime(event.startsAt)}</span>
          </div>
        </div>

        <dl className="pass-grid">
          <div><dt>Name</dt><dd>{booking.name}</dd></div>
          <div><dt>Date</dt><dd>{formatDate(event.startsAt)}</dd></div>
          <div><dt>Seats</dt><dd>{booking.seats.join(', ')}</dd></div>
          <div><dt>Gates open</dt><dd>{formatTime(gates)}</dd></div>
          <div><dt>Section</dt><dd>{tiers}</dd></div>
          <div><dt>Paid</dt><dd>{formatINR(booking.total)}</dd></div>
        </dl>
      </div>

      <div className="pass-perf" aria-hidden="true" />

      <footer className="pass-foot">
        {booking.status === 'CONFIRMED' ? (
          <Barcode seed={booking.id} label={`Entry barcode for booking ${booking.id}`} />
        ) : (
          <p className="pass-void">{booking.status === 'REFUNDED' ? `Refunded ${formatINR(booking.total)}` : 'Not valid for entry'}</p>
        )}
        <span className="pass-id">{booking.id}{booking.checkedInAt ? ` · checked in ${formatTime(booking.checkedInAt)}` : ''}</span>
        {actions}
      </footer>
    </article>
  );
}
