import Link from "next/link";
import { ExternalLink, GitPullRequest, CircleDot } from "lucide-react";

import type { GitHubIssuePage } from "@/features/github/services/github-backend";

import { formatRelativeTime } from "./stats-utils";

interface StatsBoardProps {
  issuePage: GitHubIssuePage | null;
  totalItems: number;
  offset: number;
}

const statusDotColors = {
  todo: "bg-blue-500",
  "in-progress": "bg-amber-500 animate-pulse",
  done: "bg-emerald-500",
};

const statusBorderColors = {
  todo: "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400",
  "in-progress": "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400",
  done: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400",
};

const getLabelStyles = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("bug")) return "border-rose-500/20 bg-rose-500/5 text-rose-600 dark:text-rose-400";

  if (l.includes("feature") || l.includes("enhancement"))
    return "border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400";

  if (l.includes("refactor"))
    return "border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400";

  if (l.includes("docs") || l.includes("documentation"))
    return "border-purple-500/20 bg-purple-500/5 text-purple-600 dark:text-purple-400";

  if (l.includes("ui") || l.includes("ux") || l.includes("design"))
    return "border-indigo-500/20 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400";

  return "border-border/30 bg-card/60 text-muted";
};

const StatsBoard = ({ issuePage, totalItems, offset }: StatsBoardProps) => {
  const items = issuePage?.items ?? [];

  const totalPages = Math.max(1, Math.ceil((issuePage?.total ?? 0) / 20));
  const currentPage = Math.floor(offset / 20) + 1;

  const showingStart = totalItems === 0 ? 0 : offset + 1;
  const showingEnd = Math.min(offset + items.length, totalItems);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-muted/90 font-sans text-sm font-bold tracking-widest uppercase">
            Project Board
          </h2>

          <p className="text-muted text-xs">
            Showing {showingStart}–{showingEnd} of {totalItems} items.
          </p>
        </div>

        {issuePage ? (
          <span className="border-border/40 bg-card text-foreground rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold shadow-xs">
            Page {currentPage} of {totalPages}
          </span>
        ) : null}
      </div>

      <div className="grid gap-4">
        {items.length > 0 ? (
          items.map((item) => {
            const isPR = item.kind === "pull-request";
            const statusDot =
              statusDotColors[item.status as keyof typeof statusDotColors] || "bg-muted";
            const statusStyle =
              statusBorderColors[item.status as keyof typeof statusBorderColors] ||
              "border-border bg-card/40 text-muted";

            return (
              <article
                key={item.id}
                className="group border-border/30 bg-card/20 hover:border-border/60 relative flex flex-col gap-4 overflow-hidden rounded-3xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-10px_rgba(37,99,235,0.05)] sm:p-6"
              >
                <div className="bg-accent absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 rounded-t-full transition-transform duration-300 group-hover:scale-x-100" />

                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 space-y-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-sans text-[10px] font-bold capitalize shadow-2xs ${statusStyle}`}
                      >
                        <span className={`h-1.2 w-1.2 rounded-full ${statusDot}`} />
                        {item.status}
                      </span>

                      <span className="border-border/40 bg-card text-muted inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold shadow-2xs">
                        {isPR ? (
                          <GitPullRequest className="text-muted/70 h-2.5 w-2.5" />
                        ) : (
                          <CircleDot className="text-muted/70 h-2.5 w-2.5" />
                        )}
                        {isPR ? "pull-request" : "issue"}
                      </span>

                      <span className="border-border/40 bg-card text-muted rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold shadow-2xs">
                        #{item.number}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-foreground group-hover:text-accent font-sans text-base leading-snug font-bold tracking-tight transition-colors sm:text-lg">
                        {item.title}
                      </h3>

                      <div className="text-muted/70 flex items-center gap-1.5 font-mono text-[10px]">
                        <svg
                          className="text-muted/50 h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>

                        <span>updated {formatRelativeTime(item.updatedAt)}</span>
                      </div>
                    </div>

                    {item.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 capitalize">
                        {item.labels.map((label) => (
                          <span
                            key={`${item.id}-${label}`}
                            className={`rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold ${getLabelStyles(label)}`}
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted hover:text-foreground inline-flex items-center gap-1.5 self-start font-sans text-xs font-bold transition-colors lg:pt-0.5"
                  >
                    Open in GitHub
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })
        ) : (
          <div className="border-border/40 bg-card/10 flex flex-col items-center justify-center rounded-3xl border border-dashed px-4 py-16 text-center">
            <h3 className="text-foreground font-sans text-sm font-bold tracking-tight">
              Nothing to show here
            </h3>

            <p className="text-muted/80 mt-1 max-w-sm text-xs">
              Try adjusting your status, type, or date filters to explore the sync board.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default StatsBoard;
