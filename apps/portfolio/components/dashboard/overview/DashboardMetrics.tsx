import { Eye, LayoutTemplate, Check, Sparkles } from "lucide-react";
import { Metric } from "./Metric";
import type { CloudPortfolioDraft } from "@/lib/portfolio";

export interface DashboardMetricsProps {
  totalViews: number;
  visibleSections: number;
  projectCount: number;
  readiness: number;
  isLive: boolean;
  draft?: CloudPortfolioDraft | null;
}

export function DashboardMetrics({
  totalViews,
  visibleSections,
  projectCount,
  readiness,
  isLive,
  draft,
}: DashboardMetricsProps) {
  return (
    <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric
        label="Portfolio views"
        value={String(totalViews)}
        detail="All-time public views"
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
        detail={draft ? `${draft.slug}.veriworkly.com` : "Create your first draft"}
        icon={<Sparkles size={16} />}
      />
    </section>
  );
}
