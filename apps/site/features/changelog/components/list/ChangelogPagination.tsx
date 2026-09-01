import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@veriworkly/ui";

import { buildChangelogHref } from "@/features/changelog/utils/changelog-utils";
import { type ChangelogPagination as ChangelogPaginationMeta } from "@/features/changelog/services/changelog-backend";

interface ChangelogPaginationProps {
  pagination: ChangelogPaginationMeta;
  activeType?: string;
  search?: string;
  basePath?: string;
}

const ChangelogPagination = ({
  pagination,
  activeType,
  search,
  basePath = "/changelog",
}: ChangelogPaginationProps) => {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) return null;

  const hrefForPage = (targetPage: number) =>
    buildChangelogHref(basePath, {
      type: activeType && activeType !== "all" ? activeType : undefined,
      search,
      page: targetPage > 1 ? targetPage.toString() : undefined,
    });

  const navLinkClass = (disabled: boolean) =>
    cn(
      "border-border/40 text-muted inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-sans text-xs font-semibold whitespace-nowrap transition-colors",
      disabled
        ? "pointer-events-none opacity-40"
        : "hover:text-foreground hover:border-border/60 hover:bg-muted/5",
    );

  return (
    <nav
      aria-label="Changelog pagination"
      className="mt-10 flex items-center justify-between gap-4"
    >
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} className={navLinkClass(false)}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Previous
        </Link>
      ) : (
        <span className={navLinkClass(true)}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Previous
        </span>
      )}

      <p className="text-muted font-mono text-[11px] tracking-wide">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link href={hrefForPage(page + 1)} className={navLinkClass(false)}>
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : (
        <span className={navLinkClass(true)}>
          Next
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
};

export default ChangelogPagination;
