import { NextResponse } from "next/server";
import { buildPeriod, parsePeriodKey } from "@/lib/period";
import { buildLeakage } from "@/lib/leakage";
import { buildSignal } from "@/lib/narrative";
import { int, money, pct } from "@/lib/format";
import { getAsOf, getCampaigns, getChannels, getFunnel, getMarketMix, getMarkets, getResults } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AskResponse {
  answer: string;
  href: string;
  label: string;
}

/** POST { question, period } -> a real answer computed from the hotel's data. */
export async function POST(req: Request) {
  let body: { question?: string; period?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "Ask a question" }, { status: 400 });

  const asOf = await getAsOf();
  const p = buildPeriod(parsePeriodKey(body.period), asOf);
  const [cur, prev, yoy, markets, mix, channels, campaigns, funnel] = await Promise.all([
    getResults(p.start, p.end), getResults(p.prevStart, p.prevEnd), getResults(p.yoyStart, p.yoyEnd),
    getMarkets(p), getMarketMix(p.start, p.end), getChannels(p), getCampaigns(p, true), getFunnel(p.start, p.end),
  ]);
  const leakage = buildLeakage(cur, campaigns, mix);
  const signal = buildSignal(p, cur, prev, yoy, markets[0]);

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalReturn = campaigns.reduce((s, c) => s + c.revenue, 0);
  const overallRoas = totalSpend > 0 ? totalReturn / totalSpend : null;
  const topCampaign = [...campaigns].filter((c) => c.spend > 0).sort((a, b) => (b.roas ?? 0) - (a.roas ?? 0))[0];
  const commissionPaid = cur.otaRevenue * 0.15;
  const topMarket = markets[0];

  const q = question.toLowerCase();
  const { href, label } = destinationFor(q, p.key);

  // Optional: upgrade to the Anthropic API when a key is configured.
  let answer: string;
  const snapshot = {
    window: p.label, direct_bookings: cur.bookings, direct_revenue: cur.revenue,
    revenue_vs_last_year_pct: signal.yoyRevenueChange, commission_kept: cur.commissionAvoided,
    commission_paid_to_otas: commissionPaid, recoverable: leakage.totalAtStake,
    ota_bookings: cur.otaBookings, top_market: topMarket?.name, overall_roas: overallRoas,
    ad_spend: totalSpend, ad_return: totalReturn, top_campaign: topCampaign?.name,
    impressions: funnel.impressions, visits_from_ads: funnel.clicks, ctr_pct: funnel.ctr,
  };
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    try {
      answer = await askAnthropic(key, question, snapshot);
    } catch {
      answer = answerFromData(q, { cur, signal, leakage, commissionPaid, topMarket, overallRoas, totalSpend, totalReturn, topCampaign, funnel });
    }
  } else {
    answer = answerFromData(q, { cur, signal, leakage, commissionPaid, topMarket, overallRoas, totalSpend, totalReturn, topCampaign, funnel });
  }

  const res: AskResponse = { answer, href, label };
  return NextResponse.json(res);
}

function destinationFor(q: string, period: string): { href: string; label: string } {
  const base = `/source?period=${period}`;
  if (/ota|leak|commission|losing|book\s*direct/.test(q)) return { href: `${base}#bookings`, label: "View leaks" };
  if (/campaign|roas|return|spend|marketing|\bads?\b|drove|driving/.test(q)) return { href: `${base}#marketing`, label: "View marketing" };
  if (/trend|increas|grow|month|year|over time/.test(q)) return { href: `${base}#insights`, label: "View trends" };
  return { href: `${base}#bookings`, label: "View bookings" };
}

interface DataCtx {
  cur: Awaited<ReturnType<typeof getResults>>;
  signal: ReturnType<typeof buildSignal>;
  leakage: ReturnType<typeof buildLeakage>;
  commissionPaid: number;
  topMarket: Awaited<ReturnType<typeof getMarkets>>[number] | undefined;
  overallRoas: number | null;
  totalSpend: number;
  totalReturn: number;
  topCampaign: Awaited<ReturnType<typeof getCampaigns>>[number] | undefined;
  funnel: Awaited<ReturnType<typeof getFunnel>>;
}

function answerFromData(q: string, c: DataCtx): string {
  const yoy = c.signal.yoyRevenueChange;
  const yoyText = yoy === null ? "" : ` ${yoy >= 0 ? "up" : "down"} ${pct(Math.abs(yoy))} vs last year`;

  if (/ota|leak|commission|losing|book\s*direct/.test(q)) {
    const m = c.topMarket ? `, and ${c.topMarket.name} sends the most guests` : "";
    return `You paid about ${money(c.commissionPaid)} in OTA commission this period. Around ${money(c.leakage.totalAtStake)} is recoverable across OTA commission, campaign waste and cancellations${m}.`;
  }
  if (/campaign|roas|return|spend|marketing|\bads?\b|drove|driving/.test(q)) {
    const roas = c.overallRoas === null ? "no paid spend this period" : `${c.overallRoas.toFixed(1)}× overall (${money(c.totalSpend)} spent, ${money(c.totalReturn)} returned)`;
    const best = c.topCampaign ? `. "${c.topCampaign.name}" is your best performer` : "";
    return `Your marketing returned ${roas}${best}.`;
  }
  if (/market|city|guests|feeder|where.*from/.test(q)) {
    return c.topMarket ? `${c.topMarket.name} is your top feeder market with ${int(c.topMarket.bookings)} direct stays worth ${money(c.topMarket.revenue)} this period.` : `No feeder-market data for this period.`;
  }
  if (/trend|increas|grow|month|year|over time/.test(q)) {
    return `Direct revenue is ${money(c.cur.revenue)} this period${yoyText}. Direct bookings are ${int(c.cur.bookings)}.`;
  }
  // revenue / bookings / default
  return `Autumn drove ${int(c.cur.bookings)} direct bookings worth ${money(c.cur.revenue)} this period${yoyText}. That kept ${money(c.cur.commissionAvoided)} in commission off OTAs.`;
}

async function askAnthropic(key: string, question: string, snapshot: Record<string, unknown>): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
      max_tokens: 200,
      system: "You are Autumn, a calm marketing assistant for an independent hotel owner. Answer in 1-2 short, plain sentences using only the JSON figures provided. No jargon, no markdown.",
      messages: [{ role: "user", content: `Figures: ${JSON.stringify(snapshot)}\n\nQuestion: ${question}` }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}`);
  const data: { content?: { type: string; text?: string }[] } = await r.json();
  const text = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join(" ").trim();
  if (!text) throw new Error("Empty response");
  return text;
}
