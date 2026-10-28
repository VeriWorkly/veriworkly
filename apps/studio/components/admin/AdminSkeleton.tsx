import type { ReactNode } from "react";

import { cn } from "@veriworkly/ui";

import type { AdminRouteSkeleton, AdminStatCount } from "@/features/admin/config/admin-routes";

/**
 * Loading placeholders for the admin's server-rendered pages. Each shape mirrors its page's real
 * grid (stat row, side column, kanban columns) closely enough that content does not jump when
 * it arrives.
 */

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("bg-admin-inset animate-pulse rounded-md", className)}
      // Purely decorative: the `aria-busy`/`aria-live` announcement belongs on the region as a
      // whole, not on each individual grey box.
      aria-hidden="true"
    />
  );
}

function SkeletonCard() {
  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <SkeletonBlock className="h-2.5 w-24" />
      <SkeletonBlock className="mt-3 h-6 w-20" />
      <SkeletonBlock className="mt-2 h-2.5 w-32" />
    </div>
  );
}

function SkeletonPanel({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("border-border bg-card rounded-xl border", className)}>
      <div className="border-border border-b px-4 py-3">
        <SkeletonBlock className="h-3 w-32" />
      </div>

      <div className="space-y-3 p-4">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <SkeletonBlock className="h-3 flex-1" />
            <SkeletonBlock className="h-3 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      <div className="bg-admin-inset border-border border-b px-4 py-2.5">
        <SkeletonBlock className="h-2.5 w-40" />
      </div>

      <div className="divide-border divide-y">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex items-center gap-4 px-4 py-3">
            <SkeletonBlock className="h-3 flex-1" />
            <SkeletonBlock className="hidden h-3 w-20 shrink-0 md:block" />
            <SkeletonBlock className="hidden h-3 w-16 shrink-0 md:block" />
            <SkeletonBlock className="h-3 w-14 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Wraps a page's skeleton so assistive tech announces the load once, not per placeholder. */
function SkeletonPage({ children, label = "Loading" }: { children: ReactNode; label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="space-y-5">
      {children}
    </div>
  );
}

function SkeletonHeader() {
  return (
    <div>
      <SkeletonBlock className="h-6 w-40" />
      <SkeletonBlock className="mt-2 h-3 w-80 max-w-full" />
    </div>
  );
}

/** The same column classes the pages put on their stat-card `<section>`. */
const STAT_GRID: Record<AdminStatCount, string> = {
  3: "grid gap-3 sm:grid-cols-3",
  4: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
  5: "grid gap-3 sm:grid-cols-2 xl:grid-cols-5",
};

function SkeletonStats({ count }: { count: AdminStatCount }) {
  return (
    <div className={STAT_GRID[count]}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

/** Mirrors the dashboard: queue strip, KPI rows, the growth chart beside the role breakdown. */
function DashboardSkeleton() {
  return (
    <SkeletonPage label="Loading dashboard">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SkeletonBlock className="h-6 w-36" />
          <SkeletonBlock className="mt-2 h-3 w-72 max-w-full" />
        </div>

        <SkeletonBlock className="h-8 w-40 rounded-lg" />
      </div>

      <SkeletonBlock className="h-14 w-full rounded-xl" />

      <SkeletonStats count={5} />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="border-border bg-card rounded-xl border lg:col-span-2">
          <div className="border-border border-b px-4 py-3">
            <SkeletonBlock className="h-3 w-24" />
          </div>

          <div className="p-4">
            <SkeletonBlock className="h-[220px] w-full rounded-lg" />
          </div>
        </div>

        <SkeletonPanel rows={5} />
      </div>

      <SkeletonStats count={4} />

      <div className="grid gap-3 lg:grid-cols-3">
        <SkeletonPanel rows={5} />
        <SkeletonPanel rows={5} />
        <SkeletonPanel rows={5} />
      </div>
    </SkeletonPage>
  );
}

/** Header, optional stat row and panel, then filters + table, beside a side form when `aside`. */
function ListSkeleton({ stats, panel, aside }: Extract<AdminRouteSkeleton, { kind: "list" }>) {
  const list = (
    <>
      <SkeletonBlock className="h-14 w-full rounded-xl" />
      <SkeletonTable />
    </>
  );

  return (
    <SkeletonPage>
      <SkeletonHeader />

      {stats ? <SkeletonStats count={stats} /> : null}

      {panel ? <SkeletonPanel rows={2} /> : null}

      {aside ? (
        <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
          <div className="space-y-4">{list}</div>
          <SkeletonPanel rows={4} className="h-fit" />
        </div>
      ) : (
        list
      )}
    </SkeletonPage>
  );
}

/** Header, optional stat row, then the main column of panels beside the 20rem side column. */
function DetailSkeleton({ stats, panelRow }: Extract<AdminRouteSkeleton, { kind: "detail" }>) {
  return (
    <SkeletonPage>
      <SkeletonHeader />

      {stats ? <SkeletonStats count={stats} /> : null}

      {panelRow ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <SkeletonPanel rows={4} />
          <SkeletonPanel rows={4} />
          <SkeletonPanel rows={4} />
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <SkeletonPanel rows={6} />
          <SkeletonPanel rows={6} />
        </div>

        <div className="space-y-4">
          <SkeletonPanel rows={4} />
          <SkeletonPanel rows={3} />
        </div>
      </div>
    </SkeletonPage>
  );
}

/** The roadmap board: three status columns under the header and its "New feature" button. */
function KanbanSkeleton() {
  return (
    <SkeletonPage label="Loading roadmap">
      <div className="flex items-start justify-between gap-3">
        <SkeletonHeader />
        <SkeletonBlock className="h-8 w-32 rounded-lg" />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2.5">
            <SkeletonBlock className="mx-1 h-3 w-24" />
            <SkeletonBlock className="min-h-96 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}

function FormSkeleton() {
  return (
    <SkeletonPage label="Loading form">
      <div>
        <SkeletonBlock className="h-6 w-56" />
        <SkeletonBlock className="mt-2 h-3 w-80 max-w-full" />
      </div>

      <SkeletonBlock className="h-[32rem] w-full rounded-xl" />
    </SkeletonPage>
  );
}

export default function AdminSkeleton({ skeleton }: { skeleton: AdminRouteSkeleton }) {
  switch (skeleton.kind) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "list":
      return <ListSkeleton {...skeleton} />;
    case "detail":
      return <DetailSkeleton {...skeleton} />;
    case "kanban":
      return <KanbanSkeleton />;
    case "form":
      return <FormSkeleton />;
  }
}
