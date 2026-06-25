"use client";

import { useState } from "react";
import type { ResumeSectionId, ResumeSection } from "@/types/resume";
import { cn } from "@/lib/utils";

interface SectionVisibilitySettingsProps {
  onMove: (fromIndex: number, toIndex: number) => void;
  onToggle: (sectionId: ResumeSectionId, visible: boolean) => void;
  sections: ResumeSection[];
  /** When true, omit the section title (e.g. inside an accordion). */
  embedded?: boolean;
  isTwoColumn?: boolean;
  onUpdateSectionColumn?: (sectionId: ResumeSectionId, column: "left" | "right") => void;
}

const SectionVisibilitySettings = ({
  onMove,
  onToggle,
  sections,
  embedded = false,
  isTwoColumn = false,
  onUpdateSectionColumn,
}: SectionVisibilitySettingsProps) => {
  const sortedSections = sections.slice().sort((left, right) => left.order - right.order);
  const [draggedSectionId, setDraggedSectionId] = useState<ResumeSectionId | null>(null);

  const handleDropOnColumn = (targetColumn: "left" | "right") => {
    if (!draggedSectionId || !onUpdateSectionColumn) return;

    const section = sections.find((s) => s.id === draggedSectionId);
    if (!section || section.id === "basics" || section.id === "links") return;

    onUpdateSectionColumn(draggedSectionId, targetColumn);
    setDraggedSectionId(null);
  };

  const handleDropOnSection = (targetSectionId: ResumeSectionId) => {
    if (!draggedSectionId || draggedSectionId === targetSectionId) return;

    const targetSection = sections.find((s) => s.id === targetSectionId);
    if (!targetSection) return;

    const fromIndex = sortedSections.findIndex((s) => s.id === draggedSectionId);
    const toIndex = sortedSections.findIndex((s) => s.id === targetSectionId);

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex >= 2 && toIndex >= 2) {
      if (onUpdateSectionColumn) {
        onUpdateSectionColumn(draggedSectionId, targetSection.column || "left");
      }
      onMove(fromIndex, toIndex);
    }

    setDraggedSectionId(null);
  };

  const renderSectionCard = (section: ResumeSection) => {
    const index = sortedSections.findIndex((s) => s.id === section.id);
    const isLocked = section.id === "basics" || section.id === "links";

    return (
      <div
        key={section.id}
        draggable={!isLocked}
        onDragStart={() => !isLocked && setDraggedSectionId(section.id)}
        onDragEnd={() => setDraggedSectionId(null)}
        onDragOver={(e) => {
          if (!isLocked) e.preventDefault();
        }}
        onDrop={(e) => {
          e.stopPropagation();
          if (!isLocked) handleDropOnSection(section.id);
        }}
        className={cn(
          "border-border bg-card/85 flex items-center justify-between gap-2 rounded-xl border p-2 text-xs transition",
          draggedSectionId === section.id ? "opacity-40" : "",
          !isLocked ? "hover:border-accent/40 cursor-grab active:cursor-grabbing" : "",
        )}
      >
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
          <input
            checked={section.visible}
            className="accent-accent h-4 w-4 shrink-0 cursor-pointer rounded"
            onChange={(event) => onToggle(section.id, event.target.checked)}
            type="checkbox"
          />
          <span className="text-foreground/90 min-w-0 truncate font-semibold">{section.label}</span>
        </label>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Column Select Dropdown (visible in two column template) */}
          {isTwoColumn && !isLocked && onUpdateSectionColumn && (
            <select
              aria-label={`Column for ${section.label}`}
              value={section.column || "left"}
              onChange={(e) => {
                onUpdateSectionColumn(section.id, e.target.value as "left" | "right");
              }}
              className="border-border bg-background hover:bg-card text-foreground focus:ring-accent h-7 rounded-lg border px-1.5 text-[11px] font-medium focus:ring-1 focus:outline-none"
            >
              <option value="left">Col 1</option>
              <option value="right">Col 2</option>
            </select>
          )}

          {/* Position Select Dropdown */}
          {!isLocked && (
            <select
              aria-label={`Position for ${section.label}`}
              value={index + 1}
              onChange={(e) => {
                const targetPos = Number(e.target.value);
                onMove(index, targetPos - 1);
              }}
              className="border-border bg-background hover:bg-card text-foreground focus:ring-accent h-7 rounded-lg border px-1.5 text-[11px] font-medium focus:ring-1 focus:outline-none"
            >
              {sortedSections.map((_, idx) => {
                if (idx < 2) return null; // Skip locked basics/links
                return (
                  <option key={idx} value={idx + 1}>
                    {idx + 1}
                  </option>
                );
              })}
            </select>
          )}
        </div>
      </div>
    );
  };

  const leftSections = sortedSections.filter((s) => s.column !== "right");
  const rightSections = sortedSections.filter((s) => s.column === "right");

  return (
    <div className={embedded ? undefined : "border-border/70 border-b p-3"}>
      {!embedded && (
        <div className="mb-3">
          <p className="text-foreground text-sm font-semibold">Section visibility</p>
          <p className="text-muted text-xs">Show, hide, and reorder resume blocks.</p>
        </div>
      )}

      {isTwoColumn ? (
        <div className="space-y-3.5">
          <p className="text-muted text-[11px] leading-relaxed font-medium">
            Drag &amp; drop cards to reorder or move between columns. Or use dropdown selections.
          </p>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Column 1 (Left/Sidebar) */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnColumn("left")}
              className={cn(
                "border-border/60 bg-background/40 flex min-h-[220px] flex-col gap-2 rounded-2xl border p-2.5 transition-all",
                draggedSectionId ? "bg-accent/5 border-accent/40 border-dashed" : "",
              )}
            >
              <div className="border-border/40 mb-1 flex items-center justify-between border-b px-1 pb-1.5">
                <p className="text-foreground text-[10px] font-black tracking-wider uppercase">
                  Column 1
                </p>
                <span className="text-muted text-[9px] font-bold">
                  {leftSections.length} sections
                </span>
              </div>
              {leftSections.map((section) => renderSectionCard(section))}
            </div>

            {/* Column 2 (Right/Main) */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDropOnColumn("right")}
              className={cn(
                "border-border/60 bg-background/40 flex min-h-[220px] flex-col gap-2 rounded-2xl border p-2.5 transition-all",
                draggedSectionId ? "bg-accent/5 border-accent/40 border-dashed" : "",
              )}
            >
              <div className="border-border/40 mb-1 flex items-center justify-between border-b px-1 pb-1.5">
                <p className="text-foreground text-[10px] font-black tracking-wider uppercase">
                  Column 2
                </p>
                <span className="text-muted text-[9px] font-bold">
                  {rightSections.length} sections
                </span>
              </div>
              {rightSections.map((section) => renderSectionCard(section))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-1.5">
          {sortedSections.map((section) => renderSectionCard(section))}
        </div>
      )}
    </div>
  );
};

export default SectionVisibilitySettings;
