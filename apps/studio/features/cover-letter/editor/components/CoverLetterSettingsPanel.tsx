"use client";

import { useMemo, useState } from "react";

import type {
  CoverLetterContent,
  CoverLetterSectionId,
  CoverLetterAppearance,
} from "@/features/cover-letter/types";
import type { BaseDocument } from "@/features/documents/core/types";
import type { FontFamilyId } from "@/features/documents/constants/fonts";

import {
  SettingsColor,
  SettingsRange,
  SettingsSelect,
} from "@/features/resume/editor/settings/SettingControls";
import {
  DocumentTemplateSummary,
  DocumentTemplatePickerModal,
} from "@/features/documents/editor/DocumentTemplatePickerModal";
import { fontOptions } from "@/features/documents/constants/fonts";
import { templateCatalogByType } from "@/features/documents/core/template-catalog";

interface CoverLetterSettingsPanelProps {
  document: BaseDocument<CoverLetterContent>;
  appearance: CoverLetterAppearance;
  onUpdateDocument: (
    next: BaseDocument<CoverLetterContent>,
    options?: { debounceMs?: number; flush?: boolean },
  ) => void;
  onUpdateAppearance: (patch: Partial<CoverLetterAppearance>) => void;
}

export function CoverLetterSettingsPanel({
  document,
  appearance,
  onUpdateDocument,
  onUpdateAppearance,
}: CoverLetterSettingsPanelProps) {
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const activeTemplate = templateCatalogByType.COVER_LETTER.find(
    (template) => template.id === document.templateId,
  );
  const hiddenSections = useMemo(
    () => appearance.hiddenSections ?? [],
    [appearance.hiddenSections],
  );

  function updateTemplate(templateId: string) {
    onUpdateDocument({
      ...document,
      templateId,
      updatedAt: new Date().toISOString(),
    });
  }

  function setSectionVisibility(sectionId: CoverLetterSectionId, visible: boolean) {
    onUpdateAppearance({
      hiddenSections: visible
        ? hiddenSections.filter((id) => id !== sectionId)
        : Array.from(new Set([...hiddenSections, sectionId])),
    });
  }

  return (
    <div>
      <div className="border-border/70 border-b p-3">
        <p className="text-foreground text-base font-semibold">Design controls</p>
        <p className="text-muted text-sm">Template, spacing, typography, and visibility.</p>
      </div>

      <DocumentTemplateSummary
        activeTemplate={activeTemplate}
        onOpen={() => setTemplateModalOpen(true)}
      />

      <div className="space-y-4 border-b p-3">
        <SettingsSelect
          label="Font style"
          value={appearance.fontFamily}
          onChange={(event) =>
            onUpdateAppearance({ fontFamily: event.target.value as FontFamilyId })
          }
        >
          {fontOptions.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </SettingsSelect>

        <SettingsRange
          min={24}
          max={72}
          value={appearance.pageMargin}
          label={`Page margin (${appearance.pageMargin}px)`}
          onChange={(event) => onUpdateAppearance({ pageMargin: Number(event.target.value) })}
        />

        <SettingsRange
          min={4}
          max={24}
          value={appearance.paragraphSpacing}
          label={`Paragraph gap (${appearance.paragraphSpacing}px)`}
          onChange={(event) => onUpdateAppearance({ paragraphSpacing: Number(event.target.value) })}
        />

        <SettingsRange
          min={1.25}
          max={1.8}
          step={0.05}
          value={appearance.lineHeight}
          label={`Line height (${appearance.lineHeight.toFixed(2)})`}
          onChange={(event) => onUpdateAppearance({ lineHeight: Number(event.target.value) })}
        />
      </div>

      <div className="space-y-4 border-b p-3">
        <SettingsColor
          label="Accent color"
          value={appearance.accentColor}
          onChange={(event) => onUpdateAppearance({ accentColor: event.target.value })}
        />

        <SettingsColor
          label="Sidebar color"
          value={appearance.sidebarColor}
          onChange={(event) => onUpdateAppearance({ sidebarColor: event.target.value })}
        />

        <SettingsColor
          label="Page color"
          value={appearance.pageColor}
          onChange={(event) => onUpdateAppearance({ pageColor: event.target.value })}
        />

        <SettingsColor
          label="Text color"
          value={appearance.textColor}
          onChange={(event) => onUpdateAppearance({ textColor: event.target.value })}
        />
      </div>

      <div className="border-border/70 border-b p-3">
        <div className="mb-3">
          <p className="text-foreground text-sm font-semibold">Section visibility</p>
          <p className="text-muted text-xs">Show or hide cover letter blocks.</p>
        </div>

        <div className="grid gap-1.5">
          {COVER_LETTER_SECTIONS.map((section) => (
            <label
              className="border-border bg-background/70 flex items-center gap-3 rounded-xl border px-3 py-2 text-sm transition"
              key={section.id}
            >
              <input
                checked={!hiddenSections.includes(section.id)}
                className="accent-accent h-4 w-4"
                onChange={(event) => setSectionVisibility(section.id, event.target.checked)}
                type="checkbox"
              />

              <span className="min-w-0 truncate">{section.label}</span>
            </label>
          ))}
        </div>
      </div>

      <DocumentTemplatePickerModal
        activeTemplateId={document.templateId}
        description="Choose a cover letter layout."
        onChange={updateTemplate}
        onClose={() => setTemplateModalOpen(false)}
        open={templateModalOpen}
        templates={templateCatalogByType.COVER_LETTER}
      />
    </div>
  );
}

const COVER_LETTER_SECTIONS: Array<{ id: CoverLetterSectionId; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "links", label: "Links" },
  { id: "target", label: "Target" },
  { id: "letter", label: "Letter" },
];
