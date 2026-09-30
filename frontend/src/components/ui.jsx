import { useState } from 'react';

const STATUS_LABEL = {
  DRAFT: 'Draft',
  PENDING: 'Waiting for approval',
  REJECTED: 'Changes needed',
  PUBLISHED: 'Published',
  UPCOMING: 'Sale not open yet',
  ON_SALE: 'On sale',
  SOLD_OUT: 'Sold out',
  ENDED: 'Ended',
  CANCELLED: 'Cancelled',
  CONFIRMED: 'Confirmed',
  REFUNDED: 'Refunded',
  ACTIVE: 'Active',
  INVITED: 'Invite sent',
  SUSPENDED: 'Suspended',
};
const STATUS_TONE = {
  DRAFT: 'neutral',
  PENDING: 'warn',
  REJECTED: 'bad',
  UPCOMING: 'info',
  ON_SALE: 'good',
  SOLD_OUT: 'info',
  ENDED: 'neutral',
  CANCELLED: 'bad',
  CONFIRMED: 'good',
  REFUNDED: 'neutral',
  ACTIVE: 'good',
  INVITED: 'warn',
  SUSPENDED: 'bad',
};

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_TONE[status] || 'neutral'}`}>{STATUS_LABEL[status] || status}</span>;
}

export function Stat({ label, value, note }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {note && <span className="stat-note">{note}</span>}
    </div>
  );
}

export function Meter({ value, max, label }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="meter" aria-label={label || `${pct}%`}>
      <div className="meter-track"><div className="meter-fill" style={{ width: `${pct}%` }} /></div>
      <span className="meter-text">{pct}%</span>
    </div>
  );
}

// Two-step button for destructive actions (browser confirm dialogs are avoided).
export function ConfirmButton({ label, confirmLabel, question, onConfirm, className = 'btn btn-ghost btn-small', danger = true }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) {
    return (
      <button className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="confirm-inline" role="group" aria-label={question}>
      {question && <span className="confirm-q">{question}</span>}
      <button
        className={`btn btn-small ${danger ? 'btn-danger' : ''}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setAsking(false);
          }
        }}
      >
        {busy ? 'Working…' : confirmLabel}
      </button>
      <button className="btn btn-ghost btn-small" onClick={() => setAsking(false)} disabled={busy}>
        Keep
      </button>
    </span>
  );
}

export function Empty({ children, action }) {
  return (
    <div className="empty">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button className="link-btn" onClick={onClose}>Dismiss</button>
    </div>
  );
}

export function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
