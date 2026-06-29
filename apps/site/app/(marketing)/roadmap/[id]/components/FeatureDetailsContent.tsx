import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { RoadmapFeature } from "@/features/roadmap/services/roadmap-backend";

const FeatureDetailsContent = ({ feature }: { feature: RoadmapFeature }) => {
  const details = feature.details;

  if (!details) return null;

  const timeline = feature.timeline ?? details.timeline;
  const whyItMatters = feature.whyItMatters ?? details.whyItMatters;
  const overview = feature.fullDescription ?? details.fullDescription;

  return (
    <div className="mt-12 space-y-12">
      {overview && (
        <div className="space-y-3">
          <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-400 uppercase">
            Overview
          </h3>
          <p className="text-muted text-base leading-relaxed md:text-lg">{overview}</p>
        </div>
      )}

      {whyItMatters && (
        <div className="border-border/40 space-y-3 rounded-3xl border bg-linear-to-br from-blue-500/5 to-purple-500/5 p-6 md:p-8">
          <h3 className="text-foreground text-lg font-bold">Why It Matters</h3>
          <p className="text-muted text-base leading-relaxed">{whyItMatters}</p>
        </div>
      )}

      {(details.problem || details.solution) && (
        <div className="border-border/40 grid gap-8 border-t pt-10 md:grid-cols-2">
          {details.problem && (
            <div className="space-y-3">
              <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-400 uppercase">
                The Challenge
              </h3>
              <p className="text-muted leading-relaxed">{details.problem}</p>
            </div>
          )}

          {details.solution && (
            <div className="space-y-3">
              <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-400 uppercase">
                Our Resolution
              </h3>
              <p className="text-muted leading-relaxed">{details.solution}</p>
            </div>
          )}
        </div>
      )}

      {details.approach && (
        <div className="border-border/40 space-y-3 border-t pt-10">
          <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-400 uppercase">
            Implementation Approach
          </h3>
          <p className="text-muted leading-relaxed">{details.approach}</p>
        </div>
      )}

      {details.keyImprovements && details.keyImprovements.length > 0 && (
        <div className="border-border/40 space-y-4 border-t pt-10">
          <h3 className="text-foreground text-xl font-bold">Key Improvements</h3>

          <div className="grid gap-6 sm:grid-cols-2">
            {details.keyImprovements.map((improvement, index) => (
              <div key={index} className="flex gap-4">
                <span className="mt-0.5 shrink-0 font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                  {(index + 1).toString().padStart(2, "0")}
                </span>

                <p className="text-muted text-sm leading-relaxed">{improvement}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {details.beforeAfter && details.beforeAfter.length > 0 && (
        <div className="border-border/40 space-y-6 border-t pt-10">
          <h3 className="text-foreground text-xl font-bold">Before vs After</h3>

          <div className="space-y-6">
            {details.beforeAfter.map((item, index) => (
              <div key={index} className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 rounded-2xl border border-red-500/10 bg-red-500/5 p-5">
                  <span className="font-mono text-xs font-bold tracking-widest text-red-600 uppercase dark:text-red-400">
                    Legacy Experience
                  </span>
                  <p className="text-muted text-sm leading-relaxed">{item.before}</p>
                </div>

                <div className="space-y-2 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-5">
                  <span className="font-mono text-xs font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                    Optimized Experience
                  </span>
                  <p className="text-foreground text-sm leading-relaxed">{item.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {details.technicalHighlights && details.technicalHighlights.length > 0 && (
        <div className="border-border/40 space-y-4 border-t pt-10">
          <h3 className="text-foreground text-xl font-bold">Technical Highlights</h3>

          <ul className="grid list-none gap-4 sm:grid-cols-2">
            {details.technicalHighlights.map((highlight, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" />
                <p className="text-muted text-sm leading-relaxed">{highlight}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {details.items && details.items.length > 0 && (
        <div className="border-border/40 space-y-6 border-t pt-10">
          <h3 className="text-foreground text-xl font-bold">
            {feature.title === "7 Professional Templates"
              ? "Templates Included"
              : "Scope & Features"}
          </h3>

          <div className="grid gap-6 sm:grid-cols-2">
            {details.items.map((item, idx) => (
              <div
                key={idx}
                className="border-border/40 bg-card/20 flex flex-col justify-between space-y-4 rounded-2xl border p-6"
              >
                <div className="space-y-2">
                  <h4 className="text-foreground text-lg font-bold">{item.name}</h4>

                  {item.description && (
                    <p className="text-muted text-sm leading-relaxed">{item.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {details.media && details.media.length > 0 && (
        <div className="border-border/40 space-y-4 border-t pt-10">
          <h3 className="text-foreground text-xl font-bold">Related Resources</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {details.media.map((media, index) => (
              <div
                key={index}
                className="border-border/40 bg-card/20 flex flex-col items-start justify-between rounded-2xl border p-5"
              >
                <div className="space-y-1">
                  {media.label && (
                    <h4 className="text-foreground text-sm font-bold">{media.label}</h4>
                  )}
                  {media.type && (
                    <span className="text-muted block font-mono text-[10px] tracking-wider uppercase">
                      {media.type}
                    </span>
                  )}
                </div>

                {media.url && (
                  <Link
                    href={media.url}
                    className="group mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View Resource{" "}
                    <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {details.impactMetrics && details.impactMetrics.length > 0 && (
        <div className="border-border/40 space-y-4 border-t pt-10">
          <h3 className="text-foreground text-xl font-bold">Expected Impact</h3>

          <ul className="list-none space-y-3">
            {details.impactMetrics.map((metric, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 font-bold text-emerald-500">✓</span>
                <p className="text-muted text-sm leading-relaxed">{metric}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {timeline && (
        <div className="border-border/40 space-y-3 border-t pt-10">
          <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-400 uppercase">
            Milestone Timeline
          </h3>

          <div className="bg-foreground/5 border-border/30 rounded-2xl border p-5">
            <p className="text-muted text-sm leading-relaxed">{timeline}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureDetailsContent;
