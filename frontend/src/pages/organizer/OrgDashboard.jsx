import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { Empty, Meter, Stat, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { formatCompactINR, formatDate, formatDateTime, formatINR } from '../../utils';

export default function OrgDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    api.orgStats().then(setStats);
    api.orgEvents().then(setEvents);
  }, []);

  if (!stats) return <div className="loader" aria-label="Loading" />;
  const live = events.filter((e) => ['ON_SALE', 'UPCOMING', 'SOLD_OUT'].includes(e.state));
  const needsAction = events.filter((e) => ['DRAFT', 'REJECTED'].includes(e.status));

  return (
    <>
      <PageHead
        title={`Hi, ${user.name.split(' ')[0]}`}
        sub={`${user.org?.name} · here's how your events are doing.`}
        actions={<Link to="/organizer/events/new" className="btn">Create event</Link>}
      />

      <div className="stat-row">
        <Stat label="Ticket sales" value={formatCompactINR(stats.revenue)} />
        <Stat label="Tickets sold" value={stats.ticketsSold.toLocaleString('en-IN')} />
        <Stat label="Live events" value={stats.live} />
        <Stat label="Waiting for approval" value={stats.pending} />
      </div>

      {needsAction.length > 0 && (
        <section className="panel">
          <div className="panel-head"><h2>Needs your attention</h2></div>
          <ul className="list">
            {needsAction.map((e) => (
              <li key={e.id}>
                <div>
                  <strong>{e.title}</strong>
                  <span className="muted">
                    {e.status === 'REJECTED' ? `Admin asked for changes: ${e.rejectionReason}` : 'Draft · not submitted yet'}
                  </span>
                </div>
                <Link to={`/organizer/events/${e.id}/edit`} className="btn btn-small">{e.status === 'REJECTED' ? 'Fix and resubmit' : 'Finish draft'}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>Live events</h2>
          <Link to="/organizer/events" className="text-link">All events</Link>
        </div>
        {live.length === 0 ? (
          <Empty action={<Link to="/organizer/events/new" className="btn">Create event</Link>}>You have no live events. Create one and submit it for approval.</Empty>
        ) : (
          <div className="live-cards">
            {live.map((e) => (
              <Link key={e.id} to={`/organizer/events/${e.id}`} className="live-card" style={{ '--hue': e.hue }}>
                <div className="live-card-top">
                  <StatusBadge status={e.state} />
                  <span className="muted small">{formatDate(e.startsAt)}</span>
                </div>
                <h3>{e.title}</h3>
                <p className="muted small">
                  {e.state === 'UPCOMING' ? `Sale opens ${formatDateTime(e.saleOpensAt)}` : `${e.stats.held} seats on hold right now`}
                </p>
                <Meter value={e.stats.sold} max={e.stats.capacity} label="Seats sold" />
                <div className="live-card-foot">
                  <span>{e.stats.sold} / {e.stats.capacity} sold</span>
                  <strong>{formatINR(e.stats.revenue)}</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
