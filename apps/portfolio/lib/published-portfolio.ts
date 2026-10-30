import { cache } from "react";
import { backendApiUrl, firstPartyServerHeaders } from "@/lib/backend";
import {
  parsePortfolioContent,
  type PortfolioContent,
  type PortfolioSection,
} from "@/lib/portfolio";

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
 * What a visitor may see, the same rule as the server's `publicSnapshot`: no hidden section, no
 * extra pages without portfolio access, and no email unless a contact section is shown. The
 * server already strips these; doing it again here keeps a server slip off the page.
 */
export function publicView(snapshot: PortfolioContent, isPaid: boolean): PortfolioContent {
  const visible = (sections: PortfolioSection[]) => sections.filter((section) => section.visible);
  const sections = visible(snapshot.sections);
  const pages = isPaid
    ? (snapshot.pages ?? []).map((page) => ({ ...page, sections: visible(page.sections) }))
    : [];
  const showsContact = [sections, ...pages.map((page) => page.sections)].some((list) =>
    list.some((section) => section.type === "contact"),
  );

  return {
    ...snapshot,
    identity: showsContact ? snapshot.identity : { ...snapshot.identity, email: "" },
    sections,
    pages,
  };
}

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

    const isPaid = data.isPaid === true;

    return {
      subdomain: data.subdomain,
      snapshot: publicView(parsePortfolioContent(data.snapshot), isPaid),
      templateId: String(data.templateId ?? ""),
      updatedAt: String(data.updatedAt ?? ""),
      isPaid,
      isPremiumTemplate: data.isPremiumTemplate === true,
    };
  },
);
