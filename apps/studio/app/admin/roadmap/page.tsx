import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Plus } from "lucide-react";

import { Badge, Button } from "@veriworkly/ui";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import type { ChartSeries } from "@/components/admin/charts/ChartDefs";
import { chartColor } from "@/components/admin/charts/ChartDefs";

import type { RoadmapStatus } from "@/features/roadmap/services/roadmap-backend";
import { fetchAdminRoadmapColumn } from "@/features/admin/services/admin-server";
import { formatNumber, lastPageOffset } from "@/features/admin/utils/admin-format";
import {
  toSingleValueParams,
  type AdminSearchParams,
} from "@/features/admin/utils/admin-search-params";

import DeleteRoadmapButton from "@/app/admin/roadmap/components/DeleteRoadmapButton";

/** Column accents come from the chart ramp, which has light and dark values; raw palette steps do not. */
const statusConfig: Record<RoadmapStatus, { label: string; series: ChartSeries }> = {
  todo: { label: "To do", series: 2 },
  "in-progress": { label: "In progress", series: 1 },
  done: { label: "Done", series: 3 },
};

export const metadata: Metadata = {
  title: "Admin · Roadmap",
  description: "Create, update, and organize public roadmap items from admin panel.",
  robots: { index: false, follow: false },
};

const STATUSES: RoadmapStatus[] = ["todo", "in-progress", "done"];

/** A column's offset from the URL (`?todo=20`); each column pages on its own. */
function columnOffset(value: string | undefined) {
  const offset = Number(value);
  return Number.isInteger(offset) && offset > 0 ? offset : 0;
}

function columnHref(params: Record<string, string>, status: RoadmapStatus, offset: number) {
  const search = new URLSearchParams(params);

  if (offset > 0) search.set(status, String(offset));
  else search.delete(status);

  const query = search.toString();
  return query ? `/admin/roadmap?${query}` : "/admin/roadmap";
}

const AdminRoadmapPage = async ({ searchParams }: { searchParams: Promise<AdminSearchParams> }) => {
  const params = toSingleValueParams(await searchParams);

  const pages = await Promise.all(
    STATUSES.map((status) => fetchAdminRoadmapColumn(status, columnOffset(params[status]))),
  );
  const grouped = Object.fromEntries(
    STATUSES.map((status, index) => [status, pages[index]]),
  ) as Record<RoadmapStatus, (typeof pages)[number]>;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="Platform"
        title="Roadmap"
        description="Feature requests and development progress. Every item here is visible on the public roadmap page."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/roadmap/new">
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              New feature
            </Link>
          </Button>
        }
      />

      <section className="grid gap-3 lg:grid-cols-3">
        {STATUSES.map((status) => {
          const column = statusConfig[status];
          const page = grouped[status];
          const hasPrevious = page.offset > 0;
          const hasNext = page.offset + page.items.length < page.total;
          // Past the end (a stale link after deletions), "Previous" goes to the last real page.
          const previousOffset =
            page.items.length === 0
              ? lastPageOffset(page.total, page.limit)
              : Math.max(0, page.offset - page.limit);

          return (
            <div key={status} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: chartColor(column.series) }}
                    aria-hidden="true"
                  />

                  <h2 className="admin-label text-foreground">{column.label}</h2>
                </div>

                <span className="text-muted admin-numeric text-xs">{formatNumber(page.total)}</span>
              </div>

              <div className="border-border bg-admin-inset min-h-96 flex-1 rounded-xl border border-dashed p-2">
                {page.items.length === 0 ? (
                  <div className="flex h-32 items-center justify-center">
                    <p className="text-muted text-xs">Nothing in this column.</p>
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {page.items.map((item) => (
                      <li
                        key={item.id}
                        className="group border-border bg-card rounded-lg border p-3 transition hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                      >
                        <h3 className="text-foreground group-hover:text-accent text-sm font-semibold transition-colors">
                          {item.title}
                        </h3>

                        <p className="text-muted mt-1 line-clamp-2 text-xs leading-relaxed">
                          {item.description}
                        </p>

                        {item.timeline ? (
                          <p className="text-muted mt-2 flex items-center gap-1.5 text-xs">
                            <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" />
                            {item.timeline}
                          </p>
                        ) : null}

                        {item.tags && item.tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.tags.map((tag) => (
                              <Badge
                                key={`${item.id}-${tag}`}
                                className="rounded-md px-1.5 py-0 text-xs capitalize"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        <div className="border-border mt-2.5 flex items-center justify-end gap-1 border-t pt-2">
                          <Button size="sm" asChild variant="ghost" className="h-7 text-xs">
                            <Link href={`/admin/roadmap/${encodeURIComponent(item.id)}/edit`}>
                              Edit
                            </Link>
                          </Button>

                          <DeleteRoadmapButton id={item.id} title={item.title} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {hasPrevious || hasNext ? (
                <nav
                  aria-label={`${column.label} pages`}
                  className="text-muted admin-numeric flex items-center justify-between px-1 text-xs"
                >
                  <span>
                    {page.items.length > 0
                      ? `${page.offset + 1}–${page.offset + page.items.length} of ${formatNumber(page.total)}`
                      : `Past the end of ${formatNumber(page.total)}`}
                  </span>

                  <span className="flex gap-3">
                    {hasPrevious ? (
                      <Link
                        href={columnHref(params, status, previousOffset)}
                        className="text-accent font-medium"
                      >
                        Previous
                      </Link>
                    ) : null}
                    {hasNext ? (
                      <Link
                        href={columnHref(params, status, page.offset + page.limit)}
                        className="text-accent font-medium"
                      >
                        Next
                      </Link>
                    ) : null}
                  </span>
                </nav>
              ) : null}
            </div>
          );
        })}
      </section>
    </div>
  );
};

export default AdminRoadmapPage;
