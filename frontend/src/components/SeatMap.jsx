import { ROW_LETTERS, tierForRow } from '../data/mockData';
import { formatINR } from '../utils';

// Interactive seat map for buyers; read-only (with "held" shown) for organizers/admins.
export default function SeatMap({ rows, selected = [], onToggle, maxSeats = 6, readOnly = false }) {
  const selectedIds = new Set(selected.map((s) => s.id));
  const atLimit = selected.length >= maxSeats;

  return (
    <div className="seatmap">
      <Stage />
      <div className="seat-scroll">
        <div className="seat-grid" role="group" aria-label="Seat map">
          {rows.map((row, i) => {
            const tierStart = i === 0 || rows[i - 1].tier !== row.tier;
            return (
              <div key={row.row}>
                {tierStart && (
                  <div className="tier-label">
                    <span>{row.tier}</span>
                    <span>{formatINR(row.price)}</span>
                  </div>
                )}
                <div className="seat-row">
                  {row.seats.map((seat) => {
                    const isSelected = selectedIds.has(seat.id);
                    const aisle = row.aisleAfter > 0 && seat.number === row.aisleAfter + 1;
                    const cls = `seat ${aisle ? 'aisle' : ''} ${isSelected ? 'selected' : seat.status === 'held' ? 'held' : seat.status === 'sold' ? 'sold' : ''}`;
                    const label = `Seat ${seat.id}, ${row.tier}, ${formatINR(seat.price)}${seat.status !== 'available' ? `, ${seat.status === 'held' ? 'on hold' : 'taken'}` : ''}`;
                    if (readOnly) {
                      return (
                        <span key={seat.id} className={cls} role="img" aria-label={label}>
                          <span aria-hidden="true">{row.row}</span>
                          <span aria-hidden="true">{seat.number}</span>
                        </span>
                      );
                    }
                    const unavailable = seat.status !== 'available';
                    return (
                      <button
                        key={seat.id}
                        className={cls}
                        disabled={unavailable || (!isSelected && atLimit)}
                        aria-pressed={isSelected}
                        aria-label={label}
                        onClick={() => onToggle(seat)}
                      >
                        <span aria-hidden="true">{row.row}</span>
                        <span aria-hidden="true">{seat.number}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="legend">
        {readOnly ? (
          <>
            <li><span className="seat demo" /> Available</li>
            <li><span className="seat demo held" /> On hold now</li>
            <li><span className="seat demo sold" /> Sold</li>
          </>
        ) : (
          <>
            <li><span className="seat demo" /> Available</li>
            <li><span className="seat demo selected" /> Your pick</li>
            <li><span className="seat demo sold" /> Taken</li>
          </>
        )}
      </ul>
    </div>
  );
}

function Stage() {
  return (
    <div className="stage" aria-hidden="true">
      <svg viewBox="0 0 400 40" preserveAspectRatio="none">
        <path d="M10 34 Q200 -6 390 34" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span>Stage this way</span>
    </div>
  );
}

// Small colour-coded preview of a layout (organizer form, admin review).
const TIER_TONES = ['var(--tier-1)', 'var(--tier-2)', 'var(--tier-3)', 'var(--tier-4)', 'var(--tier-5)'];

export function LayoutPreview({ layout }) {
  const rows = Math.min(26, Math.max(0, Number(layout.rows) || 0));
  const per = Math.min(30, Math.max(0, Number(layout.seatsPerRow) || 0));
  const aisle = Number(layout.aisleAfter) || 0;
  if (!rows || !per || !layout.tiers.length) return <p className="muted">Set rows and seats to see a preview.</p>;
  return (
    <div className="layout-preview">
      <Stage />
      <div className="seat-scroll">
        <div className="lp-grid">
          {Array.from({ length: rows }, (_, r) => {
            const tier = tierForRow({ ...layout, tiers: layout.tiers }, r);
            return (
              <div className="lp-row" key={r}>
                <span className="lp-label">{ROW_LETTERS[r]}</span>
                {Array.from({ length: per }, (_, n) => (
                  <span
                    key={n}
                    className={`lp-seat ${aisle > 0 && n === aisle ? 'aisle' : ''}`}
                    style={{ background: TIER_TONES[tier.index % TIER_TONES.length] }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <ul className="legend">
        {layout.tiers.map((t, i) => (
          <li key={i}>
            <span className="lp-seat" style={{ background: TIER_TONES[i % TIER_TONES.length] }} /> {t.name || `Tier ${i + 1}`} · {formatINR(Number(t.price) || 0)}
          </li>
        ))}
      </ul>
    </div>
  );
}
