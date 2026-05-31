import { randomBytes } from "node:crypto";

export const RESERVED_USERNAMES = new Set([
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

export function normalizeSlug(value: string, fallback = "document") {
  const normalized = value
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

export function buildUsernameBase(input: { email?: string | null; name?: string | null }) {
  const emailPrefix = input.email?.split("@")[0];
  const base = normalizeUsername(emailPrefix || input.name || "user");

  if (base.length >= 3) return base;

  return `${base}user`.slice(0, 32);
}

export function randomSuffix(bytes = 3) {
  return randomBytes(bytes).toString("hex");
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
