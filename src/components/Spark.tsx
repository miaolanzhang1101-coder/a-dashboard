/** Tiny inline-SVG sparkline for stat cards. No library, no axes. */
export function Spark({ data, stroke = "#0F2438", width = 96, height = 30 }: { data: number[]; stroke?: string; width?: number; height?: number }) {
  const pts = data.length ? data : [0, 0];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const stepX = width / (pts.length - 1 || 1);
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${d} L${width} ${height} L0 ${height} Z`;
  const id = `sp${Math.round(data.reduce((s, v) => s + v, 0))}${data.length}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.12} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
