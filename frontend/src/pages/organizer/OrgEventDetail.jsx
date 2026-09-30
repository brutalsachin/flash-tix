import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import SeatMap, { LayoutPreview } from '../../components/SeatMap';
import { ConfirmButton, Empty, Meter, Stat, StatusBadge, downloadCsv } from '../../components/ui';
import { formatDateTime, formatINR, formatTime } from '../../utils';

export default function OrgEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [e, setE] = useState(null);
  const [rows, setRows] = useState(null);
  const [people, setPeople] = useState([]);
  const [tab, setTab] = useState('seats');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.orgEvent(id).then(setE).catch((err) => setError(err.message));
    api.getSeats(id).then(setRows).catch(() => {});
    api.attendees(id).then(setPeople).catch(() => {});
  }, [id]);

  // Refresh every 5 s so the seat map and numbers stay live during a sale.
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  if (error && !e) return <Empty action={<Link to="/organizer/events" className="btn btn-dark">Back to my events</Link>}>{error}</Empty>;
  if (!e) return <div className="loader" aria-label="Loading" />;

  const isDraft = ['DRAFT', 'REJECTED'].includes(e.status);
  const published = e.status === 'PUBLISHED';
  const term = q.trim().toLowerCase();
  const shown = people.filter((b) => !term || `${b.id} ${b.name} ${b.email} ${b.seats.join(' ')}`.toLowerCase().includes(term));

  const exportCsv = () =>
    downloadCsv(`${e.title.replace(/\W+/g, '-').toLowerCase()}-attendees.csv`, [
      ['Booking ID', 'Name', 'Email', 'Phone', 'Seats', 'Amount', 'Status', 'Booked at', 'Checked in at'],
      ...people.map((b) => [b.id, b.name, b.email, b.phone, b.seats.join(' '), b.amount, b.status, b.createdAt, b.checkedInAt || '']),
    ]);

  return (
    <>
      <PageHead
        back={{ to: '/organizer/events', label: 'My events' }}
        title={e.title}
        sub={`${e.venue}, ${e.city} · ${formatDateTime(e.startsAt)}`}
        actions={
          <>
            <StatusBadge status={e.state} />
            {(isDraft || published || e.status === 'PENDING') && e.state !== 'ENDED' && (
              <Link to={`/organizer/events/${id}/edit`} className="btn btn-ghost btn-small">Edit</Link>
            )}
            {published && e.state !== 'ENDED' && <Link to={`/events/${id}`} className="btn btn-ghost btn-small">View on site</Link>}
          </>
        }
      />

      {e.status === 'REJECTED' && <p className="notice bad"><strong>Changes requested:</strong> {e.rejectionReason}</p>}
      {e.status === 'PENDING' && <p className="notice warn">This event is with the FlashTix team for approval. You'll get an email once it's live.</p>}
      {e.status === 'CANCELLED' && <p className="notice bad">This event was cancelled. Every buyer has been refunded.</p>}

      {isDraft ? (
        <section className="panel decision">
          <div>
            <h2>This is a draft</h2>
            <p className="muted">Nobody can see it yet. Submit it when the details are final.</p>
          </div>
          <div className="row-actions">
            <button
              className="btn"
              onClick={async () => {
                try {
                  await api.submitEvent(id);
                  load();
                } catch (err) {
                  setError(err.message);
                }
              }}
            >
              Submit for approval
            </button>
            <ConfirmButton
              label="Delete draft"
              question="Delete this draft?"
              confirmLabel="Delete"
              onConfirm={async () => {
                await api.deleteDraft(id);
                navigate('/organizer/events');
              }}
            />
          </div>
          {error && <p className="alert" role="alert">{error}</p>}
        </section>
      ) : (
        <div className="stat-row">
          <Stat label="Seats sold" value={`${e.stats.sold} / ${e.stats.capacity}`} note={<Meter value={e.stats.sold} max={e.stats.capacity} />} />
          <Stat label="On hold right now" value={e.stats.held} note="Buyers currently paying" />
          <Stat label="Ticket sales" value={formatINR(e.stats.revenue)} note={`${e.stats.bookings} bookings`} />
          <Stat label="Checked in" value={e.stats.checkedIn} note={e.state === 'UPCOMING' ? `Sale opens ${formatDateTime(e.saleOpensAt)}` : `Gates open ${formatTime(new Date(new Date(e.startsAt) - 36e5).toISOString())}`} />
        </div>
      )}

      {isDraft || e.status === 'PENDING' ? (
        <section className="panel">
          <h2>Seat layout</h2>
          <LayoutPreview layout={e.layout} />
        </section>
      ) : (
        <>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'seats'} className={`tab ${tab === 'seats' ? 'active' : ''}`} onClick={() => setTab('seats')}>Live seat map</button>
            <button role="tab" aria-selected={tab === 'people'} className={`tab ${tab === 'people' ? 'active' : ''}`} onClick={() => setTab('people')}>
              Attendees <span className="tab-count">{people.length}</span>
            </button>
          </div>

          {tab === 'seats' ? (
            <section className="panel">
              <div className="panel-head">
                <h2>Seat map</h2>
                <span className="muted small">Updates every 5 seconds</span>
              </div>
              {rows ? <SeatMap rows={rows} readOnly /> : <div className="loader" aria-label="Loading" />}
            </section>
          ) : (
            <section className="panel flush">
              <div className="toolbar in-panel">
                <label className="search-box">
                  <span className="sr-only">Search attendees</span>
                  <input id="att-search" type="search" placeholder="Name, email, booking ID or seat" value={q} onChange={(ev) => setQ(ev.target.value)} />
                </label>
                <button className="btn btn-ghost btn-small" onClick={exportCsv} disabled={!people.length}>Export CSV</button>
              </div>
              {shown.length === 0 ? (
                <Empty>No attendees yet.</Empty>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Booking</th><th>Name</th><th>Seats</th><th>Paid</th><th>Status</th><th>Check-in</th></tr></thead>
                    <tbody>
                      {shown.map((b) => (
                        <tr key={b.id}>
                          <td className="mono">{b.id}</td>
                          <td>{b.name}<span className="cell-sub">{b.email}</span></td>
                          <td>{b.seats.join(', ')}</td>
                          <td className="num">{formatINR(b.amount)}</td>
                          <td><StatusBadge status={b.status} /></td>
                          <td>{b.checkedInAt ? formatTime(b.checkedInAt) : <span className="muted">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {published && e.state !== 'ENDED' && (
            <section className="panel danger-zone">
              <h2>Cancel this event</h2>
              <p className="muted">Everyone who booked gets a full refund and an email. This can't be undone.</p>
              <ConfirmButton
                label="Cancel event"
                question={`Refund ${e.stats.bookings} booking${e.stats.bookings === 1 ? '' : 's'}?`}
                confirmLabel="Cancel and refund everyone"
                onConfirm={async () => {
                  await api.cancelEvent(id, 'Cancelled by organizer');
                  load();
                }}
              />
            </section>
          )}
        </>
      )}
    </>
  );
}
