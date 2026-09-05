"use client";

import { useOptimistic, useTransition } from "react";
import { decideRecommendation, undoRecommendation, type Decision } from "@/app/actions";
import type { Recommendation } from "@/lib/narrative";
import { int, money } from "@/lib/format";
import { Tag } from "./ui";

type State = Record<string, Decision | undefined>;

/**
 * The Steer: 2–3 recommended moves with projected impact and one-click decisions.
 * Optimistic UI so the button responds instantly; the server action persists it.
 */
export function Steer({ recs, decisions, compact = false }: { recs: Recommendation[]; decisions: State; compact?: boolean }) {
  const [state, setState] = useOptimistic<State, { id: string; d: Decision | undefined }>(decisions, (s, a) => ({ ...s, [a.id]: a.d }));
  const [pending, start] = useTransition();

  const act = (id: string, d: Decision | undefined) =>
    start(async () => {
      setState({ id, d });
      if (d) await decideRecommendation(id, d);
      else await undoRecommendation(id);
    });

  if (!recs.length) {
    return <p className="text-[13.5px] text-ink-2">No moves to suggest right now. Your program is running as planned.</p>;
  }

  return (
    <ol className="divide-y divide-line" aria-busy={pending}>
      {recs.map((r) => {
        const d = state[r.id];
        return (
          <li key={r.id} className={`py-4 first:pt-0 last:pb-0 ${d === "dismissed" ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium leading-snug text-ink">{r.title}</p>
                {!compact && <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{r.why}</p>}
                <p className="tnum mt-2 text-[13px] text-ink-2">
                  Expected: <span className="font-medium text-ink">+{money(r.projectedRevenue)}</span>
                  {r.projectedBookings > 0 && <> · about {int(r.projectedBookings)} more direct {r.projectedBookings === 1 ? "stay" : "stays"}</>}
                </p>
              </div>
              <Tag tone={r.effort === "Autumn handles it" ? "up" : "note"}>{r.effort}</Tag>
            </div>

            <div className="mt-3 flex items-center gap-2">
              {d === "approved" ? (
                <>
                  <Tag tone="up">Approved. Autumn is on it</Tag>
                  <button onClick={() => act(r.id, undefined)} className="text-[12.5px] text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline">Undo</button>
                </>
              ) : d === "dismissed" ? (
                <>
                  <Tag>Not now</Tag>
                  <button onClick={() => act(r.id, undefined)} className="text-[12.5px] text-ink-3 underline-offset-2 hover:text-ink-2 hover:underline">Reconsider</button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => act(r.id, "approved")}
                    className="rounded-md bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent-hover"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => act(r.id, "dismissed")}
                    className="rounded-md border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-2 hover:border-line-strong hover:text-ink"
                  >
                    Not now
                  </button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
