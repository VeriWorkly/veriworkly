import Link from "next/link";
import type {
  GitHubFilterKind,
  GitHubFilterStatus,
} from "@/features/github/services/github-backend";
import { cn } from "@veriworkly/ui";
import { statusOptions, kindOptions, buildSearchHref } from "./stats-utils";

interface StatsFiltersProps {
  status: GitHubFilterStatus;
  kind: GitHubFilterKind;
  updatedFrom?: string;
  updatedTo?: string;
}

const pillClass = (isActive: boolean) =>
  cn(
    "rounded-full px-3.5 py-1.5 font-sans text-xs font-bold whitespace-nowrap transition-all duration-200 select-none",
    isActive
      ? "bg-card text-foreground border-border/30 border shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)]"
      : "text-muted hover:text-foreground hover:bg-muted/5 border border-transparent",
  );

/**
 * The page already parsed `kind` from the URL, threaded it through every `buildSearchHref`
 * call, and forwarded it to the backend - but never rendered a control for it, so the only
 * way to filter issues from pull requests was to hand-edit the query string. The copy
 * underneath advertised it regardless.
 */
const StatsFilters = ({ status, kind, updatedFrom, updatedTo }: StatsFiltersProps) => {
  return (
    <section className="mb-8 space-y-6">
      <div className="border-border/20 flex flex-col gap-5 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-foreground font-sans text-sm font-bold tracking-tight">
            Filter the board
          </h2>

          <p className="text-muted text-xs">
            Status and type filters are applied on the server, so every view is a real query rather
            than a client-side slice.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 sm:items-end">
          <div
            role="group"
            aria-label="Filter by status"
            className="bg-muted/10 border-border/20 inline-flex w-fit scrollbar-none overflow-x-auto rounded-full border p-0.5"
          >
            {statusOptions.map((option) => {
              const isActive = status === option.value;

              return (
                <Link
                  key={option.value}
                  aria-current={isActive ? "page" : undefined}
                  href={buildSearchHref({
                    status: option.value,
                    kind,
                    page: 1,
                    updatedFrom,
                    updatedTo,
                  })}
                  className={pillClass(isActive)}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="Filter by item type"
            className="bg-muted/10 border-border/20 inline-flex w-fit scrollbar-none overflow-x-auto rounded-full border p-0.5"
          >
            {kindOptions.map((option) => {
              const isActive = kind === option.value;

              return (
                <Link
                  key={option.value}
                  aria-current={isActive ? "page" : undefined}
                  href={buildSearchHref({
                    status,
                    kind: option.value,
                    page: 1,
                    updatedFrom,
                    updatedTo,
                  })}
                  className={pillClass(isActive)}
                >
                  {option.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsFilters;
