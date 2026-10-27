"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { MasterProfile } from "@/types/resume";

import { Button } from "@veriworkly/ui";

import {
  loadMasterProfileForEditor,
  saveMasterProfileToDatabase,
  saveMasterProfileToLocalStorage,
  type MasterProfileEditorState,
} from "@/features/resume/services/master-profile";

import ProfileAdvanced from "./ProfileAdvanced";
import AdvancedSkeleton from "./AdvanceProfileSkeleton";
import AdvancedProfileStatusBand from "./AdvancedProfilePanels";
import { RecoveredProfileNotice } from "../RecoveredProfileNotice";

const AdvancedProfileClient = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [recovered, setRecovered] = useState(false);
  // The editor remounts on the saved profile, so the confirmation is carried across from here.
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // A failed load blocks editing: saving a stand-in would overwrite the profile that did
  // not load. Only "no profile yet" opens the editor without one from the database.
  const applyLoadResult = useCallback((result: MasterProfileEditorState) => {
    if (result.status === "ready") {
      setProfile(result.profile);
      setUpdatedAt(result.updatedAt);
      setRecovered(Boolean(result.recovered));
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

  const handleSave = async (nextProfile: MasterProfile, expectedUpdatedAt = updatedAt) => {
    setSaving(true);

    try {
      const savedBundle = await saveMasterProfileToDatabase(
        nextProfile,
        expectedUpdatedAt ?? undefined,
      );

      saveMasterProfileToLocalStorage(savedBundle.profile);
      setProfile(savedBundle.profile);
      setUpdatedAt(savedBundle.updatedAt);
      setRecovered(false);
      setSavedNotice("Profile saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdvancedSkeleton />;

  if (loadError || !profile) {
    return (
      <div className="border-destructive/20 bg-destructive/5 flex h-full items-start gap-3 rounded-2xl border p-5">
        <AlertCircle className="text-destructive h-5 w-5 shrink-0" />

        <div className="space-y-2">
          <div>
            <h2 className="text-sm font-bold">Profile data unavailable</h2>

            <p className="text-muted mt-1 text-sm">
              {loadError ?? "No profile payload was found."} Editing is paused so a saved profile is
              not overwritten.
            </p>
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={retryLoad}>
              Try again
            </Button>

            <Button asChild size="sm" variant="secondary">
              <Link href="/profile/master">Open guided editor</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdvancedProfileStatusBand updatedAt={updatedAt} />

      {recovered ? <RecoveredProfileNotice /> : null}

      <ProfileAdvanced
        isSaving={saving}
        profile={profile}
        onSave={handleSave}
        initialStatus={savedNotice}
        key={updatedAt ?? "init"}
      />
    </div>
  );
};

export default AdvancedProfileClient;
