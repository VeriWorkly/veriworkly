import { siteConfig } from "@/config/site";

interface ApiSuccessResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

/** One short log line (status and message, no stack): an outage repeats it on every render. */
export function describeError(error: unknown) {
  if (error instanceof ApiRequestError) return `${error.status} ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

/** Wall-clock budget per backend call: a hanging connection would otherwise pin a Node render worker indefinitely. */
const DEFAULT_API_TIMEOUT_MS = 8_000;

const NEXT_PUBLIC_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

const INTERNAL_BACKEND_BASE_URL = process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") || "";

const BACKEND_BASE_URL =
  typeof window === "undefined"
    ? INTERNAL_BACKEND_BASE_URL || NEXT_PUBLIC_BACKEND_BASE_URL
    : NEXT_PUBLIC_BACKEND_BASE_URL;

/** Paths on the configured backend only: a server-side call can carry the session cookie and the internal key. */
function backendApiUrl(path: string) {
  const trimmedPath = path.trim();

  if (/^[a-z][a-z\d+.-]*:|^[/\\]{2}/i.test(trimmedPath))
    throw new Error("fetchApiData takes a backend path, not an absolute URL.");

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

  return { ...normalizedHeaders, origin: siteOrigin };
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
      // Content-Type only with a body: on a GET it forces a CORS preflight.
      headers: {
        ...(typeof fetchOptions.body === "string" ? { "Content-Type": "application/json" } : {}),
        ...firstPartyServerHeaders(fetchOptions.headers),
      },
    });
  } catch (cause) {
    // Timeouts and network failures are normalised to ApiRequestError so callers' instanceof checks keep working.
    const timedOut = cause instanceof DOMException && cause.name === "TimeoutError";

    throw new ApiRequestError(
      errorMessage ||
        (timedOut ? "Request to the backend timed out." : "Could not reach the backend."),
      timedOut ? 504 : 503,
    );
  }

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({}) as { message?: string; details?: unknown });
    const message = errorMessage || errorData.message || `Request failed: ${response.status}`;

    throw new ApiRequestError(message, response.status, errorData.details);
  }

  const payload = await response.json().catch(() => null);

  // A 2xx with success:false or no data must not reach callers typed as T.
  const envelope = payload as Partial<ApiSuccessResponse<T>> | null;

  if (
    !envelope ||
    typeof envelope !== "object" ||
    envelope.success !== true ||
    envelope.data === undefined
  )
    throw new ApiRequestError(
      errorMessage || envelope?.message || "Backend returned a malformed response.",
      502,
    );

  return envelope.data;
}
