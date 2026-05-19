"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";

import type { MasterProfileData } from "@/types/resume";

import ProfileMaster from "./ProfileMaster";
import { MasterSkeleton } from "./MasterProfileLoading";
import { MASTER_SECTION_NAV } from "./master-section-nav";
import { MasterMobileSectionNav, MasterProfileNavigator } from "./MasterProfileNavigator";

import {
  saveMasterProfileToDatabase,
  loadMasterProfileFromDatabase,
  saveMasterProfileToLocalStorage,
  loadMasterProfileFromLocalStorage,
} from "@/features/resume/services/master-profile";

export default function MasterProfileClient() {
  const [state, setState] = useState<{
    profile: MasterProfileData | null;
    source: "database" | "local" | null;
    updatedAt: string | null;
  }>({ profile: null, source: null, updatedAt: null });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeSectionId, setActiveSectionId] = useState<string>(MASTER_SECTION_NAV[0].id);

  const isManualScrolling = useRef(false);

  const sourceLabel =
    state.source === "database" ? "Database" : state.source === "local" ? "Local cache" : "Unknown";

  const sectionCounts = useMemo(() => {
    if (!state.profile) return { experience: 0, projects: 0, skills: 0 };

    return {
      experience: state.profile.experience?.length ?? 0,
      projects: state.profile.projects?.length ?? 0,
      skills: state.profile.skills?.length ?? 0,
    };
  }, [state.profile]);

  const activeSectionIndex = MASTER_SECTION_NAV.findIndex((s) => s.id === activeSectionId);

  useEffect(() => {
    const load = async () => {
      try {
        const bundle = await loadMasterProfileFromDatabase();

        if (bundle?.profile) {
          setState({
            profile: bundle.profile,
            source: "database",
            updatedAt: bundle.updatedAt,
          });
        } else {
          const local = loadMasterProfileFromLocalStorage();

          setState({
            profile: local.profile,
            source: "local",
            updatedAt: null,
          });
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  const handleSave = async (profile: MasterProfileData) => {
    setSaving(true);

    try {
      const savedBundle = await saveMasterProfileToDatabase(profile, state.updatedAt ?? undefined);

      saveMasterProfileToLocalStorage(savedBundle.profile);

      setState({
        profile: savedBundle.profile,
        source: "database",
        updatedAt: savedBundle.updatedAt,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !state.profile) return <MasterSkeleton />;

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

        <ProfileMaster profile={state.profile} onSave={handleSave} isSaving={saving} />
      </main>
    </div>
  );
}
