const siteUrl = process.env.SITE_URL?.replace(/\/+$/, "") || "";
const internalBackendUrl = process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") || "";
const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";

export function backendApiUrl(path: string, serverSide = false) {
  const baseUrl = serverSide ? internalBackendUrl || publicBackendUrl : publicBackendUrl;

  if (!baseUrl) throw new Error("Portfolio backend URL is not configured.");

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function firstPartyServerHeaders(headers?: HeadersInit) {
  const normalizedHeaders = Object.fromEntries(new Headers(headers ?? {}).entries());

  if (typeof window !== "undefined" || !siteUrl) return normalizedHeaders;

  return {
    Origin: new URL(siteUrl).origin,
    ...normalizedHeaders,
  };
}
