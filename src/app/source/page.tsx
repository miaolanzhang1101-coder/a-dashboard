import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Steer } from "@/components/Steer";
import { TrendChart } from "@/components/TrendChart";
import { Panel, PanelHeader, NotConnected, Delta } from "@/components/ui";
import { RevenueSplitBar, RoiBars, ShareBars, LeakageBars, type RoiRow, type ShareRow } from "@/components/charts";
import { CampaignsTable, ChannelsTable, FunnelView, Ledger } from "@/components/tables";
import { readDecisions } from "@/lib/decisions";
import { buildPeriod, parsePeriodKey } from "@/lib/period";
import { buildRecommendations } from "@/lib/narrative";
import { buildLeakage } from "@/lib/leakage";
import { change, int, money, monthLabel, pct } from "@/lib/format";
import { OTA_COMMISSION_RATE } from "@/lib/config";
import {
  getAsOf, getCampaigns, getChannels, getDemographics, getDeviceBreakdown, getEvents, getFunnel, getLedger,
  getMarketMix, getMarkets, getMonthly, getPageViews, getResults, getTimeOfDay, getTrend,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

interface SourceSearchParams {
  period?: string;
  rows?: string;
}

/**
 * Screen 2 — Attribution & revenue.
 * Tier 1 direct verification & leaks → Tier 2 operational behavior →
 * Tier 3 web telemetry, then Insights (moves & trends).
 */
export default async function SourcePage({ searchParams }: { searchParams: SourceSearchParams }) {
  const asOf = await getAsOf();
  const p = buildPeriod(parsePeriodKey(searchParams.period), asOf);
  const ledgerLimit = searchParams.rows === "all" ? 5000 : 30;

  const [cur, prev, ledger, markets, mix, channels, campaignsInPeriod, allCampaigns, funnel, prevFunnel, monthly, trend, prevTrend] = await Promise.all([
    getResults(p.start, p.end), getResults(p.prevStart, p.prevEnd), getLedger(p.start, p.end, ledgerLimit),
    getMarkets(p), getMarketMix(p.start, p.end), getChannels(p), getCampaigns(p, true), getCampaigns(p, false),
    getFunnel(p.start, p.end), getFunnel(p.prevStart, p.prevEnd), getMonthly(13),
    getTrend(p.start, p.end), getTrend(p.prevStart, p.prevEnd),
  ]);
  const [devices, timeOfDay, pages, events, demographics] = await Promise.all([
    getDeviceBreakdown(), getTimeOfDay(), getPageViews(), getEvents(), getDemographics(),
  ]);
  const recs = await buildRecommendations(p, campaignsInPeriod, markets, cur);
  const decisions = readDecisions();
  const leakage = buildLeakage(cur, campaignsInPeriod, mix);
  const otaPct = Math.round(OTA_COMMISSION_RATE * 100);
  const commissionPaid = cur.otaRevenue * OTA_COMMISSION_RATE;

  const roiRows: RoiRow[] = campaignsInPeriod.filter((c) => c.spend > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 6)
    .map((c) => ({ label: c.name, spend: c.spend, revenue: c.revenue, roas: c.roas }));
  const totalSpend = campaignsInPeriod.reduce((s, c) => s + c.spend, 0);
  const totalReturn = campaignsInPeriod.reduce((s, c) => s + c.revenue, 0);
  const overallRoas = totalSpend > 0 ? totalReturn / totalSpend : null;
  const shareRows: ShareRow[] = mix.filter((m) => m.otaBookings + m.directBookings >= 5 && m.otaBookings > 0)
    .sort((a, b) => b.otaShare - a.otaShare).slice(0, 6).map((m) => ({ label: m.name, sharePct: m.otaShare }));

  return (
    <AppShell
      period={p}
      active="source"
      title="Attribution & revenue"
      breadcrumb={<Link href={`/?period=${p.key}`} className="transition-colors duration-150 hover:text-ink">Overview</Link>}
      basePath="/source"
    >
      <div className="space-y-5">
        {/* Autumn Results, repeated orientation anchor */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Direct revenue" value={money(cur.revenue)} delta={change(cur.revenue, prev.revenue)} compare={<>{int(cur.bookings)} direct stays</>} />
          <StatCard label="Commission kept" value={money(cur.commissionAvoided)} compare={<>by booking direct</>} />
          <StatCard label="Leaking to OTAs" value={money(commissionPaid)} valueTone="down" help={`Commission on ${int(cur.otaBookings)} OTA stays at ${otaPct}%.`} compare={<>{int(cur.otaBookings)} OTA stays</>} />
          <StatCard label="Recoverable" value={money(leakage.totalAtStake)} valueTone="down" help="Money a Steer move could recover." compare={<>across {leakage.items.length} sources</>} />
        </div>

        {/* ---- Tier 1: direct verification & leaks ---- */}
        <SectionLabel id="bookings">Direct verification & leaks</SectionLabel>

        <Panel>
          <PanelHeader title="Every dollar: direct vs OTA" help="Revenue you kept by booking direct versus revenue that came through OTAs." />
          <RevenueSplitBar direct={cur.revenue} ota={cur.otaRevenue} commissionPaid={commissionPaid} />
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Return on ad spend" sub={overallRoas === null ? "no paid spend" : `${overallRoas.toFixed(1)}× overall`} help="Direct revenue returned per dollar of ad spend." aside={<span className="tnum text-sm text-ink-2">{money(totalSpend)} → {money(totalReturn)}</span>} />
            <RoiBars rows={roiRows} />
          </Panel>
          <Panel>
            <PanelHeader title="Where you leak to OTAs" sub="OTA share by market" help="High bars are your best recovery targets." />
            <ShareBars rows={shareRows} />
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Recoverable revenue" sub={`${money(leakage.totalAtStake)} across ${leakage.items.length} sources`} aside={<Link href="#insights" className="text-sm text-ink-2 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline">See the moves</Link>} />
          <LeakageBars items={leakage.items.map((l) => ({ id: l.id, title: l.title, amount: l.amount, anchor: l.anchor }))} />
        </Panel>

        <Panel>
          <PanelHeader title="Booking ledger" sub={`${int(ledger.total)} direct stays${cur.cancellations ? `, ${int(cur.cancellations)} cancelled` : ""}`} help="Guest, stay dates, channel and confirmation code for every direct booking." />
          <Ledger rows={ledger.rows} total={ledger.total} showAllHref={`/source?period=${p.key}&rows=all#bookings`} />
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Top traffic channels" sub="ranked by revenue" help="Channels ranked by hard bookings and revenue, not visits. OTAs shown for context." />
            <ChannelsTable rows={channels} full />
          </Panel>
          <Panel>
            <PanelHeader title="Funnel & engagement" sub="where bookings are lost" help="How many people move from impressions to clicks to bookings, and where they drop off." />
            <FunnelView f={funnel} full />
          </Panel>
        </div>

        {/* ---- Tier 2 behavior + Tier 3 telemetry ---- */}
        <SectionLabel id="marketing">Behavior & web telemetry</SectionLabel>

        <div className="grid gap-5 lg:grid-cols-3">
          <Panel><PanelHeader title="Traffic by device" help="Desktop, mobile, tablet." />{devices === null && <NotConnected what="Device data" source="your website analytics" />}</Panel>
          <Panel><PanelHeader title="Traffic by time of day" help="When visitors arrive." />{timeOfDay === null && <NotConnected what="Time-of-day data" source="your website analytics" />}</Panel>
          <Panel><PanelHeader title="Visitor demographics" help="Audience makeup, when available." />{demographics === null && <NotConnected what="Demographic data" source="an audience provider" />}</Panel>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Panel>
            <PanelHeader title="Ad telemetry" help="Raw paid-media counts." />
            <dl className="space-y-3">
              <TeleRow label="Impressions from ads" value={int(funnel.impressions)} delta={change(funnel.impressions, prevFunnel.impressions)} />
              <TeleRow label="Click-through rate" value={funnel.ctr === null ? "n/a" : `${funnel.ctr.toFixed(1)}%`} />
              <TeleRow label="Website visits from ads" value={int(funnel.clicks)} delta={change(funnel.clicks, prevFunnel.clicks)} />
            </dl>
          </Panel>
          <Panel><PanelHeader title="Page views" help="Most-viewed pages." />{pages === null && <NotConnected what="Page-level data" source="your website analytics" />}</Panel>
          <Panel><PanelHeader title="Events" help="Key on-site actions." />{events === null && <NotConnected what="Event tracking" source="your website analytics" />}</Panel>
        </div>

        <Panel>
          <PanelHeader title="Campaign detail" sub="every campaign, with impressions and clicks" />
          <CampaignsTable rows={campaignsInPeriod} full />
          {allCampaigns.length > campaignsInPeriod.length && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-ink-2 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline">Show all {allCampaigns.length} campaigns</summary>
              <div className="mt-3"><CampaignsTable rows={allCampaigns.filter((c) => !campaignsInPeriod.some((x) => x.id === c.id))} full /></div>
            </details>
          )}
        </Panel>

        {/* ---- Insights: moves & trends ---- */}
        <SectionLabel id="insights">Insights: moves & trends</SectionLabel>

        <Panel>
          <PanelHeader title="Recommended moves" sub="approve to act" aside={<Link href={`/?period=${p.key}`} className="text-sm text-ink-2 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline">Back to overview</Link>} />
          <Steer recs={recs} decisions={decisions} compact />
        </Panel>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Direct revenue over time" sub={`vs ${p.compareLabel}`} />
            <TrendChart current={trend} previous={prevTrend} compareLabel={p.compareLabel} />
          </Panel>
          <Panel>
            <PanelHeader title="Month by month" sub="last 13 months" help="Occupancy and ADR from your property system; bookings and revenue count all stays." />
            <div className="overflow-x-auto">
              <table className="data-table min-w-[27rem]">
                <thead><tr><th>Month</th><th className="num">Bookings</th><th className="num">Revenue</th><th className="num">Occ.</th><th className="num">ADR</th></tr></thead>
                <tbody>
                  {monthly.map((m) => (
                    <tr key={m.month}>
                      <td>{monthLabel(m.month)}</td>
                      <td className="num">{int(m.bookings)}</td>
                      <td className="num font-medium">{money(m.revenue)}</td>
                      <td className="num text-ink-2">{pct(m.occupancy * 100)}</td>
                      <td className="num text-ink-2">{money(m.adr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <p className="pt-2 text-center text-xs text-ink-3">Figures reflect bookings made through {p.end.replace(/-/g, "/")}. Direct = anything not booked through an OTA.</p>
      </div>
    </AppShell>
  );
}

function SectionLabel({ id, children }: { id: string; children: React.ReactNode }) {
  return <h2 id={id} className="scroll-mt-24 px-1 pt-2 text-sm font-medium text-ink-2">{children}</h2>;
}

function TeleRow({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-hairline pb-3 last:border-b-0 last:pb-0">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="tnum flex items-center gap-2 text-right"><span className="text-base font-semibold text-ink">{value}</span>{delta !== undefined && <Delta value={delta ?? null} />}</dd>
    </div>
  );
}
