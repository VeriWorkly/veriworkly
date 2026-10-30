import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createHash, timingSafeEqual } from "node:crypto";

// Hashing both sides to a fixed-length digest before comparing avoids
// crypto.timingSafeEqual's "buffers must be the same length" throw for
// mismatched secret lengths, while still comparing in constant time.
function secretsMatch(provided: string, expected: string) {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export async function POST(request: Request) {
  const expectedSecret = process.env.PORTFOLIO_REVALIDATE_SECRET;

  // Fail closed: an unconfigured secret must never fall back to a public,
  // guessable default that lets anyone force-revalidate arbitrary paths/tags.
  if (!expectedSecret) {
    console.error("PORTFOLIO_REVALIDATE_SECRET is not configured; refusing revalidate requests.");
    return NextResponse.json({ message: "Revalidation is not configured." }, { status: 503 });
  }

  let body: { paths?: string[]; tags?: string[]; secret?: string };

  try {
    body = (await request.json()) as { paths?: string[]; tags?: string[]; secret?: string };
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const { paths, tags, secret } = body;

  if (typeof secret !== "string" || !secretsMatch(secret, expectedSecret)) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      try {
        // Expire now rather than serve stale: an unpublished or suspended site must not stay up
        // for another visit. updateTag is for Server Actions only (Next 16).
        revalidateTag(tag, { expire: 0 });
      } catch (err) {
        console.error(`Failed to revalidate tag: ${tag}`, err);
      }
    }
  }

  if (paths && Array.isArray(paths)) {
    for (const path of paths) {
      try {
        revalidatePath(path);
      } catch (err) {
        console.error(`Failed to revalidate path: ${path}`, err);
      }
    }
  }

  return NextResponse.json({ revalidated: true, paths, tags });
}
