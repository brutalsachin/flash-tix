import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import SeatMap from '../components/SeatMap';
import Countdown from '../components/Countdown';
import { StatusBadge } from '../components/ui';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatINR, formatTime } from '../utils';

export default function EventPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { now, startHold, fee } = useBooking();

  const [event, setEvent] = useState(null);
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reminded, setReminded] = useState(false);

  const loadSeats = () => api.getSeats(id).then(setRows);

  useEffect(() => {
    setSelected([]);
    api
      .getEvent(id)
      .then((e) => {
        setEvent(e);
        return loadSeats();
      })
      .catch((e) => (e.status === 404 ? setNotFound(true) : setError(e.message)));
    if (user?.role === 'USER') api.myReminders().then((ids) => setReminded(ids.includes(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  if (notFound) {
    return (
      <div className="container section narrow">
        <h1>Event not found</h1>
        <p>It may have ended or been removed.</p>
        <Link to="/" className="btn">Browse events</Link>
      </div>
    );
  }
  if (!event) return <div className="container section"><div className="loader" aria-label="Loading" /></div>;

  const maxSeats = event.maxPerUser;
  const saleMs = new Date(event.saleOpensAt).getTime() - now;
  const saleOpen = saleMs <= 0 && event.state !== 'CANCELLED' && event.state !== 'ENDED' && event.status === 'PUBLISHED';
  const subtotal = selected.reduce((s, x) => s + x.price, 0);
  const fees = fee(selected.length);
  const staff = user && user.role !== 'USER';

  const toggle = (seat) => {
    setError('');
    setSelected((cur) => (cur.some((s) => s.id === seat.id) ? cur.filter((s) => s.id !== seat.id) : [...cur, seat]));
  };

  const reserve = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setBusy(true);
    setError('');
    try {
      await startHold(event, selected);
      navigate('/checkout');
    } catch (e) {
      setError(e.message);
      if (e.status === 409) {
        setSelected([]);
        await loadSeats(); // someone else got there first: show fresh availability
      }
    } finally {
      setBusy(false);
    }
  };

  const remind = async () => {
    if (!user) return navigate('/login', { state: { from: location.pathname } });
    setReminded(await api.toggleReminder(id));
  };

  return (
    <div className="container section">
      <Link to="/" className="back">← All events</Link>

      <div className="booking-layout three">
        <header className="event-card" style={{ '--hue': event.hue }}>
          <div className="poster">
            <span className="pill on-dark">{event.category}</span>
            <h1>{event.title}</h1>
          </div>
          <dl className="event-facts">
            <div><dt>Date</dt><dd>{formatDate(event.startsAt)}</dd></div>
            <div><dt>Show</dt><dd>{formatTime(event.startsAt)}</dd></div>
            <div className="wide"><dt>Venue</dt><dd>{event.venue}, {event.city}</dd></div>
            {event.organizer && <div className="wide"><dt>Organised by</dt><dd>{event.organizer.orgName}</dd></div>}
          </dl>
          <p className="event-desc">{event.description}</p>
        </header>

        <section className="panel seats-panel" aria-labelledby="seats-heading">
          <div className="panel-head">
            <h2 id="seats-heading">Select seats</h2>
            <span className="muted">
              {selected.length ? `${selected.length} of ${maxSeats} selected` : `Up to ${maxSeats} per person`}
            </span>
          </div>

          {event.status !== 'PUBLISHED' ? (
            <div className="sale-closed">
              <StatusBadge status={event.state} />
              <p className="sale-note">This is a preview. Buyers can't see this event yet.</p>
            </div>
          ) : event.state === 'CANCELLED' || event.state === 'ENDED' ? (
            <div className="sale-closed"><p>This event is no longer on sale.</p></div>
          ) : !saleOpen ? (
            <div className="sale-closed">
              <p>Tickets for this event open in</p>
              <Countdown ms={saleMs} />
              {!staff && (
                <button className="btn" onClick={remind} aria-pressed={reminded}>
                  {reminded ? "We'll email you when it opens" : 'Remind me when sale opens'}
                </button>
              )}
              <p className="sale-note">Keep this page open. Seats unlock the moment the sale starts.</p>
            </div>
          ) : rows ? (
            <SeatMap rows={rows} selected={selected} onToggle={toggle} maxSeats={maxSeats} readOnly={staff} />
          ) : (
            <div className="loader" aria-label="Loading seats" />
          )}
        </section>

        <aside className="panel summary" aria-labelledby="summary-heading">
          <h2 id="summary-heading">Price</h2>
          {staff ? (
            <p className="muted">You're signed in as {user.role === 'ADMIN' ? 'an admin' : 'an organizer'}. Sign in with a buyer account to book seats.</p>
          ) : selected.length === 0 ? (
            <p className="muted">Tap a seat on the map to add it here.</p>
          ) : (
            <ul className="summary-seats">
              {selected.map((s) => (
                <li key={s.id}>
                  <span className="seat-tag">{s.id}</span>
                  <span>{formatINR(s.price)}</span>
                  <button className="link-btn" onClick={() => toggle(s)} aria-label={`Remove seat ${s.id}`}>Remove</button>
                </li>
              ))}
            </ul>
          )}

          <dl className="totals">
            <div><dt>{selected.length} ticket{selected.length === 1 ? '' : 's'}</dt><dd>{formatINR(subtotal)}</dd></div>
            <div><dt>Booking fee</dt><dd>{formatINR(fees)}</dd></div>
            <div className="grand"><dt>Total</dt><dd>{formatINR(subtotal + fees)}</dd></div>
          </dl>

          {error && <p className="alert" role="alert">{error}</p>}

          {!staff && (
            <>
              <button className="btn btn-block" disabled={!selected.length || busy || !saleOpen} onClick={reserve}>
                {busy
                  ? 'Holding seats…'
                  : !selected.length
                    ? 'Select seats'
                    : !user
                      ? 'Sign in to hold seats'
                      : `Hold ${selected.length} seat${selected.length > 1 ? 's' : ''}`}
              </button>
              <p className="fine">We hold your seats while you pay. Nobody else can take them.</p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
