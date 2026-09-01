"use client";

import { useMemo } from "react";
import type { LegalSection } from "../types";

export function useLegalSearch(sections: LegalSection[], query: string): LegalSection[] {
  return useMemo(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) return sections;

    return sections.filter((sec) => {
      const matchTitle = sec.title.toLowerCase().includes(trimmed);

      const matchIntro = sec.intro?.some((p) => p.toLowerCase().includes(trimmed));

      const matchSubs = sec.subsections?.some(
        (sub) =>
          sub.heading?.toLowerCase().includes(trimmed) ||
          sub.paragraphs?.some((p) => p.toLowerCase().includes(trimmed)) ||
          sub.list?.some((item) => item.toLowerCase().includes(trimmed)) ||
          sub.orderedList?.some((item) => item.toLowerCase().includes(trimmed)),
      );

      return matchTitle || matchIntro || matchSubs;
    });
  }, [sections, query]);
}
