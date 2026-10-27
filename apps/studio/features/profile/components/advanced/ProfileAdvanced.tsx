"use client";

import {
  Save,
  Upload,
  FileJson,
  Download,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import type { MasterProfile } from "@/types/resume";

import { Card, Badge, Button, TextArea, cn } from "@veriworkly/ui";

import ConfirmDialog from "@/components/modals/ConfirmDialog";

import { resolveConflictUpdatedAt } from "@/features/resume/services/master-profile";

import {
  stringifyProfile,
  buildProfileExportName,
  checkMasterProfileJson,
  parseMasterProfileJson,
  prepareMasterProfileJsonForSave,
} from "./advanced-profile-utils";

type ProfileAdvancedProps = {
  profile: MasterProfile;
  /** `expectedUpdatedAt` overrides the loaded cursor, to overwrite after a conflict. */
  onSave: (profile: MasterProfile, expectedUpdatedAt?: string) => Promise<void>;
  isSaving?: boolean;
  /** Shown on arrival: a save remounts this editor on the new profile. */
  initialStatus?: string | null;
};

const ProfileAdvanced = ({ profile, onSave, isSaving, initialStatus }: ProfileAdvancedProps) => {
  const baseJsonValue = stringifyProfile(profile);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [jsonValue, setJsonValue] = useState(baseJsonValue);

  const [isExporting, setIsExporting] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(initialStatus ?? null);
  /** Set after a 409: the stored profile's cursor, which "Save my version" overwrites. */
  const [conflictUpdatedAt, setConflictUpdatedAt] = useState<string | null>(null);

  const hasChanges = jsonValue !== baseJsonValue;

  // Parsed once per edit, not on every render.
  const jsonCheck = useMemo(() => checkMasterProfileJson(jsonValue), [jsonValue]);
  const isJsonValid = jsonCheck.ok;

  /*
   * The draft stays in the text area whatever happens. On a 409 the server's message says
   * why the stored profile differs, and "Save my version" overwrites it with the cursor the
   * conflict carries.
   */
  const handleSave = async (expectedUpdatedAt?: string) => {
    try {
      await onSave(prepareMasterProfileJsonForSave(jsonValue), expectedUpdatedAt);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Save failed");
      setConflictUpdatedAt(await resolveConflictUpdatedAt(error));
    }
  };

  const handleReset = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    setJsonValue(stringifyProfile(profile));

    setErrorMessage(null);
    setIsResetConfirmOpen(false);
  };

  const handleExport = () => {
    setIsExporting(true);

    try {
      const blob = new Blob([jsonValue], { type: "application/json" });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = buildProfileExportName();
      a.click();

      // Some browsers start reading the URL only after the click handler returns.
      setTimeout(() => URL.revokeObjectURL(url), 0);

      setStatusMessage("Backup file generated.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b bg-zinc-500/3 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 text-accent flex h-8 w-8 items-center justify-center rounded-lg">
              <FileJson className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-bold">Raw JSON Schema</h3>

              <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                Direct Data Manipulation
              </p>
            </div>
          </div>

          <Badge className="h-5 px-2 text-[10px]">
            {jsonCheck.ok
              ? "Valid profile"
              : jsonCheck.kind === "syntax"
                ? "Invalid JSON"
                : "Not a valid profile"}
          </Badge>
        </div>

        <div className="space-y-4 p-4">
          <TextArea
            rows={22}
            value={jsonValue}
            onChange={(e) => {
              setJsonValue(e.target.value);
              setErrorMessage(null);
              setConflictUpdatedAt(null);
            }}
            className={cn(
              "hide-scrollbar font-mono text-[13px] leading-relaxed transition-all focus:ring-1",
              "selection:bg-accent/30 bg-zinc-950 text-zinc-300 selection:text-white",
              !isJsonValid && "border-red-500/50 focus:ring-red-500/50",
            )}
          />

          {!jsonCheck.ok && !errorMessage ? (
            <p className="text-xs leading-normal font-medium text-red-600">{jsonCheck.message}</p>
          ) : null}

          {errorMessage && (
            <div className="animate-in slide-in-from-top-2 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />

              <div className="space-y-3">
                <p className="text-xs leading-normal font-medium text-red-600">{errorMessage}</p>

                {conflictUpdatedAt && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isSaving}
                    onClick={() => void handleSave(conflictUpdatedAt)}
                  >
                    Save my version
                  </Button>
                )}
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="animate-in slide-in-from-top-2 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />

              <p className="text-xs leading-normal font-medium text-emerald-600">{statusMessage}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t bg-zinc-500/3 p-4 sm:flex-row">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              onClick={() => void handleSave()}
              disabled={isSaving || !isJsonValid || !hasChanges}
              className="flex-1 gap-2 px-6 sm:flex-none"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Commit Changes"}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={handleReset}
              disabled={!hasChanges}
              title="Reset to original"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              className="flex-1 gap-2 text-xs sm:flex-none"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>

            <Button
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 gap-2 text-xs sm:flex-none"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>
      </Card>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="application/json"
        onChange={async (e) => {
          const file = e.target.files?.[0];

          if (!file) return;

          try {
            // A backup file shows only the Master Profile it carries.
            setJsonValue(stringifyProfile(parseMasterProfileJson(await file.text())));
            setErrorMessage(null);
            setStatusMessage("JSON imported successfully. Review before committing.");
          } catch (error) {
            setErrorMessage(
              `Import failed: ${error instanceof Error ? error.message : "the file could not be read."}`,
            );
          } finally {
            e.target.value = "";
          }
        }}
      />

      <ConfirmDialog
        tone="warning"
        title="Discard changes?"
        cancelLabel="Keep editing"
        open={isResetConfirmOpen}
        confirmLabel="Discard changes"
        onConfirm={handleConfirmReset}
        onClose={() => setIsResetConfirmOpen(false)}
        description="Are you sure you want to discard all local raw JSON modifications and reset back to the saved profile state? This action cannot be undone."
      />
    </div>
  );
};

export default ProfileAdvanced;
