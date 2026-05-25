"use client";

import type { ResumeCustomization } from "@/types/resume";

import { Button } from "@veriworkly/ui";

import { SettingsColor, SettingsRange } from "./SettingControls";

interface AdvancedThemeSettingsProps {
  advancedOpen: boolean;
  customization: ResumeCustomization;
  onResetThemeDefaults: () => void;
  onToggleOpen: () => void;
  onUpdateCustomization: (patch: Partial<ResumeCustomization>) => void;
}

const AdvancedThemeSettings = ({
  advancedOpen,
  customization,
  onResetThemeDefaults,
  onToggleOpen,
  onUpdateCustomization,
}: AdvancedThemeSettingsProps) => {
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-[color-mix(in_oklab,var(--border)_75%,transparent)] p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-foreground text-sm font-semibold">Advanced Theme</p>

          <p className="text-muted text-xs">
            Full color control for resume surface and typography.
          </p>
        </div>

        <Button onClick={onToggleOpen} size="sm" variant="ghost">
          {advancedOpen ? "Hide" : "Show"}
        </Button>
      </div>

      {advancedOpen ? (
        <div className="grid gap-3 md:grid-cols-2">
          <SettingsColor
            compact
            label="Text color"
            onChange={(event) => onUpdateCustomization({ textColor: event.target.value })}
            value={customization.textColor}
          />

          <SettingsColor
            compact
            label="Muted text color"
            onChange={(event) => onUpdateCustomization({ mutedTextColor: event.target.value })}
            value={customization.mutedTextColor}
          />

          <SettingsColor
            compact
            label="Page background"
            onChange={(event) => onUpdateCustomization({ pageBackgroundColor: event.target.value })}
            value={customization.pageBackgroundColor}
          />

          <SettingsColor
            compact
            label="Section background"
            onChange={(event) =>
              onUpdateCustomization({
                sectionBackgroundColor: event.target.value,
              })
            }
            value={customization.sectionBackgroundColor}
          />

          <SettingsColor
            compact
            label="Border color"
            onChange={(event) => onUpdateCustomization({ borderColor: event.target.value })}
            value={customization.borderColor}
          />

          <SettingsColor
            compact
            label="Item heading color"
            onChange={(event) => onUpdateCustomization({ sectionHeadingColor: event.target.value })}
            value={customization.sectionHeadingColor}
          />

          <SettingsRange
            label={`Body line-height (${customization.bodyLineHeight.toFixed(2)})`}
            max={2}
            min={1}
            onChange={(event) =>
              onUpdateCustomization({
                bodyLineHeight: Number(event.target.value),
              })
            }
            step={0.05}
            value={customization.bodyLineHeight}
          />

          <div className="md:col-span-2">
            <Button onClick={onResetThemeDefaults} size="sm" variant="secondary">
              Reset Theme Defaults
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdvancedThemeSettings;
