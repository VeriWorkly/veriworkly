"use client";

import type { ResumeSectionId, ResumeSection } from "@/types/resume";

import { ArrowDown, ArrowUp } from "lucide-react";

interface SectionVisibilitySettingsProps {
  onMove: (fromIndex: number, toIndex: number) => void;
  onToggle: (sectionId: ResumeSectionId, visible: boolean) => void;
  sections: ResumeSection[];
  /** When true, omit the section title (e.g. inside an accordion). */
  embedded?: boolean;
}

const SectionVisibilitySettings = ({
  onMove,
  onToggle,
  sections,
  embedded = false,
}: SectionVisibilitySettingsProps) => {
  const sortedSections = sections.slice().sort((left, right) => left.order - right.order);

  return (
    <div className={embedded ? undefined : "border-border/70 border-b p-3"}>
      {!embedded && (
        <div className="mb-3">
          <p className="text-foreground text-sm font-semibold">Section visibility</p>
          <p className="text-muted text-xs">Show, hide, and reorder resume blocks.</p>
        </div>
      )}

      <div className="grid gap-1.5">
        {sortedSections.map((section, index) => (
          <div
            className="border-border bg-background/70 flex items-center gap-2 rounded-xl border px-2 py-2 text-sm transition"
            key={section.id}
          >
            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label={`Move ${section.label} up`}
                className="text-muted hover:bg-card hover:text-foreground grid h-7 w-7 place-items-center rounded-lg transition disabled:opacity-35"
                disabled={index === 0}
                onClick={() => onMove(index, index - 1)}
                type="button"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                aria-label={`Move ${section.label} down`}
                className="text-muted hover:bg-card hover:text-foreground grid h-7 w-7 place-items-center rounded-lg transition disabled:opacity-35"
                disabled={index === sortedSections.length - 1}
                onClick={() => onMove(index, index + 1)}
                type="button"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <label className="flex min-w-0 flex-1 items-center gap-3">
              <input
                checked={section.visible}
                className="accent-accent h-4 w-4"
                onChange={(event) => onToggle(section.id, event.target.checked)}
                type="checkbox"
              />

              <span className="min-w-0 truncate">{section.label}</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionVisibilitySettings;
