"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button, Select } from "@veriworkly/ui";

interface AdminFilterOption {
  label: string;
  value: string;
}

export interface AdminFilterSelect {
  name: string;
  label: string;
  options: AdminFilterOption[];
}

/** A `YYYY-MM-DD` URL param, picked with a date input. */
export interface AdminFilterDate {
  name: string;
  label: string;
}

interface AdminFilterBarProps {
  basePath: string;
  searchPlaceholder?: string;
  selects?: AdminFilterSelect[];
  dates?: AdminFilterDate[];
}

/**
 * Filters are URL state, not component state.
 *
 * Every admin list page is a server component that reads `searchParams`, so applying a filter
 * has to be a navigation. The payoff is that a filtered view is a shareable link — an operator
 * can paste "the failed webhooks page" into a ticket and it still means the same thing.
 */
const AdminFilterBar = ({
  basePath,
  searchPlaceholder = "Search…",
  selects = [],
  dates = [],
}: AdminFilterBarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQuery = searchParams.get("query") ?? "";

  const applyParam = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());

    if (value) next.set(name, value);
    else next.delete(name);

    // Any filter change invalidates the current page position.
    next.delete("offset");

    const search = next.toString();
    router.push(search ? `${basePath}?${search}` : basePath);
  };

  const activeFilters = [...searchParams.keys()].filter((key) => key !== "offset");

  return (
    <form
      className="border-border bg-card flex flex-wrap items-center gap-2 rounded-xl border p-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
      onSubmit={(event) => {
        event.preventDefault();

        const submitted = new FormData(event.currentTarget).get("query");
        applyParam("query", typeof submitted === "string" ? submitted.trim() : "");
      }}
    >
      <div className="relative min-w-56 flex-1">
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2"
          aria-hidden="true"
        />

        {/*
          Uncontrolled, keyed on the URL value. The URL is the source of truth for filters, so
          keying here remounts the input with the right default whenever the URL changes (back
          button, Reset) without an effect that writes state on every render.
        */}
        <input
          key={currentQuery}
          id="admin-filter-query"
          name="query"
          defaultValue={currentQuery}
          placeholder={searchPlaceholder}
          aria-label="Search"
          className="border-border bg-background text-foreground placeholder:text-muted focus:border-accent focus:ring-accent/25 h-9 w-full rounded-lg border pr-3 pl-8 text-sm transition outline-none focus:ring-2"
        />
      </div>

      {selects.map((select) => (
        <Select
          key={select.name}
          id={`admin-filter-${select.name}`}
          aria-label={select.label}
          className="h-9 min-w-32 rounded-lg text-xs"
          value={searchParams.get(select.name) ?? ""}
          onChange={(event) => applyParam(select.name, event.target.value)}
        >
          {select.options.map((option) => (
            <option key={option.value} value={option.value}>
              {/* The label is on the control, not above it, so it has to carry into the
                  placeholder option or an unset filter reads as a bare "Any". */}
              {option.value === "" ? `${select.label}: ${option.label}` : option.label}
            </option>
          ))}
        </Select>
      ))}

      {dates.map((date) => (
        <label
          key={date.name}
          className="text-muted flex h-9 items-center gap-1.5 text-xs whitespace-nowrap"
        >
          {date.label}
          <input
            type="date"
            name={date.name}
            value={searchParams.get(date.name) ?? ""}
            onChange={(event) => applyParam(date.name, event.target.value)}
            className="border-border bg-background text-foreground focus:border-accent h-9 rounded-lg border px-2 text-xs outline-none"
          />
        </label>
      ))}

      <Button type="submit" size="sm" className="h-9 rounded-lg">
        Apply
      </Button>

      {activeFilters.length > 0 ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 rounded-lg"
          onClick={() => router.push(basePath)}
        >
          <X className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
          Clear {activeFilters.length}
        </Button>
      ) : null}
    </form>
  );
};

export default AdminFilterBar;
