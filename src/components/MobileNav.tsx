"use client";

import type { Period } from "@/lib/period";

/** Horizontal scroll nav shown below lg. Categorized links jump into detail. */
export function MobileNav({ period, active }: { period: Period; active: "overview" | "source" }) {
  const q = `?period=${period.key}`;
  const items: { label: string; href: string; on: boolean }[] = [
    { label: "Overview", href: `/${q}`, on: active === "overview" },
    { label: "Bookings", href: `/source${q}#attribution`, on: active === "source" },
    { label: "Attribution", href: `/source${q}#attribution`, on: false },
    { label: "Revenue", href: `/source${q}#revenue`, on: false },
  ];
  return (
    <div className="sticky top-0 z-20 border-b border-line bg-surface lg:hidden">
      <div className="flex h-12 items-center gap-3 px-4">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-ink text-[12px] font-semibold text-white">A</span>
        <nav className="flex items-center gap-1 overflow-x-auto text-[13px]">
          {items.map((i) => (
            <a key={i.label} href={i.href} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 transition-colors duration-150 ${i.on ? "bg-canvas font-medium text-ink" : "text-ink-2 hover:text-ink"}`}>
              {i.label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
