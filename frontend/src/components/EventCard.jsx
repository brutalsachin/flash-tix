import { Link } from 'react-router-dom';
import { formatDate, formatINR, formatTime } from '../utils';

// Ticket-stub card: event info on the left, date stub on the right, perforation between.
export default function EventCard({ event }) {
  const d = new Date(event.startsAt);
  return (
    <Link to={`/events/${event.id}`} className="stub" style={{ '--hue': event.hue }}>
      <div className="stub-main">
        <span className="pill">{event.category}</span>
        <h3 className="stub-title">{event.title}</h3>
        <p className="stub-venue">{event.venue}, {event.city}</p>
        <p className="stub-price">
          From <strong>{formatINR(event.priceFrom)}</strong>
        </p>
      </div>
      <div className="stub-date" aria-label={`${formatDate(event.startsAt)} at ${formatTime(event.startsAt)}`}>
        <span className="stub-month">{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
        <span className="stub-day">{String(d.getDate()).padStart(2, '0')}</span>
        <span className="stub-month">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
        <span className="stub-time">{formatTime(event.startsAt)}</span>
      </div>
    </Link>
  );
}

export function EventCardSkeleton() {
  return <div className="stub skeleton" aria-hidden="true" />;
}
