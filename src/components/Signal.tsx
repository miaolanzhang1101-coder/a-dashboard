import type { Attention, Signal as SignalT } from "@/lib/narrative";
import type { Period } from "@/lib/period";

/** The verdict, as a typographic band. Numbers live in the metric row below. */
export function SignalBand({ p, signal, attention }: { p: Period; signal: SignalT; attention: Attention }) {
  const dot = signal.tone === "good" ? "bg-up" : signal.tone === "watch" ? "bg-accent" : "bg-ink-3";
  return (
    <section aria-labelledby="signal-heading" className="rounded-lg border border-line bg-surface p-6 sm:p-7">
      <p className="mb-2.5 flex items-center gap-2 text-[12.5px] text-ink-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
        Direct-booking results · {p.label.toLowerCase()}
      </p>
      <h2 id="signal-heading" className="max-w-[34ch] text-[24px] font-medium leading-[1.28] tracking-[-0.01em] text-ink sm:text-[27px]">
        {signal.verdict}
      </h2>
      <p className="mt-3 max-w-[70ch] text-[14.5px] leading-relaxed text-ink-2">{signal.detail}</p>
      <p
        className={`mt-4 inline-flex max-w-[68ch] items-start gap-2 rounded-md px-3 py-2 text-[13px] ${
          attention.level === "clear" ? "bg-up-soft text-up-ink" : "bg-note-soft text-note-ink"
        }`}
      >
        <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
        <span>{attention.text}</span>
      </p>
    </section>
  );
}
