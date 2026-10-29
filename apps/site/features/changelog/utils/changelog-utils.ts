import {
  Wrench,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

import { type ChangelogEntry } from "@/features/changelog/services/changelog-backend";
import { fitDescription } from "@/utils/metadata";

export type ChangelogCategory = "added" | "improved" | "fixed" | "security" | "breaking";

// Status tokens keep contrast in both themes; Security uses the ink because it is neither good nor bad news.
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

export function categoryCountsFor(entry: ChangelogEntry) {
  return CATEGORY_ORDER.filter((category) => entry[category]?.length).map((category) => ({
    category,
    count: entry[category].length,
    ...CATEGORY_META[category],
  }));
}

/** Strips a leading version from the backend title, which otherwise doubled it in the <title>. */
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
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** The release's one-line description, shared by its page metadata and its share card. */
export function describeRelease({
  title,
  version,
  summary,
}: Pick<ChangelogEntry, "title" | "version" | "summary">) {
  return fitDescription(
    releaseSummary(summary) ??
      `Everything that shipped in VeriWorkly v${version} - ${releaseHeadline(title)}: new features, improvements, fixes, and the pull requests behind them.`,
  );
}
