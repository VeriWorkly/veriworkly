import { siteConfig } from "@/config/site";

const TRUSTED_ORIGINS = new Set<string>([
  new URL(siteConfig.links.app).origin,
  new URL(siteConfig.links.portfolio).origin,
]);

export function getSafeAuthCallback(rawCallback: string | null, fallback = "/") {
  if (!rawCallback) return fallback;

  if (rawCallback.startsWith("/") && !rawCallback.startsWith("//")) {
    return rawCallback;
  }

  try {
    const callback = new URL(rawCallback);
    const isTrusted = callback.protocol === "https:" && TRUSTED_ORIGINS.has(callback.origin);

    return isTrusted ? callback.toString() : fallback;
  } catch {
    return fallback;
  }
}
