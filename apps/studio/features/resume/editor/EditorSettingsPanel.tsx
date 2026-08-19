"use client";

import { memo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@veriworkly/ui";

import type { FontFamilyId } from "@/features/documents/constants/fonts";

import { templateCatalogByType } from "@/features/documents/core/template-catalog";
import {
  DocumentTemplatePickerModal,
  DocumentTemplateSummary,
} from "@/features/documents/editor/DocumentTemplatePickerModal";

import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import SectionVisibilitySettings from "./settings/SectionVisibilitySettings";
import {
  SettingsColor,
  SettingsRange,
  SettingsSelect,
} from "@/features/documents/editor/settings/SettingControls";

import { fontOptions } from "@/features/documents/constants/fonts";
import { useResumeStore } from "@/features/resume/store/resume-store";
import { defaultResume } from "@/features/resume/constants/default-resume";

type SettingsSectionId = "typography" | "colors" | "visibility";

const EditorSettingsPanel = memo(function EditorSettingsPanel() {
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [openSection, setOpenSection] = useState<SettingsSectionId | null>("typography");

  const sections = useResumeStore((state) => state.resume.sections);
  const templateId = useResumeStore((state) => state.resume.templateId);
  const customization = useResumeStore((state) => state.resume.customization);

  const setTemplateId = useResumeStore((state) => state.setTemplateId);
  const reorderSections = useResumeStore((state) => state.reorderSections);
  const updateCustomization = useResumeStore((state) => state.updateCustomization);
  const setSectionVisibility = useResumeStore((state) => state.setSectionVisibility);
  const updateSectionColumn = useResumeStore((state) => state.updateSectionColumn);

  const selectedTemplate = templateCatalogByType.RESUME.find(
    (template) => template.id === templateId,
  );

  const isTwoColumnTemplate = !!selectedTemplate?.tags.includes("Two columns");

  const handleToggle = (section: string) => {
    setOpenSection((curr) => (curr === section ? null : (section as SettingsSectionId)));
  };

  return (
    <div>
      <div className="border-border/70 border-b p-3">
        <p className="text-foreground text-base font-semibold">Design controls</p>
        <p className="text-muted text-sm">Template, spacing, typography, and visibility.</p>
      </div>

      {/* Always visible — not inside accordion */}
      <DocumentTemplateSummary
        activeTemplate={selectedTemplate}
        onOpen={() => setTemplateModalOpen(true)}
      />

      <div className="flex flex-col">
        <SectionAccordion
          label="Typography & Spacing"
          isOpen={openSection === "typography"}
          id="typography"
          onToggle={handleToggle}
        >
          <div className="text-foreground space-y-4">
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
          </div>
        </SectionAccordion>

        <SectionAccordion
          label="Color Theme"
          isOpen={openSection === "colors"}
          id="colors"
          onToggle={handleToggle}
        >
          <div className="text-foreground space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingsColor
                compact
                label="Accent color"
                value={customization.accentColor}
                onChange={(event) =>
                  updateCustomization({
                    accentColor: event.target.value,
                  })
                }
              />

              <SettingsColor
                compact
                label="Border color"
                onChange={(event) => updateCustomization({ borderColor: event.target.value })}
                value={customization.borderColor}
              />

              <SettingsColor
                compact
                label="Text color"
                onChange={(event) => updateCustomization({ textColor: event.target.value })}
                value={customization.textColor}
              />

              <SettingsColor
                compact
                label="Muted text color"
                onChange={(event) => updateCustomization({ mutedTextColor: event.target.value })}
                value={customization.mutedTextColor}
              />

              <SettingsColor
                compact
                label="Page background"
                onChange={(event) =>
                  updateCustomization({ pageBackgroundColor: event.target.value })
                }
                value={customization.pageBackgroundColor}
              />

              <SettingsColor
                compact
                label="Section background"
                onChange={(event) =>
                  updateCustomization({
                    sectionBackgroundColor: event.target.value,
                  })
                }
                value={customization.sectionBackgroundColor}
              />

              <SettingsColor
                compact
                label="Item heading color"
                onChange={(event) =>
                  updateCustomization({ sectionHeadingColor: event.target.value })
                }
                value={customization.sectionHeadingColor}
              />
            </div>

            <Button
              className="w-full rounded-xl"
              onClick={() => updateCustomization({ ...defaultResume.customization })}
              size="sm"
              variant="secondary"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Theme Defaults
            </Button>
          </div>
        </SectionAccordion>

        <SectionAccordion
          label="Section Visibility"
          isOpen={openSection === "visibility"}
          id="visibility"
          onToggle={handleToggle}
        >
          <div className="text-foreground">
            <SectionVisibilitySettings
              embedded
              sections={sections}
              onMove={reorderSections}
              onToggle={setSectionVisibility}
              isTwoColumn={isTwoColumnTemplate}
              onUpdateSectionColumn={updateSectionColumn}
            />
          </div>
        </SectionAccordion>
      </div>

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
