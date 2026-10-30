import Link from "next/link";

import { siteConfig } from "@/config/site";

import { TYPE } from "@/components/marketing/PageLayout";

import ChangelogEntryCard from "./ChangelogEntryCard";

import { type ChangelogEntry } from "@/features/changelog/services/changelog-backend";

interface ChangelogTimelineProps {
  entries: ChangelogEntry[];
  latestVersion?: string;
  /** A type filter or search is active, so an empty list means "no match", not "no data". */
  filtered: boolean;
  /** The list did not load: the outage message, even with a filter set (W-104). */
  failed: boolean;
}

const ChangelogTimeline = ({
  entries,
  latestVersion,
  filtered,
  failed,
}: ChangelogTimelineProps) => {
  if (entries.length === 0 && (failed || !filtered)) {
    return (
      <div className="bg-card rounded-3xl px-6 py-16 text-center sm:px-10">
        <p className={TYPE.title}>Release notes are unavailable right now</p>
        <p className="text-muted mt-3 text-base">
          They could not be loaded. Every release is also on{" "}
          <a
            href={`${siteConfig.links.github}/releases`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-semibold underline underline-offset-4"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-card rounded-3xl px-6 py-16 text-center sm:px-10">
        <p className={TYPE.title}>No releases match these filters</p>
        <p className="text-muted mt-3 text-base">
          Try another search term or release type, or{" "}
          <Link
            href="/changelog"
            className="text-accent font-semibold underline underline-offset-4"
          >
            show every release
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <ol className="divide-border divide-y">
      {entries.map((entry) => (
        <li key={entry.id} className="py-2">
          <ChangelogEntryCard entry={entry} isLatest={entry.version === latestVersion} />
        </li>
      ))}
    </ol>
  );
};

export default ChangelogTimeline;
