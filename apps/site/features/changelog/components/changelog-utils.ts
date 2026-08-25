import {
  Sparkles,
  TrendingUp,
  Wrench,
  ShieldCheck,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

import { type ChangelogEntry } from "@/features/changelog/services/changelog-backend";

export type ChangelogCategory = "added" | "improved" | "fixed" | "security" | "breaking";

export const CATEGORY_META: Record<
  ChangelogCategory,
  { label: string; icon: LucideIcon; dot: string; text: string; border: string }
> = {
  added: {
    label: "Added",
    icon: Sparkles,
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  improved: {
    label: "Improved",
    icon: TrendingUp,
    dot: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/30",
  },
  fixed: {
    label: "Fixed",
    icon: Wrench,
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  security: {
    label: "Security",
    icon: ShieldCheck,
    dot: "bg-purple-500",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/30",
  },
  breaking: {
    label: "Breaking",
    icon: AlertTriangle,
    dot: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    border: "border-red-500/30",
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

export function changelogEntryHref(id: string) {
  return `/changelog/${id}`;
}

export const TYPE_META: Record<ChangelogEntry["type"], { label: string; className: string }> = {
  major: {
    label: "Major",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  minor: {
    label: "Minor",
    className: "bg-accent/10 text-accent border-accent/20",
  },
  patch: {
    label: "Patch",
    className: "bg-muted/10 text-muted border-border/40",
  },
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
