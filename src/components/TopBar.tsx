import Link from "next/link";
import type { Period, PeriodKey } from "@/lib/period";
import { dateRange } from "@/lib/format";
import { HOTEL_NAME } from "@/lib/config";

const OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "12m", label: "12 months" },
];

export function TopBar({ period, active }: { period: Period; active: "overview" | "source" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-2.5 sm:h-14 sm:flex-nowrap sm:py-0">
        <div className="flex items-center gap-3 sm:gap-6">
          <Link href={`/?period=${period.key}`} className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-[13px] font-semibold text-white">A</span>
            <span className="text-[15px] font-medium tracking-tight">Autumn</span>
            <span className="hidden text-[13px] text-ink-3 sm:inline">for {HOTEL_NAME}</span>
          </Link>
          <nav className="flex items-center gap-1 whitespace-nowrap text-[13.5px]">
            <NavLink href={`/?period=${period.key}`} current={active === "overview"}>Overview</NavLink>
            <NavLink href={`/source?period=${period.key}`} current={active === "source"}>Where it comes from</NavLink>
          </nav>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <span className="whitespace-nowrap text-[12.5px] text-ink-3">{dateRange(period.start, period.end)}</span>
          <div className="flex whitespace-nowrap rounded-md border border-line bg-canvas p-0.5 text-[12.5px]" role="tablist" aria-label="Time period">
            {OPTIONS.map((o) => (
              <Link
                key={o.key}
                href={`${active === "overview" ? "/" : "/source"}?period=${o.key}`}
                role="tab"
                aria-selected={period.key === o.key}
                className={`rounded px-2.5 py-1 ${period.key === o.key ? "bg-surface font-medium text-ink shadow-card" : "text-ink-2 hover:text-ink"}`}
              >
                {o.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`rounded-md px-2.5 py-1.5 ${current ? "bg-canvas font-medium text-ink" : "text-ink-2 hover:bg-canvas hover:text-ink"}`}
    >
      {children}
    </Link>
  );
}
