import type { AccountProfile } from "../services/account-profile";

import { UserRound } from "lucide-react";

const ProfileHero = ({ profile }: { profile: AccountProfile | null }) => {
  const email = profile?.email || "No account connected";
  const name = profile?.name || profile?.email?.split("@")[0] || "Local builder";

  return (
    <section
      className="border-border bg-card overflow-hidden rounded-2xl border"
      aria-labelledby="profile-title"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="p-5 sm:p-6">
          <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Profile</p>

          <h1 id="profile-title" className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            User profile
          </h1>

          <p className="text-muted mt-2 max-w-2xl text-base">
            Account identity, backup status, and workspace usage. Your Master Profile is edited on
            its own page.
          </p>
        </div>

        <div className="border-border/70 border-t p-5 lg:border-t-0 lg:border-l">
          <div className="flex items-center gap-3">
            <span className="bg-accent/10 text-accent flex h-12 w-12 items-center justify-center rounded-xl">
              <UserRound className="h-6 w-6" />
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-black">{name}</p>
              <p className="text-muted truncate text-xs">{email}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileHero;
