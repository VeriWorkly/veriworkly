import { backendApiUrl } from "@/lib/constants";
import { clearInvalidSessionAndRedirect, isInvalidSessionResponse } from "@/lib/invalid-session";

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

function normalizeHeaders(headers?: HeadersInit) {
  return Object.fromEntries(new Headers(headers ?? {}).entries());
}

function firstPartyServerHeaders(headers?: HeadersInit) {
  const normalizedHeaders = normalizeHeaders(headers);

  if (typeof window !== "undefined") return normalizedHeaders;

  const siteOrigin = process.env.SITE_URL ? new URL(process.env.SITE_URL).origin : "";
  if (!siteOrigin) return normalizedHeaders;

  return {
    Origin: siteOrigin,
    ...normalizedHeaders,
  };
}

export async function fetchApiData<T>(
  path: string,
  options: RequestInit & { errorMessage?: string; nullOnNotFound?: boolean } = {},
): Promise<T> {
  const { errorMessage, nullOnNotFound, ...fetchOptions } = options;

  const url = backendApiUrl(path);

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: fetchOptions.credentials ?? "include",
    headers: {
      "Content-Type": "application/json",
      ...firstPartyServerHeaders(fetchOptions.headers),
    },
  });

  if (!response.ok) {
    if (isInvalidSessionResponse(path, response.status)) {
      await clearInvalidSessionAndRedirect();
    }

    if (response.status === 404 && nullOnNotFound) {
      return null as unknown as T;
    }

    const errorData = await response.json().catch(() => ({}));
    const message = errorMessage || errorData.message || `Request failed: ${response.status}`;

    throw new ApiRequestError(message, response.status);
  }

  const payload = (await response.json()) as ApiSuccessResponse<T>;

  return payload.data;
}
