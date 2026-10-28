import { buildAtomFeed, getFeedEntries } from "@/lib/feed";

/** Content only changes on deploy, so the feed is generated once at build time. */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildAtomFeed(getFeedEntries()), {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
