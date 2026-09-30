import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { Empty, Meter, StatusBadge } from '../../components/ui';
import { formatDate, formatINR, formatTime } from '../../utils';

export default function OrgEvents() {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    api.orgEvents().then(setEvents);
  }, []);

  return (
    <>
      <PageHead title="My events" sub="Drafts, events waiting for approval, and everything on sale." actions={<Link to="/organizer/events/new" className="btn">Create event</Link>} />
      {!events ? (
        <div className="loader" aria-label="Loading" />
      ) : events.length === 0 ? (
        <Empty action={<Link to="/organizer/events/new" className="btn">Create event</Link>}>You haven't created any events yet.</Empty>
      ) : (
        <div className="table-wrap panel flush">
          <table className="table">
            <thead>
              <tr><th>Event</th><th>Show date</th><th>Status</th><th>Sold</th><th>Sales</th><th><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.title}</strong><span className="cell-sub">{e.venue}, {e.city}</span></td>
                  <td>{formatDate(e.startsAt)}<span className="cell-sub">{formatTime(e.startsAt)}</span></td>
                  <td><StatusBadge status={e.state} /></td>
                  <td className="cell-meter">{e.status === 'PUBLISHED' ? <Meter value={e.stats.sold} max={e.stats.capacity} /> : <span className="muted">—</span>}</td>
                  <td className="num">{e.status === 'PUBLISHED' ? formatINR(e.stats.revenue) : '—'}</td>
                  <td className="cell-actions">
                    {['DRAFT', 'REJECTED'].includes(e.status) ? (
                      <Link to={`/organizer/events/${e.id}/edit`} className="btn btn-small">Edit</Link>
                    ) : (
                      <Link to={`/organizer/events/${e.id}`} className="btn btn-ghost btn-small">Open</Link>
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
