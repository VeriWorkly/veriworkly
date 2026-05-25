"use client";

import type { ResumeSectionId, ResumeSection } from "@/types/resume";

interface SectionVisibilitySettingsProps {
  onToggle: (sectionId: ResumeSectionId, visible: boolean) => void;
  sections: ResumeSection[];
}

const SectionVisibilitySettings = ({ onToggle, sections }: SectionVisibilitySettingsProps) => {
  return (
    <div className="space-y-3">
      <p className="text-muted text-xs font-semibold tracking-[0.22em] uppercase">
        Section visibility
      </p>

      <div className="grid grid-cols-2 gap-2">
        {sections.map((section) => (
          <label
            className="border-border bg-background flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm"
            key={section.id}
          >
            <input
              checked={section.visible}
              className="accent-accent h-4 w-4"
              onChange={(event) => onToggle(section.id, event.target.checked)}
              type="checkbox"
            />

            <span>{section.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default SectionVisibilitySettings;
