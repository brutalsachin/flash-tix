import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { ConfirmButton, Empty, StatusBadge } from '../../components/ui';
import { formatDateTime, formatINR } from '../../utils';

export default function AdminBookings() {
  const [q, setQ] = useState('');
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  const load = (term = q) => api.adminBookings(term).then(setList);
  useEffect(() => {
    const t = setTimeout(() => load(q), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <>
      <PageHead title="Bookings" sub="Find any booking by ID, name or email. Refunds go back to the original payment method." />
      <div className="toolbar">
        <label className="search-box">
          <span className="sr-only">Search bookings</span>
          <input id="booking-search" type="search" placeholder="FTX-… , name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {error && <p className="alert">{error}</p>}
      {!list ? (
        <div className="loader" aria-label="Loading" />
      ) : list.length === 0 ? (
        <Empty>No bookings match “{q}”.</Empty>
      ) : (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead>
              <tr><th>Booking</th><th>Buyer</th><th>Event</th><th>Seats</th><th>Total</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td><strong className="mono">{b.id}</strong><span className="cell-sub">{formatDateTime(b.createdAt)}</span></td>
                  <td>{b.name}<span className="cell-sub">{b.email}</span></td>
                  <td>{b.eventTitle}</td>
                  <td>{b.seats.join(', ')}</td>
                  <td className="num">{formatINR(b.total)}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="cell-actions">
                    {b.status === 'CONFIRMED' && (
                      <ConfirmButton
                        label="Refund"
                        question={`Refund ${formatINR(b.total)}?`}
                        confirmLabel="Refund"
                        onConfirm={async () => {
                          try {
                            await api.refundBooking(b.id);
                            load();
                          } catch (e) {
                            setError(e.message);
                          }
                        }}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
