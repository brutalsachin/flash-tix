import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, localDay } from '../api/client';
import { CATEGORIES, CITIES } from '../data/mockData';
import EventCard, { EventCardSkeleton } from '../components/EventCard';
import Barcode from '../components/Barcode';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatINR, formatTime, pad, splitDuration } from '../utils';

export default function Home() {
  const [q, setQ] = useState('');
  const [city, setCity] = useState('All cities');
  const [category, setCategory] = useState('All');
  const [date, setDate] = useState('');
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const resultsRef = useRef(null);
  const [allEvents, setAllEvents] = useState([]);

  useEffect(() => {
    api.listEvents().then(setAllEvents).catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    setEvents(null);
    const t = setTimeout(() => {
      api
        .listEvents({ q, city, category, date })
        .then((data) => live && setEvents(data))
        .catch((e) => live && setError(e.message));
    }, 200); // debounce typing
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, city, category, date]);

  const resetFilters = () => {
    setQ('');
    setCity('All cities');
    setCategory('All');
    setDate('');
  };

  const onSearch = (e) => {
    e.preventDefault();
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <FlashSaleHero events={allEvents} />

      <div className="container">
        <form className="search-pill" onSubmit={onSearch} role="search">
          <label className="pill-field grow">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="sr-only">Search events</span>
            <input
              id="search"
              type="search"
              placeholder="Artist, venue or city"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
          <label className="pill-field">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" fill="none" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="9.5" r="2.5" fill="currentColor" />
            </svg>
            <span className="sr-only">City</span>
            <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="pill-field">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="sr-only">Type of event</span>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All types' : c}</option>
              ))}
            </select>
          </label>
          <button className="btn">Find events</button>
        </form>
      </div>

      <section className="container section" aria-labelledby="browse-heading" ref={resultsRef}>
        <div className="section-head">
          <h2 id="browse-heading">Upcoming events</h2>
          {events && <span className="muted">{events.length} event{events.length === 1 ? '' : 's'}</span>}
        </div>

        <DateStrip value={date} onChange={setDate} events={allEvents} />

        {error && <p className="alert">{error}</p>}

        <div className="event-grid">
          {events === null
            ? Array.from({ length: 3 }, (_, i) => <EventCardSkeleton key={i} />)
            : events.map((e) => <EventCard key={e.id} event={e} />)}
        </div>

        {events?.length === 0 && (
          <div className="empty">
            <p>No events match these filters.</p>
            <button className="btn btn-ghost" onClick={resetFilters}>Clear filters</button>
          </div>
        )}
      </section>
    </>
  );
}

// Next two weeks as a scrollable strip. Days with events get a dot.
function DateStrip({ value, onChange, events }) {
  const days = useMemo(() => {
    const busy = new Set(events.map((e) => localDay(e.startsAt)));
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const key = localDay(d.toISOString());
      return {
        key,
        top: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
        bottom: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        busy: busy.has(key),
      };
    });
  }, [events]);

  return (
    <div className="date-strip" role="group" aria-label="Filter by date">
      <button className={`date-chip ${value === '' ? 'active' : ''}`} aria-pressed={value === ''} onClick={() => onChange('')}>
        <span className="date-top">Any</span>
        <span className="date-bottom">All dates</span>
      </button>
      {days.map((d) => (
        <button
          key={d.key}
          className={`date-chip ${value === d.key ? 'active' : ''}`}
          aria-pressed={value === d.key}
          onClick={() => onChange(d.key)}
        >
          <span className="date-top">{d.top}</span>
          <span className="date-bottom">{d.bottom}</span>
          {d.busy && <span className="date-dot" aria-label="Has events" />}
        </button>
      ))}
    </div>
  );
}

function FlashSaleHero({ events }) {
  const { now } = useBooking();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminded, setReminded] = useState(false);
  const drop = events.find((e) => e.state === 'UPCOMING') || events.find((e) => e.state === 'ON_SALE');

  useEffect(() => {
    if (drop && user?.role === 'USER') api.myReminders().then((ids) => setReminded(ids.includes(drop.id)));
  }, [drop, user]);

  if (!drop) return <section className="hero hero-empty"><div className="container hero-inner"><div className="hero-copy"><h1 id="hero-title">Get in before it sells out.</h1></div></div></section>;
  const ms = new Date(drop.saleOpensAt).getTime() - now;
  const live = ms <= 0;
  const { h, m, s } = splitDuration(ms);

  const remind = async () => {
    if (!user) return navigate('/login', { state: { from: '/' } });
    if (user.role !== 'USER') return;
    setReminded(await api.toggleReminder(drop.id));
  };

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="container hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker">{live ? 'Sale is live' : 'Next flash sale'}</p>
          <h1 id="hero-title">Get in before it sells out.</h1>
          <p className="hero-lede">
            Seats for big shows go in minutes. Pick yours on a live seat map and we hold them for 5 minutes while you pay.
          </p>
          <div className="hero-actions">
            <Link to={`/events/${drop.id}`} className="btn">{live ? 'Pick seats' : 'See event'}</Link>
            {!live && (!user || user.role === 'USER') && (
              <button className="btn btn-outline-light" onClick={remind} aria-pressed={reminded}>
                {reminded ? "We'll remind you" : 'Remind me'}
              </button>
            )}
          </div>
        </div>

        <div className="hero-ticket-wrap">
          <svg className="hero-arc" viewBox="0 0 300 120" aria-hidden="true">
            <path d="M10 110 C 80 10, 220 0, 290 40" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 7" strokeLinecap="round" />
            <circle cx="10" cy="110" r="5" fill="currentColor" />
            <circle cx="290" cy="40" r="5" fill="currentColor" />
          </svg>
          <Link to={`/events/${drop.id}`} className="hero-ticket" style={{ '--hue': drop.hue }}>
            <div className="ht-top">
              <span className="tag">Flash sale</span>
              <span className="ht-code">{drop.city.slice(0, 3).toUpperCase()} · {formatDate(drop.startsAt)}</span>
            </div>
            <h2 className="ht-title">{drop.title}</h2>
            <dl className="ht-facts">
              <div><dt>Venue</dt><dd>{drop.venue}</dd></div>
              <div><dt>Show</dt><dd>{formatTime(drop.startsAt)}</dd></div>
              <div><dt>From</dt><dd>{formatINR(drop.priceFrom)}</dd></div>
              <div><dt>Limit</dt><dd>{drop.maxPerUser} per person</dd></div>
            </dl>
            <div className="ht-perf" aria-hidden="true" />
            <div className="ht-bottom">
              {live ? (
                <p className="ht-open">Tickets on sale now</p>
              ) : (
                <div className="ht-timer" role="timer" aria-label={`Tickets open in ${h} hours ${m} minutes ${s} seconds`}>
                  <span className="ht-timer-label">Opens in</span>
                  <span className="ht-timer-num">{pad(h)}:{pad(m)}:{pad(s)}</span>
                </div>
              )}
              <Barcode seed={drop.id} height={36} />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
