import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Steer } from "@/components/Steer";
import { TrendChart } from "@/components/TrendChart";
import { Panel, PanelHeader } from "@/components/ui";
import { RevenueSplitBar, RoiBars, ShareBars, LeakageBars, ChannelBars, type RoiRow, type ShareRow, type ChannelBar } from "@/components/charts";
import { CampaignsTable, FunnelView, Ledger } from "@/components/tables";
import { readDecisions } from "@/lib/decisions";
import { buildPeriod, parsePeriodKey } from "@/lib/period";
import { buildRecommendations } from "@/lib/narrative";
import { buildLeakage } from "@/lib/leakage";
import { int, money } from "@/lib/format";
import { OTA_COMMISSION_RATE } from "@/lib/config";
import { getAsOf, getCampaigns, getChannels, getFunnel, getLedger, getMarketMix, getMarkets, getResults, getTrend } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface SourceSearchParams {
  period?: string;
  rows?: string;
}

/**
 * Screen 2 — Bookings: Attribution & revenue. Only attribution and revenue
 * data, told with charts. Two sub-sections mirror the sidebar: Attribution
 * (what earned the bookings) and Revenue (kept vs recoverable).
 */
export default async function SourcePage({ searchParams }: { searchParams: SourceSearchParams }) {
  const asOf = await getAsOf();
  const p = buildPeriod(parsePeriodKey(searchParams.period), asOf);
  const ledgerLimit = searchParams.rows === "all" ? 5000 : 30;

  const [cur, ledger, markets, mix, channels, campaignsInPeriod, allCampaigns, funnel, trend, prevTrend] = await Promise.all([
    getResults(p.start, p.end), getLedger(p.start, p.end, ledgerLimit), getMarkets(p), getMarketMix(p.start, p.end),
    getChannels(p), getCampaigns(p, true), getCampaigns(p, false), getFunnel(p.start, p.end),
    getTrend(p.start, p.end), getTrend(p.prevStart, p.prevEnd),
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
  const channelBars: ChannelBar[] = channels.filter((c) => c.isWebsite && c.bookings > 0)
    .sort((a, b) => b.revenue - a.revenue).slice(0, 6).map((c) => ({ label: c.name, revenue: c.revenue, bookings: c.bookings, isPaid: c.isPaid }));

  const splitStats: { label: string; value: string; tone: "up" | "down" }[] = [
    { label: "Direct revenue", value: money(cur.revenue), tone: "up" },
    { label: "Commission kept", value: money(cur.commissionAvoided), tone: "up" },
    { label: "Paid to OTAs", value: money(commissionPaid), tone: "down" },
    { label: "Recoverable", value: money(leakage.totalAtStake), tone: "down" },
  ];

  return (
    <AppShell
      period={p}
      active="source"
      title="Bookings · Attribution & revenue"
      breadcrumb={<Link href={`/?period=${p.key}`} className="transition-colors duration-150 hover:text-ink">Overview</Link>}
      basePath="/source"
    >
      <div className="space-y-5">
        {/* Money orientation: direct vs OTA + the key figures, combined */}
        <Panel>
          <PanelHeader title="Every dollar: direct vs OTA" help="Revenue you kept by booking direct versus revenue that came through OTAs, and what is recoverable." />
          <RevenueSplitBar direct={cur.revenue} ota={cur.otaRevenue} commissionPaid={commissionPaid} />
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairline pt-4 sm:grid-cols-4">
            {splitStats.map((s) => (
              <div key={s.label} className="min-w-0">
                <dt className="truncate text-xs text-ink-2">{s.label}</dt>
                <dd className={`tnum mt-0.5 text-xl font-semibold ${s.tone === "up" ? "text-up-ink" : "text-down-ink"}`}>{s.value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        {/* ---- Attribution: what earned the bookings ---- */}
        <h2 id="attribution" className="scroll-mt-24 px-1 pt-2 text-sm font-medium text-ink-2">Attribution: what earned the bookings</h2>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Return on ad spend" sub={overallRoas === null ? "no paid spend" : `${overallRoas.toFixed(1)}× overall`} help="Direct revenue returned per dollar of ad spend." aside={<span className="tnum text-sm text-ink-2">{money(totalSpend)} → {money(totalReturn)}</span>} />
            <RoiBars rows={roiRows} />
          </Panel>
          <Panel>
            <PanelHeader title="Direct revenue by channel" sub="ranked by revenue" help="Which channels earned the bookings. Paid channels are the campaigns Autumn runs." />
            <ChannelBars rows={channelBars} />
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Booking ledger" sub={`${int(ledger.total)} direct stays${cur.cancellations ? `, ${int(cur.cancellations)} cancelled` : ""}`} help="Guest, stay dates, channel and confirmation code for every direct booking." />
          <Ledger rows={ledger.rows} total={ledger.total} showAllHref={`/source?period=${p.key}&rows=all#attribution`} />
        </Panel>

        <Panel>
          <PanelHeader title="Ad to booking funnel" sub={funnel.ctr === null ? undefined : `${funnel.ctr.toFixed(1)}% click-through`} help="How many people move from impressions to clicks to bookings, and where they drop off." />
          <FunnelView f={funnel} full />
        </Panel>

        <details className="group scroll-mt-24 rounded-lg bg-surface shadow-ambient ring-1 ring-hairline transition-shadow duration-200 hover:shadow-ambient-md">
          <summary className="flex items-center justify-between gap-3 px-5 py-4">
            <span><span className="text-[0.95rem] font-medium text-ink">Campaign detail</span><span className="ml-2 text-sm text-ink-3">every campaign, with impressions and clicks</span></span>
            <svg className="chev size-4 shrink-0 text-ink-3" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </summary>
          <div className="border-t border-hairline px-5 pb-5 pt-4">
            <CampaignsTable rows={campaignsInPeriod} full />
            {allCampaigns.length > campaignsInPeriod.length && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-ink-2 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline">Show all {allCampaigns.length} campaigns</summary>
                <div className="mt-3"><CampaignsTable rows={allCampaigns.filter((c) => !campaignsInPeriod.some((x) => x.id === c.id))} full /></div>
              </details>
            )}
          </div>
        </details>

        {/* ---- Revenue: kept vs recoverable ---- */}
        <h2 id="revenue" className="scroll-mt-24 px-1 pt-2 text-sm font-medium text-ink-2">Revenue: kept vs recoverable</h2>

        <div className="grid gap-5 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Where you leak to OTAs" sub="OTA share by market" help="High bars are your best recovery targets." />
            <ShareBars rows={shareRows} />
          </Panel>
          <Panel>
            <PanelHeader title="Recoverable revenue" sub={`${money(leakage.totalAtStake)} across ${leakage.items.length} sources`} help={`OTA commission at ${otaPct}%, campaign waste, and cancellations.`} />
            <LeakageBars items={leakage.items.map((l) => ({ id: l.id, title: l.title, amount: l.amount, anchor: l.anchor }))} />
          </Panel>
        </div>

        <Panel>
          <PanelHeader title="Recommended moves" sub="approve to recover" aside={<Link href={`/?period=${p.key}`} className="text-sm text-ink-2 underline-offset-2 transition-colors duration-150 hover:text-ink hover:underline">Back to overview</Link>} />
          <Steer recs={recs} decisions={decisions} compact />
        </Panel>

        <Panel>
          <PanelHeader title="Direct revenue over time" sub={`vs ${p.compareLabel}`} />
          <TrendChart current={trend} previous={prevTrend} compareLabel={p.compareLabel} />
        </Panel>

        <p className="pt-2 text-center text-xs text-ink-3">Figures reflect bookings made through {p.end.replace(/-/g, "/")}. Direct = anything not booked through an OTA.</p>
      </div>
    </AppShell>
  );
}
