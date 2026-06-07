import Link from "next/link";
import { ArrowRight, BarChart3, Eye, Globe2, Info } from "lucide-react";

export type PortfolioAnalytics = {
  totalViews: number;
  daily: Array<{ date: string; count: number }>;
  referrers: Array<{ host: string; count: number }>;
};

export function PortfolioAnalyticsWorkspace({
  analytics,
}: {
  analytics: PortfolioAnalytics | null;
}) {
  const daily = analytics?.daily.slice().reverse() ?? [];
  const recentViews = daily.reduce((total, item) => total + item.count, 0);
  const activeDays = daily.filter((item) => item.count > 0).length;

  return (
    <main className="surface-grid min-h-[calc(100dvh-4.25rem)] px-4 py-8 sm:px-6 sm:py-10 xl:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className="text-xs font-extrabold text-[var(--color-accent)]">Portfolio analytics</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] sm:text-4xl">
              A clear view of your reach.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
              See how often your published portfolio is viewed and which websites helped people find
              it.
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 text-xs font-extrabold text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-strong)]"
            href="/editor"
          >
            Improve your portfolio <ArrowRight size={13} />
          </Link>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <Metric
            icon={<Eye size={16} />}
            label="All-time views"
            value={analytics?.totalViews ?? 0}
            detail="Since first publication"
          />
          <Metric
            icon={<BarChart3 size={16} />}
            label="Last 30 days"
            value={recentViews}
            detail={`${activeDays} active ${activeDays === 1 ? "day" : "days"}`}
          />
          <Metric
            icon={<Globe2 size={16} />}
            label="Referring sites"
            value={analytics?.referrers.length ?? 0}
            detail="Hostnames only, no visitor profiles"
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,.5fr)]">
          <article className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold text-[var(--color-muted)]">View trend</p>
                <h2 className="mt-1 text-xl font-black tracking-[-.04em]">
                  Recent portfolio views
                </h2>
              </div>
              <span className="rounded-full bg-[var(--color-accent-soft)] px-3 py-1.5 text-xs font-extrabold text-[var(--color-accent)]">
                Last 30 active days
              </span>
            </div>
            {daily.length ? <TrendChart daily={daily} /> : <EmptyAnalytics />}
          </article>

          <aside className="rounded-[2rem] border border-[var(--color-line)] bg-[var(--color-panel)] p-6">
            <p className="text-xs font-extrabold text-[var(--color-muted)]">Discovery</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.04em]">Referring sites</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
              We store only the referring website hostname with an aggregated daily view count.
            </p>
            <div className="mt-5 space-y-2">
              {analytics?.referrers.length ? (
                analytics.referrers.map((item) => (
                  <div
                    className="flex items-center gap-3 rounded-xl bg-[var(--color-paper)] px-3 py-3"
                    key={item.host}
                  >
                    <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-panel)] text-[var(--color-accent)]">
                      <Globe2 size={14} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-bold">{item.host}</span>
                    <span className="text-xs font-black tabular-nums">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-[var(--color-paper)] p-4 text-xs leading-5 text-[var(--color-muted)]">
                  No referring websites have been recorded yet. Direct visits do not include a
                  referring hostname.
                </p>
              )}
            </div>
            <div className="mt-5 flex gap-2 border-t border-[var(--color-line)] pt-4 text-[11px] leading-5 text-[var(--color-muted)]">
              <Info size={14} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
              <p>No personal visitor profiles, cookies, or page-level behavior are shown here.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function TrendChart({ daily }: { daily: Array<{ date: string; count: number }> }) {
  const max = Math.max(...daily.map((item) => item.count), 1);
  const width = 900;
  const height = 260;
  const pad = 24;
  const points = daily.map((item, index) => {
    const x =
      daily.length === 1 ? width / 2 : pad + (index / (daily.length - 1)) * (width - pad * 2);
    const y = height - pad - (item.count / max) * (height - pad * 2);
    return { ...item, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="mt-8">
      <svg
        className="h-auto w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Portfolio views trend"
      >
        {[0, 1, 2, 3].map((row) => (
          <line
            key={row}
            x1={pad}
            x2={width - pad}
            y1={pad + row * ((height - pad * 2) / 3)}
            y2={pad + row * ((height - pad * 2) / 3)}
            stroke="rgba(23,23,23,.1)"
          />
        ))}
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point) => (
          <circle
            key={point.date}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="var(--color-panel)"
            stroke="var(--color-accent)"
            strokeWidth="3"
          >
            <title>{`${formatDate(point.date)}: ${point.count} views`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-3 flex justify-between text-[10px] font-bold text-[var(--color-muted)]">
        <span>{formatDate(daily[0].date)}</span>
        <span>{formatDate(daily.at(-1)?.date || daily[0].date)}</span>
      </div>
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <div className="mt-8 grid min-h-64 place-items-center rounded-2xl bg-[var(--color-paper)] p-6 text-center">
      <div>
        <BarChart3 className="mx-auto text-[var(--color-accent)]" size={24} />
        <p className="mt-3 text-sm font-extrabold">Analytics start after publishing</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Publish your portfolio to begin collecting aggregate view counts.
        </p>
      </div>
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
      <div className="flex items-center justify-between text-[var(--color-muted)]">
        <p className="text-xs font-extrabold">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          {icon}
        </span>
      </div>
      <p className="mt-6 text-3xl font-black tracking-[-.04em] tabular-nums">{value}</p>
      <p className="mt-2 truncate text-[11px] text-[var(--color-muted)]">{detail}</p>
    </article>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(value),
  );
}
