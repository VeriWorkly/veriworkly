import { type RoadmapSectionResponse } from "@/features/roadmap/services/roadmap-backend";

const statusDots = {
  todo: "bg-blue-500",
  "in-progress": "bg-amber-500 animate-pulse",
  done: "bg-emerald-500",
};

const RoadmapStatsGrid = ({ sections }: { sections: RoadmapSectionResponse[] }) => {
  return (
    <div className="mb-10 grid gap-4 sm:grid-cols-3">
      {sections.map((section) => (
        <div
          key={section.status}
          className="group border-border/40 bg-card/30 hover:border-border/60 hover:bg-card/50 relative overflow-hidden rounded-2xl border p-5 shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-300"
        >
          <div className="flex items-center justify-between">
            <span className="text-muted font-mono text-[10px] font-bold tracking-wider uppercase">
              {section.title}
            </span>

            <span
              className={`h-1.5 w-1.5 rounded-full ${statusDots[section.status as keyof typeof statusDots] || "bg-muted"}`}
            />
          </div>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-foreground font-sans text-3xl font-bold tracking-tight tabular-nums">
              {section.items.length}
            </span>

            <span className="text-muted/80 font-mono text-[10px] tracking-wider uppercase">
              items
            </span>
          </div>

          <div className="text-muted/60 border-border/20 mt-3 flex items-center justify-between border-t pt-2.5 font-mono text-[9px]">
            <span>Synchronized</span>

            <span>
              {new Date(section.fetchedAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RoadmapStatsGrid;
