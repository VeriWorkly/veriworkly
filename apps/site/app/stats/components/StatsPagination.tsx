import Link from "next/link";

import { cn } from "@/lib/utils";

import type {
  GitHubFilterKind,
  GitHubFilterStatus,
} from "@/features/github/services/github-backend";

import { PAGE_SIZE, buildSearchHref } from "./stats-utils";

interface StatsPaginationProps {
  status: GitHubFilterStatus;
  kind: GitHubFilterKind;
  currentPage: number;
  hasMore: boolean;
  updatedFrom?: string;
  updatedTo?: string;
}

export default function StatsPagination({
  status,
  kind,
  currentPage,
  hasMore,
  updatedFrom,
  updatedTo,
}: StatsPaginationProps) {
  const prevHref = buildSearchHref({
    status,
    kind,
    page: Math.max(1, currentPage - 1),
    updatedFrom,
    updatedTo,
  });

  const nextHref = buildSearchHref({
    status,
    kind,
    page: currentPage + 1,
    updatedFrom,
    updatedTo,
  });

  const hasPrev = currentPage > 1;

  return (
    <section className="border-border/30 bg-card/25 mt-10 flex flex-col gap-4 rounded-3xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] backdrop-blur-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-foreground font-sans text-sm font-bold tracking-tight">Pagination</p>
        <p className="text-muted text-xs">
          Each page returns {PAGE_SIZE} items and remains cached until the next sync.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href={prevHref}
          aria-disabled={!hasPrev}
          className={cn(
            "rounded-full px-4 py-2 text-center font-sans text-xs font-bold transition-all select-none",
            hasPrev
              ? "border-border/40 bg-card text-foreground hover:bg-muted/10 border active:scale-[0.98]"
              : "border-border/10 bg-muted/5 text-muted/50 pointer-events-none border opacity-50",
          )}
        >
          Previous
        </Link>

        <Link
          href={nextHref}
          aria-disabled={!hasMore}
          className={cn(
            "rounded-full px-4 py-2 text-center font-sans text-xs font-bold transition-all select-none",
            hasMore
              ? "bg-foreground text-background hover:opacity-90 active:scale-[0.98]"
              : "border-border/10 bg-muted/5 text-muted/50 pointer-events-none border opacity-50",
          )}
        >
          Next
        </Link>
      </div>
    </section>
  );
}
