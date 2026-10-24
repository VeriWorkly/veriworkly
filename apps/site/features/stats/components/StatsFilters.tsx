import Link from "next/link";

import { cn } from "@veriworkly/ui";

import type {
  GitHubFilterKind,
  GitHubFilterStatus,
} from "@/features/github/services/github-backend";

import { statusOptions, kindOptions, buildSearchHref } from "./stats-utils";

interface StatsFiltersProps {
  status: GitHubFilterStatus;
  kind: GitHubFilterKind;
}

const pillClass = (isActive: boolean) =>
  cn(
    "focus-visible:ring-accent/40 rounded-full px-4 py-2.5 text-base font-semibold whitespace-nowrap transition-colors duration-200 select-none focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] sm:px-5",
    isActive ? "bg-foreground text-background" : "text-muted hover:text-foreground",
  );

const groupClass = "bg-card flex w-fit max-w-full flex-wrap gap-1 rounded-3xl p-1 sm:rounded-full";

/**
 * Both filters are links: each view is a real server query, so it can be shared and works
 * without script. The page previously parsed `kind` without rendering a control for it.
 */
const StatsFilters = ({ status, kind }: StatsFiltersProps) => (
  <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
    <nav aria-label="Filter by status" className={groupClass}>
      {statusOptions.map((option) => {
        const isActive = status === option.value;

        return (
          <Link
            key={option.value}
            aria-current={isActive ? "page" : undefined}
            href={buildSearchHref({ status: option.value, kind, page: 1 })}
            className={pillClass(isActive)}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>

    <nav aria-label="Filter by item type" className={groupClass}>
      {kindOptions.map((option) => {
        const isActive = kind === option.value;

        return (
          <Link
            key={option.value}
            aria-current={isActive ? "page" : undefined}
            href={buildSearchHref({ status, kind: option.value, page: 1 })}
            className={pillClass(isActive)}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  </div>
);

export default StatsFilters;
