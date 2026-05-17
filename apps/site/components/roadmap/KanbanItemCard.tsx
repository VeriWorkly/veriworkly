import Link from "next/link";

import { cn } from "@/lib/utils";

import { Card, Badge } from "@veriworkly/ui";

import { KanbanItem } from "./KanbanBoard";
import { tagColorMap } from "./KanbanTagColor";

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
        "cursor-default px-6 py-4 transition-all hover:shadow-lg",
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
                className={tagColorMap[tag] || "bg-blue-500/10 text-blue-700 dark:text-blue-300"}
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
