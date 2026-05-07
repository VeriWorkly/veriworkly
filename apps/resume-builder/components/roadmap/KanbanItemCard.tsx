import Link from "next/link";

import { cn } from "@/lib/utils";

import { Card } from "@veriworkly/ui";
import { Badge } from "@veriworkly/ui";

import { KanbanItem } from "./KanbanBoard";

const tagColorMap: Record<string, string> = {
  core: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  ai: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "ai-assisted": "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  export: "bg-green-500/10 text-green-700 dark:text-green-300",
  import: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
  integration: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  templates: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  privacy: "bg-red-500/10 text-red-700 dark:text-red-300",
  ux: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  ui: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  testing: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  cicd: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  ats: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  analysis: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  personalization: "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
  format: "bg-lime-500/10 text-lime-700 dark:text-lime-300",
  i18n: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  content: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  research: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  design: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
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
  const cardContent = (
    <Card
      className={cn(
        "cursor-default transition-all hover:shadow-lg py-4 px-6",
        (showUrl && item.url) || showRoadmapLinks ? "cursor-pointer" : "",
      )}
    >
      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-foreground leading-tight font-semibold">{item.title}</h4>

          {item.eta && <p className="text-muted mt-1 text-xs">ETA: {item.eta}</p>}

          {!item.eta && item.status === "done" && (
            <p className="text-muted mt-1 text-xs">
              {item.completedQuarter
                ? `Shipped: ${item.completedQuarter}`
                : item.completedAt
                  ? `Completed: ${new Date(item.completedAt).toLocaleDateString()}`
                  : "Shipped"}
            </p>
          )}
        </div>

        {showDescription && item.description && (
          <p className="text-muted text-sm leading-relaxed">{item.description}</p>
        )}

        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 capitalize">
            {item.tags.map((tag) => (
              <Badge
                key={tag}
                className={tagColorMap[tag] || "bg-gray-500/10 text-gray-700 dark:text-gray-300"}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );

  if (showRoadmapLinks) {
    return <Link href={`/roadmap/${item.id}`}>{cardContent}</Link>;
  }

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
