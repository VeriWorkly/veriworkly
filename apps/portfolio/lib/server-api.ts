import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { backendApiUrl, firstPartyServerHeaders } from "@/lib/backend";

const TIMEOUT_MS = 10_000;

/** The API failed (5xx, 429, network, timeout), as opposed to answering "no session". */
export class ServerApiUnavailableError extends Error {
  constructor(path: string, status?: number) {
    super(`API unavailable for ${path}${status ? ` (${status})` : ""}.`);
    this.name = "ServerApiUnavailableError";
  }
}

/**
 * Resolves to the payload's `data`, or `null` when the API answered with a client error
 * (401 no session, 404 nothing there). Throws `ServerApiUnavailableError` when the API
 * itself failed, so a caller never mistakes an outage for a signed-out visitor.
 */
export const fetchServerApiData = cache(async function fetchServerApiData<T>(
  path: string,
): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(backendApiUrl(path, true), {
      headers: firstPartyServerHeaders({ Cookie: (await cookies()).toString() }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ServerApiUnavailableError(path);
  }

  if (response.status >= 500 || response.status === 429 || response.status === 408) {
    throw new ServerApiUnavailableError(path, response.status);
  }
  if (!response.ok) return null;

  const payload = (await response.json().catch(() => {
    throw new ServerApiUnavailableError(path, response.status);
  })) as { data?: T };
  return payload.data ?? null;
});
