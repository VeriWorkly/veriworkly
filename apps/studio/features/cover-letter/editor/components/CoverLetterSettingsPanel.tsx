"use client";

import { Select } from "@veriworkly/ui";

import type { BaseDocument } from "@/features/documents/core/types";
import type { FontFamilyId } from "@/features/documents/constants/fonts";
import type { CoverLetterAppearance, CoverLetterContent } from "@/features/cover-letter/types";

import { fontOptions } from "@/features/documents/constants/fonts";
import { templateCatalogByType } from "@/features/documents/core/template-catalog";

import { ColorField, EditorBlock, RangeField } from "./CoverLetterFields";

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
  return (
    <div className="space-y-6">
      <EditorBlock title="Template">
        <label className="grid gap-2 text-sm font-medium">
          <span>Template</span>

          <Select
            value={document.templateId}
            onChange={(event) =>
              onUpdateDocument({
                ...document,
                templateId: event.target.value,
                updatedAt: new Date().toISOString(),
              })
            }
          >
            {templateCatalogByType.COVER_LETTER.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
        </label>
      </EditorBlock>

      <EditorBlock title="Layout">
        <label className="grid gap-2 text-sm font-medium">
          <span>Font style</span>

          <Select
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
          </Select>
        </label>

        <RangeField
          min={24}
          max={72}
          value={appearance.pageMargin}
          label={`Page margin (${appearance.pageMargin}px)`}
          onChange={(pageMargin) => onUpdateAppearance({ pageMargin })}
        />

        <RangeField
          min={4}
          max={24}
          value={appearance.paragraphSpacing}
          label={`Paragraph gap (${appearance.paragraphSpacing}px)`}
          onChange={(paragraphSpacing) => onUpdateAppearance({ paragraphSpacing })}
        />

        <RangeField
          min={1.25}
          max={1.8}
          step={0.05}
          value={appearance.lineHeight}
          label={`Line height (${appearance.lineHeight.toFixed(2)})`}
          onChange={(lineHeight) => onUpdateAppearance({ lineHeight })}
        />
      </EditorBlock>

      <EditorBlock title="Colors">
        <ColorField
          label="Accent color"
          value={appearance.accentColor}
          onChange={(accentColor) => onUpdateAppearance({ accentColor })}
        />

        <ColorField
          label="Sidebar color"
          value={appearance.sidebarColor}
          onChange={(sidebarColor) => onUpdateAppearance({ sidebarColor })}
        />

        <ColorField
          label="Page color"
          value={appearance.pageColor}
          onChange={(pageColor) => onUpdateAppearance({ pageColor })}
        />

        <ColorField
          label="Text color"
          value={appearance.textColor}
          onChange={(textColor) => onUpdateAppearance({ textColor })}
        />
      </EditorBlock>
    </div>
  );
}
