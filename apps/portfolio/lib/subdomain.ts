import { normalizeSlug } from "@/lib/portfolio";

/**
 * Names the server refuses for a new subdomain: `RESERVED_SUBDOMAINS` in
 * apps/server/src/utils/slugs.ts. Copied so a default can be picked without a round trip; the
 * server stays the enforcement point, and the availability check reports anything this misses.
 */
const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "auth",
  "blog",
  "dashboard",
  "docs",
  "documents",
  "editor",
  "health",
  "login",
  "logout",
  "me",
  "profile",
  "portfolio",
  "public",
  "settings",
  "share",
  "shares",
  "signup",
  "support",
  "users",
  "www",
  "veriworkly",
  "job",
  "work",
  "billing",
  "payment",
  "webhook",
  "developer",
  "designer",
  "server",
  "github",
  "studio",
  "roadmap",
  "portal",
  "list",
  "mail",
  "status",
  "cdn",
  "assets",
  "media",
  "static",
  "staging",
  "dev",
  "help",
  "email",
]);

export function isAllowedSubdomain(slug: string) {
  return Boolean(slug) && !RESERVED_SUBDOMAINS.has(slug) && !slug.startsWith("xn-");
}

/**
 * The subdomain a new portfolio starts with: the user's name, else their email's name part.
 * A reserved or empty result (a name like "Designer", or one with no Latin letters) used to be
 * saved as is, and every autosave then failed (P-023). Deterministic, because it also runs during
 * the server render and the hydrating render must agree with it.
 */
export function defaultSubdomain(user?: { name?: string | null; email?: string | null } | null) {
  const base = normalizeSlug(user?.name || "") || normalizeSlug(user?.email?.split("@")[0] || "");
  if (!base) return "my-portfolio";
  if (isAllowedSubdomain(base)) return base;

  return base === "portfolio" ? "my-portfolio" : `${base}-portfolio`.slice(0, 63);
}

/** An alternative for a name that is taken or not allowed: the name plus four random digits. */
export function suggestSubdomain(slug: string, random = Math.random) {
  const digits = String(Math.floor(random() * 9000) + 1000);
  const base = (slug || "portfolio").slice(0, 63 - 5).replace(/-+$/, "");

  return `${base}-${digits}`;
}

export type SubdomainCheck =
  | { state: "available" | "taken" | "not-allowed"; slug: string; suggestion?: string }
  | { state: "unknown"; slug: string };

/** The line shown under the subdomain field for a check result. */
export function subdomainCheckMessage(check: SubdomainCheck) {
  const address = `${check.slug}.veriworkly.com`;
  if (check.state === "available") return `${address} is available.`;
  if (check.state === "taken") return `${address} is taken. Choose another name.`;
  if (check.state === "not-allowed") {
    return check.slug
      ? `"${check.slug}" is reserved or not allowed. Choose another name.`
      : "Enter a subdomain.";
  }

  return "Could not check this name right now. It is checked again when you save.";
}

/**
 * Checks a subdomain with the server (`GET /portfolios/subdomains/:slug/availability`). The
 * server answers 400 for a reserved or invalid name and `available: false` for one another
 * account holds.
 */
export async function checkSubdomain(
  slug: string,
  request: (path: string) => Promise<Response>,
): Promise<SubdomainCheck> {
  if (!isAllowedSubdomain(slug)) {
    return { state: "not-allowed", slug, suggestion: slug ? suggestSubdomain(slug) : undefined };
  }
  try {
    const response = await request(
      `/portfolios/subdomains/${encodeURIComponent(slug)}/availability`,
    );
    if (response.status === 400) {
      return { state: "not-allowed", slug, suggestion: suggestSubdomain(slug) };
    }
    if (!response.ok) return { state: "unknown", slug };
    const payload = await response.json();
    return payload?.data?.available
      ? { state: "available", slug }
      : { state: "taken", slug, suggestion: suggestSubdomain(slug) };
  } catch {
    return { state: "unknown", slug };
  }
}
