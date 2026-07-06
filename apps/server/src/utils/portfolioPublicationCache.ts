import { config } from "#config";

import { logger } from "#lib/logger";
import { cacheDel, cacheDelByPrefix } from "#lib/redis";

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
  
  if (unique.length === 0) return;

  const CHUNK_SIZE = 50;
  const chunks: string[][] = [];

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map(async (chunk, index) => {
      try {
        const paths =
          index === 0
            ? ["/sitemap.xml", ...chunk.map((subdomain) => `/portfolios/${subdomain}`)]
            : chunk.map((subdomain) => `/portfolios/${subdomain}`);

        const tags =
          index === 0
            ? ["portfolios-list", ...chunk.map((subdomain) => `portfolio-${subdomain}`)]
            : chunk.map((subdomain) => `portfolio-${subdomain}`);

        const response = await fetch(`${config.portfolio.url}/api/revalidate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paths,
            tags,
            secret: config.portfolio.revalidateSecret,
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          logger.warn(`Failed to revalidate public portfolio paths for chunk ${index + 1}`, {
            status: response.status,
            body: await response.text(),
          });
        }
      } catch (error) {
        logger.warn(
          `Failed to trigger public portfolio revalidation for chunk ${index + 1}`,
          error,
        );
      }
    }),
  );
}
