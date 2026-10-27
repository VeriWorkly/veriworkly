import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@veriworkly/ui";

import { formatNumber, lastPageOffset } from "@/features/admin/utils/admin-format";

interface AdminPaginationProps {
  total: number;
  limit: number;
  offset: number;
  /** Path without a query string, e.g. `/admin/users`. */
  basePath: string;
  /** Current filters, re-emitted on the prev/next links so paging never drops them. */
  params?: Record<string, string | number | undefined>;
}

function buildHref(
  basePath: string,
  params: Record<string, string | number | undefined>,
  offset: number,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || key === "offset") continue;
    search.set(key, String(value));
  }

  if (offset > 0) search.set("offset", String(offset));

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

const controlClass =
  "border-border text-foreground hover:border-accent/40 hover:bg-admin-inset focus-visible:ring-accent inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition focus-visible:ring-2 focus-visible:outline-none";

const AdminPagination = ({ total, limit, offset, basePath, params = {} }: AdminPaginationProps) => {
  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  const hasPrevious = offset > 0;
  const hasNext = offset + limit < total;
  // A stale link (rows deleted since) can land past the end; it has no range to show.
  const pastEnd = offset > 0 && offset >= total;
  const previousOffset = pastEnd ? lastPageOffset(total, limit) : Math.max(0, offset - limit);

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + limit, total);

  // A single page of results needs no controls at all.
  if (total <= limit && offset === 0) {
    return total === 0 ? null : (
      <p className="text-muted admin-numeric px-1 text-xs">
        {total} {total === 1 ? "result" : "results"}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      {pastEnd ? (
        <p className="text-muted admin-numeric text-xs">
          {total === 0 ? (
            "Past the last page: nothing matches these filters now."
          ) : (
            <>
              Past the last page: there are{" "}
              <span className="text-foreground font-medium">{formatNumber(total)}</span> results in{" "}
              {pageCount} {pageCount === 1 ? "page" : "pages"}.
            </>
          )}
        </p>
      ) : (
        <p className="text-muted admin-numeric text-xs">
          <span className="text-foreground font-medium">{rangeStart}</span>–
          <span className="text-foreground font-medium">{rangeEnd}</span> of{" "}
          <span className="text-foreground font-medium">{formatNumber(total)}</span>
          <span className="mx-1.5 opacity-50">·</span>
          page {page} of {pageCount}
        </p>
      )}

      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Link href={buildHref(basePath, params, previousOffset)} className={controlClass}>
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Previous
          </Link>
        ) : (
          <span className={cn(controlClass, "pointer-events-none opacity-40")} aria-hidden="true">
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </span>
        )}

        {hasNext ? (
          <Link href={buildHref(basePath, params, offset + limit)} className={controlClass}>
            Next
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <span className={cn(controlClass, "pointer-events-none opacity-40")} aria-hidden="true">
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
};

export default AdminPagination;
