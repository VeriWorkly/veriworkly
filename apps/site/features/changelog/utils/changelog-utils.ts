import {
  Wrench,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

import { type ChangelogEntry } from "@/features/changelog/services/changelog-backend";

export type ChangelogCategory = "added" | "improved" | "fixed" | "security" | "breaking";

// Status tokens, not raw palette colours, so both themes keep their contrast. Security uses the
// ink because it is neither good news nor bad: it is the thing to read first.
export const CATEGORY_META: Record<
  ChangelogCategory,
  { label: string; icon: LucideIcon; dot: string; text: string }
> = {
  added: { label: "Added", icon: Sparkles, dot: "bg-success", text: "text-success" },
  improved: { label: "Improved", icon: TrendingUp, dot: "bg-accent", text: "text-accent" },
  fixed: { label: "Fixed", icon: Wrench, dot: "bg-warning", text: "text-warning" },
  security: { label: "Security", icon: ShieldCheck, dot: "bg-foreground", text: "text-foreground" },
  breaking: {
    label: "Breaking",
    icon: AlertTriangle,
    dot: "bg-destructive",
    text: "text-destructive",
  },
};

export const CATEGORY_ORDER: ChangelogCategory[] = [
  "breaking",
  "security",
  "added",
  "improved",
  "fixed",
];

export function categoriesFor(entry: ChangelogEntry) {
  return CATEGORY_ORDER.filter((category) => entry[category]?.length).map((category) => ({
    category,
    items: entry[category],
    ...CATEGORY_META[category],
  }));
}

/**
 * Per-category counts for the listing card, which shows how much changed rather than the
 * change lists themselves - those live on the detail page now.
 */
export function categoryCountsFor(entry: ChangelogEntry) {
  return CATEGORY_ORDER.filter((category) => entry[category]?.length).map((category) => ({
    category,
    count: entry[category].length,
    ...CATEGORY_META[category],
  }));
}

/**
 * The backend's release title often repeats the version ("v3.21.0 - AI Experience Refresh"),
 * which doubled it in the <title>. Strip a leading version so the page can place it once.
 */
export function releaseHeadline(title: string) {
  return title.replace(/^v?\d+(?:\.\d+)+(?:-[\w.]+)?\s*[-\u2013\u2014:]\s*/i, "").trim() || title;
}

/** A summary that is only a markdown rule, or empty, is not a description. */
export function releaseSummary(summary: string | null) {
  const clean = (summary ?? "").trim();

  return /^[-*_\s]*$/.test(clean) ? null : clean;
}

export function changelogEntryHref(id: string) {
  return `/changelog/${id}`;
}

export const TYPE_META: Record<ChangelogEntry["type"], { label: string; className: string }> = {
  major: { label: "Major", className: "bg-foreground text-background" },
  minor: { label: "Minor", className: "bg-accent/10 text-accent" },
  patch: { label: "Patch", className: "bg-foreground/5 text-muted" },
};

export function formatChangelogDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildChangelogHref(basePath: string, updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") {
      params.delete(key);
      continue;
    }

    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
