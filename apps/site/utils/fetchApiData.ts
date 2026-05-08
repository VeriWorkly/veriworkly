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

const NEXT_PUBLIC_BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

const INTERNAL_BACKEND_BASE_URL = process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") || "";

export const BACKEND_BASE_URL =
  typeof window === "undefined"
    ? INTERNAL_BACKEND_BASE_URL || NEXT_PUBLIC_BACKEND_BASE_URL
    : NEXT_PUBLIC_BACKEND_BASE_URL;

export function backendApiUrl(path: string) {
  const trimmedPath = path.trim();

  if (/^https?:\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const normalizedPath = trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;

  if (!BACKEND_BASE_URL) {
    throw new Error(
      "Backend base URL is not configured. Set NEXT_PUBLIC_BACKEND_URL and optionally BACKEND_INTERNAL_URL for server-side runtime.",
    );
  }

  return `${BACKEND_BASE_URL}${normalizedPath}`;
}

export async function fetchApiData<T>(
  path: string,
  options: RequestInit & { errorMessage?: string } = {},
): Promise<T> {
  const { errorMessage, ...fetchOptions } = options;

  const url = backendApiUrl(path);

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: fetchOptions.credentials ?? "include",
    headers: {
      "Content-Type": "application/json",
      ...(fetchOptions.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorMessage || errorData.message || `Request failed: ${response.status}`;

    throw new ApiRequestError(message, response.status);
  }

  const payload = (await response.json()) as ApiSuccessResponse<T>;

  return payload.data;
}
