"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Guarantees a hash target is scrolled into view after navigation. Next's App
 * Router can land at the top of a page on cross-page hash links, so we scroll
 * to the element ourselves once the page has mounted.
 */
export function HashScroll() {
  const pathname = usePathname();
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!hash) return;
    let tries = 0;
    const tick = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (tries++ < 10) {
        setTimeout(tick, 50);
      }
    };
    const t = setTimeout(tick, 40);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}
