"use client";

import { useState } from "react";

import type { FontFamilyId } from "@/features/documents/constants/fonts";

import { templateSummaries } from "@/config/templates";

import AdvancedThemeSettings from "./settings/AdvancedThemeSettings";
import SectionVisibilitySettings from "./settings/SectionVisibilitySettings";
import { SettingsColor, SettingsRange, SettingsSelect } from "./settings/SettingControls";

import { useResume } from "@/features/resume/hooks/use-resume";
import { fontOptions } from "@/features/documents/constants/fonts";
import { defaultResume } from "@/features/resume/constants/default-resume";

const EditorSettingsPanel = () => {
  const { resume, setSectionVisibility, setTemplateId, updateCustomization } = useResume();

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
        value={resume.templateId}
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
        value={resume.customization.fontFamily}
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
        label={`Section gap (${resume.customization.sectionSpacing}px)`}
        onChange={(event) =>
          updateCustomization({
            sectionSpacing: Number(event.target.value),
          })
        }
        value={resume.customization.sectionSpacing}
      />

      <SettingsRange
        max={52}
        min={16}
        label={`Page margin (${resume.customization.pagePadding}px)`}
        onChange={(event) =>
          updateCustomization({
            pagePadding: Number(event.target.value),
          })
        }
        value={resume.customization.pagePadding}
      />

      <SettingsColor
        label="Accent color"
        value={resume.customization.accentColor}
        onChange={(event) =>
          updateCustomization({
            accentColor: event.target.value,
          })
        }
      />

      <AdvancedThemeSettings
        advancedOpen={advancedOpen}
        customization={resume.customization}
        onUpdateCustomization={updateCustomization}
        onResetThemeDefaults={() => updateCustomization({ ...defaultResume.customization })}
        onToggleOpen={() => setAdvancedOpen((isOpen) => !isOpen)}
      />

      <SectionVisibilitySettings sections={resume.sections} onToggle={setSectionVisibility} />
    </div>
  );
};

export default EditorSettingsPanel;
