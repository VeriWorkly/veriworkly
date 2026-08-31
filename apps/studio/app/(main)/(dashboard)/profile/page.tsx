import type { Metadata } from "next";

import {
  ProfileLinksGrid,
  ProfileDataLayers,
} from "@/features/profile/components/ProfileOverviewSections";
import ProfileHero from "@/features/profile/components/ProfielHero";
import ProfileDataPanel from "@/features/profile/components/ProfileDataPanel";
import AccountStatsPanel from "@/features/profile/components/ProfileAccountStats";
import DangerZoneCard from "@/features/profile/components/DangerZoneCard";
import { fetchAccountProfile } from "@/features/profile/services/account-profile";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage user account profile and profile data tools.",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const accountProfile = await fetchAccountProfile();

  return (
    <main className="space-y-6" aria-labelledby="profile-title">
      <ProfileHero profile={accountProfile} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <ProfileDataPanel profile={accountProfile} />
          <ProfileLinksGrid />
          {accountProfile?.email && <DangerZoneCard userEmail={accountProfile.email} />}
        </div>

        <AccountStatsPanel profile={accountProfile} />
      </section>

      <ProfileDataLayers />
    </main>
  );
}
