import { Eye, LayoutTemplate, Check, Sparkles } from "lucide-react";
import { Metric } from "./Metric";
import { portfolioWorkspaceUrl } from "@/config/site";

export interface DashboardMetricsProps {
  totalViews: number;
  /** Server withheld the figures — show that, rather than a "0" the user would read as real. */
  analyticsLocked: boolean;
  visibleSections: number;
  projectCount: number;
  readiness: number;
  isLive: boolean;
  slug?: string;
}

export function DashboardMetrics({
  totalViews,
  analyticsLocked,
  visibleSections,
  projectCount,
  readiness,
  isLive,
  slug,
}: DashboardMetricsProps) {
  return (
    <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric
        label="Portfolio views"
        value={analyticsLocked ? "—" : String(totalViews)}
        detail={
          analyticsLocked ? "With Creator Pro, the Bundle or a pass" : "All-time public views"
        }
        icon={<Eye size={16} />}
      />
      <Metric
        label="Published sections"
        value={String(visibleSections)}
        detail={`${projectCount} project ${projectCount === 1 ? "story" : "stories"}`}
        icon={<LayoutTemplate size={16} />}
      />
      <Metric
        label="Readiness"
        value={`${readiness}%`}
        detail={readiness === 100 ? "Ready to share" : "Complete the remaining details"}
        icon={<Check size={16} />}
      />
      <Metric
        label="Publication"
        value={isLive ? "Live" : "Draft"}
        detail={slug ? portfolioWorkspaceUrl(slug).display : "Create your first draft"}
        icon={<Sparkles size={16} />}
      />
    </section>
  );
}
