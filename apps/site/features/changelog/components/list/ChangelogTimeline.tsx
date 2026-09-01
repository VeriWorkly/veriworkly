import ChangelogEntryCard from "./ChangelogEntryCard";

import { type ChangelogEntry } from "@/features/changelog/services/changelog-backend";

interface ChangelogTimelineProps {
  entries: ChangelogEntry[];
  latestVersion?: string;
}

const ChangelogTimeline = ({ entries, latestVersion }: ChangelogTimelineProps) => {
  if (entries.length === 0) {
    return (
      <div className="border-border/40 bg-card/30 rounded-3xl border border-dashed p-12 text-center">
        <p className="text-foreground font-semibold">No releases match these filters</p>
        <p className="text-muted mt-1.5 text-sm">Try a different search term or release type.</p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-4">
      {entries.map((entry) => (
        <li key={entry.id}>
          <ChangelogEntryCard entry={entry} isLatest={entry.version === latestVersion} />
        </li>
      ))}
    </ol>
  );
};

export default ChangelogTimeline;
