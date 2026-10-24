import type { GitHubProjectStats } from "@/features/github/services/github-backend";

import { TYPE } from "@/components/marketing/PageLayout";

import { STATUS_META } from "./stats-utils";

interface StatsOverviewProps {
  stats: GitHubProjectStats | null;
}

/**
 * The board in numbers. Without a sync there are no numbers, and showing zeros would read as
 * "nothing is happening", so the offline case says what is true instead.
 */
const StatsOverview = ({ stats }: StatsOverviewProps) => {
  if (!stats) {
    return (
      <div className="bg-card grid gap-3 rounded-3xl p-6 sm:p-8 md:grid-cols-[.8fr_1.2fr] md:gap-10">
        <p className={TYPE.title}>The sync is offline right now.</p>
        <div>
          <p className="text-muted max-w-2xl text-base leading-7 text-pretty">
            These figures come from our server&apos;s copy of the GitHub board, and it could not be
            reached. Nothing here is estimated, so nothing is shown until it is back. The board
            itself is public on GitHub.
          </p>
        </div>
      </div>
    );
  }

  const { total, issues, pullRequests, todo, inProgress, done, completionRate } = stats.stats;
  const completion = Number.parseFloat(completionRate) || 0;

  const segments = [
    { status: "done" as const, count: done },
    { status: "in-progress" as const, count: inProgress },
    { status: "todo" as const, count: todo },
  ];
  const segmentTotal = segments.reduce((sum, segment) => sum + segment.count, 0);

  return (
    <div className="space-y-12">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {[
          { label: "Items on the board", value: total },
          { label: "Issues", value: issues },
          { label: "Pull requests", value: pullRequests },
          { label: "Done", value: `${completion}%` },
        ].map((figure) => (
          <div key={figure.label} className="border-border flex flex-col-reverse border-t pt-5">
            <dt className="text-muted mt-3 text-base">{figure.label}</dt>
            <dd className={TYPE.figure}>{figure.value}</dd>
          </div>
        ))}
      </dl>

      {segmentTotal > 0 && (
        <figure>
          <div
            role="img"
            aria-label={segments
              .map(({ status, count }) => `${count} ${STATUS_META[status].label.toLowerCase()}`)
              .join(", ")}
            className="flex h-4 gap-1 overflow-hidden rounded-full"
          >
            {segments.map(({ status, count }) =>
              count > 0 ? (
                <span
                  key={status}
                  className={`h-full rounded-full ${STATUS_META[status].dot}`}
                  style={{ flexGrow: count }}
                />
              ) : null,
            )}
          </div>
          <figcaption className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-base">
            {segments.map(({ status, count }) => (
              <span key={status} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${STATUS_META[status].dot}`}
                />
                <span className="font-semibold tabular-nums">{count}</span>
                <span className="text-muted">{STATUS_META[status].label.toLowerCase()}</span>
              </span>
            ))}
          </figcaption>
        </figure>
      )}
    </div>
  );
};

export default StatsOverview;
