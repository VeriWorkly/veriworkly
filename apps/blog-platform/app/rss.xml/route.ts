import { buildRssFeed, getFeedEntries } from "@/lib/feed";

/** Content only changes on deploy, so the feed is generated once at build time. */
export const dynamic = "force-static";

export async function GET() {
  return new Response(buildRssFeed(await getFeedEntries()), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
