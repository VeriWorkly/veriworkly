import Link from "next/link";
import { ExternalLink, GitBranch, AlertCircle, FileText, CheckCircle2 } from "lucide-react";

interface StatsOverviewProps {
  projectName: string;
  projectUrl: string;
  totalItems: number;
  issueCount: number;
  pullRequestCount: number;
  completionRate: string;
}

const StatsOverview = ({
  projectName,
  projectUrl,
  totalItems,
  issueCount,
  pullRequestCount,
  completionRate,
}: StatsOverviewProps) => {
  const completionVal = parseFloat(completionRate) || 0;

  return (
    <section className="mb-10 space-y-6">
      <div className="border-border/30 bg-card/10 flex flex-col gap-4 rounded-3xl border p-5 shadow-xs backdrop-blur-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <GitBranch className="text-accent h-4.5 w-4.5" />

            <h2 className="text-foreground font-sans text-base font-bold tracking-tight">
              {projectName}
            </h2>
          </div>

          <p className="text-muted max-w-xl text-[13px]">
            Sync snapshots compile all public issues and pull requests, serving normalized
            cache-backed records directly from the database.
          </p>
        </div>

        <Link
          target="_blank"
          href={projectUrl}
          rel="noopener noreferrer"
          className="border-border/40 bg-card text-foreground hover:bg-muted/10 inline-flex w-fit items-center gap-1.5 rounded-full border px-4 py-2 font-sans text-xs font-bold shadow-xs transition-colors"
        >
          View Repository
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="group border-border/30 bg-card/25 hover:border-border/50 hover:bg-card/45 relative overflow-hidden rounded-2xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-muted/80 font-mono text-[10px] font-bold tracking-wider uppercase">
              Total Items
            </span>

            <FileText className="text-muted/50 group-hover:text-accent h-4 w-4 transition-colors" />
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-foreground font-sans text-3xl font-bold tracking-tight tabular-nums">
              {totalItems}
            </span>

            <span className="text-muted/60 font-mono text-[9px] tracking-wider uppercase">
              records
            </span>
          </div>
        </div>

        <div className="group border-border/30 bg-card/25 hover:border-border/50 hover:bg-card/45 relative overflow-hidden rounded-2xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-muted/80 font-mono text-[10px] font-bold tracking-wider uppercase">
              Issues
            </span>

            <AlertCircle className="h-4 w-4 text-blue-500/80 transition-transform group-hover:scale-110" />
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-foreground font-sans text-3xl font-bold tracking-tight tabular-nums">
              {issueCount}
            </span>

            <span className="text-muted/60 font-mono text-[9px] tracking-wider uppercase">
              open/closed
            </span>
          </div>
        </div>

        <div className="group border-border/30 bg-card/25 hover:border-border/50 hover:bg-card/45 relative overflow-hidden rounded-2xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-muted/80 font-mono text-[10px] font-bold tracking-wider uppercase">
              Pull Requests
            </span>

            <GitBranch className="h-4 w-4 text-amber-500/80 transition-transform group-hover:scale-110" />
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-foreground font-sans text-3xl font-bold tracking-tight tabular-nums">
              {pullRequestCount}
            </span>

            <span className="text-muted/60 font-mono text-[9px] tracking-wider uppercase">
              merged/active
            </span>
          </div>
        </div>

        <div className="group border-border/30 bg-card/25 hover:border-border/50 hover:bg-card/45 relative overflow-hidden rounded-2xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-muted/80 font-mono text-[10px] font-bold tracking-wider uppercase">
              Completion Rate
            </span>

            <CheckCircle2 className="h-4 w-4 text-emerald-500/80" />
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-sans text-3xl font-bold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
              {completionRate}%
            </span>
          </div>

          <div className="bg-muted/20 mt-3.5 h-1 w-full overflow-hidden rounded-full">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, completionVal))}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsOverview;
