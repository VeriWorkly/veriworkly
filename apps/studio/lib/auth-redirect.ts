import { siteConfig } from "@/config/site";

const TRUSTED_ORIGINS = new Set<string>([
  new URL(siteConfig.links.app).origin,
  new URL(siteConfig.links.portfolio).origin,
]);

export function getSafeAuthCallback(rawCallback: string | null, fallback = "/") {
  if (!rawCallback) return fallback;

  // Prevent redirect loops back to login page
  if (
    rawCallback === "/login" ||
    rawCallback.startsWith("/login?") ||
    rawCallback.startsWith("/login/")
  )
    return fallback;

  if (rawCallback.startsWith("/") && !rawCallback.startsWith("//")) return rawCallback;

  try {
    const callback = new URL(rawCallback);
    if (callback.pathname === "/login" || callback.pathname.startsWith("/login/")) return fallback;

    const isLocal = callback.hostname === "localhost" || callback.hostname === "127.0.0.1";
    const isTrusted =
      (callback.protocol === "https:" || (isLocal && callback.protocol === "http:")) &&
      TRUSTED_ORIGINS.has(callback.origin);

    return isTrusted ? callback.toString() : fallback;
  } catch {
    return fallback;
  }
}
