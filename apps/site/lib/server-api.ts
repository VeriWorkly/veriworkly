import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { ApiRequestError, fetchApiData } from "@/utils/fetchApiData";

/**
 * Why a server-side read failed. Collapsing all of these into `null` is fine for optional
 * data (a pricing page that just hides a badge), but it is actively harmful for a gated
 * page: "you are signed out" and "the backend returned 503" demand opposite responses,
 * and treating the second as the first bounces a signed-in user into a login redirect
 * loop.
 */

export type ServerApiFailure =
  /** No session cookie on the request at all - the visitor is browsing anonymously. */
  | "no-session"
  /** A session was sent but the backend rejected it (expired, revoked). */
  | "unauthorized"
  /** Feature flag off, backend down, timeout, malformed response. Not the user's fault. */
  | "unavailable";

export type ServerApiResult<T> =
  { ok: true; data: T } | { ok: false; reason: ServerApiFailure; status?: number };

// Server Component data fetching, authenticated as the visiting user. `fetchApiData` already
// forwards a first-party Origin header when called server-side; the one thing it can't do on its
// own is see the browser's cookies, since Node's fetch has no ambient cookie jar - so we read
// them explicitly from the incoming request via next/headers and forward them along.

export const fetchServerApiResult = cache(async function fetchServerApiResult<T>(
  path: string,
): Promise<ServerApiResult<T>> {
  let cookieHeader = "";

  try {
    cookieHeader = (await cookies()).toString();
  } catch {
    return { ok: false, reason: "unavailable" };
  }

  if (!cookieHeader.trim()) return { ok: false, reason: "no-session" };

  try {
    const data = await fetchApiData<T>(path, {
      headers: { Cookie: cookieHeader },
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
