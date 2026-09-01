import { siteConfig } from "@/config/site";

declare const process: {
  env: Record<string, string | undefined>;
};

interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

/**
 * Wall-clock budget for a single backend call. Without this, a backend that accepts
 * the connection but never responds pins a Node render worker indefinitely - a
 * connection *refused* fails fast, but a connection that hangs does not. Callers that
 * legitimately need longer can pass their own `signal`.
 */

export const DEFAULT_API_TIMEOUT_MS = 8_000;

const NEXT_PUBLIC_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

const INTERNAL_BACKEND_BASE_URL = process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") || "";

export const BACKEND_BASE_URL =
  typeof window === "undefined"
    ? INTERNAL_BACKEND_BASE_URL || NEXT_PUBLIC_BACKEND_BASE_URL
    : NEXT_PUBLIC_BACKEND_BASE_URL;

export function backendApiUrl(path: string) {
  const trimmedPath = path.trim();

  if (/^https?:\/\//i.test(trimmedPath)) return trimmedPath;

  const normalizedPath = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;

  if (!BACKEND_BASE_URL)
    throw new Error(
      "Backend base URL is not configured. Set NEXT_PUBLIC_BACKEND_URL and optionally BACKEND_INTERNAL_URL for server-side runtime.",
    );

  return `${BACKEND_BASE_URL}${normalizedPath}`;
}

function normalizeHeaders(headers?: HeadersInit) {
  return Object.fromEntries(new Headers(headers ?? {}).entries());
}

function firstPartyServerHeaders(headers?: HeadersInit) {
  const normalizedHeaders = normalizeHeaders(headers);

  if (typeof window !== "undefined") return normalizedHeaders;

  let siteOrigin = "";

  try {
    siteOrigin = siteConfig.url ? new URL(siteConfig.url).origin : "";
  } catch {
    siteOrigin = "";
  }

  if (!siteOrigin) return normalizedHeaders;

  return {
    Origin: siteOrigin,
    ...normalizedHeaders,
  };
}

export async function fetchApiData<T>(
  path: string,
  options: RequestInit & { errorMessage?: string; timeoutMs?: number } = {},
): Promise<T> {
  const { errorMessage, timeoutMs, ...fetchOptions } = options;

  const url = backendApiUrl(path);

  let response: Response;

  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: fetchOptions.signal ?? AbortSignal.timeout(timeoutMs ?? DEFAULT_API_TIMEOUT_MS),
      credentials: fetchOptions.credentials ?? "include",
      headers: {
        "Content-Type": "application/json",
        ...firstPartyServerHeaders(fetchOptions.headers),
      },
    });
  } catch (cause) {
    // A timeout surfaces as DOMException(name: "TimeoutError"); a hard network failure
    // as TypeError. Both are normalised to ApiRequestError so every caller's existing
    // `instanceof ApiRequestError` handling keeps working.
    const timedOut = cause instanceof DOMException && cause.name === "TimeoutError";

    throw new ApiRequestError(
      errorMessage ||
        (timedOut ? "Request to the backend timed out." : "Could not reach the backend."),
      timedOut ? 504 : 503,
    );
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}) as { message?: string });
    const message = errorMessage || errorData.message || `Request failed: ${response.status}`;

    throw new ApiRequestError(message, response.status);
  }

  const payload = await response.json().catch(() => null);

  if (!payload || typeof payload !== "object")
    throw new ApiRequestError(errorMessage || "Backend returned a malformed response.", 502);

  return (payload as ApiSuccessResponse<T>).data;
}
