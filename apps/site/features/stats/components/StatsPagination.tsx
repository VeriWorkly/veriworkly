import Link from "next/link";
import { cn } from "@veriworkly/ui";
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

const StatsPagination = ({
  status,
  kind,
  currentPage,
  hasMore,
  updatedFrom,
  updatedTo,
}: StatsPaginationProps) => {
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

      <nav aria-label="Pagination" className="flex items-center gap-3">
        {/*
          Previous/Next alone gave no sense of position - nothing on the page said which
          page you were on, so paging deep and losing your place was a one-way trip.
        */}
        <span className="text-muted mr-1 font-mono text-xs font-bold whitespace-nowrap">
          Page {currentPage}
        </span>

        <Link
          href={prevHref}
          rel="prev"
          aria-disabled={!hasPrev}
          tabIndex={!hasPrev ? -1 : undefined}
          className={cn(
            "border-border/40 bg-card text-foreground inline-flex items-center justify-center rounded-full border px-4 py-2 font-sans text-xs font-bold shadow-xs transition-colors",
            !hasPrev && "pointer-events-none opacity-50",
          )}
        >
          Previous
        </Link>

        <Link
          href={nextHref}
          rel="next"
          aria-disabled={!hasMore}
          tabIndex={!hasMore ? -1 : undefined}
          className={cn(
            "border-border/40 bg-card text-foreground inline-flex items-center justify-center rounded-full border px-4 py-2 font-sans text-xs font-bold shadow-xs transition-colors",
            !hasMore && "pointer-events-none opacity-50",
          )}
        >
          Next
        </Link>
      </nav>
    </section>
  );
};

export default StatsPagination;
