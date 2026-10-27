import { createHash, timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";

import { CONTENT_CACHE_TAGS, type ContentCacheTag } from "@/utils/cache-tags";

/**
 * Called by the API after a release sync or a roadmap change, so the changelog, the roadmap and
 * their sitemap entries refresh now instead of when the week-long fetch cache runs out (W-083).
 */

// Hashed first: timingSafeEqual throws on buffers of different lengths.
function secretsMatch(provided: string, expected: string) {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(expected));
}

const isContentTag = (tag: unknown): tag is ContentCacheTag =>
  typeof tag === "string" && (CONTENT_CACHE_TAGS as readonly string[]).includes(tag);

export async function POST(request: Request) {
  const expected = process.env.SITE_REVALIDATE_SECRET;
  // Fail closed: without a configured secret nobody can force a refill.
  if (!expected)
    return Response.json({ message: "Revalidation is not configured." }, { status: 503 });

  let body: { secret?: unknown; tags?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.secret !== "string" || !secretsMatch(body.secret, expected))
    return Response.json({ message: "Invalid secret." }, { status: 401 });

  const tags = Array.isArray(body.tags) ? body.tags : [];
  if (tags.length === 0 || !tags.every(isContentTag))
    return Response.json(
      { message: `tags must be a non-empty list of: ${CONTENT_CACHE_TAGS.join(", ")}.` },
      { status: 400 },
    );

  for (const tag of new Set(tags)) revalidateTag(tag, "max");

  return Response.json({ revalidated: [...new Set(tags)] });
}
