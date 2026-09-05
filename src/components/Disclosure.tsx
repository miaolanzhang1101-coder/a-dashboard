import type { ReactNode } from "react";

/**
 * Progressive disclosure with the native <details> element — no JS, keyboard
 * accessible, and state survives navigation. Used for "show more" panels.
 */
export function Disclosure({ title, sub, children, open = false }: { title: string; sub?: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group scroll-mt-24 rounded-lg bg-surface shadow-ambient ring-1 ring-hairline transition-shadow duration-200 hover:shadow-ambient-md">
      <summary className="flex items-center justify-between gap-3 px-5 py-4">
        <span>
          <span className="text-[15px] font-medium text-ink">{title}</span>
          {sub && <span className="ml-2 text-[13px] text-ink-3">{sub}</span>}
        </span>
        <svg className="chev h-4 w-4 shrink-0 text-ink-3" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="border-t border-line px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}
