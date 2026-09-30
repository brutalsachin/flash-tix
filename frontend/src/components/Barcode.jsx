// Deterministic barcode drawing from a seed string (stand-in for a real scannable code).
export default function Barcode({ seed = 'FLASHTIX', height = 44, label }) {
  let h = [...seed].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
  const bars = [];
  let x = 0;
  while (x < 200) {
    h = (h * 1103515245 + 12345) >>> 0;
    const w = 1 + (h % 3);
    if ((h >> 4) % 3 !== 0) bars.push(<rect key={x} x={x} y="0" width={w} height={height} />);
    x += w + 1 + ((h >> 8) % 2);
  }
  return (
    <svg
      className="barcode"
      viewBox={`0 0 200 ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label || `Barcode ${seed}`}
    >
      {bars}
    </svg>
  );
}
