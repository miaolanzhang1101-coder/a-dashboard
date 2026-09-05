"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { PeriodKey } from "@/lib/period";

interface Answer {
  answer: string;
  href: string;
  label: string;
}

const SUGGESTIONS = [
  "Is Autumn increasing direct bookings?",
  "How much direct revenue did Autumn generate?",
  "What drove my direct revenue this month?",
  "Where am I still losing money to OTAs?",
];

/**
 * Ask Autumn — answers from the hotel's live data via /api/ask (which upgrades
 * to the Anthropic API automatically when ANTHROPIC_API_KEY is set). Suggested
 * questions fill the prompt so you can review and press Enter.
 */
export function AskAutumn({ period }: { period: PeriodKey }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fillPrompt(text: string) {
    setQ(text);
    setAnswer(null);
    setError(null);
    inputRef.current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (!question || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, period }),
      });
      if (!res.ok) throw new Error("request failed");
      setAnswer((await res.json()) as Answer);
    } catch {
      setError("Couldn't reach Autumn just now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="ask-heading" className="rounded-lg bg-surface p-5 shadow-ambient ring-1 ring-hairline sm:p-6">
      <h2 id="ask-heading" className="text-base font-medium text-ink">Ask Autumn</h2>
      <p className="mt-0.5 text-sm text-ink-2">What do you want to know about your hotel&apos;s performance?</p>

      <form role="search" onSubmit={submit} className="mt-3">
        <label htmlFor="ask-input" className="sr-only">Ask about bookings, revenue, campaigns, or markets</label>
        <div className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2.5 shadow-ambient ring-1 ring-hairline transition-all duration-200 focus-within:ring-2 focus-within:ring-accent/50">
          <svg className="size-4 shrink-0 text-ink-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
            <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" />
          </svg>
          <input
            ref={inputRef}
            id="ask-input"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ask about bookings, revenue, campaigns, or markets..."
            autoComplete="off"
            className="w-full min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-3 focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Ask"
            disabled={loading || q.trim() === ""}
            className="grid size-7 shrink-0 place-items-center rounded-md bg-ink text-white transition-all duration-150 hover:bg-ink/90 active:scale-95 disabled:opacity-40"
          >
            {loading ? (
              <svg className="size-4 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" /><path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            ) : (
              <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8h9M8.5 4l4 4-4 4" /></svg>
            )}
          </button>
        </div>
      </form>

      {(answer || error) && (
        <div className="mt-3 rounded-lg bg-canvas px-4 py-3 shadow-ambient ring-1 ring-hairline">
          {error ? (
            <p className="text-sm text-down-ink">{error}</p>
          ) : answer ? (
            <div className="flex flex-wrap items-start justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink">{answer.answer}</p>
              <Link href={answer.href} className="shrink-0 rounded-md bg-surface px-3 py-1.5 text-sm font-medium text-accent shadow-ambient ring-1 ring-hairline transition-all duration-150 hover:-translate-y-px hover:text-accent-hover">
                {answer.label} →
              </Link>
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Suggested</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => fillPrompt(s)}
              className="max-w-full rounded-full bg-canvas px-3.5 py-1.5 text-left text-sm text-ink-2 shadow-ambient ring-1 ring-hairline transition-all duration-150 hover:-translate-y-px hover:text-ink hover:shadow-ambient-md active:translate-y-0"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
