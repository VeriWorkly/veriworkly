import type { Metadata } from "next";

import NavigationGrid from "@/features/profile/components/NavigationGrid";
import ProfileStatsGrid from "@/features/profile/components/ProfileStatsGrid";
import ProfileFeaturesInfo from "@/features/profile/components/ProfileFeaturesInfo";

export const metadata: Metadata = {
  title: `Profile`,
  description: "Overview and navigation for your profile workspace.",
  robots: { index: false, follow: false },
};

const ProfilePage = () => {
  return (
    <div className="animate-in fade-in space-y-10 py-10 duration-500">
      <header className="space-y-3 px-1">
        <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">
          Profile Workspace
        </p>

        <h1 className="text-foreground text-4xl font-black tracking-tight">Your Control Center</h1>

        <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
          Manage your account overview, master resume data, and advanced JSON controls from one
          centralized place.
        </p>
      </header>

      <NavigationGrid />
      <ProfileStatsGrid />
      <ProfileFeaturesInfo />
    </div>
  );
};

export default ProfilePage;
