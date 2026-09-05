"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { HOTEL_NAME, ROOMS } from "@/lib/config";
import type { PeriodKey } from "@/lib/period";

interface SubItem {
  label: string;
  href: string;
  section: string;
}

const ICONS: Record<string, ReactElement> = {
  overview: <path d="M3 9.5 8 4l5 5.5M4.5 8.5V13h7V8.5" />,
  bookings: <path d="M4 3h8v10H4zM6 6h4M6 8.5h4M6 11h2" />,
};

export function Sidebar({ period, onCollapse, className = "" }: { period: PeriodKey; onCollapse?: () => void; className?: string }) {
  const pathname = usePathname();
  const q = `?period=${period}`;
  const onSource = pathname === "/source";
  const subItems: SubItem[] = [
    { label: "Attribution", href: `/source${q}#attribution`, section: "attribution" },
    { label: "Revenue", href: `/source${q}#revenue`, section: "revenue" },
  ];

  const [expanded, setExpanded] = useState<boolean>(onSource);
  const [visible, setVisible] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setExpanded(onSource), [onSource]);

  useEffect(() => {
    const els = subItems.map((s) => document.getElementById(s.section)).filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top?.target.id) setVisible(top.target.id);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [pathname, period]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const overviewActive = pathname === "/";

  return (
    <aside className={`flex w-60 shrink-0 flex-col bg-surface ring-1 ring-hairline ${className}`}>
      <div className="flex h-14 items-center justify-between gap-2 px-4">
        <Link href={`/${q}`} className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-ink text-sm font-semibold text-white shadow-ambient">A</span>
          <span className="truncate text-[0.95rem] font-medium tracking-tight text-ink">Autumn</span>
        </Link>
        {onCollapse && (
          <button type="button" onClick={onCollapse} aria-label="Collapse sidebar" className="grid size-8 place-items-center rounded-md text-ink-3 transition-colors duration-150 hover:bg-canvas hover:text-ink">
            <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M6 3v10" /></svg>
          </button>
        )}
      </div>

      <div ref={menuRef} className="relative px-3 pb-3 pt-1">
        <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen} className="flex w-full items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-left shadow-ambient ring-1 ring-hairline transition-all duration-200 hover:shadow-ambient-md active:scale-[0.99]">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-ink">{HOTEL_NAME}</span>
            <span className="block truncate text-xs text-ink-3">Boutique hotel · {ROOMS} rooms</span>
          </span>
          <svg className={`size-3.5 shrink-0 text-ink-3 transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none"><path d="M5 6.5 8 9.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {menuOpen && (
          <div role="menu" className="absolute inset-x-3 top-full z-20 mt-1 rounded-lg bg-surface p-1.5 shadow-ambient-lg ring-1 ring-hairline">
            <div role="menuitemradio" aria-checked="true" className="flex items-center justify-between gap-2 rounded-md bg-canvas px-2.5 py-1.5 text-sm text-ink">
              {HOTEL_NAME}
              <svg className="size-4 text-accent" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>
            </div>
            <p className="px-2.5 py-1.5 text-xs text-ink-3">Only property on this account.</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-1">
        <ul className="space-y-1">
          <li>
            <Link href={`/${q}`} aria-current={overviewActive ? "page" : undefined} className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150 ${overviewActive ? "bg-canvas font-medium text-ink shadow-ambient ring-1 ring-hairline" : "text-ink-2 hover:bg-canvas/70 hover:text-ink"}`}>
              <svg className={`size-4 shrink-0 ${overviewActive ? "text-accent" : "text-ink-3 group-hover:text-ink-2"}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">{ICONS.overview}</svg>
              <span className="truncate">Overview</span>
            </Link>
          </li>

          <li>
            <div className={`flex items-center rounded-lg pr-1 transition-all duration-150 ${onSource ? "bg-canvas shadow-ambient ring-1 ring-hairline" : "hover:bg-canvas/70"}`}>
              <Link
                href={`/source${q}`}
                aria-current={onSource ? "page" : undefined}
                onClick={(e) => {
                  if (onSource) {
                    const el = document.getElementById("attribution");
                    if (el) {
                      e.preventDefault();
                      el.scrollIntoView({ behavior: "smooth", block: "start" });
                      window.history.replaceState(null, "", `/source${q}#attribution`);
                      setVisible("attribution");
                    }
                  }
                }}
                className={`group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ${onSource ? "font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
              >
                <svg className={`size-4 shrink-0 ${onSource ? "text-accent" : "text-ink-3 group-hover:text-ink-2"}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">{ICONS.bookings}</svg>
                <span className="truncate">Bookings</span>
              </Link>
              <button type="button" onClick={() => setExpanded((v) => !v)} aria-label={expanded ? "Collapse Bookings" : "Expand Bookings"} aria-expanded={expanded} className="grid size-7 shrink-0 place-items-center rounded-md text-ink-3 transition-colors duration-150 hover:text-ink">
                <svg className={`size-3.5 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none"><path d="M5 6.5 8 9.5l3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>

            {expanded && (
              <ul className="mt-1 space-y-0.5 pl-5">
                {subItems.map((s) => {
                  const active = onSource && visible === s.section;
                  return (
                    <li key={s.section}>
                      <Link
                        href={s.href}
                        aria-current={active ? "page" : undefined}
                        onClick={(e) => {
                          if (onSource) {
                            const el = document.getElementById(s.section);
                            if (el) {
                              e.preventDefault();
                              el.scrollIntoView({ behavior: "smooth", block: "start" });
                              window.history.replaceState(null, "", s.href);
                              setVisible(s.section);
                            }
                          }
                        }}
                        className={`flex items-center gap-2.5 rounded-md py-1.5 pl-3 pr-2 text-sm transition-colors duration-150 ${active ? "font-medium text-ink" : "text-ink-2 hover:text-ink"}`}
                      >
                        <span className={`size-1.5 shrink-0 rounded-full ${active ? "bg-accent" : "bg-line-strong"}`} aria-hidden />
                        <span className="truncate">{s.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        </ul>
      </nav>
    </aside>
  );
}
