import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

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
}

const navLinkClass = (disabled: boolean) =>
  cn(
    "bg-card inline-flex h-12 items-center gap-2 rounded-full px-5 text-base font-semibold whitespace-nowrap transition-colors duration-200",
    disabled
      ? "text-muted pointer-events-none opacity-50"
      : "hover:bg-foreground hover:text-background focus-visible:ring-accent/40 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]",
  );

const StatsPagination = ({ status, kind, currentPage, hasMore }: StatsPaginationProps) => {
  const hasPrev = currentPage > 1;

  if (!hasPrev && !hasMore) return null;

  const hrefFor = (page: number) => buildSearchHref({ status, kind, page });

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-between gap-4">
      {hasPrev ? (
        <Link href={hrefFor(currentPage - 1)} rel="prev" className={navLinkClass(false)}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={navLinkClass(true)}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Previous
        </span>
      )}

      <p className="text-muted text-center text-base tabular-nums">
        Page {currentPage}
        <span className="hidden sm:inline">, {PAGE_SIZE} items each</span>
      </p>

      {hasMore ? (
        <Link href={hrefFor(currentPage + 1)} rel="next" className={navLinkClass(false)}>
          Next
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : (
        <span aria-disabled="true" className={navLinkClass(true)}>
          Next
          <ArrowRight aria-hidden="true" className="size-4" />
        </span>
      )}
    </nav>
  );
};

export default StatsPagination;
