"use client";

import { useState, useEffect } from "react";

interface ScrollSpyOptions {
  offset?: number;
  bottomThreshold?: number;
}

export function useScrollSpy(
  sectionIds: string[],
  { offset = 240, bottomThreshold = 80 }: ScrollSpyOptions = {},
): string {
  const [activeId, setActiveId] = useState<string>(sectionIds[0] ?? "");

  useEffect(() => {
    if (sectionIds.length === 0) return;

    let ticking = false;

    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isAtBottom =
            window.innerHeight + window.scrollY >=
            document.documentElement.scrollHeight - bottomThreshold;

          if (isAtBottom) {
            setActiveId(sectionIds[sectionIds.length - 1]);
            ticking = false;
            return;
          }

          let currentActive = sectionIds[0] ?? "";

          for (const id of sectionIds) {
            const el = document.getElementById(id);

            if (!el) continue;

            const rect = el.getBoundingClientRect();

            if (rect.top <= offset) currentActive = id;
            else break;
          }

          if (currentActive) setActiveId(currentActive);

          ticking = false;
        });

        ticking = true;
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [sectionIds, offset, bottomThreshold]);

  return activeId;
}
