"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@veriworkly/ui";

interface DocumentPaginationProps {
  /** Zero-based. */
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Previous and next through the library's pages, with where the reader is. */
export function DocumentPagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
}: DocumentPaginationProps) {
  if (pageCount <= 1) return null;

  const first = page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);

  return (
    <nav
      aria-label="Document pages"
      className="border-border/70 flex flex-wrap items-center justify-between gap-3 border-t p-4 sm:px-5"
    >
      <p className="text-muted text-sm" aria-live="polite">
        <span className="text-foreground font-semibold">
          {first}–{last}
        </span>{" "}
        of {total} · page {page + 1} of {pageCount}
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="border-border h-9 gap-1 rounded-xl border shadow-none"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Button>

        <Button
          size="sm"
          variant="secondary"
          disabled={page >= pageCount - 1}
          onClick={() => onPageChange(page + 1)}
          className="border-border h-9 gap-1 rounded-xl border shadow-none"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

/** Says how many of the account's documents are still arriving; nothing once all are here. */
export function PendingCloudDocuments({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;

  return (
    <p className={className ?? "text-muted text-sm"} role="status">
      Loading {count} more from your account…
    </p>
  );
}
