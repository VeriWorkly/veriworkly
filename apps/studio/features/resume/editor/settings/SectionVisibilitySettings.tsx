"use client";

import { useState } from "react";
import type { ResumeSection } from "@/types/resume";
import { getResumeSectionKey } from "@/features/documents/rendering/resume-rendering";
import { cn } from "@/lib/utils";

/*
 * Every callback here takes a section KEY (see `getResumeSectionKey`), not a section id.
 * Custom sections all report the id "custom", so an id-keyed toggle hid or showed every one
 * of them at once and an id-keyed lookup always resolved to the first.
 */
interface SectionVisibilitySettingsProps {
  onMove: (fromIndex: number, toIndex: number) => void;
  onToggle: (sectionKey: string, visible: boolean) => void;
  sections: ResumeSection[];
  /** When true, omit the section title (e.g. inside an accordion). */
  embedded?: boolean;
  isTwoColumn?: boolean;
  onUpdateSectionColumn?: (sectionKey: string, column: "left" | "right") => void;
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
  const [draggedSectionKey, setDraggedSectionKey] = useState<string | null>(null);

  const findByKey = (key: string) => sections.find((s) => getResumeSectionKey(s) === key);

  const handleDropOnColumn = (targetColumn: "left" | "right") => {
    if (!draggedSectionKey || !onUpdateSectionColumn) return;

    const section = findByKey(draggedSectionKey);
    if (!section || section.id === "basics" || section.id === "links") return;

    onUpdateSectionColumn(draggedSectionKey, targetColumn);
    setDraggedSectionKey(null);
  };

  const handleDropOnSection = (targetSectionKey: string) => {
    if (!draggedSectionKey || draggedSectionKey === targetSectionKey) return;

    const targetSection = findByKey(targetSectionKey);
    if (!targetSection) return;

    const fromIndex = sortedSections.findIndex((s) => getResumeSectionKey(s) === draggedSectionKey);
    const toIndex = sortedSections.findIndex((s) => getResumeSectionKey(s) === targetSectionKey);

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex >= 2 && toIndex >= 2) {
      if (onUpdateSectionColumn) {
        onUpdateSectionColumn(draggedSectionKey, targetSection.column || "left");
      }
      onMove(fromIndex, toIndex);
    }

    setDraggedSectionKey(null);
  };

  const renderSectionCard = (section: ResumeSection) => {
    const sectionKey = getResumeSectionKey(section);
    const index = sortedSections.findIndex((s) => getResumeSectionKey(s) === sectionKey);
    const isLocked = section.id === "basics" || section.id === "links";

    return (
      <div
        key={sectionKey}
        draggable={!isLocked}
        onDragStart={() => !isLocked && setDraggedSectionKey(sectionKey)}
        onDragEnd={() => setDraggedSectionKey(null)}
        onDragOver={(e) => {
          if (!isLocked) e.preventDefault();
        }}
        onDrop={(e) => {
          e.stopPropagation();
          if (!isLocked) handleDropOnSection(sectionKey);
        }}
        className={cn(
          "border-border bg-card/85 flex items-center justify-between gap-2 rounded-xl border p-2 text-xs transition",
          draggedSectionKey === sectionKey ? "opacity-40" : "",
          !isLocked ? "hover:border-accent/40 cursor-grab active:cursor-grabbing" : "",
        )}
      >
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
          <input
            checked={section.visible}
            className="accent-accent h-4 w-4 shrink-0 cursor-pointer rounded"
            onChange={(event) => onToggle(sectionKey, event.target.checked)}
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
                onUpdateSectionColumn(sectionKey, e.target.value as "left" | "right");
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
                draggedSectionKey ? "bg-accent/5 border-accent/40 border-dashed" : "",
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
                draggedSectionKey ? "bg-accent/5 border-accent/40 border-dashed" : "",
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
