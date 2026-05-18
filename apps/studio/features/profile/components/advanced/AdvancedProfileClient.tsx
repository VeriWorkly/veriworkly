"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { MasterProfile } from "@/types/resume";

import { Button } from "@veriworkly/ui";

import {
  saveMasterProfileToDatabase,
  loadMasterProfileFromDatabase,
  saveMasterProfileToLocalStorage,
  loadMasterProfileFromLocalStorage,
} from "@/features/resume/services/master-profile";

import ProfileAdvanced from "./ProfileAdvanced";
import AdvancedSkeleton from "./AdvanceProfileSkeleton";
import AdvancedProfileStatusBand from "./AdvancedProfilePanels";

const AdvancedProfileClient = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [profile, setProfile] = useState<MasterProfile | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const bundle = await loadMasterProfileFromDatabase();

        if (!mounted) return;

        if (bundle?.profile) {
          setProfile(bundle.profile);
          setUpdatedAt(bundle.updatedAt);
        } else {
          setProfile(loadMasterProfileFromLocalStorage().profile);
        }
      } catch {
        if (mounted) setLoadError("Could not load master profile data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async (nextProfile: MasterProfile) => {
    setSaving(true);

    try {
      const savedBundle = await saveMasterProfileToDatabase(nextProfile, updatedAt ?? undefined);

      saveMasterProfileToLocalStorage(savedBundle.profile);
      setProfile(savedBundle.profile);
      setUpdatedAt(savedBundle.updatedAt);
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
              {loadError ?? "No profile payload was found."}
            </p>
          </div>

          <Button asChild size="sm" className="mt-4">
            <Link href="/profile/master">Open guided editor</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdvancedProfileStatusBand updatedAt={updatedAt} />

      <ProfileAdvanced
        isSaving={saving}
        profile={profile}
        onSave={handleSave}
        key={updatedAt ?? "init"}
      />
    </div>
  );
};

export default AdvancedProfileClient;
