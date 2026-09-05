"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TrendPoint } from "@/lib/queries";
import { money, moneyCompact, shortDate } from "@/lib/format";

interface Row { i: number; label: string; revenue: number; prev: number | null; bookings: number }

/** Bucket daily points into weeks when the window is long, so the line stays readable. */
function bucket(points: TrendPoint[], size: number) {
  const out: TrendPoint[] = [];
  for (let i = 0; i < points.length; i += size) {
    const slice = points.slice(i, i + size);
    out.push({
      day: slice[0].day,
      bookings: slice.reduce((s, p) => s + p.bookings, 0),
      revenue: slice.reduce((s, p) => s + p.revenue, 0),
    });
  }
  return out;
}

export function TrendChart({ current, previous, compareLabel }: { current: TrendPoint[]; previous: TrendPoint[]; compareLabel: string }) {
  const size = current.length > 120 ? 7 : current.length > 45 ? 3 : 1;
  const cur = bucket(current, size);
  const prev = bucket(previous, size);
  const rows: Row[] = cur.map((p, i) => ({
    i,
    label: size === 1 ? shortDate(p.day) : `wk of ${shortDate(p.day)}`,
    revenue: Math.round(p.revenue),
    prev: prev[i] ? Math.round(prev[i].revenue) : null,
    bookings: p.bookings,
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0F2438" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#0F2438" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#EEF2F5" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A8A9B" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
          <YAxis tick={{ fontSize: 11, fill: "#7A8A9B" }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => moneyCompact(v)} />
          <Tooltip
            cursor={{ stroke: "#C3CDD8" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as Row;
              return (
                <div className="rounded-md border border-line bg-surface px-3 py-2 text-[12.5px] shadow-raised">
                  <p className="font-medium text-ink">{r.label}</p>
                  <p className="tnum text-ink-2">{money(r.revenue)} · {r.bookings} direct {r.bookings === 1 ? "stay" : "stays"}</p>
                  {r.prev !== null && <p className="tnum text-ink-3">{money(r.prev)} in {compareLabel}</p>}
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="prev" stroke="#C3CDD8" strokeWidth={1.5} strokeDasharray="4 3" fill="none" dot={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="revenue" stroke="#0F2438" strokeWidth={2} fill="url(#rev)" dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
