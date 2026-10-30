import { cache } from "react";
import { backendApiUrl, firstPartyServerHeaders } from "@/lib/backend";
import { parsePortfolioContent, type PortfolioContent } from "@/lib/portfolio";

export interface PublishedPortfolio {
  subdomain: string;
  snapshot: PortfolioContent;
  templateId: string;
  updatedAt: string;
  /** The owner's portfolio access is in effect (or in GRACE): badge removal and extra pages. */
  isPaid: boolean;
  /** About the template only (Nimbus, Cipher); never decides the badge or the pages. */
  isPremiumTemplate: boolean;
}

const FETCH_TIMEOUT_MS = 8000;

/**
 * Only a 404, or a 200 without a site in it, means "no such portfolio" (null, so the page renders
 * not-found). Anything else (5xx, 429, a timeout, a network or parse error) throws: during an ISR
 * revalidation Next then keeps serving the last good render instead of caching a not-found for the
 * whole revalidate window, and a cold miss shows the error page rather than "this site does not
 * exist" (P-007).
 */
export const getPublishedPortfolio = cache(
  async (subdomain: string): Promise<PublishedPortfolio | null> => {
    const response = await fetch(
      backendApiUrl(`/portfolios/public/${encodeURIComponent(subdomain)}`, true),
      {
        headers: firstPartyServerHeaders(),
        next: { revalidate: 3600, tags: [`portfolio-${subdomain}`] },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      },
    );

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Public portfolio read for "${subdomain}" failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: Partial<Omit<PublishedPortfolio, "snapshot">> & { snapshot?: unknown };
    };
    const data = payload.data;
    if (!data?.snapshot || !data.subdomain) return null;

    return {
      subdomain: data.subdomain,
      snapshot: parsePortfolioContent(data.snapshot),
      templateId: String(data.templateId ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
      isPaid: data.isPaid === true,
      isPremiumTemplate: data.isPremiumTemplate === true,
    };
  },
);
