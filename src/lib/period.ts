export type PeriodKey = "30d" | "90d" | "12m";

export interface Period {
  key: PeriodKey;
  label: string;          // "Last 30 days"
  start: string;          // YYYY-MM-DD inclusive
  end: string;
  prevStart: string;      // the period immediately before, same length
  prevEnd: string;
  yoyStart: string;       // same window one year earlier
  yoyEnd: string;
  days: number;
  compareLabel: string;   // "the previous 30 days"
}

const LENGTH: Record<PeriodKey, number> = { "30d": 30, "90d": 90, "12m": 365 };
const LABEL: Record<PeriodKey, string> = { "30d": "Last 30 days", "90d": "Last 90 days", "12m": "Last 12 months" };
const COMPARE: Record<PeriodKey, string> = { "30d": "the previous 30 days", "90d": "the previous 90 days", "12m": "the 12 months before" };

export function parsePeriodKey(v: string | string[] | undefined): PeriodKey {
  return v === "90d" || v === "12m" ? v : "30d";
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function shift(dateIso: string, days: number) {
  const d = new Date(dateIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}
function shiftYear(dateIso: string, years: number) {
  const d = new Date(dateIso + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return iso(d);
}

/** Build a period ending on `asOf` (the latest date present in the database). */
export function buildPeriod(key: PeriodKey, asOf: string): Period {
  const days = LENGTH[key];
  const end = asOf;
  const start = shift(end, -(days - 1));
  const prevEnd = shift(start, -1);
  const prevStart = shift(prevEnd, -(days - 1));
  return {
    key,
    label: LABEL[key],
    start,
    end,
    prevStart,
    prevEnd,
    yoyStart: shiftYear(start, -1),
    yoyEnd: shiftYear(end, -1),
    days,
    compareLabel: COMPARE[key],
  };
}
