import Link from "next/link";

import { cn } from "@veriworkly/ui";

import {
  TYPE_META,
  changelogEntryHref,
  formatChangelogDate,
} from "@/features/changelog/utils/changelog-utils";
import { TYPE } from "@/components/marketing/PageLayout";
import CardCategories from "./CardCategories";
import CardAuthors from "./CardAuthors";
import { type ChangelogEntry } from "@/features/changelog/services/changelog-backend";

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  isLatest: boolean;
}

/**
 * The whole card is one link, so the summary must not render links of its own (`#123`, `@user`,
 * markdown links): an `<a>` inside an `<a>` is split by the HTML parser and breaks hydration.
 * Markdown is reduced to its text; the release page renders it in full.
 */
export function plainSummary(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)/g, "#$1")
    .replace(/(\*\*|__|~~|`)(.+?)\1/g, "$2")
    .replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=$|[\s).,:;!?])/g, "$1$2");
}

const ChangelogEntryCard = ({ entry, isLatest }: ChangelogEntryCardProps) => {
  const typeMeta = TYPE_META[entry.type];

  return (
    <Link
      id={entry.id}
      href={changelogEntryHref(entry.id)}
      className="group hover:bg-card focus-visible:bg-card focus-visible:ring-accent/40 -mx-4 grid scroll-mt-28 gap-4 rounded-3xl px-4 py-6 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none sm:-mx-7 sm:px-7 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-x-10 lg:grid-cols-[10rem_minmax(0,1fr)_12rem]"
    >
      <div>
        <p className="text-xl font-bold tracking-tight tabular-nums">v{entry.version}</p>
        <time dateTime={entry.publishedAt} className="text-muted mt-1 block text-sm">
          {formatChangelogDate(entry.publishedAt)}
        </time>
        <p className="mt-3 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${typeMeta.className}`}>
            {typeMeta.label}
          </span>
          {isLatest && (
            <span className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-sm font-semibold">
              Latest
            </span>
          )}
        </p>
      </div>

      <div className="min-w-0">
        <h2 className={cn("group-hover:text-accent text-balance transition-colors", TYPE.title)}>
          {entry.title}
        </h2>

        {entry.summary && (
          <p className="text-muted mt-2 line-clamp-2 max-w-3xl text-base leading-7 text-pretty">
            {plainSummary(entry.summary)}
          </p>
        )}

        <div className="mt-4">
          <CardCategories entry={entry} />
        </div>
      </div>

      <CardAuthors prRefs={entry.prRefs ?? []} className="md:col-start-2 lg:col-start-auto" />
    </Link>
  );
};

export default ChangelogEntryCard;
