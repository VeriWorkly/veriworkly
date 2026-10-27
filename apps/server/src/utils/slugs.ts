const RESERVED_USERNAMES = new Set([
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
]);

/**
 * Names a portfolio may not take as its subdomain: every reserved username plus the hostnames
 * operations will want (`mail`, `status`, `cdn`, ...) and `list`, which shares the
 * `/portfolios/public/:subdomain` path space with the public list endpoint. Punycode (`xn--`)
 * is refused in `normalizePortfolioSubdomain` so a homograph of a real brand cannot be served
 * from a veriworkly.com host.
 */
export const RESERVED_SUBDOMAINS = new Set([
  ...RESERVED_USERNAMES,
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

/**
 * The stored form of a portfolio subdomain: what every existing row was written with (no
 * reserved check, no trailing-dash strip). The public read looks rows up by this key, so a
 * site that was published before its name became reserved keeps serving.
 */
export function portfolioSubdomainLookupKey(value: string): string {
  return normalizeSlug(value, "").replace(/_/g, "-").slice(0, 63);
}

/**
 * The canonical form of a subdomain the user is claiming, or `null` when it cannot be one.
 * A name in `keep` (the user's current publication subdomain only, never a draft slug, V-300) is
 * returned as stored, so an existing site survives the rules tightening under it. A NEW name gets
 * the strict rules: trailing dash stripped after the 63-character cut, reserved list, punycode.
 */
export function normalizePortfolioSubdomain(
  value: string,
  keep: Iterable<string> = [],
): string | null {
  const stored = portfolioSubdomainLookupKey(value);

  if (stored && new Set(keep).has(stored)) return stored;

  // Checked on the raw input: normalisation folds `xn--` into `xn-` and would hide it.
  if (/^\s*xn--/i.test(value)) return null;

  const subdomain = stored.replace(/-+$/, "");

  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) return null;

  return subdomain;
}

export function normalizeSlug(value: string, fallback = "document") {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return (normalized || fallback).slice(0, 255);
}

export function normalizeUsername(value: string) {
  return normalizeSlug(value, "user")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function isValidUsername(value: string) {
  return /^[a-z0-9_-]{3,32}$/.test(value) && !RESERVED_USERNAMES.has(value);
}

export function usernameInvalidReason(value: string) {
  if (value.length < 3) return "too_short";
  if (value.length > 32) return "too_long";
  if (!/^[a-z0-9_-]+$/.test(value)) return "invalid_characters";
  if (RESERVED_USERNAMES.has(value)) return "reserved";

  return null;
}

export function normalizeTags(tags: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawTag of tags) {
    const tag = rawTag.trim().replace(/\s+/g, " ");
    const key = tag.toLowerCase();

    if (!tag || seen.has(key)) continue;

    seen.add(key);
    normalized.push(tag);
  }

  return normalized;
}

export async function buildUniqueSlugHelper(
  baseValue: string,
  checkExisting: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = normalizeSlug(baseValue);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${base.slice(0, 255 - suffix.length)}${suffix}`;

    const exists = await checkExisting(candidate);

    if (!exists) return candidate;
  }

  return `${base.slice(0, 246)}-${Date.now().toString(36)}`;
}
