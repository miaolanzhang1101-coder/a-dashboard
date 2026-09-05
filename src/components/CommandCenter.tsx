"use client";

import { useState } from "react";
import Link from "next/link";
import { Drawer } from "./Drawer";
import { Delta } from "./ui";
import { Spark } from "./Spark";
import { money, int, shortDate, nightsLabel } from "@/lib/format";
import type { RecentBooking } from "@/lib/queries";
import type { Mode, OperationalAlert, Investigation } from "@/lib/opportunity";

interface BigMetric {
  label: string;
  value: string;
  tone?: "up" | "down";
}

export interface CommandData {
  windowLabel: string;
  compareLabel: string;
  revenue: string;
  revenueDelta: number | null;
  spark: number[];
  metrics: BigMetric[];
  synthesis: string;
  opportunityAmount: string;
  leakageHref: string;
  mode: Mode;
  alerts: OperationalAlert[];
  investigation: Investigation | null;
  ledger: RecentBooking[];
  ledgerTotal: number;
  ledgerHref: string;
}

/**
 * Layer 1 — the metric command center. Leads with the number (Stripe-style),
 * a single opportunity CTA, and a row of large headline metrics. The period
 * switch lives in the app bar; there are no view tabs here.
 */
export function CommandCenter({ data }: { data: CommandData }) {
  const [drawer, setDrawer] = useState<null | "ledger">(null);
  const toneClass = (t?: "up" | "down") => (t === "up" ? "text-up-ink" : t === "down" ? "text-down-ink" : "text-ink");

  return (
    <>
      <section aria-labelledby="cc-heading" className="rounded-lg bg-surface p-6 shadow-ambient-md ring-1 ring-hairline sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          {/* metric hero */}
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink-2">Direct booking performance</p>
            <button
              onClick={() => setDrawer("ledger")}
              className="group mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-left transition-transform duration-150 active:scale-[0.99]"
              aria-label="See the stays behind this number"
            >
              <span id="cc-heading" className="tnum text-4xl font-semibold leading-none tracking-tight text-ink transition-colors duration-150 group-hover:text-accent sm:text-5xl">
                {data.revenue}
              </span>
              <Delta value={data.revenueDelta} size="md" />
            </button>
            <p className="mt-2 text-sm text-ink-2">
              Direct room revenue <span className="text-ink-3">vs {data.compareLabel}</span>
            </p>
            <div className="mt-3 h-9 w-40 max-w-full">
              <Spark data={data.spark} stroke="#1F8A82" width={160} height={36} />
            </div>
          </div>

          {/* primary action: view the bookings screen */}
          <Link
            href={data.leakageHref}
            className="flex shrink-0 flex-col justify-center rounded-lg bg-accent-soft px-4 py-3 text-accent-ink shadow-ambient ring-1 ring-accent/30 transition-all duration-200 hover:-translate-y-px hover:shadow-ambient-md active:translate-y-0 lg:max-w-xs"
          >
            <span className="flex items-center gap-1.5 text-base font-semibold">View bookings <span aria-hidden>→</span></span>
            <span className="tnum mt-0.5 text-xs text-accent-ink/90">See where {data.opportunityAmount} is recoverable</span>
          </Link>
        </div>

        {/* inline attention (maintenance) */}
        {data.mode === "maintenance" && data.alerts.length > 0 && (
          <ul className="mt-5 space-y-2">
            {data.alerts.map((a) => (
              <li key={a.id} className={`rounded-md px-3.5 py-3 shadow-ambient ring-1 ${a.severity === "high" ? "bg-down-soft ring-down/20" : "bg-note-soft ring-note-ink/15"}`}>
                <p className={`text-sm font-medium ${a.severity === "high" ? "text-down-ink" : "text-note-ink"}`}>{a.title}</p>
                <p className={`mt-0.5 text-sm leading-relaxed ${a.severity === "high" ? "text-down-ink/90" : "text-note-ink/90"}`}>{a.body}</p>
              </li>
            ))}
          </ul>
        )}


        {/* large headline metrics */}
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-hairline pt-6 sm:grid-cols-4">
          {data.metrics.map((m) => (
            <div key={m.label} className="min-w-0">
              <dt className="truncate text-sm text-ink-2">{m.label}</dt>
              <dd className={`tnum mt-1 text-3xl font-semibold tracking-tight ${toneClass(m.tone)}`}>{m.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 max-w-prose text-sm leading-relaxed text-ink-2">{data.synthesis}</p>
      </section>

      {/* Source Ledger drawer */}
      <Drawer open={drawer === "ledger"} onClose={() => setDrawer(null)} title="The stays behind this number" subtitle="Every reservation in your direct revenue" width={480}>
        <ul className="divide-y divide-hairline">
          {data.ledger.map((b) => (
            <li key={b.id} className="py-3 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{b.guests}-guest stay, {b.market}, {b.region}</p>
                  <p className="mt-0.5 text-xs text-ink-3">{shortDate(b.checkIn)} to {shortDate(b.checkOut)}, {nightsLabel(b.nights)}, via {b.channel}</p>
                  <p className="mt-1 font-mono text-xs text-ink-3">{b.confirmation}</p>
                </div>
                <div className="tnum shrink-0 text-right">
                  <p className="text-sm font-medium text-ink">{money(b.revenue)}</p>
                  <p className="text-xs text-up-ink">+{money(b.commissionAvoided)} kept</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {data.ledgerTotal > data.ledger.length && (
          <a href={data.ledgerHref} className="mt-4 flex items-center justify-center rounded-md bg-surface px-3 py-2 text-sm font-medium text-ink-2 shadow-ambient ring-1 ring-hairline transition-all duration-150 hover:text-ink">
            Open the full ledger, all {int(data.ledgerTotal)} stays
          </a>
        )}
      </Drawer>

    </>
  );
}
