import "server-only";

import { isIP } from "node:net";
import { cache } from "react";
import { cookies, headers } from "next/headers";

import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

/** "Signed out" and "backend returned 503" need opposite responses; treating the second as the first causes a login redirect loop. */

export type ServerApiFailure =
  | "no-session"
  /** A session was sent but the backend rejected it (expired, revoked). */
  | "unauthorized"
  /** Feature flag off, backend down, timeout, malformed response. Not the user's fault. */
  | "unavailable";

export type ServerApiResult<T> =
  { ok: true; data: T } | { ok: false; reason: ServerApiFailure; status?: number };

// Node's fetch has no cookie jar, so the browser's cookies are read from next/headers and forwarded.

/** Only the auth cookies ("veriworkly-auth." prefix, plus "__Secure-" over HTTPS) go to the backend, never the whole jar. */
export function sessionCookieHeader(all: { name: string; value: string }[]) {
  return all
    .filter(({ name }) => /^(__Secure-)?veriworkly-auth\./.test(name))
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}

/**
 * The browser's address as nginx reports it: `X-Real-IP`, else the last `X-Forwarded-For` hop
 * (the one nginx appended). Same rule as the studio's server-fetch-core.ts. nginx must overwrite
 * both headers (README "Behind nginx"); anything that is not an IP address is dropped.
 */
export function clientIpFrom(requestHeaders: Headers) {
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const candidate =
    realIp || requestHeaders.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "";

  return isIP(candidate) ? candidate : undefined;
}

/**
 * With INTERNAL_API_KEY the API rate-limits this call as the visitor, not as the site's one
 * server IP that every visitor would otherwise share (W-088). The API trusts the IP header only
 * alongside that key.
 */
export function visitorHeaders(requestHeaders: Headers): Record<string, string> {
  const internalKey = process.env.INTERNAL_API_KEY;
  const clientIp = clientIpFrom(requestHeaders);
  return internalKey && clientIp
    ? { "x-internal-key": internalKey, "x-forwarded-client-ip": clientIp }
    : {};
}

export const fetchServerApiResult = cache(async function fetchServerApiResult<T>(
  path: string,
): Promise<ServerApiResult<T>> {
  let cookieHeader = "";
  let forwarded: Record<string, string> = {};

  try {
    cookieHeader = sessionCookieHeader((await cookies()).getAll());
    forwarded = visitorHeaders(await headers());
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (!cookieHeader.trim()) return { ok: false, reason: "no-session" };

  try {
    const data = await fetchApiData<T>(path, {
      headers: { Cookie: cookieHeader, ...forwarded },
      cache: "no-store",
    });

    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      const reason: ServerApiFailure =
        error.status === 401 || error.status === 403 ? "unauthorized" : "unavailable";

      return { ok: false, reason, status: error.status };
    }

    return { ok: false, reason: "unavailable" };
  }
});
