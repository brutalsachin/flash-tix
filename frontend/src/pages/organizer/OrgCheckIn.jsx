import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { PageHead } from '../../components/DashboardLayout';
import { Empty } from '../../components/ui';
import { formatDate, formatTime } from '../../utils';

const RESULT = {
  OK: { tone: 'good', title: 'Checked in' },
  ALREADY: { tone: 'warn', title: 'Already checked in' },
  CANCELLED: { tone: 'bad', title: 'Booking was refunded' },
  NOT_FOUND: { tone: 'bad', title: 'Not a ticket for this event' },
};

export default function OrgCheckIn() {
  const [events, setEvents] = useState(null);
  const [eventId, setEventId] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [recent, setRecent] = useState([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    api.orgEvents().then((list) => {
      const ok = list.filter((e) => e.status === 'PUBLISHED' && e.state !== 'ENDED');
      setEvents(ok);
      if (ok[0]) setEventId(ok[0].id);
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    const r = await api.checkIn(eventId, code);
    setResult({ ...r, code: code.trim().toUpperCase() });
    if (r.result === 'OK') setRecent((x) => [r.booking, ...x].slice(0, 8));
    setCode('');
    setBusy(false);
    inputRef.current?.focus();
  };

  if (!events) return <div className="loader" aria-label="Loading" />;
  if (!events.length) return <><PageHead title="Check-in" /><Empty>You have no published events to check people into.</Empty></>;

  const r = result && RESULT[result.result];

  return (
    <>
      <PageHead title="Check-in" sub="Scan the barcode on a ticket, or type the booking ID printed under it." />
      <div className="two-col">
        <section className="panel form-panel">
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="ci-event">Event</label>
              <select id="ci-event" value={eventId} onChange={(e) => { setEventId(e.target.value); setResult(null); }}>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title} · {formatDate(e.startsAt)}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ci-code">Booking ID</label>
              <input
                id="ci-code"
                ref={inputRef}
                className="big-input mono"
                placeholder="FTX-…"
                autoComplete="off"
                autoCapitalize="characters"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoFocus
              />
              <p className="field-hint">A USB or Bluetooth barcode scanner types the ID and presses Enter for you.</p>
            </div>
            <button className="btn btn-block" disabled={busy || !code.trim()}>Check in</button>
          </form>

          {r && (
            <div className={`checkin-result ${r.tone}`} role="status">
              <strong>{r.title}</strong>
              {result.booking ? (
                <span>
                  {result.booking.name} · seats {result.booking.seats.join(', ')}
                  {result.result === 'ALREADY' && ` · first scanned at ${formatTime(result.booking.checkedInAt)}`}
                </span>
              ) : (
                <span>{result.code} doesn't match any booking for this event. Check the event selected above.</span>
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Checked in just now</h2>
          {recent.length === 0 ? (
            <p className="muted">People you check in will appear here.</p>
          ) : (
            <ul className="list">
              {recent.map((b) => (
                <li key={b.id}>
                  <div>
                    <strong>{b.name}</strong>
                    <span className="muted">{b.seats.join(', ')} · {b.id}</span>
                  </div>
                  <span className="muted small">{formatTime(b.checkedInAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
