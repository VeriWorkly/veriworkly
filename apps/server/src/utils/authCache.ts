import { createHash } from "node:crypto";

import { cacheDel } from "./redis.js";

export function extractStableAuthCookieFingerprint(cookieHeader: string): string | null {
  const authCookies = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .filter((c) => c.includes("veriworkly-auth"));

  if (!authCookies.length) {
    return null;
  }

  const stableSessionCookie = authCookies.find(
    (cookie) =>
      cookie.startsWith("veriworkly-auth.session_token=") ||
      cookie.startsWith("__Secure-veriworkly-auth.session_token="),
  );

  if (stableSessionCookie) {
    return stableSessionCookie;
  }

  return authCookies.sort().join(";");
}

export function getSessionCacheKey(cookieHeader: string): string | null {
  const fingerprint = extractStableAuthCookieFingerprint(cookieHeader);

  if (!fingerprint) return null;

  const cookieHash = createHash("md5").update(fingerprint).digest("hex");
  return `auth:session:${cookieHash}`;
}

export async function invalidateSessionCache(cookieHeader: string): Promise<void> {
  const cacheKey = getSessionCacheKey(cookieHeader);

  if (cacheKey) {
    await cacheDel(cacheKey);
  }
}
