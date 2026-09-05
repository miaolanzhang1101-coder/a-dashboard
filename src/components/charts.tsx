import { money, pct } from "@/lib/format";

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-2">
      <span className={`size-2.5 rounded-sm ${color}`} aria-hidden />
      {label} <span className="tnum font-medium text-ink">{value}</span>
    </span>
  );
}

/** Direct vs OTA revenue — the kept-vs-leaking picture. */
export function RevenueSplitBar({ direct, ota, commissionPaid }: { direct: number; ota: number; commissionPaid: number }) {
  const total = direct + ota || 1;
  const dPct = (direct / total) * 100;
  const oPct = 100 - dPct;
  return (
    <div>
      <div className="flex h-11 w-full overflow-hidden rounded-lg shadow-ambient ring-1 ring-hairline" role="img" aria-label={`Direct ${pct(dPct)}, OTA ${pct(oPct)}`}>
        <div className="flex min-w-0 items-center bg-accent px-3" style={{ width: `${Math.max(dPct, 6)}%` }}>
          <span className="tnum truncate text-sm font-semibold text-white">{money(direct)}</span>
        </div>
        <div className="flex min-w-0 items-center justify-end bg-viz-coral px-3" style={{ width: `${Math.max(oPct, 6)}%` }}>
          <span className="tnum truncate text-sm font-semibold text-ink">{money(ota)}</span>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs">
        <Legend color="bg-accent" label="Direct kept" value={pct(dPct)} />
        <Legend color="bg-viz-coral" label="Through OTAs" value={pct(oPct)} />
        <span className="text-ink-3">Commission paid to OTAs <span className="tnum font-medium text-down-ink">{money(commissionPaid)}</span></span>
      </div>
    </div>
  );
}

export interface RoiRow {
  label: string;
  spend: number;
  revenue: number;
  roas: number | null;
}

/** The Direct Visual ROI: what each campaign spent vs what it returned. */
export function RoiBars({ rows }: { rows: RoiRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-2">No paid campaigns ran this period.</p>;
  const max = Math.max(...rows.map((r) => Math.max(r.spend, r.revenue)), 1);
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => {
        const roasColor = r.roas === null ? "text-ink-3" : r.roas >= 3 ? "text-up-ink" : r.roas < 1 ? "text-down-ink" : "text-ink";
        return (
          <li key={r.label}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-ink">{r.label}</span>
              <span className={`tnum shrink-0 font-semibold ${roasColor}`}>{r.roas === null ? "n/a" : `${r.roas.toFixed(1)}×`}</span>
            </div>
            <div className="mt-1.5 space-y-1">
              <TrackRow label="Spend" value={r.spend} max={max} color="bg-line-strong" />
              <TrackRow label="Return" value={r.revenue} max={max} color="bg-accent" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TrackRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2.5">
      <span className="text-xs text-ink-3">{label}</span>
      <div className="h-2.5 rounded-full bg-canvas">
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
      </div>
      <span className="tnum w-16 text-right text-xs font-medium text-ink">{money(value)}</span>
    </div>
  );
}

export interface ShareRow {
  label: string;
  sharePct: number;
}

/** OTA share by feeder market — where the leakage concentrates. */
export function ShareBars({ rows }: { rows: ShareRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-2">No OTA bookings by market this period.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const color = r.sharePct >= 40 ? "bg-viz-coral" : r.sharePct >= 20 ? "bg-viz-gold" : "bg-accent";
        return (
          <li key={r.label} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-3 text-sm">
            <span className="truncate text-ink-2">{r.label}</span>
            <div className="h-2.5 rounded-full bg-canvas">
              <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${Math.max(2, r.sharePct)}%` }} />
            </div>
            <span className="tnum text-right text-ink">{pct(r.sharePct)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export interface LeakBar {
  id: string;
  title: string;
  amount: number;
  anchor: string;
}

/** Recoverable revenue by source, sized visually. */
export function LeakageBars({ items }: { items: LeakBar[] }) {
  if (items.length === 0) return <p className="text-sm text-ink-2">Nothing leaking this period.</p>;
  const max = Math.max(...items.map((i) => i.amount), 1);
  return (
    <ul className="space-y-3.5">
      {items.map((i) => (
        <li key={i.id}>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-ink">{i.title}</span>
            <a href={i.anchor} className="shrink-0 text-xs font-medium text-accent transition-colors duration-150 hover:text-accent-hover">See move →</a>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <div className="h-2.5 flex-1 rounded-full bg-canvas">
              <div className="h-2.5 rounded-full bg-viz-coral" style={{ width: `${Math.max(3, (i.amount / max) * 100)}%` }} />
            </div>
            <span className="tnum w-20 text-right font-semibold text-down-ink">{money(i.amount)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
