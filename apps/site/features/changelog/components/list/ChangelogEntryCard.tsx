import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card } from "@veriworkly/ui";

import {
  TYPE_META,
  changelogEntryHref,
  formatChangelogDate,
} from "@/features/changelog/utils/changelog-utils";
import ChangelogRichText from "@/features/changelog/components/detail/ChangelogRichText";
import CardCategories from "./CardCategories";
import CardAuthors from "./CardAuthors";
import { type ChangelogEntry } from "@/features/changelog/services/changelog-backend";

const MAX_VISIBLE_TAGS = 4;

interface ChangelogEntryCardProps {
  entry: ChangelogEntry;
  isLatest: boolean;
}

const ChangelogEntryCard = ({ entry, isLatest }: ChangelogEntryCardProps) => {
  const typeMeta = TYPE_META[entry.type];
  const href = changelogEntryHref(entry.id);

  const visibleTags = entry.tags.slice(0, MAX_VISIBLE_TAGS);
  const hiddenTagCount = entry.tags.length - visibleTags.length;
  const prRefs = entry.prRefs ?? [];

  return (
    <Card
      id={entry.id}
      className="hover:border-border focus-within:border-border group scroll-mt-28 p-0 transition-colors"
    >
      <Link
        href={href}
        className="block p-6 focus:outline-none sm:p-7"
        aria-label={`Read VeriWorkly release notes for version ${entry.version}: ${entry.title}`}
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span className="text-foreground font-mono text-lg font-bold tracking-tight">
            v{entry.version}
          </span>

          <span
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase ${typeMeta.className}`}
          >
            {typeMeta.label}
          </span>

          {isLatest && (
            <span className="bg-accent text-accent-foreground rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wide uppercase">
              Latest
            </span>
          )}

          <time
            dateTime={entry.publishedAt}
            className="text-muted ml-auto font-mono text-[11px] tracking-wide"
          >
            {formatChangelogDate(entry.publishedAt)}
          </time>
        </div>

        <h2 className="text-foreground group-hover:text-accent mt-3 font-sans text-xl font-bold tracking-tight transition-colors sm:text-2xl">
          {entry.title}
        </h2>

        {entry.summary && (
          <p className="text-muted mt-2 line-clamp-2 max-w-3xl text-sm leading-relaxed">
            <ChangelogRichText content={entry.summary} inline />
          </p>
        )}

        <CardCategories entry={entry} />

        <div className="border-border/30 mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t pt-4">
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="bg-muted/10 text-muted border-border/30 rounded-full border px-2.5 py-0.5 font-mono text-[10px] tracking-wide"
                >
                  #{tag}
                </span>
              ))}

              {hiddenTagCount > 0 && (
                <span className="text-muted/70 font-mono text-[10px] tracking-wide">
                  +{hiddenTagCount}
                </span>
              )}
            </div>
          )}

          <CardAuthors prRefs={prRefs} />

          <span className="text-accent ml-auto inline-flex items-center gap-1.5 font-sans text-xs font-semibold whitespace-nowrap">
            Release notes
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </Link>
    </Card>
  );
};

export default ChangelogEntryCard;
