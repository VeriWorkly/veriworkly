"use client";

import {
  PORTFOLIO_CACHE_KEY,
  parsePortfolioContent,
  type CloudPortfolioDraft,
  type PortfolioContent,
} from "@/lib/portfolio";

export function loadPortfolioCache(): { slug: string; content: PortfolioContent } | null {
  try {
    const raw = window.localStorage.getItem(PORTFOLIO_CACHE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as { slug?: unknown; content?: unknown };
    return {
      slug: typeof value.slug === "string" ? value.slug : "portfolio",
      content: parsePortfolioContent(value.content),
    };
  } catch {
    window.localStorage.removeItem(PORTFOLIO_CACHE_KEY);
    return null;
  }
}

export function savePortfolioCache(draft: Pick<CloudPortfolioDraft, "slug" | "content">) {
  window.localStorage.setItem(
    PORTFOLIO_CACHE_KEY,
    JSON.stringify({ slug: draft.slug, content: draft.content }),
  );
}
