const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num0 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const money = (n: number) => usd0.format(Math.round(n));
export const int = (n: number) => num0.format(Math.round(n));
export const pct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;

/** Compact money for tight cells: $18.7k, $1.3M */
export function moneyCompact(n: number) {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (a >= 10_000) return `$${(n / 1000).toFixed(1)}k`;
  return money(n);
}

/** Percent change from b to a, or null when b is 0. */
export function change(a: number, b: number): number | null {
  if (!b) return null;
  return ((a - b) / b) * 100;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}
export function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
export function dateRange(startIso: string, endIso: string) {
  const [sy] = startIso.split("-");
  const [ey] = endIso.split("-");
  return sy === ey ? `${shortDate(startIso)} – ${longDate(endIso)}` : `${longDate(startIso)} – ${longDate(endIso)}`;
}
export function monthLabel(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}
export function nightsLabel(n: number) {
  return n === 1 ? "1 night" : `${n} nights`;
}
