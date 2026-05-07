import Link from "next/link";

import type { RoadmapFeature } from "@/features/roadmap/services/roadmap-backend";

import { Card } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

const statusLabels = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

const SuggestedItemsSidebar = ({
  currentStatus,
  suggestedItems,
}: {
  currentStatus: keyof typeof statusLabels;
  suggestedItems: RoadmapFeature[];
}) => {
  return (
    <div className="sticky top-20">
      <h3 className="text-foreground mb-4 text-lg font-semibold">
        More{" "}
        {currentStatus === "todo"
          ? "Planned"
          : currentStatus === "in-progress"
            ? "In Progress"
            : "Completed"}
      </h3>

      <div className="space-y-3">
        {suggestedItems.length === 0 ? (
          <Card>
            <p className="text-muted text-sm">No other items in this category</p>
          </Card>
        ) : (
          suggestedItems.map((item) => (
            <Link key={item.id} href={`/roadmap/${item.id}`} className="block">
              <Card className="cursor-pointer transition-all hover:shadow-md p-4!">
                <div className="space-y-2">
                  <h4 className="text-foreground line-clamp-2 font-semibold">{item.title}</h4>

                  <p className="text-muted line-clamp-2 text-xs">{item.description}</p>

                  {item.eta && <p className="text-muted text-xs font-medium">{item.eta}</p>}

                  {item.completedQuarter && (
                    <p className="text-muted text-xs font-medium">{item.completedQuarter}</p>
                  )}
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>

      <Link href={`/roadmap/${currentStatus}`} className="mt-6 block">
        <Button variant="secondary" className="w-full">
          View {statusLabels[currentStatus]}
        </Button>
      </Link>
    </div>
  );
};

export default SuggestedItemsSidebar;
