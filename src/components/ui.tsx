import type { ReactNode } from "react";
import { pct } from "@/lib/format";

/** White panel. `flush` removes padding for edge-to-edge tables. */
export function Panel({ children, className = "", flush = false, id }: { children: ReactNode; className?: string; flush?: boolean; id?: string }) {
  return <section id={id} className={`scroll-mt-24 rounded-lg bg-surface shadow-ambient ring-1 ring-hairline transition-shadow duration-200 ${flush ? "" : "p-5"} ${className}`}>{children}</section>;
}

export function PanelHeader({ title, help, aside, sub }: { title: string; help?: string; aside?: ReactNode; sub?: string }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="flex items-center gap-1.5 text-[15px] font-medium text-ink">
          {title}
          {help && <Help text={help} />}
        </h2>
        {sub && <p className="mt-0.5 text-[13px] text-ink-2">{sub}</p>}
      </div>
      {aside && <div className="shrink-0 text-[13px] text-ink-2">{aside}</div>}
    </div>
  );
}

/** Plain-language explainer on hover / focus. Native tooltip keeps it accessible without JS. */
export function Help({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      title={text}
      aria-label={text}
      className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-line-strong text-[10px] font-medium leading-none text-ink-3 hover:border-ink-3 hover:text-ink-2"
    >
      ?
    </span>
  );
}

/** Signed percent change chip. Neutral when null or tiny. */
export function Delta({ value, suffix = "", size = "sm" }: { value: number | null; suffix?: string; size?: "sm" | "md" }) {
  const cls = size === "md" ? "px-2 py-0.5 text-[13px]" : "px-1.5 py-px text-[12px]";
  if (value === null || !isFinite(value)) return <span className={`inline-flex whitespace-nowrap rounded-md bg-canvas text-ink-3 ${cls}`}>—</span>;
  const flat = Math.abs(value) < 1;
  const up = value > 0;
  const tone = flat ? "bg-canvas text-ink-2" : up ? "bg-up-soft text-up-ink" : "bg-down-soft text-down-ink";
  const arrow = flat ? "" : up ? "↑ " : "↓ ";
  return (
    <span className={`tnum inline-flex items-center whitespace-nowrap rounded-md font-medium ${tone} ${cls}`}>
      {arrow}{pct(Math.abs(value))}{suffix}
    </span>
  );
}

/** Thin horizontal proportion bar used in ranked tables. */
export function Bar({ value, max, tone = "ink" }: { value: number; max: number; tone?: "ink" | "accent" | "muted" }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  const color = tone === "accent" ? "bg-accent" : tone === "muted" ? "bg-line-strong" : "bg-ink";
  return (
    <div className="h-1.5 w-full rounded-full bg-canvas">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "up" | "note" }) {
  const t = {
    neutral: "bg-canvas text-ink-2",
    accent: "bg-accent-soft text-accent-ink",
    up: "bg-up-soft text-up-ink",
    note: "bg-note-soft text-note-ink",
  }[tone];
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-px text-[12px] font-medium ${t}`}>{children}</span>;
}

/** Honest empty state for data this database does not carry yet. */
export function NotConnected({ what, source }: { what: string; source: string }) {
  return (
    <div className="rounded-md border border-dashed border-line-strong bg-canvas/60 px-4 py-5 text-[13px] text-ink-2">
      <p className="font-medium text-ink">{what} isn't connected yet.</p>
      <p className="mt-1">Autumn will show it here once {source} is linked to this property. Nothing is missing from your results above. This only adds detail.</p>
    </div>
  );
}
