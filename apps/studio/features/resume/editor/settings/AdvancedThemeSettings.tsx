"use client";

import type { ResumeCustomization } from "@/types/resume";

import { ChevronDown, RotateCcw } from "lucide-react";

import { Button } from "@veriworkly/ui";

import { SettingsColor } from "./SettingControls";

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
    <div className="border-border bg-background/70 space-y-3 rounded-2xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-foreground text-sm font-semibold">Advanced Theme</p>

          <p className="text-muted text-xs">Fine tune surfaces, borders, and text.</p>
        </div>

        <Button className="rounded-xl" onClick={onToggleOpen} size="sm" variant="ghost">
          {advancedOpen ? "Hide" : "Show"}
          <ChevronDown className={`ml-2 h-4 w-4 transition ${advancedOpen ? "rotate-180" : ""}`} />
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

          <div className="md:col-span-2">
            <Button
              className="w-full rounded-xl"
              onClick={onResetThemeDefaults}
              size="sm"
              variant="secondary"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Theme Defaults
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdvancedThemeSettings;
