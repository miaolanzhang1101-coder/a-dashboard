/**
 * Every database read for both screens lives here.
 * Tables come from hotel-marketing-db/sql/schema.sql (Marlow House).
 *
 * "Direct" = confirmed bookings on channels where is_website_channel = true
 * (everything except OTA). That is the number Autumn is accountable for.
 */
import { sql } from "./db";
import { OTA_COMMISSION_RATE } from "./config";
import type { Period } from "./period";

// ---------------------------------------------------------------- types
export interface Results {
  bookings: number;
  revenue: number;
  commissionAvoided: number;
  otaBookings: number;
  otaRevenue: number;
  paidBookings: number;
  cancellations: number;
}

export interface TrendPoint {
  day: string;        // YYYY-MM-DD
  bookings: number;
  revenue: number;
}

export interface RecentBooking {
  id: number;
  confirmation: string;
  bookedOn: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  market: string;
  region: string;
  channel: string;
  campaign: string | null;
  revenue: number;
  commissionAvoided: number;
}

export interface MarketRow {
  id: number;
  name: string;
  region: string;
  country: string;
  sessions: number;
  bookings: number;
  revenue: number;
  prevBookings: number;
  prevRevenue: number;
  share: number;      // % of direct bookings
}

export interface ChannelRow {
  id: number;
  name: string;
  isPaid: boolean;
  isWebsite: boolean;
  sessions: number;
  users: number;
  bookings: number;
  revenue: number;
  spend: number;
  impressions: number;
  clicks: number;
  prevBookings: number;
  prevSessions: number;
  conversion: number | null;  // %
}

export interface CampaignRow {
  id: number;
  name: string;
  channel: string;
  objective: "bookings" | "awareness";
  startDate: string;
  endDate: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  sessions: number;
  bookings: number;
  revenue: number;
  roas: number | null;
  active: boolean;
}

export interface Funnel {
  impressions: number;
  clicks: number;
  sessions: number;
  users: number;
  bookings: number;
  ctr: number | null;
  siteConversion: number | null;
}

export interface MonthRow {
  month: string;
  bookings: number;
  revenue: number;
  occupancy: number;
  adr: number;
}

// ---------------------------------------------------------------- helpers
const DIRECT = sql`ch.is_website_channel = true AND b.status = 'confirmed'`;

/** Latest date with data. All periods anchor here rather than on "today". */
export async function getAsOf(): Promise<string> {
  const [row] = await sql<{ d: string }[]>`SELECT max(date)::text AS d FROM daily_property_metrics`;
  return row.d;
}

// ---------------------------------------------------------------- the Signal
export async function getResults(start: string, end: string): Promise<Results> {
  const [row] = await sql<
    { bookings: number; revenue: number; ota_bookings: number; ota_revenue: number; paid_bookings: number; cancellations: number }[]
  >`
    SELECT
      count(*) FILTER (WHERE ch.is_website_channel AND b.status = 'confirmed')::int       AS bookings,
      coalesce(sum(b.room_revenue) FILTER (WHERE ch.is_website_channel AND b.status = 'confirmed'), 0)::float AS revenue,
      count(*) FILTER (WHERE NOT ch.is_website_channel AND b.status = 'confirmed')::int   AS ota_bookings,
      coalesce(sum(b.room_revenue) FILTER (WHERE NOT ch.is_website_channel AND b.status = 'confirmed'), 0)::float AS ota_revenue,
      count(*) FILTER (WHERE ch.is_paid AND b.status = 'confirmed')::int                  AS paid_bookings,
      count(*) FILTER (WHERE ch.is_website_channel AND b.status = 'cancelled')::int       AS cancellations
    FROM bookings b
    JOIN channels ch ON ch.id = b.channel_id
    WHERE b.booking_date BETWEEN ${start} AND ${end}
  `;
  return {
    bookings: row.bookings,
    revenue: row.revenue,
    commissionAvoided: row.revenue * OTA_COMMISSION_RATE,
    otaBookings: row.ota_bookings,
    otaRevenue: row.ota_revenue,
    paidBookings: row.paid_bookings,
    cancellations: row.cancellations,
  };
}

export async function getTrend(start: string, end: string): Promise<TrendPoint[]> {
  return sql<TrendPoint[]>`
    SELECT d.day::date::text AS day,
           coalesce(count(b.id) FILTER (WHERE ch.is_website_channel AND b.status = 'confirmed'), 0)::int AS bookings,
           coalesce(sum(b.room_revenue) FILTER (WHERE ch.is_website_channel AND b.status = 'confirmed'), 0)::float AS revenue
    FROM generate_series(${start}::date, ${end}::date, '1 day') AS d(day)
    LEFT JOIN bookings b ON b.booking_date = d.day
    LEFT JOIN channels ch ON ch.id = b.channel_id
    GROUP BY d.day ORDER BY d.day
  `;
}

// ---------------------------------------------------------------- the Source
export async function getRecentBookings(start: string, end: string, limit = 5): Promise<RecentBooking[]> {
  const rows = await sql<any[]>`
    SELECT b.id, b.booking_date::text AS booked_on, b.checkin_date::text AS check_in, b.checkout_date::text AS check_out,
           b.nights, b.guests, b.room_revenue::float AS revenue,
           mk.name AS market, mk.region, ch.name AS channel, c.name AS campaign
    FROM bookings b
    JOIN channels ch ON ch.id = b.channel_id
    JOIN markets mk ON mk.id = b.market_id
    LEFT JOIN campaigns c ON c.id = b.campaign_id
    WHERE b.booking_date BETWEEN ${start} AND ${end} AND ${DIRECT}
    ORDER BY b.room_revenue DESC, b.booking_date DESC
    LIMIT ${limit}
  `;
  return rows.map(mapBooking);
}

export async function getLedger(start: string, end: string, limit = 60, offset = 0) {
  const rows = await sql<any[]>`
    SELECT b.id, b.booking_date::text AS booked_on, b.checkin_date::text AS check_in, b.checkout_date::text AS check_out,
           b.nights, b.guests, b.room_revenue::float AS revenue,
           mk.name AS market, mk.region, ch.name AS channel, c.name AS campaign
    FROM bookings b
    JOIN channels ch ON ch.id = b.channel_id
    JOIN markets mk ON mk.id = b.market_id
    LEFT JOIN campaigns c ON c.id = b.campaign_id
    WHERE b.booking_date BETWEEN ${start} AND ${end} AND ${DIRECT}
    ORDER BY b.booking_date DESC, b.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const [{ total }] = await sql<{ total: number }[]>`
    SELECT count(*)::int AS total FROM bookings b JOIN channels ch ON ch.id = b.channel_id
    WHERE b.booking_date BETWEEN ${start} AND ${end} AND ${DIRECT}
  `;
  return { rows: rows.map(mapBooking), total };
}

function mapBooking(r: any): RecentBooking {
  return {
    id: r.id,
    confirmation: `MH-${String(r.id).padStart(5, "0")}`,
    bookedOn: r.booked_on,
    checkIn: r.check_in,
    checkOut: r.check_out,
    nights: r.nights,
    guests: r.guests,
    market: r.market,
    region: r.region,
    channel: r.channel,
    campaign: r.campaign,
    revenue: r.revenue,
    commissionAvoided: r.revenue * OTA_COMMISSION_RATE,
  };
}

export async function getMarkets(p: Period): Promise<MarketRow[]> {
  const rows = await sql<any[]>`
    WITH cur AS (
      SELECT b.market_id, count(*)::int AS bookings, sum(b.room_revenue)::float AS revenue
      FROM bookings b JOIN channels ch ON ch.id = b.channel_id
      WHERE b.booking_date BETWEEN ${p.start} AND ${p.end} AND ${DIRECT}
      GROUP BY b.market_id
    ), prev AS (
      SELECT b.market_id, count(*)::int AS bookings, sum(b.room_revenue)::float AS revenue
      FROM bookings b JOIN channels ch ON ch.id = b.channel_id
      WHERE b.booking_date BETWEEN ${p.prevStart} AND ${p.prevEnd} AND ${DIRECT}
      GROUP BY b.market_id
    ), sess AS (
      SELECT market_id, sum(sessions)::int AS sessions
      FROM daily_market_metrics WHERE date BETWEEN ${p.start} AND ${p.end}
      GROUP BY market_id
    )
    SELECT mk.id, mk.name, mk.region, mk.country,
           coalesce(sess.sessions, 0) AS sessions,
           coalesce(cur.bookings, 0) AS bookings, coalesce(cur.revenue, 0) AS revenue,
           coalesce(prev.bookings, 0) AS prev_bookings, coalesce(prev.revenue, 0) AS prev_revenue
    FROM markets mk
    LEFT JOIN cur ON cur.market_id = mk.id
    LEFT JOIN prev ON prev.market_id = mk.id
    LEFT JOIN sess ON sess.market_id = mk.id
    ORDER BY coalesce(cur.revenue, 0) DESC
  `;
  const total = rows.reduce((s, r) => s + r.bookings, 0) || 1;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    region: r.region,
    country: r.country,
    sessions: r.sessions,
    bookings: r.bookings,
    revenue: r.revenue,
    prevBookings: r.prev_bookings,
    prevRevenue: r.prev_revenue,
    share: (r.bookings / total) * 100,
  }));
}

export async function getChannels(p: Period): Promise<ChannelRow[]> {
  const rows = await sql<any[]>`
    WITH cur AS (
      SELECT channel_id, sum(sessions)::int AS sessions, sum(users)::int AS users,
             sum(bookings)::int AS bookings, sum(revenue)::float AS revenue, sum(spend)::float AS spend,
             sum(impressions)::int AS impressions, sum(clicks)::int AS clicks
      FROM daily_channel_metrics WHERE date BETWEEN ${p.start} AND ${p.end} GROUP BY channel_id
    ), prev AS (
      SELECT channel_id, sum(sessions)::int AS sessions, sum(bookings)::int AS bookings
      FROM daily_channel_metrics WHERE date BETWEEN ${p.prevStart} AND ${p.prevEnd} GROUP BY channel_id
    )
    SELECT ch.id, ch.name, ch.is_paid, ch.is_website_channel,
           coalesce(cur.sessions,0) AS sessions, coalesce(cur.users,0) AS users,
           coalesce(cur.bookings,0) AS bookings, coalesce(cur.revenue,0) AS revenue, coalesce(cur.spend,0) AS spend,
           coalesce(cur.impressions,0) AS impressions, coalesce(cur.clicks,0) AS clicks,
           coalesce(prev.bookings,0) AS prev_bookings, coalesce(prev.sessions,0) AS prev_sessions
    FROM channels ch
    LEFT JOIN cur ON cur.channel_id = ch.id
    LEFT JOIN prev ON prev.channel_id = ch.id
    ORDER BY ch.is_website_channel DESC, coalesce(cur.revenue,0) DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    isPaid: r.is_paid,
    isWebsite: r.is_website_channel,
    sessions: r.sessions,
    users: r.users,
    bookings: r.bookings,
    revenue: r.revenue,
    spend: r.spend,
    impressions: r.impressions,
    clicks: r.clicks,
    prevBookings: r.prev_bookings,
    prevSessions: r.prev_sessions,
    conversion: r.sessions > 0 ? (r.bookings / r.sessions) * 100 : null,
  }));
}

export async function getCampaigns(p: Period, onlyInPeriod = true): Promise<CampaignRow[]> {
  const rows = await sql<any[]>`
    SELECT c.id, c.name, ch.name AS channel, c.objective, c.start_date::text AS start_date, c.end_date::text AS end_date,
           c.total_budget::float AS budget,
           coalesce(sum(m.spend),0)::float AS spend, coalesce(sum(m.impressions),0)::int AS impressions,
           coalesce(sum(m.clicks),0)::int AS clicks, coalesce(sum(m.sessions),0)::int AS sessions,
           coalesce(sum(m.bookings),0)::int AS bookings, coalesce(sum(m.revenue),0)::float AS revenue
    FROM campaigns c
    JOIN channels ch ON ch.id = c.channel_id
    LEFT JOIN daily_campaign_metrics m ON m.campaign_id = c.id AND m.date BETWEEN ${p.start} AND ${p.end}
    WHERE ${onlyInPeriod ? sql`c.start_date <= ${p.end} AND c.end_date >= ${p.start}` : sql`true`}
    GROUP BY c.id, c.name, ch.name, c.objective, c.start_date, c.end_date, c.total_budget
    ORDER BY coalesce(sum(m.revenue),0) DESC, c.start_date DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    channel: r.channel,
    objective: r.objective,
    startDate: r.start_date,
    endDate: r.end_date,
    budget: r.budget,
    spend: r.spend,
    impressions: r.impressions,
    clicks: r.clicks,
    sessions: r.sessions,
    bookings: r.bookings,
    revenue: r.revenue,
    roas: r.spend > 0 ? r.revenue / r.spend : null,
    active: r.start_date <= p.end && r.end_date >= p.start,
  }));
}

export async function getFunnel(start: string, end: string): Promise<Funnel> {
  const [r] = await sql<any[]>`
    SELECT coalesce(sum(m.impressions),0)::int AS impressions, coalesce(sum(m.clicks),0)::int AS clicks,
           coalesce(sum(m.sessions) FILTER (WHERE ch.is_website_channel),0)::int AS sessions,
           coalesce(sum(m.users) FILTER (WHERE ch.is_website_channel),0)::int AS users,
           coalesce(sum(m.bookings) FILTER (WHERE ch.is_website_channel),0)::int AS bookings
    FROM daily_channel_metrics m JOIN channels ch ON ch.id = m.channel_id
    WHERE m.date BETWEEN ${start} AND ${end}
  `;
  return {
    impressions: r.impressions,
    clicks: r.clicks,
    sessions: r.sessions,
    users: r.users,
    bookings: r.bookings,
    ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : null,
    siteConversion: r.sessions > 0 ? (r.bookings / r.sessions) * 100 : null,
  };
}

export async function getMonthly(months = 13): Promise<MonthRow[]> {
  return sql<MonthRow[]>`
    SELECT month::text AS month, bookings::int AS bookings, revenue::float AS revenue,
           occupancy::float AS occupancy, adr::float AS adr
    FROM v_monthly_summary ORDER BY month DESC LIMIT ${months}
  `.then((rows) => rows.reverse());
}

/** Bookings by market for a window — used by the Steer to size a winter campaign. */
export async function getMarketBookingsBetween(start: string, end: string, marketNames: string[]) {
  const [r] = await sql<{ bookings: number; revenue: number }[]>`
    SELECT coalesce(count(*),0)::int AS bookings, coalesce(sum(b.room_revenue),0)::float AS revenue
    FROM bookings b JOIN channels ch ON ch.id = b.channel_id JOIN markets mk ON mk.id = b.market_id
    WHERE b.booking_date BETWEEN ${start} AND ${end} AND ${DIRECT} AND mk.name = ANY(${marketNames})
  `;
  return r;
}

/** Lifetime totals for campaigns that *started* inside a window — used to size a re-run. */
export async function getCampaignsStartedBetween(from: string, to: string): Promise<CampaignRow[]> {
  const rows = await sql<any[]>`
    SELECT c.id, c.name, ch.name AS channel, c.objective, c.start_date::text AS start_date, c.end_date::text AS end_date,
           c.total_budget::float AS budget,
           coalesce(sum(m.spend),0)::float AS spend, coalesce(sum(m.impressions),0)::int AS impressions,
           coalesce(sum(m.clicks),0)::int AS clicks, coalesce(sum(m.sessions),0)::int AS sessions,
           coalesce(sum(m.bookings),0)::int AS bookings, coalesce(sum(m.revenue),0)::float AS revenue
    FROM campaigns c JOIN channels ch ON ch.id = c.channel_id
    LEFT JOIN daily_campaign_metrics m ON m.campaign_id = c.id
    WHERE c.start_date BETWEEN ${from} AND ${to}
    GROUP BY c.id, c.name, ch.name, c.objective, c.start_date, c.end_date, c.total_budget
  `;
  return rows.map((r) => ({
    id: r.id, name: r.name, channel: r.channel, objective: r.objective, startDate: r.start_date, endDate: r.end_date,
    budget: r.budget, spend: r.spend, impressions: r.impressions, clicks: r.clicks, sessions: r.sessions,
    bookings: r.bookings, revenue: r.revenue, roas: r.spend > 0 ? r.revenue / r.spend : null, active: false,
  }));
}

export interface MarketMix {
  id: number;
  name: string;
  region: string;
  directRev: number;
  directBookings: number;
  otaRev: number;
  otaBookings: number;
  otaShare: number; // % of this market's stays that came via OTA
}

/** Per-market direct vs OTA split — powers the revenue-leakage view. */
export async function getMarketMix(start: string, end: string): Promise<MarketMix[]> {
  const rows = await sql<any[]>`
    SELECT mk.id, mk.name, mk.region,
           coalesce(sum(b.room_revenue) FILTER (WHERE ch.is_website_channel AND b.status='confirmed'),0)::float AS direct_rev,
           count(*) FILTER (WHERE ch.is_website_channel AND b.status='confirmed')::int AS direct_bk,
           coalesce(sum(b.room_revenue) FILTER (WHERE NOT ch.is_website_channel AND b.status='confirmed'),0)::float AS ota_rev,
           count(*) FILTER (WHERE NOT ch.is_website_channel AND b.status='confirmed')::int AS ota_bk
    FROM markets mk
    LEFT JOIN bookings b ON b.market_id = mk.id AND b.booking_date BETWEEN ${start} AND ${end}
    LEFT JOIN channels ch ON ch.id = b.channel_id
    GROUP BY mk.id, mk.name, mk.region
  `;
  return rows
    .map((r) => {
      const total = r.direct_bk + r.ota_bk;
      return {
        id: r.id, name: r.name, region: r.region,
        directRev: r.direct_rev, directBookings: r.direct_bk,
        otaRev: r.ota_rev, otaBookings: r.ota_bk,
        otaShare: total ? (r.ota_bk / total) * 100 : 0,
      };
    })
    .filter((m) => m.directBookings + m.otaBookings > 0);
}

// ---------------------------------------------------------------- not in this database (yet)
// The reference dashboard shows these; the current schema does not carry them.
// Each returns null so the UI renders a clear "not connected" state. Wire them
// to a web-analytics source (GA4, Plausible, etc.) when available.
export async function getDeviceBreakdown(): Promise<null> { return null; }
export async function getTimeOfDay(): Promise<null> { return null; }
export async function getPageViews(): Promise<null> { return null; }
export async function getEvents(): Promise<null> { return null; }
export async function getDemographics(): Promise<null> { return null; }
