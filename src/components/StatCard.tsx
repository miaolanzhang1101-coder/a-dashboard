import type { ReactNode } from "react";
import { Delta, Help } from "./ui";
import { Spark } from "./Spark";

/**
 * Compact B2B metric card: label, big value, delta chip, a muted comparison
 * line, and an optional sparkline. Pass `onClick` to make it a button that
 * reveals its source (e.g. the ledger drawer).
 */
export function StatCard({
  label, help, value, delta, deltaSuffix, compare, spark, sparkTone = "#0F2438", accent = false, onClick, cta, valueTone,
}: {
  label: string;
  help?: string;
  value: string;
  delta?: number | null;
  deltaSuffix?: string;
  compare?: ReactNode;
  spark?: number[];
  sparkTone?: string;
  accent?: boolean;
  onClick?: () => void;
  cta?: string;
  valueTone?: "down";
}) {
  const base = `rounded-lg bg-surface p-4 shadow-ambient ring-1 transition-all duration-200 ${accent ? "ring-accent/40" : "ring-hairline"}`;
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
        {label}
        {help && <Help text={help} />}
      </div>
      <div className="mt-1.5 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className={`tnum text-[23px] font-medium leading-none tracking-tight ${valueTone === "down" ? "text-down-ink" : "text-ink"}`}>{value}</span>
            {delta !== undefined && <Delta value={delta} suffix={deltaSuffix} />}
          </div>
          {compare && <p className="tnum mt-1.5 text-[12px] text-ink-3">{compare}</p>}
        </div>
        {spark && <div className="shrink-0 pb-0.5"><Spark data={spark} stroke={sparkTone} /></div>}
      </div>
      {cta && <p className="mt-2 text-[12px] font-medium text-accent">{cta}</p>}
    </>
  );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={`${base} block w-full text-left hover:-translate-y-px hover:shadow-ambient-md active:translate-y-0`}>
        {body}
      </button>
    );
  return <div className={base}>{body}</div>;
}
