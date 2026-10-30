"use client";

import {
  PORTFOLIO_CACHE_KEY,
  parsePortfolioContent,
  type CloudPortfolioDraft,
  type PortfolioContent,
} from "@/lib/portfolio";

export function loadPortfolioCache(): {
  slug: string;
  content: PortfolioContent;
  updatedAt: string | null;
} | null {
  try {
    const raw = window.localStorage.getItem(PORTFOLIO_CACHE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { slug?: unknown; content?: unknown; updatedAt?: unknown };
    return {
      slug: typeof value.slug === "string" ? value.slug : "portfolio",
      content: parsePortfolioContent(value.content),
      // Absent on caches written before this field existed — callers must
      // treat `null` as "recency unknown", not "very old".
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    };
  } catch {
    window.localStorage.removeItem(PORTFOLIO_CACHE_KEY);
    return null;
  }
}

/** Called once a guest draft has reached the account it was carried into. */
export function clearPortfolioCache() {
  window.localStorage.removeItem(PORTFOLIO_CACHE_KEY);
}

/** The guest's draft. Signed-in drafts live in the cloud and are never written here. */
export function savePortfolioCache(draft: Pick<CloudPortfolioDraft, "slug" | "content">) {
  window.localStorage.setItem(
    PORTFOLIO_CACHE_KEY,
    JSON.stringify({
      slug: draft.slug,
      content: draft.content,
      updatedAt: new Date().toISOString(),
    }),
  );
}
