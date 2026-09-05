/**
 * The words on the dashboard. Everything here is derived from live query
 * results so the sentences always match the numbers beside them.
 */
import { change, int, money, pct } from "./format";
import type { Period } from "./period";
import type { CampaignRow, ChannelRow, MarketRow, Results } from "./queries";
import { getCampaignsStartedBetween, getMarketBookingsBetween } from "./queries";
import { longDate, shortDate } from "./format";
import { OTA_COMMISSION_RATE } from "./config";

export type Tone = "good" | "steady" | "watch";

export interface Signal {
  tone: Tone;
  verdict: string;        // one sentence, the answer
  detail: string;         // one sentence of context
  bookingsChange: number | null;
  revenueChange: number | null;
  yoyRevenueChange: number | null;
}

export function buildSignal(p: Period, cur: Results, prev: Results, yoy: Results, topMarket?: MarketRow): Signal {
  const bookingsChange = change(cur.bookings, prev.bookings);
  const revenueChange = change(cur.revenue, prev.revenue);
  const yoyRevenueChange = change(cur.revenue, yoy.revenue);

  const tone: Tone = revenueChange === null ? "steady" : revenueChange >= 3 ? "good" : revenueChange <= -8 ? "watch" : "steady";

  const window = p.key === "30d" ? "In the last 30 days" : p.key === "90d" ? "In the last 90 days" : "In the last 12 months";
  const verdict = `${window}, ${int(cur.bookings)} guests booked directly with you — ${money(cur.revenue)} in room revenue that didn't go through an OTA.`;

  const vsPrev =
    revenueChange === null
      ? ""
      : Math.abs(revenueChange) < 2
        ? `That's level with ${p.compareLabel}`
        : `That's ${pct(Math.abs(revenueChange))} ${revenueChange > 0 ? "more" : "less"} than ${p.compareLabel}`;
  const vsYoy =
    yoyRevenueChange === null
      ? ""
      : `${vsPrev ? " and" : "That's"} ${pct(Math.abs(yoyRevenueChange))} ${yoyRevenueChange >= 0 ? "ahead of" : "behind"} the same window last year`;
  const market = topMarket && topMarket.bookings > 0 ? `. ${topMarket.name} sent the most guests` : "";
  const detail = `${vsPrev}${vsYoy}${market}.`.replace(/^\./, "").trim();

  return { tone, verdict, detail, bookingsChange, revenueChange, yoyRevenueChange };
}

export interface Attention {
  level: "clear" | "soft";
  text: string;
}

/** One soft line if a channel slipped meaningfully; otherwise "All clear". */
export function buildAttention(channels: ChannelRow[], cur: Results, prev: Results): Attention {
  const candidates = channels
    .filter((c) => c.isWebsite && c.prevBookings >= 8)
    .map((c) => ({ c, drop: change(c.bookings, c.prevBookings) ?? 0 }))
    .filter((x) => x.drop <= -15)
    .sort((a, b) => a.drop - b.drop);

  if (candidates.length) {
    const { c, drop } = candidates[0];
    const action = c.isPaid ? "Autumn is rebalancing bids and creative there this week." : "Autumn is reviewing what changed and will report back.";
    return { level: "soft", text: `${c.name} bookings dipped ${pct(Math.abs(drop))} versus the previous period. ${action}` };
  }

  const otaShareNow = cur.bookings + cur.otaBookings ? (cur.otaBookings / (cur.bookings + cur.otaBookings)) * 100 : 0;
  const otaSharePrev = prev.bookings + prev.otaBookings ? (prev.otaBookings / (prev.bookings + prev.otaBookings)) * 100 : 0;
  if (otaShareNow - otaSharePrev >= 3) {
    return { level: "soft", text: `A larger share of stays came through OTAs this period (${pct(otaShareNow)} vs ${pct(otaSharePrev)}). Autumn is strengthening the book-direct message on your site.` };
  }
  return { level: "clear", text: "All clear. Nothing needs your attention right now." };
}

// ---------------------------------------------------------------- the Steer
export interface Recommendation {
  id: string;
  title: string;
  why: string;
  projectedBookings: number;
  projectedRevenue: number;
  effort: "Autumn handles it" | "Needs your OK";
}

/**
 * Rule-based recommendations sized from the property's own history.
 * Replace with a `recommendations` table when Autumn's planning team
 * starts authoring these by hand.
 */
export async function buildRecommendations(p: Period, campaigns: CampaignRow[], markets: MarketRow[], cur: Results): Promise<Recommendation[]> {
  const recs: Recommendation[] = [];

  // 1a. A campaign that is still running and clearly paying for itself: extend it.
  const live = campaigns
    .filter((c) => c.objective === "bookings" && c.endDate >= p.end && c.spend > 500 && (c.roas ?? 0) >= 3)
    .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0];
  if (live) {
    const daysRun = Math.max(1, daysBetween(maxDate(live.startDate, p.start), p.end) + 1);
    const extendDays = 21;
    recs.push({
      id: `extend-${live.id}`,
      title: `Extend "${live.name}" by three weeks`,
      why: `${(live.roas ?? 0).toFixed(1)}× return this period. Ends ${shortDate(live.endDate)}.`,
      projectedBookings: Math.round((live.bookings / daysRun) * extendDays * 0.85),
      projectedRevenue: Math.round((live.revenue / daysRun) * extendDays * 0.85),
      effort: "Needs your OK",
    });
  } else {
    // 1b. Otherwise, bring back last year's next-season flight that earned the most per dollar.
    const from = shiftYear(shiftDays(p.end, 1), -1);
    const to = shiftYear(shiftDays(p.end, 75), -1);
    const lastYear = (await getCampaignsStartedBetween(from, to).catch(() => []))
      .filter((c) => c.objective === "bookings" && c.spend > 500 && (c.roas ?? 0) >= 2)
      .sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0];
    if (lastYear) {
      const startsOn = shiftYear(lastYear.startDate, 1);
      recs.push({
        id: `rerun-${lastYear.id}`,
        title: `Bring back "${lastYear.name.replace(/\s*\d{4}$/, "")}" starting ${shortDate(startsOn)}`,
        why: `Last year: ${(lastYear.roas ?? 0).toFixed(1)}× on ${money(lastYear.spend)}, ${int(lastYear.bookings)} stays.`,
        projectedBookings: Math.round(lastYear.bookings * 1.08),
        projectedRevenue: Math.round(lastYear.revenue * 1.08),
        effort: "Needs your OK",
      });
    }
  }

  // 2. Winter sun-seekers: markets that over-index Nov–Feb.
  const winterMarkets = ["Seattle", "Chicago", "New York", "Vancouver"];
  const lastWinter = await getMarketBookingsBetween(shiftYear(p.end, -1).slice(0, 4) + "-11-01", shiftYear(p.end, -1).slice(0, 4) + "-12-31", winterMarkets)
    .catch(() => ({ bookings: 0, revenue: 0 }));
  if (lastWinter.bookings > 0) {
    recs.push({
      id: "winter-sun",
      title: "Open the winter sun campaign to Seattle, Chicago & New York in October",
      why: `${int(lastWinter.bookings)} winter stays last year from these cities.`,
      projectedBookings: Math.round(lastWinter.bookings * 0.18),
      projectedRevenue: Math.round(lastWinter.revenue * 0.18),
      effort: "Autumn handles it",
    });
  }

  // 3. Shift a slice of OTA stays to direct.
  const total = cur.bookings + cur.otaBookings;
  if (total > 0 && cur.otaBookings > 0) {
    const otaShare = (cur.otaBookings / total) * 100;
    const shiftPts = 2;
    const shiftedBookings = Math.round(total * (shiftPts / 100));
    const avgRev = cur.otaRevenue / cur.otaBookings;
    recs.push({
      id: "book-direct-perk",
      title: "Add a small book-direct perk to the rate page",
      why: `${pct(otaShare)} of stays via OTAs at ${pct(OTA_COMMISSION_RATE * 100)}.`,
      projectedBookings: shiftedBookings,
      projectedRevenue: Math.round(shiftedBookings * avgRev * OTA_COMMISSION_RATE),
      effort: "Needs your OK",
    });
  }

  return recs.slice(0, 3);
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}
const maxDate = (a: string, b: string) => (a > b ? a : b);
function shiftDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function shiftYear(iso: string, years: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- insights (Tier 1 alerts)
export interface InsightItem {
  kind: "win" | "watch" | "info";
  text: string;
}

/** Short, data-first notes derived from opportunity health. No prose. */
export function buildInsights(
  signal: Signal,
  channels: ChannelRow[],
  markets: MarketRow[],
  recoverable: number,
): InsightItem[] {
  const items: InsightItem[] = [];
  if (signal.yoyRevenueChange !== null) {
    const up = signal.yoyRevenueChange >= 0;
    items.push({ kind: up ? "win" : "watch", text: `Direct revenue ${up ? "up" : "down"} ${pct(Math.abs(signal.yoyRevenueChange))} vs last year.` });
  }
  const drop = channels
    .filter((c) => c.isWebsite && c.prevBookings >= 8)
    .map((c) => ({ c, d: change(c.bookings, c.prevBookings) ?? 0 }))
    .filter((x) => x.d <= -15)
    .sort((a, b) => a.d - b.d)[0];
  if (drop) items.push({ kind: "watch", text: `${drop.c.name} bookings down ${pct(Math.abs(drop.d))}.` });
  if (markets[0] && markets[0].bookings > 0) items.push({ kind: "info", text: `${markets[0].name} is your top feeder market.` });
  if (recoverable > 0) items.push({ kind: "watch", text: `${money(recoverable)} recoverable from OTAs and waste.` });
  return items.slice(0, 4);
}
