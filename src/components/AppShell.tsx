"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { HashScroll } from "./HashScroll";
import type { Period, PeriodKey } from "@/lib/period";
import { dateRange } from "@/lib/format";

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
];

export function AppShell({
  period, active, title, breadcrumb, basePath, children,
}: {
  period: Period;
  active: "overview" | "source";
  title: string;
  breadcrumb?: ReactNode;
  basePath: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`min-h-screen bg-canvas transition-all duration-200 lg:grid ${collapsed ? "lg:grid-cols-1" : "lg:grid-cols-[15rem_1fr]"}`}>
      <HashScroll />
      {!collapsed && <Sidebar period={period.key} onCollapse={() => setCollapsed(true)} className="sticky top-0 hidden h-screen lg:flex" />}
      <MobileNav period={period} active={active} />

      <div className="flex min-h-screen min-w-0 flex-col">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-hairline bg-surface/95 px-5 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            {collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="Open sidebar"
                className="hidden size-8 shrink-0 place-items-center rounded-md text-ink-3 transition-colors duration-150 hover:bg-canvas hover:text-ink lg:grid"
              >
                <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="12" height="10" rx="1.5" />
                  <path d="M6 3v10" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              {breadcrumb && <div className="text-xs text-ink-3">{breadcrumb}</div>}
              <h1 className="truncate text-[0.95rem] font-medium tracking-tight text-ink">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden whitespace-nowrap text-xs text-ink-3 sm:inline">{dateRange(period.start, period.end)}</span>
            <div className="flex whitespace-nowrap rounded-md border border-hairline bg-canvas p-0.5 text-xs" role="tablist" aria-label="Time period">
              {OPTIONS.map((o) => (
                <Link
                  key={o.key}
                  href={`${basePath}?period=${o.key}`}
                  role="tab"
                  aria-selected={period.key === o.key}
                  className={`rounded px-2.5 py-1 transition-all duration-150 ${period.key === o.key ? "bg-surface font-medium text-ink shadow-ambient" : "text-ink-2 hover:text-ink"}`}
                >
                  {o.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1120px] flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
