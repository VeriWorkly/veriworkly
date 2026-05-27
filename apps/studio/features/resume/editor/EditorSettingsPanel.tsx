"use client";

import { memo, useState } from "react";

import type { FontFamilyId } from "@/features/documents/constants/fonts";

import { templateSummaries } from "@/config/templates";

import AdvancedThemeSettings from "./settings/AdvancedThemeSettings";
import SectionVisibilitySettings from "./settings/SectionVisibilitySettings";
import { SettingsColor, SettingsRange, SettingsSelect } from "./settings/SettingControls";

import { fontOptions } from "@/features/documents/constants/fonts";
import { useResumeStore } from "@/features/resume/store/resume-store";
import { defaultResume } from "@/features/resume/constants/default-resume";

const EditorSettingsPanel = memo(function EditorSettingsPanel() {
  const sections = useResumeStore((state) => state.resume.sections);
  const templateId = useResumeStore((state) => state.resume.templateId);
  const customization = useResumeStore((state) => state.resume.customization);
  const setSectionVisibility = useResumeStore((state) => state.setSectionVisibility);
  const setTemplateId = useResumeStore((state) => state.setTemplateId);
  const updateCustomization = useResumeStore((state) => state.updateCustomization);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-muted text-xs font-semibold tracking-[0.22em] uppercase">
          Styles & Settings
        </p>

        <h2 className="text-foreground text-xl font-semibold">Design controls</h2>
      </div>

      <SettingsSelect
        label="Template"
        value={templateId}
        onChange={(event) => setTemplateId(event.target.value)}
      >
        {templateSummaries.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
          </option>
        ))}
      </SettingsSelect>

      <SettingsSelect
        label="Font style"
        onChange={(event) =>
          updateCustomization({
            fontFamily: event.target.value as FontFamilyId,
          })
        }
        value={customization.fontFamily}
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
        label={`Section gap (${customization.sectionSpacing}px)`}
        onChange={(event) =>
          updateCustomization({
            sectionSpacing: Number(event.target.value),
          })
        }
        value={customization.sectionSpacing}
      />

      <SettingsRange
        max={52}
        min={16}
        label={`Page margin (${customization.pagePadding}px)`}
        onChange={(event) =>
          updateCustomization({
            pagePadding: Number(event.target.value),
          })
        }
        value={customization.pagePadding}
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

      <AdvancedThemeSettings
        advancedOpen={advancedOpen}
        customization={customization}
        onUpdateCustomization={updateCustomization}
        onResetThemeDefaults={() => updateCustomization({ ...defaultResume.customization })}
        onToggleOpen={() => setAdvancedOpen((isOpen) => !isOpen)}
      />

      <SectionVisibilitySettings sections={sections} onToggle={setSectionVisibility} />
    </div>
  );
});

export default EditorSettingsPanel;
