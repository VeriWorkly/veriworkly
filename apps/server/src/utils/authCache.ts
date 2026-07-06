import { createHash } from "node:crypto";

import { cacheDel } from "#/lib/redis";

export function extractStableAuthCookieFingerprint(
  cookieHeader: string | undefined | null,
): string | null {
  if (!cookieHeader) return null;

  const authCookies = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .filter((c) => c.includes("veriworkly-auth"));

  if (!authCookies.length) return null;

  const stableSessionCookie = authCookies.find(
    (cookie) =>
      cookie.startsWith("veriworkly-auth.session_token=") ||
      cookie.startsWith("__Secure-veriworkly-auth.session_token="),
  );

  if (stableSessionCookie) return stableSessionCookie;

  return authCookies.sort().join(";");
}

export function getSessionCacheKey(cookieHeader: string | undefined | null): string | null {
  const fingerprint = extractStableAuthCookieFingerprint(cookieHeader);

  if (!fingerprint) return null;

  const cookieHash = createHash("md5").update(fingerprint).digest("hex");
  return `auth:session:${cookieHash}`;
}

export async function invalidateSessionCache(
  cookieHeader: string | undefined | null,
): Promise<void> {
  const cacheKey = getSessionCacheKey(cookieHeader);

  if (cacheKey) await cacheDel(cacheKey);
}

export async function invalidateCacheByToken(token: string): Promise<void> {
  const prefix1 = `veriworkly-auth.session_token=${token}`;
  const prefix2 = `__Secure-veriworkly-auth.session_token=${token}`;

  const hash1 = createHash("md5").update(prefix1).digest("hex");
  const hash2 = createHash("md5").update(prefix2).digest("hex");

  await Promise.all([cacheDel(`auth:session:${hash1}`), cacheDel(`auth:session:${hash2}`)]);
}
