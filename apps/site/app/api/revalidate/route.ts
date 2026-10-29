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

/** The API's own minimum; a shorter secret could be guessed. */
const MIN_SECRET_LENGTH = 32;

/** A real call is a secret and a couple of tag names; anything larger is not read. */
const MAX_BODY_BYTES = 4096;

async function readBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: Request) {
  const expected = process.env.SITE_REVALIDATE_SECRET;
  // Fail closed: without a usable secret nobody can force a refill.
  if (!expected || expected.length < MIN_SECRET_LENGTH)
    return Response.json({ message: "Revalidation is not configured." }, { status: 503 });

  const raw = await readBody(request);
  if (raw === null) return Response.json({ message: "Body too large." }, { status: 413 });

  let body: { secret?: unknown; tags?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ message: "Invalid JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object")
    return Response.json({ message: "Invalid JSON body." }, { status: 400 });

  if (typeof body.secret !== "string" || !secretsMatch(body.secret, expected))
    return Response.json({ message: "Invalid secret." }, { status: 401 });

  const tags = Array.isArray(body.tags) ? body.tags : [];
  if (tags.length === 0 || !tags.every(isContentTag))
    return Response.json(
      { message: `tags must be a non-empty list of: ${CONTENT_CACHE_TAGS.join(", ")}.` },
      { status: 400 },
    );

  // Expire now, not stale-while-revalidate: the next visitor gets the new release, not the old page (W-083).
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });

  return Response.json({ revalidated: [...new Set(tags)] });
}
