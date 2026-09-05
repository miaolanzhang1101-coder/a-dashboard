/**
 * The ontological layer. Instead of raw metric tables, the dashboard reasons
 * about Booking Opportunities — real business concepts with a health state.
 * The Signal aggregates their states; the Steer acts on the degraded ones.
 */
import { change, int } from "./format";
import type { ChannelRow, MarketRow, Results, TrendPoint } from "./queries";

export type OppState = "healthy" | "watch" | "degraded";

export interface BookingOpportunity {
  id: string;
  label: string;
  kind: "channel" | "market";
  state: OppState;
  changePct: number | null;
  revenue: number;
  note: string;
}

function stateFrom(delta: number | null): OppState {
  if (delta === null) return "healthy";
  if (delta <= -20) return "degraded";
  if (delta <= -8) return "watch";
  return "healthy";
}

export function buildOpportunities(channels: ChannelRow[], markets: MarketRow[]): BookingOpportunity[] {
  const ch = channels
    .filter((c) => c.isWebsite && c.prevBookings >= 4)
    .map<BookingOpportunity>((c) => {
      const d = change(c.bookings, c.prevBookings);
      return { id: `ch-${c.id}`, label: c.name, kind: "channel", state: stateFrom(d), changePct: d, revenue: c.revenue, note: `${int(c.bookings)} stays, was ${int(c.prevBookings)}` };
    });
  const mk = markets
    .filter((m) => m.prevBookings >= 4)
    .slice(0, 8)
    .map<BookingOpportunity>((m) => {
      const d = change(m.bookings, m.prevBookings);
      return { id: `mk-${m.id}`, label: `${m.name} market`, kind: "market", state: stateFrom(d), changePct: d, revenue: m.revenue, note: `${int(m.bookings)} stays, was ${int(m.prevBookings)}` };
    });
  return [...ch, ...mk];
}

export function healthCounts(opps: BookingOpportunity[]) {
  return {
    healthy: opps.filter((o) => o.state === "healthy").length,
    watch: opps.filter((o) => o.state === "watch").length,
    degraded: opps.filter((o) => o.state === "degraded").length,
    total: opps.length,
  };
}

// ---------------------------------------------------------------- mode
export type Mode = "growth" | "maintenance";
export interface OperationalAlert {
  id: string;
  severity: "high" | "medium";
  title: string;
  body: string;
}
export interface ModeResult {
  mode: Mode;
  alerts: OperationalAlert[];
}

/** Growth = things are working, show lift. Maintenance = something operational needs attention. */
export function deriveMode(trend: TrendPoint[], channels: ChannelRow[], results: Results, prev: Results, force?: string): ModeResult {
  const alerts: OperationalAlert[] = [];

  for (const c of channels) {
    if (c.isWebsite && c.prevBookings >= 8 && c.bookings === 0) {
      alerts.push({ id: `broken-${c.id}`, severity: "high", title: `${c.name} has stopped converting`, body: `${c.name} brought ${int(c.prevBookings)} direct bookings last period and none this period — usually a broken tracking tag or channel connection. Autumn is checking the link.` });
    }
  }

  if (trend.length >= 14) {
    const last7 = trend.slice(-7).reduce((s, p) => s + p.bookings, 0);
    const prev7 = trend.slice(-14, -7).reduce((s, p) => s + p.bookings, 0);
    const d = change(last7, prev7);
    if (d !== null && d <= -30 && prev7 >= 10) {
      alerts.push({ id: "pace", severity: "medium", title: "Direct bookings are slowing this week", body: `The last 7 days brought ${int(last7)} direct stays versus ${int(prev7)} the week before. If the pace holds you could see a gap in about three weeks. Autumn is raising bids on your strongest markets to fill it.` });
    }
  }

  const revDrop = change(results.revenue, prev.revenue) ?? 0;
  const forced = force === "maintenance";
  const mode: Mode = forced || alerts.length > 0 || revDrop <= -12 ? "maintenance" : "growth";

  if (forced && alerts.length === 0) {
    alerts.push({ id: "demo-gap", severity: "medium", title: "Weekend booking gap ahead", body: "Next weekend is pacing 18% below the same weekend last year. Autumn can launch a 48-hour local flash offer to close it." });
  }
  return { mode, alerts };
}

// ---------------------------------------------------------------- investigation canvas
export interface Suspect {
  label: string;
  detail: string;
  delta: number | null;
}
export interface Investigation {
  headline: string;
  metricLine: string;
  suspects: Suspect[];
  autumnAction: string;
}

/** When a channel dips, assemble the diagnosis so the owner never has to dig. */
export function buildInvestigation(channels: ChannelRow[], markets: MarketRow[]): Investigation | null {
  const worst = channels
    .filter((c) => c.isWebsite && c.prevBookings >= 8)
    .map((c) => ({ c, d: change(c.bookings, c.prevBookings) ?? 0 }))
    .filter((x) => x.d <= -15)
    .sort((a, b) => a.d - b.d)[0];
  if (!worst) return null;

  const suspects: Suspect[] = [];
  channels
    .filter((c) => c.isWebsite && c.id !== worst.c.id && c.prevBookings >= 5)
    .map((c) => ({ c, d: change(c.bookings, c.prevBookings) }))
    .filter((x) => x.d !== null && x.d <= -10)
    .sort((a, b) => (a.d as number) - (b.d as number))
    .slice(0, 2)
    .forEach((x) => suspects.push({ label: x.c.name, detail: `${int(x.c.bookings)} bookings, was ${int(x.c.prevBookings)}`, delta: x.d }));
  markets
    .filter((m) => m.prevBookings >= 5)
    .map((m) => ({ m, d: change(m.bookings, m.prevBookings) }))
    .filter((x) => x.d !== null && x.d <= -15)
    .sort((a, b) => (a.d as number) - (b.d as number))
    .slice(0, 2)
    .forEach((x) => suspects.push({ label: `${x.m.name} market`, detail: `${int(x.m.bookings)} stays, was ${int(x.m.prevBookings)}`, delta: x.d }));

  return {
    headline: `${worst.c.name} bookings fell ${Math.abs(Math.round(worst.d))}%`,
    metricLine: `${int(worst.c.bookings)} direct bookings this period, down from ${int(worst.c.prevBookings)} in the period before.`,
    suspects,
    autumnAction: worst.c.isPaid
      ? `Autumn is rebalancing bids and refreshing the creative on ${worst.c.name} this week, and shifting budget toward the channels still converting.`
      : `Autumn is auditing the ${worst.c.name} path for tracking or content issues and will report back within a few days.`,
  };
}
