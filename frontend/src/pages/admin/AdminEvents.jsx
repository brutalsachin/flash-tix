import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { LayoutPreview } from '../../components/SeatMap';
import { ConfirmButton, Empty, Meter, StatusBadge } from '../../components/ui';
import { formatDate, formatDateTime, formatINR, formatTime, timeAgo } from '../../utils';
import { capacityOf } from '../../data/mockData';

const TABS = [
  { key: 'PENDING', label: 'Waiting for approval', match: (e) => e.status === 'PENDING' },
  { key: 'LIVE', label: 'Live', match: (e) => ['ON_SALE', 'UPCOMING', 'SOLD_OUT'].includes(e.state) },
  { key: 'REJECTED', label: 'Changes requested', match: (e) => e.status === 'REJECTED' },
  { key: 'CLOSED', label: 'Ended or cancelled', match: (e) => ['ENDED', 'CANCELLED'].includes(e.state) },
  { key: 'ALL', label: 'All', match: () => true },
];

export default function AdminEvents() {
  const [events, setEvents] = useState(null);
  const [tab, setTab] = useState('PENDING');

  useEffect(() => {
    api.adminEvents().then(setEvents);
  }, []);

  if (!events) return <div className="loader" aria-label="Loading" />;
  const current = TABS.find((t) => t.key === tab);
  const list = events.filter(current.match);

  return (
    <>
      <PageHead title="Events" sub="Review new events before they go on sale, and keep an eye on live ones." />
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label} <span className="tab-count">{events.filter(t.match).length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty>No events here.</Empty>
      ) : (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Organizer</th>
                <th>Show date</th>
                <th>Status</th>
                <th>Sold</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.title}</strong>
                    <span className="cell-sub">{e.venue}, {e.city}</span>
                  </td>
                  <td>{e.organizer?.orgName}<span className="cell-sub">{e.organizer?.name}</span></td>
                  <td>{formatDate(e.startsAt)}<span className="cell-sub">{formatTime(e.startsAt)}</span></td>
                  <td><StatusBadge status={e.state} /></td>
                  <td className="cell-meter">
                    {e.status === 'PUBLISHED' ? <Meter value={e.stats.sold} max={e.stats.capacity} /> : <span className="muted">—</span>}
                  </td>
                  <td className="cell-actions">
                    <Link to={`/admin/events/${e.id}`} className={`btn btn-small ${e.status === 'PENDING' ? '' : 'btn-ghost'}`}>
                      {e.status === 'PENDING' ? 'Review' : 'View'}
                    </Link>
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

export function AdminEventReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [e, setE] = useState(null);
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.orgEvent(id).then(setE).catch((err) => setError(err.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error && !e) return <Empty action={<Link to="/admin/events" className="btn btn-dark">Back to events</Link>}>{error}</Empty>;
  if (!e) return <div className="loader" aria-label="Loading" />;

  const approve = async () => {
    setBusy(true);
    setError('');
    try {
      await api.approveEvent(id);
      navigate('/admin/events');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  const reject = async () => {
    setBusy(true);
    setError('');
    try {
      await api.rejectEvent(id, reason);
      navigate('/admin/events');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        back={{ to: '/admin/events', label: 'Events' }}
        title={e.title}
        sub={`${e.organizer?.orgName} · ${e.organizer?.name}`}
        actions={<StatusBadge status={e.state} />}
      />

      {e.status === 'PENDING' && (
        <section className="panel decision">
          <div>
            <h2>Approve this event?</h2>
            <p className="muted">Once approved, it appears on the site and tickets go on sale at {formatDateTime(e.saleOpensAt)}. The organizer can no longer change seats, prices or dates.</p>
          </div>
          {!rejecting ? (
            <div className="row-actions">
              <button className="btn" onClick={approve} disabled={busy}>Approve and publish</button>
              <button className="btn btn-ghost" onClick={() => setRejecting(true)} disabled={busy}>Request changes</button>
            </div>
          ) : (
            <div className="reject-box">
              <label htmlFor="reject-reason">What should the organizer fix?</label>
              <textarea id="reject-reason" rows="3" value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder="For example: the Premium price looks too high for this venue." />
              <div className="row-actions">
                <button className="btn btn-danger" onClick={reject} disabled={busy}>Send back to organizer</button>
                <button className="btn btn-ghost" onClick={() => setRejecting(false)} disabled={busy}>Back</button>
              </div>
            </div>
          )}
          {error && <p className="alert" role="alert">{error}</p>}
        </section>
      )}

      {e.status === 'REJECTED' && e.rejectionReason && (
        <p className="notice bad"><strong>Changes requested:</strong> {e.rejectionReason}</p>
      )}

      {e.status === 'PUBLISHED' && e.state !== 'ENDED' && (
        <section className="panel decision">
          <div>
            <h2>Sales</h2>
            <p className="muted">{e.stats.sold} of {e.stats.capacity} seats sold · {formatINR(e.stats.revenue)} in ticket sales</p>
          </div>
          <ConfirmButton
            label="Cancel event"
            question={`Refund ${e.stats.bookings} booking${e.stats.bookings === 1 ? '' : 's'}?`}
            confirmLabel="Cancel and refund"
            onConfirm={async () => {
              await api.cancelEvent(id, 'Cancelled by FlashTix');
              load();
            }}
          />
        </section>
      )}

      <div className="two-col">
        <section className="panel">
          <h2>Details</h2>
          <dl className="detail-list">
            <div><dt>Category</dt><dd>{e.category}</dd></div>
            <div><dt>Venue</dt><dd>{e.venue}, {e.city}</dd></div>
            <div><dt>Show</dt><dd>{formatDateTime(e.startsAt)}</dd></div>
            <div><dt>Sale opens</dt><dd>{formatDateTime(e.saleOpensAt)}</dd></div>
            <div><dt>Limit per person</dt><dd>{e.maxPerUser} tickets</dd></div>
            <div><dt>Capacity</dt><dd>{capacityOf(e.layout)} seats</dd></div>
            {e.submittedAt && <div><dt>Submitted</dt><dd>{timeAgo(e.submittedAt)}</dd></div>}
          </dl>
          <h3>Description</h3>
          <p className="muted">{e.description || 'No description.'}</p>
        </section>
        <section className="panel">
          <h2>Seats and prices</h2>
          <table className="table compact">
            <thead><tr><th>Tier</th><th>Rows</th><th>Seats</th><th>Price</th></tr></thead>
            <tbody>
              {e.layout.tiers.map((t) => (
                <tr key={t.name}>
                  <td>{t.name}</td>
                  <td>{t.rows}</td>
                  <td>{t.rows * e.layout.seatsPerRow}</td>
                  <td className="num">{formatINR(t.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <LayoutPreview layout={e.layout} />
        </section>
      </div>
    </>
  );
}
