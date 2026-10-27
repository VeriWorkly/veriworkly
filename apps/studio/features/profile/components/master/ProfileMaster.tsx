"use client";

import { Save, RotateCcw } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef, type RefObject } from "react";

import type {
  UpdateProfile,
  RepeatableField,
  UpdateRepeatableItem,
  AddRepeatableItem,
  RemoveRepeatableItem,
} from "./types";
import type { MasterProfileData } from "@/types/resume";

import { Card, Button, cn } from "@veriworkly/ui";

import { CoreSections } from "./CoreSections";
import { AdditionalSections } from "./AdditionalSections";
import { BasicsAndSummarySections } from "./BasicsAndSummarySections";
import { AppearanceAndVisibilitySections } from "./AppearanceAndVisibilitySections";

import {
  updateItem,
  removeItem,
  sectionRowKey,
  setLinkByType,
  rebaseAfterSave,
  isInAppNavigation,
  normalizeProfileIds,
  withCustomSectionRows,
  prepareMasterProfileForSave,
} from "./master-utils";
import { dismissMasterSaveFailure, retryLatestSave, type SaveLatest } from "./master-save-failure";

/** Every profile the editor holds or compares against has one visibility row per custom section. */
function prepareProfile(profile: MasterProfileData) {
  return withCustomSectionRows(normalizeProfileIds(profile));
}

type ProfileMasterProps = {
  profile: MasterProfileData;
  /** `expectedUpdatedAt` overrides the loaded cursor, to overwrite after a conflict. */
  onSave: (profile: MasterProfileData, expectedUpdatedAt?: string) => Promise<void>;
  isSaving?: boolean;
  /** Filled with a save of whatever the editor holds when it is called, for a toast's retry. */
  saveLatestRef?: RefObject<SaveLatest | null>;
  /** Nothing is stored for this account yet: the profile on screen is a blank start. */
  neverSaved?: boolean;
};

const ProfileMaster = ({
  profile,
  onSave,
  isSaving,
  neverSaved,
  saveLatestRef,
}: ProfileMasterProps) => {
  const [localProfile, setLocalProfile] = useState<MasterProfileData>(() =>
    prepareProfile(profile),
  );
  // The editor's state at the moment a save was sent, to tell a reply apart from new typing.
  const submittedRef = useRef<MasterProfileData | null>(null);

  const [status, setStatus] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialFingerprint = useMemo(() => JSON.stringify(prepareProfile(profile)), [profile]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentFingerprint = JSON.stringify(prepareProfile(localProfile));

      setHasUnsavedChanges(initialFingerprint !== currentFingerprint);
    }, 150);

    return () => clearTimeout(timer);
  }, [localProfile, initialFingerprint]);

  useEffect(() => {
    const submitted = submittedRef.current;
    submittedRef.current = null;

    setLocalProfile((current) => rebaseAfterSave(current, submitted, prepareProfile(profile)));
  }, [profile]);

  // While there are unsaved changes, reloading or closing the tab makes the browser ask first,
  // and a link to another studio page asks before leaving. The link check runs in the capture
  // phase, ahead of the client router's own click handler.
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    const guardLinks = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as
        HTMLAnchorElement | null | undefined;

      if (!anchor || !isInAppNavigation(event, anchor, window.location)) return;
      if (window.confirm("You have unsaved changes to your Master Profile. Leave anyway?")) return;

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guardLinks, true);

    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guardLinks, true);
    };
  }, [hasUnsavedChanges]);

  const updateProfile: UpdateProfile = useCallback((updater) => {
    setLocalProfile((prev) => withCustomSectionRows(updater(prev)));
    setStatus(null);
    setIssues([]);
  }, []);

  // Shared by both CoreSections and AdditionalSections. Typed against the
  // RepeatableField/RepeatableItemMap contract in ./types so a typo'd field name or a
  // mismatched item shape at any call site is a compile error, not a runtime bug.
  const updateRepeatableItem: UpdateRepeatableItem = useCallback(
    (field, id, updater) => {
      updateProfile((prev) => {
        const items = prev[field] as Array<{ id: string }>;
        return {
          ...prev,
          [field]: updateItem(
            items,
            id,
            updater as unknown as (item: { id: string }) => { id: string },
          ),
        };
      });
    },
    [updateProfile],
  );

  const addRepeatableItem: AddRepeatableItem = useCallback(
    (field, item) => {
      updateProfile((prev) => {
        const items = prev[field] as Array<{ id: string }>;
        return { ...prev, [field]: [...items, item] };
      });
    },
    [updateProfile],
  );

  const removeRepeatableItem: RemoveRepeatableItem = useCallback(
    (field: RepeatableField, id: string) => {
      updateProfile((prev) => {
        const items = prev[field] as Array<{ id: string }>;
        return { ...prev, [field]: removeItem(items, id) };
      });
    },
    [updateProfile],
  );

  /** A retry after a failure passes the cursor to overwrite and saves even if nothing changed since. */
  const save = useCallback(
    async (expectedUpdatedAt?: string) => {
      if (isSaving) return;
      try {
        const prepared = prepareMasterProfileForSave(localProfile);

        if (!prepared.ok) {
          setIssues(prepared.issues);
          setStatus({ type: "error", msg: "Not saved: fix the fields listed above." });

          return;
        }

        setIssues([]);
        submittedRef.current = localProfile;
        await onSave(prepared.profile, expectedUpdatedAt);
        dismissMasterSaveFailure();
        setStatus({ type: "success", msg: "Saved to your account." });

        setTimeout(() => setStatus(null), 3000);
      } catch (error) {
        submittedRef.current = null;
        setStatus({ type: "error", msg: error instanceof Error ? error.message : "Save failed." });
      }
    },
    [isSaving, localProfile, onSave],
  );

  // A retry asked for while a save runs, run once that save settles.
  const queuedRetryRef = useRef<{ cursor?: string } | null>(null);

  useEffect(() => {
    const queued = queuedRetryRef.current;
    if (isSaving || !queued) return;

    queuedRetryRef.current = null;
    void save(queued.cursor);
  }, [isSaving, save]);

  // Re-pointed after every render, so a toast created earlier acts on the current draft; cleared
  // on unmount, so a toast outliving the page does nothing.
  useEffect(() => {
    if (!saveLatestRef) return;

    saveLatestRef.current = (cursor) =>
      retryLatestSave(
        {
          isDirty: () => JSON.stringify(prepareProfile(localProfile)) !== initialFingerprint,
          isSaving: () => Boolean(isSaving),
          queue: (queuedCursor) => {
            queuedRetryRef.current = { cursor: queuedCursor };
          },
          save,
        },
        cursor,
      );

    return () => {
      saveLatestRef.current = null;
    };
  });

  const handleSave = () => {
    if (hasUnsavedChanges) void save();
  };

  const handleReset = () => {
    setLocalProfile(prepareProfile(profile));
    setIssues([]);
    // "Save my version" would now save the stored copy over newer data: it is withdrawn.
    dismissMasterSaveFailure();
  };

  return (
    <div className="relative flex flex-col gap-12">
      <div className="space-y-16">
        <BasicsAndSummarySections
          localProfile={localProfile}
          updateProfile={updateProfile}
          setBasicField={(k, v) =>
            updateProfile((p) => ({ ...p, basics: { ...p.basics, [k]: v } }))
          }
          updateLink={(type, url) =>
            updateProfile((p) => ({ ...p, links: setLinkByType(p.links, type, url) }))
          }
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
          updateSectionVisibility={(rowKey, visible) =>
            updateProfile((p) => ({
              ...p,
              sections: p.sections.map((s) =>
                sectionRowKey(s) === rowKey ? { ...s, visible } : s,
              ),
            }))
          }
        />

        <CoreSections
          localProfile={localProfile}
          updateRepeatableItem={updateRepeatableItem}
          addRepeatableItem={addRepeatableItem}
          removeRepeatableItem={removeRepeatableItem}
        />

        <AdditionalSections
          localProfile={localProfile}
          updateRepeatableItem={updateRepeatableItem}
          addRepeatableItem={addRepeatableItem}
          removeRepeatableItem={removeRepeatableItem}
        />
      </div>

      <div className="sticky bottom-6 z-40 mt-8 w-full space-y-3">
        {issues.length > 0 ? (
          <div
            role="alert"
            className="border-destructive/30 bg-background/95 rounded-xl border p-4 shadow-xl backdrop-blur-md"
          >
            <p className="text-destructive text-sm font-bold">Your Master Profile was not saved</p>
            <ul className="text-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

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
                hasUnsavedChanges
                  ? "animate-pulse bg-amber-500"
                  : neverSaved
                    ? "bg-zinc-400"
                    : "bg-emerald-500",
              )}
            />

            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-widest uppercase">
                {hasUnsavedChanges ? "Unsaved changes" : neverSaved ? "Not saved yet" : "Saved"}
              </span>

              {status && (
                <span
                  className={cn(
                    "text-[10px] leading-tight font-bold",
                    status.type === "error" ? "text-destructive" : "text-emerald-600",
                  )}
                >
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

              {isSaving ? "Saving..." : "Save Master Profile"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfileMaster;
