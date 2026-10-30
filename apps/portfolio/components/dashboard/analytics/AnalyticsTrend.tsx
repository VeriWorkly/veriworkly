import { TrendChart } from "./TrendChart";
import { EmptyAnalytics } from "./EmptyAnalytics";

export interface AnalyticsTrendProps {
  daily: Array<{ date: string; count: number }>;
  isLive: boolean;
}

export function AnalyticsTrend({ daily, isLive }: AnalyticsTrendProps) {
  return (
    <article className="border-line bg-panel rounded-[2rem] border p-6 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.45)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted text-xs font-extrabold">View trend</p>
          <h2 className="mt-1 text-xl font-bold tracking-[-.04em]">Recent portfolio views</h2>
        </div>
        <span className="bg-accent-soft text-accent rounded-full px-3 py-1.5 text-xs font-extrabold">
          Last 30 days
        </span>
      </div>
      {daily.some((item) => item.count > 0) ? (
        <TrendChart daily={daily} />
      ) : (
        <EmptyAnalytics isLive={isLive} />
      )}
    </article>
  );
}
