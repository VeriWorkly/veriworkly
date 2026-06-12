import { Eye, Info, Globe2 } from "lucide-react";
import { Metric } from "./Metric";

export interface AnalyticsMetricsProps {
  totalViews: number;
  recentViews: number;
  activeDays: number;
  referrersCount: number;
}

export function AnalyticsMetrics({
  totalViews,
  recentViews,
  activeDays,
  referrersCount,
}: AnalyticsMetricsProps) {
  return (
    <section className="mt-8 grid gap-3 sm:grid-cols-3">
      <Metric
        icon={<Eye size={16} />}
        label="All-time views"
        value={totalViews}
        detail="Since first publication"
      />
      <Metric
        icon={<Info size={16} />}
        label="Last 30 days"
        value={recentViews}
        detail={`${activeDays} active ${activeDays === 1 ? "day" : "days"}`}
      />
      <Metric
        icon={<Globe2 size={16} />}
        label="Referring sites"
        value={referrersCount}
        detail="Hostnames only, no visitor profiles"
      />
    </section>
  );
}
