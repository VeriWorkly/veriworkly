import { config } from "#config";

import { logger } from "#lib/logger";

/** The marketing site's fetch-cache tags this API owns (apps/site/utils/cache-tags.ts). */
export type SiteContentTag = "changelog" | "roadmap";

/**
 * Tells veriworkly.com that changelog or roadmap content changed, so it refreshes now rather
 * than when its week-long cache runs out. Best effort and never awaited by a write: the site
 * being down must not fail a sync or an admin edit. Off while SITE_URL or the secret is unset.
 */
export function notifySiteContentChanged(tag: SiteContentTag): void {
  const { url, revalidateSecret } = config.site;
  if (!url || !revalidateSecret) return;

  void fetch(`${url}/api/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: revalidateSecret, tags: [tag] }),
    signal: AbortSignal.timeout(10_000),
  })
    .then(async (response) => {
      if (!response.ok)
        logger.warn("Site revalidation was refused", {
          tag,
          status: response.status,
          body: (await response.text()).slice(0, 200),
        });
    })
    .catch((error: unknown) => logger.warn("Site revalidation failed", { tag, error }));
}
