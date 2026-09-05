/**
 * Revenue leakage — the shadow of "commission kept". Where money is leaving the
 * building or being left on the table, quantified from the same data, each with
 * a recovery path that links to a Steer move.
 */
import { OTA_COMMISSION_RATE } from "./config";
import { int, money } from "./format";
import type { CampaignRow, MarketMix, Results } from "./queries";

export interface LeakItem {
  id: string;
  title: string;
  amount: number;
  detail: string;
  recovery: string;
  anchor: string;
}

export interface Leakage {
  totalAtStake: number;
  items: LeakItem[];
  leakyMarket: { name: string; otaShare: number; otaRev: number } | null;
}

export function buildLeakage(results: Results, campaigns: CampaignRow[], mix: MarketMix[], rate = OTA_COMMISSION_RATE): Leakage {
  const items: LeakItem[] = [];
  const otaPct = Math.round(rate * 100);

  const leaky = [...mix].filter((m) => m.otaRev > 0 && m.otaBookings >= 3).sort((a, b) => b.otaRev - a.otaRev)[0] ?? null;

  // 1. OTA commission paid — the biggest, clearest leak.
  const commissionPaid = results.otaRevenue * rate;
  if (commissionPaid > 0) {
    items.push({
      id: "ota",
      title: "Paid to OTAs in commission",
      amount: commissionPaid,
      detail:
        `${int(results.otaBookings)} OTA stays at ${otaPct}%.` +
        (leaky ? ` Biggest source: ${leaky.name} (${Math.round(leaky.otaShare)}%).` : ""),
      recovery: "A small book-direct perk on your rate page typically moves a couple of points of this back to direct.",
      anchor: "#steer",
    });
  }

  // 2. Campaign spend below break-even.
  const waste = campaigns
    .filter((c) => c.objective === "bookings" && c.roas !== null && (c.roas as number) < 1)
    .reduce((s, c) => s + Math.max(0, c.spend - c.revenue), 0);
  if (waste > 50) {
    items.push({
      id: "campaign",
      title: "Campaign spend below break-even",
      amount: waste,
      detail: "Some campaigns returned under $1 per $1 spent.",
      recovery: "Autumn can pause or re-target the underperformers and move that budget to the campaigns that are converting.",
      anchor: "#campaigns",
    });
  }

  // 3. Cancelled direct bookings (estimated at average value).
  const avg = results.bookings > 0 ? results.revenue / results.bookings : 0;
  const cxlValue = results.cancellations * avg;
  if (cxlValue > 0) {
    items.push({
      id: "cxl",
      title: "Cancelled direct bookings",
      amount: cxlValue,
      detail: `${int(results.cancellations)} cancellations, about ${money(cxlValue)} at your average rate.`,
      recovery: "A short deposit window on high-demand dates cuts last-minute cancellations.",
      anchor: "#steer",
    });
  }

  return { totalAtStake: items.reduce((s, i) => s + i.amount, 0), items, leakyMarket: leaky };
}
