import Link from "next/link";

import type {
  GitHubFilterKind,
  GitHubFilterStatus,
} from "@/features/github/services/github-backend";

import { cn } from "@/lib/utils";

import { kindOptions, statusOptions, buildSearchHref } from "./stats-utils";

interface StatsFiltersProps {
  status: GitHubFilterStatus;
  kind: GitHubFilterKind;
  updatedFrom?: string;
  updatedTo?: string;
}

const StatsFilters = ({ status, kind, updatedFrom, updatedTo }: StatsFiltersProps) => {
  return (
    <section className="mb-8 space-y-6">
      <div className="border-border/20 flex flex-col gap-5 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-foreground font-sans text-sm font-bold tracking-tight">
            Filter by status
          </h2>

          <p className="text-muted text-xs">
            Status, type, and date filters are applied on the server.
          </p>
        </div>

        <div className="bg-muted/10 border-border/20 scrollbar-none inline-flex w-fit overflow-x-auto rounded-full border p-0.5">
          {statusOptions.map((option) => {
            const isActive = status === option.value;

            return (
              <Link
                key={option.value}
                href={buildSearchHref({
                  status: option.value,
                  kind,
                  page: 1,
                  updatedFrom,
                  updatedTo,
                })}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-sans text-xs font-bold whitespace-nowrap transition-all duration-200 select-none",
                  isActive
                    ? "bg-card text-foreground border-border/30 border shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)]"
                    : "text-muted hover:text-foreground hover:bg-muted/5 border border-transparent",
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-border/20 flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-foreground font-sans text-sm font-bold tracking-tight">
            Filter by item type
          </h2>
        </div>

        <div className="bg-muted/10 border-border/20 scrollbar-none inline-flex w-fit overflow-x-auto rounded-full border p-0.5">
          {kindOptions.map((option) => {
            const isActive = kind === option.value;

            return (
              <Link
                key={option.value}
                href={buildSearchHref({
                  status,
                  kind: option.value,
                  page: 1,
                  updatedFrom,
                  updatedTo,
                })}
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-sans text-xs font-bold whitespace-nowrap transition-all duration-200 select-none",
                  isActive
                    ? "bg-card text-foreground border-border/30 border shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)]"
                    : "text-muted hover:text-foreground hover:bg-muted/5 border border-transparent",
                )}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <form
        method="get"
        action="/stats"
        className="border-border/30 bg-card/10 flex flex-wrap items-end gap-4 rounded-3xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.01)] backdrop-blur-xs"
      >
        {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
        {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="updatedFrom"
            className="text-muted/80 font-mono text-[9px] font-bold tracking-wider uppercase"
          >
            Updated from
          </label>

          <input
            type="date"
            id="updatedFrom"
            name="updatedFrom"
            defaultValue={updatedFrom}
            className="border-border/30 bg-card text-foreground hover:border-border/60 focus:border-accent/50 focus:ring-accent/50 cursor-pointer rounded-xl border px-3 py-1.5 font-sans text-xs font-bold shadow-xs transition-colors outline-none focus:ring-1"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="updatedTo"
            className="text-muted/80 font-mono text-[9px] font-bold tracking-wider uppercase"
          >
            Updated to
          </label>

          <input
            type="date"
            id="updatedTo"
            name="updatedTo"
            defaultValue={updatedTo}
            className="border-border/30 bg-card text-foreground hover:border-border/60 focus:border-accent/50 focus:ring-accent/50 cursor-pointer rounded-xl border px-3 py-1.5 font-sans text-xs font-bold shadow-xs transition-colors outline-none focus:ring-1"
          />
        </div>

        <button
          type="submit"
          className="bg-foreground text-background cursor-pointer rounded-full px-4 py-1.5 font-sans text-xs font-bold transition-opacity hover:opacity-90 active:scale-[0.98]"
        >
          Apply Date Filter
        </button>

        <Link
          href={buildSearchHref({
            status,
            kind,
            page: 1,
          })}
          className="text-muted hover:text-foreground px-3 py-1.5 font-sans text-xs font-bold transition-colors"
        >
          Clear Dates
        </Link>
      </form>
    </section>
  );
};

export default StatsFilters;
