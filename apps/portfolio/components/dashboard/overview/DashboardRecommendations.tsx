import { MoveUpRight } from "lucide-react";
import { Task } from "./Task";

export interface DashboardRecommendationsProps {
  projectCount: number;
}

export function DashboardRecommendations({ projectCount }: DashboardRecommendationsProps) {
  return (
    <aside className="border-line bg-panel rounded-[2rem] border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted text-xs font-extrabold">This week</p>
          <h2 className="mt-1 text-lg font-black tracking-[-.04em]">Recommended next steps</h2>
        </div>
        <MoveUpRight size={16} className="text-accent" />
      </div>
      <div className="mt-5 space-y-1">
        <Task
          href="/editor"
          title={projectCount ? "Refine your strongest project" : "Add your first project"}
          detail="Clear proof gives visitors a reason to contact you."
        />
        <Task
          href="/settings"
          title="Review search preview"
          detail="Make the shared link explain what you do."
        />
        <Task
          href="/analytics"
          title="Check portfolio reach"
          detail="Review your recent view trend and referring sites."
        />
      </div>
    </aside>
  );
}
