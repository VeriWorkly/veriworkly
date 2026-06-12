import type { Metadata } from "next";
import Link from "next/link";

import { Card, Badge, Button } from "@veriworkly/ui";

import { AuthInitializer } from "@/providers/auth-provider";
import AdminActionButtons from "@/app/admin/components/AdminActionButtons";

import { fetchCurrentUser } from "@/features/auth/services/current-user";
import { fetchAdminDashboardStatsServer } from "@/features/admin/services/admin-server";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Monitor platform metrics, roadmap operations, and admin controls.",
  robots: { index: false, follow: false },
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function humanizeMetricKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildMetricCards(source: Record<string, unknown> = {}, fallbackKeys: string[] = []) {
  const uniqueKeys = Array.from(new Set([...fallbackKeys, ...Object.keys(source)]));

  return uniqueKeys
    .filter((key) => key !== "raw")
    .map((key) => ({
      key,
      label: humanizeMetricKey(key),
      value: toNumber(source[key]),
    }));
}

export default async function AdminPage() {
  const [user, stats] = await Promise.all([fetchCurrentUser(), fetchAdminDashboardStatsServer()]);

  const githubStats = (stats?.githubStats?.stats || {}) as Record<string, unknown>;
  const usageMetrics = stats?.usageMetrics || {};

  const githubTotal = toNumber(githubStats.total ?? githubStats.totalItems);

  const todayMetrics = buildMetricCards((usageMetrics.today as Record<string, unknown>) || {}, [
    "resumeCreated",
    "resumeExported",
    "loginSuccess",
  ]);

  const totalMetrics = buildMetricCards((usageMetrics.totals as Record<string, unknown>) || {}, [
    "resumeCreated",
    "resumeDeleted",
    "resumeExported",
    "loginSuccess",
    "otpSent",
    "dashboardOpened",
    "roadmapViewed",
  ]);

  const formattedGeneratedAt = usageMetrics.generatedAt
    ? new Date(usageMetrics.generatedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Just now";

  return (
    <>
      <AuthInitializer initialUser={user} />

      <div className="space-y-8 md:space-y-10">
        <section className="border-border bg-card relative overflow-hidden rounded-4xl border px-6 py-7 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] md:px-8">
          <div className="bg-accent/12 pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl" />

          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <Badge className="bg-background/70">Admin Control Panel</Badge>

              <div>
                <h2 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
                  Admin Operations Dashboard
                </h2>

                <p className="text-muted mt-2 text-sm leading-6 md:text-base">
                  Signed in as
                  <span className="text-foreground font-semibold"> {user?.email || "Admin"}</span>
                </p>
              </div>
            </div>

            <AdminActionButtons />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link href="/admin/monetization">
            <Card className="border-border/80 bg-card/90 h-full cursor-pointer rounded-4xl p-6 transition duration-200 hover:-translate-y-0.5">
              <div className="space-y-3"><Badge className="bg-background/70">Revenue</Badge><h3 className="text-foreground text-xl font-semibold">Monetization Operations</h3><p className="text-muted text-sm leading-6">Review affiliate withdrawals, credit adjustments, entitlements, and audit activity.</p></div>
              <div className="text-accent mt-5 text-sm font-semibold">Open Monetization</div>
            </Card>
          </Link>
          <Link href="/admin/roadmap">
            <Card className="border-border/80 bg-card/90 h-full cursor-pointer rounded-4xl p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_70px_-38px_rgba(0,0,0,0.5)]">
              <div className="space-y-3">
                <Badge className="bg-background/70">Planning</Badge>

                <h3 className="text-foreground text-xl font-semibold tracking-tight">
                  Manage Roadmap
                </h3>

                <p className="text-muted text-sm leading-6">
                  Browse, create, and edit detailed roadmap items from the new admin routes.
                </p>
              </div>

              <div className="text-accent mt-5 text-sm font-semibold">Open Admin Roadmap</div>
            </Card>
          </Link>

          <Link href="/admin/roadmap/new">
            <Card className="border-border/80 bg-card/90 h-full cursor-pointer rounded-4xl p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_70px_-38px_rgba(0,0,0,0.5)]">
              <div className="space-y-3">
                <Badge className="bg-background/70">Creation</Badge>

                <h3 className="text-foreground text-xl font-semibold tracking-tight">
                  Create Roadmap Item
                </h3>

                <p className="text-muted text-sm leading-6">
                  Use dedicated create/edit pages to manage complete schema-backed feature details.
                </p>
              </div>

              <div className="text-accent mt-5 text-sm font-semibold">Create New Item</div>
            </Card>
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="space-y-2 rounded-4xl p-6">
            <p className="text-muted text-sm">GitHub Items Tracked</p>
            <p className="text-foreground text-3xl font-semibold">{githubTotal}</p>
          </Card>

          <Card className="space-y-2 rounded-4xl p-6">
            <p className="text-muted text-sm">Completion Rate</p>
            <p className="text-foreground text-3xl font-semibold">
              {String(githubStats.completionRate ?? "0.00")}
              <span className="text-muted text-lg">%</span>
            </p>
          </Card>

          <Card className="space-y-2 rounded-4xl p-6">
            <p className="text-muted text-sm">GitHub Issues</p>
            <p className="text-foreground text-3xl font-semibold">{toNumber(githubStats.issues)}</p>
          </Card>

          <Card className="space-y-2 rounded-4xl p-6">
            <p className="text-muted text-sm">GitHub Pull Requests</p>
            <p className="text-foreground text-3xl font-semibold">
              {toNumber(githubStats.pullRequests)}
            </p>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">Today Metrics</h3>

            <span className="text-muted text-sm">{formattedGeneratedAt}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {todayMetrics.map((metric) => (
              <Card key={metric.key} className="space-y-2 rounded-4xl p-6">
                <p className="text-muted text-sm">{metric.label}</p>
                <p className="text-foreground text-3xl font-semibold">{metric.value}</p>
              </Card>
            ))}
          </div>
        </section>

        <Card className="space-y-4 rounded-4xl p-6 md:p-7">
          <h3 className="text-foreground text-lg font-semibold tracking-tight">Platform Signals</h3>

          <div className="grid gap-3 text-sm md:grid-cols-2 md:text-base">
            {totalMetrics.map((metric) => (
              <div key={metric.key} className="flex items-center justify-between">
                <span className="text-muted">Total {metric.label}</span>

                <span className="text-foreground font-semibold">{metric.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-border h-px" />

          <p className="text-muted text-sm leading-6">
            GitHub sync runs every 12 hours. Usage metrics are buffered in Redis and flushed daily.
          </p>

          <Button asChild variant="secondary" size="sm" className="w-fit">
            <Link href="/stats">Open Public Development Page</Link>
          </Button>
        </Card>
      </div>
    </>
  );
}
