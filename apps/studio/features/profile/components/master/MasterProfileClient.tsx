"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";

import type { MasterProfileData } from "@/types/resume";

import { Button } from "@veriworkly/ui";

import ProfileMaster from "./ProfileMaster";
import { reportMasterSaveFailure, saveThroughRef, type SaveLatest } from "./master-save-failure";
import { MasterSkeleton } from "./MasterProfileLoading";
import { MASTER_SECTION_NAV } from "./master-section-nav";
import { MasterMobileSectionNav, MasterProfileNavigator } from "./MasterProfileNavigator";
import { RecoveredProfileNotice } from "../RecoveredProfileNotice";

import {
  loadMasterProfileForEditor,
  saveMasterProfileToDatabase,
  saveMasterProfileToLocalStorage,
  type MasterProfileEditorState,
} from "@/features/resume/services/master-profile";

const SOURCE_LABELS = {
  database: "Database",
  local: "Local cache",
  new: "New profile",
} as const;

export default function MasterProfileClient() {
  const [state, setState] = useState<{
    profile: MasterProfileData | null;
    source: keyof typeof SOURCE_LABELS | null;
    updatedAt: string | null;
    recovered: boolean;
  }>({ profile: null, source: null, updatedAt: null, recovered: false });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeSectionId, setActiveSectionId] = useState<string>(MASTER_SECTION_NAV[0].id);

  const isManualScrolling = useRef(false);

  const sourceLabel = state.source ? SOURCE_LABELS[state.source] : "Unknown";

  const sectionCounts = useMemo(() => {
    if (!state.profile) return { experience: 0, projects: 0, skills: 0 };

    return {
      experience: state.profile.experience?.length ?? 0,
      projects: state.profile.projects?.length ?? 0,
      skills: state.profile.skills?.length ?? 0,
    };
  }, [state.profile]);

  const activeSectionIndex = MASTER_SECTION_NAV.findIndex((s) => s.id === activeSectionId);

  const applyLoadResult = useCallback((result: MasterProfileEditorState) => {
    if (result.status === "ready") {
      setState({
        profile: result.profile,
        source: result.source,
        updatedAt: result.updatedAt,
        recovered: Boolean(result.recovered),
      });
      setLoadError(null);
    } else {
      console.error("Failed to load master profile from the database", result.error);
      setLoadError(
        result.error instanceof Error ? result.error.message : "Could not load master profile.",
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    void loadMasterProfileForEditor().then((result) => {
      if (mounted) applyLoadResult(result);
    });

    return () => {
      mounted = false;
    };
  }, [applyLoadResult]);

  const retryLoad = () => {
    setLoading(true);
    void loadMasterProfileForEditor().then(applyLoadResult);
  };

  useEffect(() => {
    if (loading || !state.profile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isManualScrolling.current) return;

        const visibleEntry = entries.find((entry) => entry.isIntersecting);

        if (visibleEntry) {
          setActiveSectionId(visibleEntry.target.id);
        }
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );

    MASTER_SECTION_NAV.forEach((section) => {
      const el = document.getElementById(section.id);

      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [loading, state.profile]);

  const scrollToSection = useCallback((sectionId: string) => {
    const target = document.getElementById(sectionId);

    if (!target) return;

    isManualScrolling.current = true;
    setActiveSectionId(sectionId);

    const topOffset = window.innerWidth >= 1280 ? 100 : 140;
    const y = target.getBoundingClientRect().top + window.scrollY - topOffset;

    window.scrollTo({ top: y, behavior: "smooth" });

    setTimeout(() => {
      isManualScrolling.current = false;
    }, 800);
  }, []);

  // Set by `ProfileMaster`: saves what the editor holds at the moment it is called.
  const saveLatestRef = useRef<SaveLatest | null>(null);

  /*
   * A failed save is reported here and re-thrown so `ProfileMaster` keeps its own inline
   * failure state, and so `state.profile` is never replaced with a value the server
   * rejected — the user's draft stays in the editor.
   */
  const handleSave = async (profile: MasterProfileData, expectedUpdatedAt?: string) => {
    setSaving(true);

    try {
      const savedBundle = await saveMasterProfileToDatabase(
        profile,
        expectedUpdatedAt ?? state.updatedAt ?? undefined,
      );

      saveMasterProfileToLocalStorage(savedBundle.profile);

      setState({
        profile: savedBundle.profile,
        source: "database",
        updatedAt: savedBundle.updatedAt,
        recovered: false,
      });
    } catch (error) {
      await reportMasterSaveFailure(error, saveThroughRef(saveLatestRef));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <MasterSkeleton />;

  if (loadError || !state.profile) {
    return (
      <div className="border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-2xl border p-5">
        <AlertCircle className="text-destructive h-5 w-5 shrink-0" />

        <div className="space-y-2">
          <div>
            <h2 className="text-sm font-bold">Master profile did not load</h2>

            <p className="text-muted mt-1 text-sm">
              {loadError ?? "Could not load master profile."} Editing is paused so a saved profile
              is not overwritten.
            </p>
          </div>

          <Button size="sm" className="mt-4" onClick={retryLoad}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:gap-10">
      <MasterProfileNavigator
        sourceLabel={sourceLabel}
        updatedAt={state.updatedAt}
        onNavigate={scrollToSection}
        sections={MASTER_SECTION_NAV}
        sectionCounts={sectionCounts}
        activeSectionId={activeSectionId}
        activeSectionIndex={activeSectionIndex}
      />

      <main className="xl:col-span-9">
        <MasterMobileSectionNav
          onNavigate={scrollToSection}
          sections={MASTER_SECTION_NAV}
          activeSectionId={activeSectionId}
        />

        {state.recovered ? (
          <div className="mb-6">
            <RecoveredProfileNotice />
          </div>
        ) : null}

        <ProfileMaster
          profile={state.profile}
          onSave={handleSave}
          saveLatestRef={saveLatestRef}
          isSaving={saving}
          neverSaved={state.source !== "database"}
        />
      </main>
    </div>
  );
}
