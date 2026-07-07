import { cache } from "react";
import { backendApiUrl, firstPartyServerHeaders } from "@/lib/backend";
import { parsePortfolioContent, type PortfolioContent } from "@/lib/portfolio";

export interface PublishedPortfolio {
  subdomain: string;
  snapshot: PortfolioContent;
  templateId: string;
  updatedAt: string;
  isPremium?: boolean;
}

export const getPublishedPortfolio = cache(
  async (subdomain: string): Promise<PublishedPortfolio | null> => {
    const response = await fetch(
      backendApiUrl(`/portfolios/public/${encodeURIComponent(subdomain)}`, true),
      {
        headers: firstPartyServerHeaders(),
        next: { revalidate: 3600, tags: [`portfolio-${subdomain}`] },
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: Partial<PublishedPortfolio> };
    if (!payload.data?.snapshot || !payload.data.subdomain) return null;
    return {
      subdomain: payload.data.subdomain,
      snapshot: parsePortfolioContent(payload.data.snapshot),
      templateId: String(payload.data.templateId ?? ""),
      updatedAt: String(payload.data.updatedAt ?? ""),
      isPremium: Boolean(payload.data.isPremium),
    };
  },
);
