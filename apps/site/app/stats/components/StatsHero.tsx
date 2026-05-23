import { formatAbsoluteTime, formatRelativeTime } from "./stats-utils";

interface StatsHeroProps {
  syncedAt: string | null;
  nextSyncAt: string | null;
}

const StatsHero = ({ syncedAt, nextSyncAt }: StatsHeroProps) => {
  return (
    <div className="border-border/40 mb-12 flex flex-col gap-4 border-b pb-8">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />

        <span className="text-muted/90 font-mono text-[9px] font-bold tracking-widest uppercase">
          Live GitHub Sync
        </span>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <h1 className="text-foreground font-sans text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Development Activity
          </h1>

          <p className="text-muted max-w-2xl text-sm leading-relaxed sm:text-base">
            Track the public GitHub board with server-side filters, pagination, and cache-backed
            snapshots that refresh on the next sync cycle.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <span className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-600 shadow-xs dark:text-emerald-400">
            Synced {formatRelativeTime(syncedAt)}
          </span>

          <span className="border-border/40 bg-card text-muted rounded-md border px-2.5 py-1 font-mono text-[10px] font-bold shadow-xs">
            Next sync {formatAbsoluteTime(nextSyncAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatsHero;
