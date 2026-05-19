"use client";

import { ArrowUp, Circle, Compass } from "lucide-react";

import type { CountKey, MasterSectionNavItem } from "./master-section-nav";

import { Card } from "@veriworkly/ui";

import { cn } from "@/lib/utils";

type SectionCounts = Record<CountKey, number>;

type MasterProfileNavigatorProps = {
  sections: MasterSectionNavItem[];
  activeSectionId: string;
  activeSectionIndex: number;
  sourceLabel: string;
  updatedAt: string | null;
  sectionCounts: SectionCounts;
  onNavigate: (sectionId: string) => void;
};

export function MasterProfileNavigator({
  sections,
  activeSectionId,
  activeSectionIndex,
  sourceLabel,
  updatedAt,
  sectionCounts,
  onNavigate,
}: MasterProfileNavigatorProps) {
  return (
    <aside className="relative xl:col-span-3">
      <div className="sticky top-8">
        <Card className="border-dashed bg-zinc-500/5 p-4">
          <header className="mb-4 flex items-center gap-2">
            <Compass className="text-accent h-4 w-4" />

            <h2 className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">
              Navigator
            </h2>
          </header>

          <div className="mb-6 space-y-2 border-b border-dashed pb-4 text-[11px]">
            <StatRow label="Source" value={sourceLabel} />
            <StatRow
              isMono
              label="Updated"
              value={updatedAt ? new Date(updatedAt).toLocaleDateString() : "New"}
            />
            <StatRow label="Progress" value={`${activeSectionIndex + 1} / ${sections.length}`} />
          </div>

          <nav className="custom-scrollbar max-h-[50vh] space-y-1 overflow-y-auto pr-1">
            {sections.map((section) => (
              <NavButton
                key={section.id}
                section={section}
                isActive={activeSectionId === section.id}
                count={section.countKey ? sectionCounts[section.countKey] : undefined}
                onClick={() => onNavigate(section.id)}
              />
            ))}
          </nav>

          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/5 mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-2 text-xs font-bold transition-all"
          >
            <ArrowUp className="h-3.5 w-3.5" /> Back to top
          </button>
        </Card>
      </div>
    </aside>
  );
}

export function MasterMobileSectionNav({
  sections,
  activeSectionId,
  onNavigate,
}: {
  sections: MasterSectionNavItem[];
  activeSectionId: string;
  onNavigate: (sectionId: string) => void;
}) {
  return (
    <div className="bg-background/80 sticky top-18 z-30 -mx-4 mb-6 border-y px-4 py-3 backdrop-blur-md xl:hidden">
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onNavigate(section.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium whitespace-nowrap transition",
              activeSectionId === section.id
                ? "bg-accent text-white"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const StatRow = ({ label, value, isMono }: { label: string; value: string; isMono?: boolean }) => (
  <div className="flex justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className={cn("font-semibold", isMono && "font-mono")}>{value}</span>
  </div>
);

function NavButton({
  section,
  isActive,
  count,
  onClick,
}: {
  section: MasterSectionNavItem;
  isActive: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all",
        isActive
          ? "bg-accent/10 text-accent font-bold"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      <Circle
        className={cn(
          "h-2 w-2 transition-transform",
          isActive ? "scale-125 fill-current" : "opacity-40",
        )}
      />

      <span className="flex-1 truncate">{section.label}</span>

      {count !== undefined && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[9px]",
            count > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-zinc-500/10 text-zinc-500",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
