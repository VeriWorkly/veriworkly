import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { config, isProduction } from "#config";
import { logger } from "#lib/logger";
import { cacheDel, getRedis } from "#lib/redis";

/**
 * better-auth prefixes the cookie with `__Secure-` when `useSecureCookies` is on, which
 * `auth/index.ts` ties to `isProduction`. Only that one name is read: in
 * production an injected plain-name cookie must not be able to pick the cache entry.
 */
function sessionCookieName(): string {
  return isProduction ? "__Secure-veriworkly-auth.session_token" : "veriworkly-auth.session_token";
}

/**
 * The session token carried by the request's session cookie, or null when there is none or
 * its signature does not verify.
 *
 * better-call signs a cookie as `encodeURIComponent(`${token}.${base64(HMAC-SHA256(secret,
 * token))}`)` (`better-call/dist/crypto.mjs`, `signCookieValue`). The signature is checked here
 * with the same secret before the token is trusted as a cache key: the cache entry is a
 * projection of a session better-auth already verified, and the key must be derived from the
 * TOKEN alone (every revocation path only knows the token), so without this check a leaked raw
 * token, or a valid token with a forged signature, would hit a warm entry and authenticate
 * without the HMAC ever being verified. Unsigned values are therefore rejected outright.
 */
export function extractSessionTokenFromCookieHeader(
  cookieHeader: string | undefined | null,
): string | null {
  if (!cookieHeader) return null;

  const cookieName = sessionCookieName();

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== cookieName) continue;

    let value: string;

    try {
      value = decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }

    const dot = value.lastIndexOf(".");
    if (dot <= 0) return null;

    const token = value.slice(0, dot);
    const signature = Buffer.from(value.slice(dot + 1));
    const expected = Buffer.from(
      createHmac("sha256", config.auth.secret).update(token).digest("base64"),
    );

    if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;

    return token;
  }

  return null;
}

/** The one place the key is built, so the request path and every revocation path agree. */
export function sessionCacheKeyForToken(token: string): string {
  return `auth:session:${createHash("sha256").update(token).digest("hex")}`;
}

export function getSessionCacheKey(cookieHeader: string | undefined | null): string | null {
  const token = extractSessionTokenFromCookieHeader(cookieHeader);

  return token ? sessionCacheKeyForToken(token) : null;
}

export async function invalidateSessionCache(
  cookieHeader: string | undefined | null,
): Promise<void> {
  const cacheKey = getSessionCacheKey(cookieHeader);

  if (cacheKey) await cacheDel(cacheKey);
}

export async function invalidateCacheByToken(token: string): Promise<void> {
  await cacheDel(sessionCacheKeyForToken(token));
}

/**
 * Revocation tombstone (V-122). A request that missed the cache and is still inside better-auth's
 * session lookup when the session is revoked would otherwise write the user back under the key
 * the revocation just deleted, and stay signed in for the cache's lifetime. Revoking writes this
 * marker first and then deletes the entry; `cacheSessionUser` refuses to write while it exists.
 * It lives as long as an entry could, after which better-auth itself rejects the dead token.
 */
function revokedMarkerKey(cacheKey: string): string {
  return `${cacheKey}:revoked`;
}

const SET_UNLESS_REVOKED = `
if redis.call('EXISTS', KEYS[2]) == 1 then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
return 1
`;

/** The request path's cache write: skipped when the session was revoked meanwhile. */
export async function cacheSessionUser(cacheKey: string, value: unknown): Promise<void> {
  try {
    await getRedis().eval(SET_UNLESS_REVOKED, {
      keys: [cacheKey, revokedMarkerKey(cacheKey)],
      arguments: [JSON.stringify(value), String(config.auth.sessionCacheMaxAgeSeconds)],
    });
  } catch (error) {
    logger.error("Session cache set error", error);
  }
}

/**
 * Deletes the cached users of revoked sessions and leaves a tombstone for each. `strict` throws
 * when Redis does not confirm, for the callers that report success to someone (V-259); otherwise
 * a failure is logged and swallowed, as a sign-out must still complete.
 */
export async function revokeSessionCaches(
  tokens: readonly string[],
  options: { strict?: boolean; extraKeys?: readonly string[] } = {},
): Promise<void> {
  const keys = tokens.map(sessionCacheKeyForToken);
  const extra = options.extraKeys ?? [];
  if (keys.length === 0 && extra.length === 0) return;

  try {
    const multi = getRedis().multi();
    for (const key of keys)
      multi.set(revokedMarkerKey(key), "1", { EX: config.auth.sessionCacheMaxAgeSeconds });
    multi.unlink([...keys, ...extra]);
    await multi.exec();
  } catch (error) {
    if (options.strict) throw error;
    logger.error("Session cache revoke error", error);
  }
}

/** `revokeSessionCaches` for the session a request's cookie carries (sign-out). */
export async function revokeSessionCacheForCookie(
  cookieHeader: string | undefined | null,
): Promise<void> {
  const token = extractSessionTokenFromCookieHeader(cookieHeader);
  if (token) await revokeSessionCaches([token]);
}

/** The better-auth path whose request cookie is the session it ends (before-hook tombstone). */
export function isSignOutPath(path: string): boolean {
  return path === "/sign-out" || path.startsWith("/sign-out/");
}
