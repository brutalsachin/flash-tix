import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { Empty, Meter, Stat, StatusBadge } from '../../components/ui';
import { formatCompactINR, formatDate, formatINR, timeAgo } from '../../utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [audit, setAudit] = useState([]);

  useEffect(() => {
    api.adminStats().then(setStats);
    api.adminEvents().then(setEvents);
    api.adminBookings().then((b) => setBookings(b.slice(0, 6)));
    api.auditLog().then((a) => setAudit(a.slice(0, 6)));
  }, []);

  if (!stats) return <div className="loader" aria-label="Loading" />;
  const pending = events.filter((e) => e.status === 'PENDING');
  const live = events.filter((e) => ['ON_SALE', 'UPCOMING', 'SOLD_OUT'].includes(e.state));

  return (
    <>
      <PageHead title="Overview" sub="Everything happening on FlashTix right now." />

      <div className="stat-row">
        <Stat label="Ticket sales" value={formatCompactINR(stats.revenue)} note={`${formatCompactINR(stats.fees)} in booking fees`} />
        <Stat label="Tickets sold" value={stats.ticketsSold.toLocaleString('en-IN')} />
        <Stat label="Live events" value={stats.liveEvents} />
        <Stat label="Organizers" value={stats.organizers} note={`${stats.users} ticket buyers`} />
      </div>

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Waiting for approval</h2>
            <Link to="/admin/events" className="text-link">All events</Link>
          </div>
          {pending.length === 0 ? (
            <Empty>Nothing to review. New events from organizers will show up here.</Empty>
          ) : (
            <ul className="list">
              {pending.map((e) => (
                <li key={e.id}>
                  <div>
                    <strong>{e.title}</strong>
                    <span className="muted">{e.organizer?.orgName} · {formatDate(e.startsAt)} · submitted {timeAgo(e.submittedAt || e.createdAt)}</span>
                  </div>
                  <Link to={`/admin/events/${e.id}`} className="btn btn-small">Review</Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Live events</h2></div>
          <ul className="list">
            {live.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{e.title}</strong>
                  <span className="muted">{e.city} · {e.stats.sold}/{e.stats.capacity} sold</span>
                </div>
                <div className="list-side">
                  <StatusBadge status={e.state} />
                  <Meter value={e.stats.sold} max={e.stats.capacity} label={`${e.title} sold`} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Latest bookings</h2>
            <Link to="/admin/bookings" className="text-link">All bookings</Link>
          </div>
          <ul className="list">
            {bookings.map((b) => (
              <li key={b.id}>
                <div>
                  <strong>{b.name}</strong>
                  <span className="muted">{b.eventTitle} · {b.seats.length} seat{b.seats.length > 1 ? 's' : ''}</span>
                </div>
                <div className="list-side">
                  <span className="num">{formatINR(b.total)}</span>
                  <span className="muted small">{timeAgo(b.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Recent activity</h2>
            <Link to="/admin/audit" className="text-link">Activity log</Link>
          </div>
          <ul className="list">
            {audit.map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{a.action}</strong>
                  <span className="muted">{a.target} · by {a.actor}</span>
                </div>
                <span className="muted small">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
