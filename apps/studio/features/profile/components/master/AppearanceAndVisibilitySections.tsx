import { Input } from "@veriworkly/ui";
import { Select } from "@veriworkly/ui";
import type { MasterProfileData } from "@/types/resume";

import { ColorField, SectionCard } from "./master-shared";
import { fontFamilies, sectionLabels, sectionRowKey } from "./master-utils";

type AppearanceAndVisibilitySectionsProps = {
  localProfile: MasterProfileData;
  setCustomizationField: (
    key: keyof MasterProfileData["customization"],
    value: string | number,
  ) => void;
  /** Takes {@link sectionRowKey}, so each custom section toggles on its own. */
  updateSectionVisibility: (rowKey: string, visible: boolean) => void;
};

export function AppearanceAndVisibilitySections({
  localProfile,
  setCustomizationField,
  updateSectionVisibility,
}: AppearanceAndVisibilitySectionsProps) {
  return (
    <>
      <SectionCard
        sectionId="profile-appearance"
        title="Appearance"
        description="Keep theme, color, font, and spacing controls in the master profile."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ColorField
            label="Accent Color"
            value={localProfile.customization.accentColor}
            onChange={(value) => setCustomizationField("accentColor", value)}
          />
          <ColorField
            label="Text Color"
            value={localProfile.customization.textColor}
            onChange={(value) => setCustomizationField("textColor", value)}
          />
          <ColorField
            label="Muted Text"
            value={localProfile.customization.mutedTextColor}
            onChange={(value) => setCustomizationField("mutedTextColor", value)}
          />
          <ColorField
            label="Page Background"
            value={localProfile.customization.pageBackgroundColor}
            onChange={(value) => setCustomizationField("pageBackgroundColor", value)}
          />
          <ColorField
            label="Section Background"
            value={localProfile.customization.sectionBackgroundColor}
            onChange={(value) => setCustomizationField("sectionBackgroundColor", value)}
          />
          <ColorField
            label="Border Color"
            value={localProfile.customization.borderColor}
            onChange={(value) => setCustomizationField("borderColor", value)}
          />
          <ColorField
            label="Section Heading Color"
            value={localProfile.customization.sectionHeadingColor}
            onChange={(value) => setCustomizationField("sectionHeadingColor", value)}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium">Font Family</p>
            <Select
              aria-label="Font Family"
              value={localProfile.customization.fontFamily}
              onChange={(event) =>
                setCustomizationField(
                  "fontFamily",
                  event.target.value as (typeof fontFamilies)[number],
                )
              }
            >
              {fontFamilies.map((fontFamily) => (
                <option key={fontFamily} value={fontFamily}>
                  {fontFamily}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Section Spacing</p>
            <Input
              aria-label="Section Spacing"
              type="number"
              min={0}
              max={120}
              value={localProfile.customization.sectionSpacing}
              onChange={(event) =>
                setCustomizationField("sectionSpacing", Number(event.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Page Padding</p>
            <Input
              aria-label="Page Padding"
              type="number"
              min={0}
              max={120}
              value={localProfile.customization.pagePadding}
              onChange={(event) => setCustomizationField("pagePadding", Number(event.target.value))}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Body Line Height</p>
            <Input
              aria-label="Body Line Height"
              type="number"
              step="0.1"
              min={1}
              max={3}
              value={localProfile.customization.bodyLineHeight}
              onChange={(event) =>
                setCustomizationField("bodyLineHeight", Number(event.target.value))
              }
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Heading Line Height</p>
            <Input
              aria-label="Heading Line Height"
              type="number"
              step="0.1"
              min={1}
              max={3}
              value={localProfile.customization.headingLineHeight}
              onChange={(event) =>
                setCustomizationField("headingLineHeight", Number(event.target.value))
              }
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        sectionId="profile-visibility"
        title="Section Visibility"
        description="Show or hide resume sections from the output."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {localProfile.sections.map((section) => (
            <label
              key={sectionRowKey(section)}
              className="border-border/60 bg-card/40 flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
            >
              <div>
                <p className="text-foreground text-sm font-semibold">
                  {section.customSectionId
                    ? localProfile.customSections.find(
                        (custom) => custom.id === section.customSectionId,
                      )?.title || sectionLabels.custom
                    : sectionLabels[section.id]}
                </p>
                <p className="text-muted text-xs">Order {section.order}</p>
              </div>
              <input
                type="checkbox"
                checked={section.visible}
                onChange={(event) =>
                  updateSectionVisibility(sectionRowKey(section), event.target.checked)
                }
              />
            </label>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
