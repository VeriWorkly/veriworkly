import { buildAtomFeed, getFeedEntries } from "@/lib/feed";

/** Content only changes on deploy, so the feed is generated once at build time. */
export const dynamic = "force-static";

export async function GET() {
  return new Response(buildAtomFeed(await getFeedEntries()), {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
