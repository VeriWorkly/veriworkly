import { siteConfig } from "@/config/site";
import { backendApiUrl } from "@/lib/constants";
import { clearInvalidSessionAndRedirect, isInvalidSessionResponse } from "@/lib/invalid-session";

export interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface OffsetPaginationPayload<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
  pagination: {
    mode: "offset";
    nextOffset: number | null;
    nextCursor: string | null;
  };
}

export class ApiRequestError extends Error {
  status: number;
  /** The error body's `details`, e.g. `currentUpdatedAt` on a master-profile 409. */
  details: unknown;
  /** `details.code` when the server names the failure, e.g. `AUTH_UNAVAILABLE` on a 503. */
  code: string | undefined;
  /**
   * How long the server asked the client to wait before retrying, in seconds: its `Retry-After`
   * header, or else `details.retryAfterSeconds` (a 503 `SERVER_RESTARTING` sends both).
   */
  retryAfterSeconds: number | undefined;

  constructor(message: string, status: number, details?: unknown, retryAfterSeconds?: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;

    const code = (details as { code?: unknown } | null | undefined)?.code;
    this.code = typeof code === "string" ? code : undefined;

    const fromDetails = (details as { retryAfterSeconds?: unknown } | null | undefined)
      ?.retryAfterSeconds;
    this.retryAfterSeconds =
      retryAfterSeconds ??
      (typeof fromDetails === "number" && fromDetails >= 0 ? fromDetails : undefined);
  }
}

/** `Retry-After` in seconds; the HTTP-date form is read as the time left until that date. */
export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - now) / 1000));
}

/** The server's own message wins: it says what actually went wrong ("Username is already taken"). */
export async function readApiError(response: Response, fallbackMessage?: string) {
  const body = (await response.json().catch(() => null)) as {
    message?: unknown;
    details?: unknown;
  } | null;

  const message =
    typeof body?.message === "string" && body.message
      ? body.message
      : (fallbackMessage ?? `Request failed: ${response.status}`);

  return new ApiRequestError(
    message,
    response.status,
    body?.details,
    // Optional: a hand-built Response (a test double, a polyfill) may carry no headers.
    parseRetryAfter(response.headers?.get("Retry-After") ?? null),
  );
}

function normalizeHeaders(headers?: HeadersInit) {
  return Object.fromEntries(new Headers(headers ?? {}).entries());
}

let reportedBadOrigin = false;

/**
 * Studio's own origin, which server-side calls send in place of a browser's. A malformed
 * `NEXT_PUBLIC_APP_URL` is logged once and the header left out (the API accepts a call with no
 * Origin) rather than failing every render.
 */
export function firstPartyOrigin(): string | undefined {
  try {
    return new URL(siteConfig.url).origin;
  } catch (error) {
    if (!reportedBadOrigin) {
      reportedBadOrigin = true;
      console.error(`Studio URL "${siteConfig.url}" is not a valid URL; sending no Origin.`, error);
    }

    return undefined;
  }
}

function firstPartyServerHeaders(headers?: HeadersInit) {
  const normalizedHeaders = normalizeHeaders(headers);

  if (typeof window !== "undefined") return normalizedHeaders;

  const origin = firstPartyOrigin();

  return origin ? { Origin: origin, ...normalizedHeaders } : normalizedHeaders;
}

type FetchApiOptions = RequestInit & {
  /** Shown only when the server's answer carries no message of its own. */
  errorMessage?: string;
  nullOnNotFound?: boolean;
  /**
   * `false` for calls a guest can make: their 401 means "not signed in", not "session
   * expired", so it must reach the caller instead of signing out and leaving for /login.
   */
  redirectOnInvalidSession?: boolean;
};

export async function fetchApiData<T>(
  path: string,
  options: FetchApiOptions & { nullOnNotFound: true },
): Promise<T | null>;
export async function fetchApiData<T>(path: string, options?: FetchApiOptions): Promise<T>;
export async function fetchApiData<T>(
  path: string,
  options: FetchApiOptions = {},
): Promise<T | null> {
  const {
    errorMessage,
    nullOnNotFound,
    redirectOnInvalidSession = true,
    ...fetchOptions
  } = options;

  const url = backendApiUrl(path);

  // A GET with a JSON Content-Type is not a "simple" request, so each one cost a CORS preflight.
  // FormData sets its own multipart Content-Type with the boundary.
  const hasJsonBody =
    fetchOptions.body !== undefined &&
    fetchOptions.body !== null &&
    !(fetchOptions.body instanceof FormData);

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: fetchOptions.credentials ?? "include",
    headers: {
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...firstPartyServerHeaders(fetchOptions.headers),
    },
  });

  if (!response.ok) {
    if (
      redirectOnInvalidSession &&
      typeof window !== "undefined" &&
      isInvalidSessionResponse(path, response.status)
    ) {
      // The page is leaving for /login. Settling would hand callers a "Request failed: 401"
      // to toast over the redirect, so the call simply never finishes.
      void clearInvalidSessionAndRedirect();
      return new Promise<never>(() => {});
    }

    if (response.status === 404 && nullOnNotFound) return null;

    throw await readApiError(response, errorMessage);
  }

  const payload = (await response.json()) as ApiSuccessResponse<T>;

  return payload.data;
}
