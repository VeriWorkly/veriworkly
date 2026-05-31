import { config } from "#config";

import { logger } from "#utils/logger";
import { cacheDel, cacheDelByPrefix } from "#utils/redis";

function uniqueSubdomains(subdomains: string[]) {
  return [...new Set(subdomains.filter(Boolean))];
}

export async function invalidatePublicPortfolioCaches(subdomains: string[]) {
  const unique = uniqueSubdomains(subdomains);

  await Promise.all([
    cacheDelByPrefix("portfolio:public:list"),
    ...unique.map((subdomain) => cacheDel(`portfolio:public:${subdomain}`)),
  ]);
}

export async function revalidatePublicPortfolios(subdomains: string[]) {
  const unique = uniqueSubdomains(subdomains);

  try {
    const response = await fetch(`${config.portfolio.url}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paths: ["/sitemap.xml", ...unique.map((subdomain) => `/portfolios/${subdomain}`)],
        tags: ["portfolios-list", ...unique.map((subdomain) => `portfolio-${subdomain}`)],
        secret: config.portfolio.revalidateSecret,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn("Failed to revalidate public portfolio paths", {
        status: response.status,
        body: await response.text(),
      });
    }
  } catch (error) {
    logger.warn("Failed to trigger public portfolio revalidation", error);
  }
}
