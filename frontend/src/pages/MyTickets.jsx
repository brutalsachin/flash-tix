import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ConfirmButton } from '../components/ui';
import { TicketStub } from './Confirmation';

export default function MyTickets() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.myBookings().then(setBookings);
  useEffect(() => {
    load();
  }, []);

  if (bookings === null) return <div className="container section"><div className="loader" aria-label="Loading tickets" /></div>;

  const upcoming = bookings.filter((b) => b.status === 'CONFIRMED' && new Date(b.event.startsAt) > new Date());
  const past = bookings.filter((b) => !upcoming.includes(b));
  const canCancel = (b) => new Date(b.event.startsAt) - Date.now() > 24 * 36e5;

  return (
    <div className="container section">
      <h1>My tickets</h1>
      {error && <p className="alert" role="alert">{error}</p>}
      {bookings.length === 0 ? (
        <div className="empty">
          <p>Tickets you book will show up here.</p>
          <Link to="/" className="btn">Find an event</Link>
        </div>
      ) : (
        <>
          <h2 className="list-title">Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className="muted">No upcoming shows. <Link to="/">Find an event</Link></p>
          ) : (
            <div className="ticket-list">
              {upcoming.map((b) => (
                <TicketStub
                  key={b.id}
                  booking={b}
                  actions={
                    canCancel(b) ? (
                      <ConfirmButton
                        label="Cancel booking"
                        question="Cancel and get a full refund?"
                        confirmLabel="Cancel booking"
                        onConfirm={async () => {
                          try {
                            await api.cancelBooking(b.id);
                            load();
                          } catch (e) {
                            setError(e.message);
                          }
                        }}
                      />
                    ) : (
                      <span className="fine">Can't be cancelled within 24 hours of the show.</span>
                    )
                  }
                />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <>
              <h2 className="list-title">Past and refunded</h2>
              <div className="ticket-list">
                {past.map((b) => <TicketStub key={b.id} booking={b} />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
