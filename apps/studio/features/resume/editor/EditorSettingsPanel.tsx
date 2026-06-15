"use client";

import { memo, useState } from "react";

import type { FontFamilyId } from "@/features/documents/constants/fonts";

import { templateCatalogByType } from "@/features/documents/core/template-catalog";
import {
  DocumentTemplatePickerModal,
  DocumentTemplateSummary,
} from "@/features/documents/editor/DocumentTemplatePickerModal";

import AdvancedThemeSettings from "./settings/AdvancedThemeSettings";
import SectionVisibilitySettings from "./settings/SectionVisibilitySettings";
import { SettingsColor, SettingsRange, SettingsSelect } from "./settings/SettingControls";

import { fontOptions } from "@/features/documents/constants/fonts";
import { useResumeStore } from "@/features/resume/store/resume-store";
import { defaultResume } from "@/features/resume/constants/default-resume";

const EditorSettingsPanel = memo(function EditorSettingsPanel() {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  const sections = useResumeStore((state) => state.resume.sections);
  const templateId = useResumeStore((state) => state.resume.templateId);
  const customization = useResumeStore((state) => state.resume.customization);

  const setTemplateId = useResumeStore((state) => state.setTemplateId);
  const reorderSections = useResumeStore((state) => state.reorderSections);
  const updateCustomization = useResumeStore((state) => state.updateCustomization);
  const setSectionVisibility = useResumeStore((state) => state.setSectionVisibility);

  const selectedTemplate = templateCatalogByType.RESUME.find(
    (template) => template.id === templateId,
  );

  return (
    <div>
      <div className="border-border/70 border-b p-3">
        <p className="text-foreground text-base font-semibold">Design controls</p>
        <p className="text-muted text-sm">Template, spacing, typography, and visibility.</p>
      </div>

      <DocumentTemplateSummary
        activeTemplate={selectedTemplate}
        onOpen={() => setTemplateModalOpen(true)}
      />

      <div className="space-y-4 border-b p-3">
        <SettingsSelect
          label="Font style"
          value={customization.fontFamily}
          onChange={(event) =>
            updateCustomization({
              fontFamily: event.target.value as FontFamilyId,
            })
          }
        >
          {fontOptions.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </SettingsSelect>

        <SettingsRange
          min={0}
          max={44}
          value={customization.sectionSpacing}
          label={`Section gap (${customization.sectionSpacing}px)`}
          onChange={(event) =>
            updateCustomization({
              sectionSpacing: Number(event.target.value),
            })
          }
        />

        <SettingsRange
          max={52}
          min={16}
          value={customization.pagePadding}
          label={`Page margin (${customization.pagePadding}px)`}
          onChange={(event) =>
            updateCustomization({
              pagePadding: Number(event.target.value),
            })
          }
        />

        <SettingsRange
          min={1}
          max={2}
          step={0.05}
          value={customization.bodyLineHeight}
          label={`Body line-height (${customization.bodyLineHeight.toFixed(2)})`}
          onChange={(event) =>
            updateCustomization({
              bodyLineHeight: Number(event.target.value),
            })
          }
        />

        <SettingsColor
          label="Accent color"
          value={customization.accentColor}
          onChange={(event) =>
            updateCustomization({
              accentColor: event.target.value,
            })
          }
        />
      </div>

      <AdvancedThemeSettings
        advancedOpen={advancedOpen}
        customization={customization}
        onUpdateCustomization={updateCustomization}
        onToggleOpen={() => setAdvancedOpen((isOpen) => !isOpen)}
        onResetThemeDefaults={() => updateCustomization({ ...defaultResume.customization })}
      />

      <SectionVisibilitySettings
        sections={sections}
        onMove={reorderSections}
        onToggle={setSectionVisibility}
      />

      <DocumentTemplatePickerModal
        open={templateModalOpen}
        onChange={setTemplateId}
        activeTemplateId={templateId}
        description="Choose a resume layout."
        templates={templateCatalogByType.RESUME}
        onClose={() => setTemplateModalOpen(false)}
      />
    </div>
  );
});

export default EditorSettingsPanel;
