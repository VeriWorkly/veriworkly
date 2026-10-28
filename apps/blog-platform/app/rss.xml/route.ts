import { buildRssFeed, getFeedEntries } from "@/lib/feed";

/** Content only changes on deploy, so the feed is generated once at build time. */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildRssFeed(getFeedEntries()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
