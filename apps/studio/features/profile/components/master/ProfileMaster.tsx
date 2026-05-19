/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Save, RotateCcw } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";

import type { UpdateProfile } from "./types";
import type { MasterProfileData } from "@/types/resume";

import { Card, Button } from "@veriworkly/ui";

import { cn } from "@/lib/utils";

import { CoreSections } from "./CoreSections";
import { AdditionalSections } from "./AdditionalSections";
import { BasicsAndSummarySections } from "./BasicsAndSummarySections";
import { AppearanceAndVisibilitySections } from "./AppearanceAndVisibilitySections";

import {
  updateItem,
  removeItem,
  normalizeProfileIds,
  sanitizeMasterProfileForSave,
  validateMasterProfileForSave,
} from "./master-utils";

type ProfileMasterProps = {
  profile: MasterProfileData;
  onSave: (profile: MasterProfileData) => Promise<void>;
  isSaving?: boolean;
};

const ProfileMaster = ({ profile, onSave, isSaving }: ProfileMasterProps) => {
  const [localProfile, setLocalProfile] = useState<MasterProfileData>(() =>
    normalizeProfileIds(profile),
  );

  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialFingerprint = useMemo(() => JSON.stringify(normalizeProfileIds(profile)), [profile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentFingerprint = JSON.stringify(normalizeProfileIds(localProfile));

      setHasUnsavedChanges(initialFingerprint !== currentFingerprint);
    }, 150);

    return () => clearTimeout(timer);
  }, [localProfile, initialFingerprint]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalProfile(normalizeProfileIds(profile));
  }, [profile]);

  const updateProfile: UpdateProfile = useCallback((updater) => {
    setLocalProfile((prev) => updater(prev));
    setStatus(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasUnsavedChanges || isSaving) return;
    try {
      const sanitized = sanitizeMasterProfileForSave(localProfile);
      const validation = validateMasterProfileForSave(sanitized);

      if (!validation.ok) {
        setStatus({
          type: "error",
          msg: validation.issues[0] ?? "Check fields.",
        });

        return;
      }

      await onSave(sanitized);
      setStatus({ type: "success", msg: "Changes synced." });

      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus({ type: "error", msg: "Save failed." });
    }
  }, [hasUnsavedChanges, isSaving, localProfile, onSave]);

  const handleReset = () => setLocalProfile(normalizeProfileIds(profile));

  return (
    <div className="relative flex flex-col gap-12">
      <div className="space-y-16">
        <BasicsAndSummarySections
          localProfile={localProfile}
          updateProfile={updateProfile}
          setBasicField={(k, v) =>
            updateProfile((p) => ({ ...p, basics: { ...p.basics, [k]: v } }))
          }
          updateLink={() => {}}
          updateLinkDisplayMode={(mode) =>
            updateProfile((p) => ({
              ...p,
              links: { ...p.links, displayMode: mode },
            }))
          }
        />

        <AppearanceAndVisibilitySections
          localProfile={localProfile}
          setCustomizationField={(k, v) =>
            updateProfile((p) => ({
              ...p,
              customization: { ...p.customization, [k]: v },
            }))
          }
          updateSectionVisibility={(id, visible) =>
            updateProfile((p) => ({
              ...p,
              sections: p.sections.map((s) => (s.id === id ? { ...s, visible } : s)),
            }))
          }
        />

        <CoreSections
          localProfile={localProfile}
          updateRepeatableItem={(f: string, id: string, u: any) =>
            updateProfile((p) => ({
              ...p,
              [f]: updateItem(p[f as keyof typeof p] as any, id, u),
            }))
          }
          addRepeatableItem={(f: string, item: any) =>
            updateProfile((p) => ({
              ...p,
              [f]: [...(p[f as keyof typeof p] as any[]), item],
            }))
          }
          removeRepeatableItem={(f: string, id: string) =>
            updateProfile((p) => ({
              ...p,
              [f]: removeItem(p[f as keyof typeof p] as any[], id),
            }))
          }
        />

        <AdditionalSections
          localProfile={localProfile}
          updateRepeatableItem={(f: string, id: string, u: any) =>
            updateProfile((p) => ({
              ...p,
              [f]: updateItem(p[f as keyof typeof p] as any[], id, u),
            }))
          }
          addRepeatableItem={(f: string, item: any) =>
            updateProfile((p) => ({
              ...p,
              [f]: [...(p[f as keyof typeof p] as any[]), item],
            }))
          }
          removeRepeatableItem={(f: string, id: string) =>
            updateProfile((p) => ({
              ...p,
              [f]: removeItem(p[f as keyof typeof p] as any[], id),
            }))
          }
        />
      </div>

      <div className="sticky bottom-6 z-40 mt-8 w-full">
        <Card
          className={cn(
            "flex flex-wrap items-center justify-between gap-4 border-2 p-2 pl-4 shadow-2xl backdrop-blur-md transition-all duration-300",
            hasUnsavedChanges
              ? "bg-background/95 border-amber-500/40 ring-8 ring-amber-500/5"
              : "border-border bg-background/80",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                hasUnsavedChanges ? "animate-pulse bg-amber-500" : "bg-emerald-500",
              )}
            />

            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest uppercase">
                {hasUnsavedChanges ? "Unsaved Changes" : "Everything Synced"}
              </span>

              {status && (
                <span className="text-[10px] leading-none font-bold text-emerald-600">
                  {status.msg}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="hover:bg-destructive/10 h-9 px-3 text-xs font-bold"
              >
                Discard
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={cn(
                "h-10 px-6 text-xs font-bold transition-all",
                hasUnsavedChanges
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-700"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isSaving ? (
                <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}

              {isSaving ? "Syncing..." : "Save Master"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfileMaster;
