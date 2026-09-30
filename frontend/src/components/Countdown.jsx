import { pad, splitDuration } from '../utils';

export default function Countdown({ ms, compact = false, showHours = false }) {
  const { h, m, s } = splitDuration(ms);
  if (compact) {
    return (
      <span className="countdown-compact" aria-label={`${m} minutes ${s} seconds left`}>
        {showHours ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}
      </span>
    );
  }
  const units = [
    ['hrs', h],
    ['min', m],
    ['sec', s],
  ];
  return (
    <div className="countdown" role="timer" aria-label={`${h} hours ${m} minutes ${s} seconds`}>
      {units.map(([label, v]) => (
        <div key={label} className="countdown-unit">
          <span className="countdown-num">{pad(v)}</span>
          <span className="countdown-label">{label}</span>
        </div>
      ))}
    </div>
  );
}
