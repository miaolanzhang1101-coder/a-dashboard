import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { AskAutumn } from "@/components/AskAutumn";
import { CommandCenter, type CommandData } from "@/components/CommandCenter";
import { TrendChart } from "@/components/TrendChart";
import { Panel, PanelHeader, NotConnected, Help } from "@/components/ui";
import { CampaignsTable, FunnelView, MarketsTable } from "@/components/tables";
import { buildPeriod, parsePeriodKey } from "@/lib/period";
import { buildInsights, buildSignal, type InsightItem } from "@/lib/narrative";
import { buildInvestigation, deriveMode } from "@/lib/opportunity";
import { buildLeakage } from "@/lib/leakage";
import { int, money, pct } from "@/lib/format";
import { OTA_COMMISSION_RATE } from "@/lib/config";
import { getAsOf, getCampaigns, getChannels, getDeviceBreakdown, getFunnel, getMarketMix, getMarkets, getRecentBookings, getResults, getTrend } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface OverviewSearchParams {
  period?: string;
  view?: string;
}

/**
 * Screen 1 — Overview.
 * Tier 1 immediate outcomes (results, value, insights) → Tier 2 trajectory
 * (trends, feeder markets) → Tier 3 secondary performance details.
 */
export default async function OverviewPage({ searchParams }: { searchParams: OverviewSearchParams }) {
  const asOf = await getAsOf();
  const p = buildPeriod(parsePeriodKey(searchParams.period), asOf);

  const [cur, prev, yoy, trend, prevTrend, topStays, markets, channels, campaigns, funnel, mix, devices] = await Promise.all([
    getResults(p.start, p.end), getResults(p.prevStart, p.prevEnd), getResults(p.yoyStart, p.yoyEnd),
    getTrend(p.start, p.end), getTrend(p.prevStart, p.prevEnd), getRecentBookings(p.start, p.end, 14),
    getMarkets(p), getChannels(p), getCampaigns(p), getFunnel(p.start, p.end), getMarketMix(p.start, p.end), getDeviceBreakdown(),
  ]);

  const signal = buildSignal(p, cur, prev, yoy, markets[0]);
  const { mode, alerts } = deriveMode(trend, channels, cur, prev, searchParams.view);
  const investigation = buildInvestigation(channels, markets);
  const leakage = buildLeakage(cur, campaigns, mix);
  const insights = buildInsights(signal, channels, markets, leakage.totalAtStake);
  const src = `/source?period=${p.key}`;

  const totalStays = cur.bookings + cur.otaBookings;
  const directShare = totalStays ? (cur.bookings / totalStays) * 100 : 0;
  const yoyPct = signal.yoyRevenueChange;

  const command: CommandData = {
    windowLabel: p.label,
    compareLabel: p.compareLabel,
    revenue: money(cur.revenue),
    revenueDelta: signal.revenueChange,
    spark: trend.map((t) => t.revenue),
    metrics: [
      { label: "Direct bookings", value: int(cur.bookings) },
      { label: "Total booking value", value: money(cur.revenue), tone: "up" },
      { label: "Commission kept", value: money(cur.commissionAvoided), tone: "up" },
      { label: "vs last year", value: yoyPct === null ? "n/a" : `${yoyPct >= 0 ? "+" : ""}${yoyPct.toFixed(1)}%`, tone: (yoyPct ?? 0) >= 0 ? "up" : "down" },
    ],
    synthesis: `${int(cur.bookings)} direct stays this period, ${pct(directShare)} of all your bookings.`,
    opportunityAmount: money(leakage.totalAtStake),
    leakageHref: src,
    mode,
    alerts,
    investigation,
    ledger: topStays,
    ledgerTotal: cur.bookings,
    ledgerHref: `${src}#attribution`,
  };

  const adMetrics: { label: string; help: string; value: string; sub?: string }[] = [
    { label: "Impressions from ads", help: "How many times your hotel appeared in paid placements.", value: int(funnel.impressions) },
    { label: "Website visits from ads", help: "People who clicked an ad through to your site.", value: int(funnel.clicks), sub: funnel.ctr === null ? undefined : `${funnel.ctr.toFixed(1)}% click-through` },
  ];

  return (
    <AppShell period={p} active="overview" title="Overview" basePath="/">
      <div className="space-y-5">
        <AskAutumn period={p.key} />

        {/* ---- Tier 1: immediate outcomes ---- */}
        <CommandCenter data={command} />
        <Panel>
          <PanelHeader title="Insights" sub="what changed" />
          {insights.length === 0 ? (
            <p className="text-sm text-ink-2">All steady this period.</p>
          ) : (
            <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {insights.map((it: InsightItem, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${it.kind === "win" ? "bg-up" : it.kind === "watch" ? "bg-accent" : "bg-line-strong"}`} aria-hidden />
                  {it.text}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ---- Tier 2: trajectory & context ---- */}
        <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
          <Panel>
            <PanelHeader title="Trends over time" sub={`direct revenue vs ${p.compareLabel}`} />
            <TrendChart current={trend} previous={prevTrend} compareLabel={p.compareLabel} />
          </Panel>
          <Panel>
            <PanelHeader title="Feeder markets" help="The cities your direct bookers come from." aside={<Link href={`${src}#revenue`} className="text-sm text-ink-2 transition-colors duration-150 hover:text-ink">All</Link>} />
            <MarketsTable rows={markets} />
          </Panel>
        </div>

        {/* ---- Tier 3: secondary performance details ---- */}
        <h2 className="px-1 pt-2 text-sm font-medium text-ink-2">Performance details</h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <Panel>
            <PanelHeader title="Ads reach" help="Paid impressions and the visits they sent to your site." />
            <dl className="space-y-3">
              {adMetrics.map((m, i) => (
                <div key={m.label} className={`flex items-center justify-between gap-3 ${i > 0 ? "border-t border-hairline pt-3" : ""}`}>
                  <dt className="flex items-center gap-1.5 text-sm text-ink-2">{m.label} <Help text={m.help} /></dt>
                  <dd className="tnum text-right">
                    <span className="text-lg font-semibold text-ink">{m.value}</span>
                    {m.sub && <span className="block text-xs text-ink-3">{m.sub}</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel>
            <PanelHeader title="Device summary" help="Clicks and bookings by device." />
            {devices === null && <NotConnected what="Device data" source="your website analytics" />}
          </Panel>
          <Panel>
            <PanelHeader title="Funnel & website engagement" help="How people move from impressions to clicks to bookings." />
            <FunnelView f={funnel} />
          </Panel>
        </div>
        <Panel>
          <PanelHeader title="Campaign summary" sub="by return" aside={<Link href={`${src}#attribution`} className="text-sm text-ink-2 transition-colors duration-150 hover:text-ink">All</Link>} />
          <CampaignsTable rows={campaigns} />
        </Panel>

        <p className="pt-2 text-center text-xs text-ink-3">Figures reflect bookings made through {p.end.replace(/-/g, "/")}. Direct = anything not booked through an OTA.</p>
      </div>
    </AppShell>
  );
}
