/**
 * The implementation behind `lib/server-fetch.ts`, given the incoming request explicitly. It
 * imports neither `server-only` nor `next/headers` because `current-user.ts`, which also ships
 * to the browser, loads it lazily on the server; either import would fail that build. Server
 * modules import `lib/server-fetch.ts`.
 */

import { SESSION_COOKIE_NAMES } from "@/lib/auth-redirect";
import { backendApiUrl } from "@/lib/constants";
import { firstPartyOrigin, readApiError } from "@/utils/fetchApiData";

/** The parts of `cookies()` and `headers()` a backend call needs. */
export type IncomingRequest = {
  cookies: { toString(): string; has(name: string): boolean };
  headers: Headers;
};

/** A hung API must fail the render (error boundary), not hang every page behind it. */
const SERVER_FETCH_TIMEOUT_MS = 5000;

/**
 * The browser's address as nginx reports it: `X-Real-IP` (its `$remote_addr`), else the last
 * `X-Forwarded-For` hop, the one nginx appended. Earlier hops are whatever the client sent.
 */
function clientIpFrom(requestHeaders: Headers) {
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return requestHeaders.get("x-forwarded-for")?.split(",").at(-1)?.trim() || undefined;
}

export function hasSessionCookieIn(cookies: IncomingRequest["cookies"]) {
  return SESSION_COOKIE_NAMES.some((name) => cookies.has(name));
}

/**
 * Every backend call a server render makes goes through here. It acts for the browser: its
 * cookies, studio's `Origin`, and — with `INTERNAL_API_KEY` — the browser's IP, which the API
 * trusts only alongside that key. Without it every visitor shares studio's own IP, and with it
 * one rate-limit bucket.
 */
export function serverFetchFrom(request: IncomingRequest, path: string, init: RequestInit = {}) {
  const outgoing = new Headers(init.headers);

  const cookie = request.cookies.toString();
  if (cookie) outgoing.set("cookie", cookie);

  const origin = firstPartyOrigin();
  if (origin && !outgoing.has("origin")) outgoing.set("origin", origin);

  if (init.body !== undefined && init.body !== null && !outgoing.has("content-type")) {
    outgoing.set("content-type", "application/json");
  }

  const internalKey = process.env.INTERNAL_API_KEY;
  const clientIp = clientIpFrom(request.headers);

  if (internalKey && clientIp) {
    outgoing.set("x-internal-key", internalKey);
    outgoing.set("x-forwarded-client-ip", clientIp);
  }

  return fetch(backendApiUrl(path), {
    cache: "no-store",
    ...init,
    headers: outgoing,
    signal: init.signal ?? AbortSignal.timeout(SERVER_FETCH_TIMEOUT_MS),
  });
}

/**
 * The response's `data`. A 404 is `null` only with `notFoundAsNull`; every other failure throws
 * an `ApiRequestError` (or the timeout's `TimeoutError`), so a page never mistakes an outage for
 * an empty account.
 */
export async function serverFetchDataFrom<T>(
  request: IncomingRequest,
  path: string,
  { notFoundAsNull, ...init }: RequestInit & { notFoundAsNull?: boolean } = {},
): Promise<T | null> {
  const response = await serverFetchFrom(request, path, init);

  if (response.status === 404 && notFoundAsNull) return null;
  if (!response.ok) throw await readApiError(response);

  return ((await response.json()) as { data: T }).data;
}

/**
 * The API's CORS refusal (`cors.ts`) is a 403 too, and the server sends studio's `Origin` on
 * every call. A refused origin is a deploy misconfiguration, not a dead session: read as one, it
 * would sign every user out. The API names it with `details.code`; its fixed message is the tell
 * for a caller that has only the message, or an API that sends no code.
 */
export function isCorsRejection(status: number, message: string | undefined, details?: unknown) {
  if (status !== 403) return false;

  return (
    (details as { code?: unknown } | null | undefined)?.code === "CORS_REJECTED" ||
    message === "Not allowed by CORS"
  );
}
