import Link from "next/link";
import { Calendar, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { KanbanItem } from "./KanbanBoard";

const tagDotMap: Record<string, string> = {
  core: "bg-purple-500",
  ai: "bg-blue-500",
  "ai-assisted": "bg-blue-500",
  export: "bg-green-500",
  import: "bg-pink-500",
  integration: "bg-indigo-500",
  templates: "bg-cyan-500",
  privacy: "bg-red-500",
  ux: "bg-yellow-500",
  ui: "bg-yellow-500",
  testing: "bg-orange-500",
  cicd: "bg-teal-500",
  ats: "bg-violet-500",
  analysis: "bg-violet-500",
  personalization: "bg-fuchsia-500",
  format: "bg-lime-500",
  i18n: "bg-rose-500",
  content: "bg-amber-500",
  research: "bg-slate-500",
  design: "bg-pink-500",
  done: "bg-emerald-500",
  product: "bg-sky-500",
  docs: "bg-lime-500",
  platform: "bg-yellow-500",
  api: "bg-cyan-500",
  admin: "bg-rose-500",
  editor: "bg-indigo-500",
  blog: "bg-orange-500",
  security: "bg-red-500",
  auth: "bg-violet-500",
  performance: "bg-amber-500",
  billing: "bg-emerald-500",
  database: "bg-pink-500",
  seo: "bg-teal-500",
  infrastructure: "bg-lime-500",
  accessibility: "bg-fuchsia-500",
};

const KanbanItemCard = ({
  item,
  showDescription,
  showUrl,
  showRoadmapLinks,
}: {
  item: KanbanItem;
  showDescription: boolean;
  showUrl: boolean;
  showRoadmapLinks: boolean;
}) => {
  const isInteractive = (showUrl && item.url) || showRoadmapLinks;

  const cardContent = (
    <div
      className={cn(
        "group border-border/50 bg-card relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 ease-out",
        "shadow-[0_1px_3px_rgba(0,0,0,0.02),0_1px_2px_rgba(0,0,0,0.04)]",
        isInteractive
          ? "hover:border-accent/40 cursor-pointer hover:-translate-y-1 hover:shadow-[0_10px_20px_-10px_rgba(37,99,235,0.08),0_1px_5px_rgba(37,99,235,0.04)]"
          : "cursor-default",
      )}
      style={{
        background: `linear-gradient(145deg, var(--card) 92%, rgba(23,23,23,0.02) 100%)`,
      }}
    >
      {isInteractive && (
        <div className="bg-accent/80 absolute top-0 right-0 left-0 h-[2px] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-foreground group-hover:text-accent font-sans text-sm leading-snug font-bold transition-colors">
            {item.title}
          </h4>

          {isInteractive && (
            <ArrowUpRight className="text-muted/60 group-hover:text-accent h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          )}
        </div>

        {showDescription && item.description && (
          <p className="text-muted line-clamp-3 text-xs leading-relaxed">{item.description}</p>
        )}

        {(item.eta || item.status === "done" || (item.tags && item.tags.length > 0)) && (
          <div className="bg-border/40 h-px" />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          {item.eta ? (
            <div className="text-muted flex items-center gap-1.5">
              <Calendar className="text-muted/60 h-3.5 w-3.5" />

              <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
                ETA: {item.eta}
              </span>
            </div>
          ) : item.status === "done" ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <svg
                className="h-3.5 w-3.5 text-emerald-500/80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>

              <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
                {item.completedQuarter
                  ? `Shipped: ${item.completedQuarter}`
                  : item.completedAt
                    ? `Shipped: ${new Date(item.completedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                    : "Shipped"}
              </span>
            </div>
          ) : (
            <div />
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.slice(0, 2).map((tag) => {
                const dotColor = tagDotMap[tag.toLowerCase()] || "bg-muted";
                return (
                  <span
                    key={tag}
                    className="border-border/40 bg-muted/10 text-muted/90 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold tracking-wider uppercase"
                  >
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor)} />
                    {tag}
                  </span>
                );
              })}

              {item.tags.length > 2 && (
                <span className="border-border/40 bg-muted/10 text-muted/60 inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-bold">
                  +{item.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (showRoadmapLinks) return <Link href={`/roadmap/${item.id}`}>{cardContent}</Link>;

  if (showUrl && item.url) {
    return (
      <a href={item.url} target="_blank" rel="noopener noreferrer">
        {cardContent}
      </a>
    );
  }

  return cardContent;
};

export default KanbanItemCard;
