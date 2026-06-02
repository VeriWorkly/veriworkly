const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") || "";
const internalBackendUrl = process.env.BACKEND_INTERNAL_URL?.replace(/\/+$/, "") || "";

export function backendApiUrl(path: string, serverSide = false) {
  const baseUrl = serverSide ? internalBackendUrl || publicBackendUrl : publicBackendUrl;
  if (!baseUrl) throw new Error("Portfolio backend URL is not configured.");
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
