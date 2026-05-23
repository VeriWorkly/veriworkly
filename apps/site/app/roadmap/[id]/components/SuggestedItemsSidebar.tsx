import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { RoadmapFeature } from "@/features/roadmap/services/roadmap-backend";

import { Button } from "@veriworkly/ui";

const statusLabels = {
  todo: "Planned",
  "in-progress": "In Progress",
  done: "Completed",
};

const SuggestedItemsSidebar = ({
  currentStatus,
  suggestedItems,
}: {
  currentStatus: keyof typeof statusLabels;
  suggestedItems: RoadmapFeature[];
}) => {
  return (
    <div className="border-border/40 mt-16 space-y-8 border-t pt-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-foreground font-sans text-xl font-bold">
            More {statusLabels[currentStatus]} Features
          </h3>

          <p className="text-muted text-sm">
            Discover other initiatives and updates currently in the same development phase.
          </p>
        </div>

        <Link href={`/roadmap/${currentStatus}`} className="shrink-0">
          <Button
            variant="secondary"
            className="border-border/40 flex items-center gap-2 border px-5 py-3 text-xs font-bold tracking-widest uppercase"
          >
            View All {statusLabels[currentStatus]} <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>

      {suggestedItems.length === 0 ? (
        <div className="border-border/40 bg-card/20 rounded-2xl border p-8 text-center">
          <p className="text-muted text-sm">No other items in this status</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {suggestedItems.map((item) => (
            <Link
              key={item.id}
              href={`/roadmap/${item.id}`}
              className="group border-border/40 bg-card/10 hover:bg-card/30 block space-y-4 rounded-2xl border p-6 transition-all hover:shadow-[0_15px_40px_-20px_rgba(0,0,0,0.15)]"
            >
              <div className="space-y-2">
                <h4 className="text-foreground line-clamp-2 text-base leading-snug font-bold transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {item.title}
                </h4>

                <p className="text-muted line-clamp-2 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>

              {(item.eta || item.completedQuarter) && (
                <div className="border-border/20 flex items-center gap-2 border-t pt-2 font-mono text-[9px] font-bold tracking-wider text-zinc-400 uppercase">
                  {item.eta && <span>ETA: {item.eta}</span>}
                  {item.eta && item.completedQuarter && <span>•</span>}
                  {item.completedQuarter && <span>Released: {item.completedQuarter}</span>}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestedItemsSidebar;
