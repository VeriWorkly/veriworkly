"use client";

import type { LucideIcon } from "lucide-react";

import {
  Mail,
  Pencil,
  AtSign,
  RefreshCw,
  UserRound,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import * as React from "react";

import type { AccountProfile } from "@/features/profile/services/account-profile";

import UsernameLockedModal from "./UsernameLockedModal";
import EditProfileNameModal from "./EditProfileNameModal";
import EditProfileUsernameModal from "./EditProfileUsernameModal";

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function DataLine({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/10 min-w-0 rounded-xl p-3">
      <p className="text-muted flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold">{value}</p>
    </div>
  );
}

export default function ProfileDataPanel({ profile }: { profile: AccountProfile | null }) {
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = React.useState(false);
  const [isLockedModalOpen, setIsLockedModalOpen] = React.useState(false);

  const canEditAccount = Boolean(profile);

  const email = profile?.email || "No email saved";
  const name = profile?.name || profile?.email?.split("@")[0] || "Local builder";

  const initials = name.slice(0, 1).toUpperCase();

  return (
    <>
      <section
        className="border-border bg-card overflow-hidden rounded-2xl border"
        aria-labelledby="profile-data-title"
      >
        <div className="border-border/70 grid gap-5 border-b p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <span className="bg-accent text-accent-foreground flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black">
            {initials}
          </span>

          <div className="min-w-0">
            <p className="text-muted text-xs font-bold tracking-[0.18em] uppercase">User profile</p>

            <h2
              id="profile-data-title"
              className="mt-1 flex items-center gap-2 truncate text-2xl font-black"
            >
              {name}
              <button
                aria-label="Edit name"
                disabled={!canEditAccount}
                id="edit-profile-name-header-btn"
                onClick={() => canEditAccount && setIsEditModalOpen(true)}
                title={canEditAccount ? "Edit name" : "Sign in to edit your account name"}
                className="text-muted hover:text-accent hover:bg-muted/20 cursor-pointer rounded-lg p-1 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </h2>

            <p className="text-muted mt-1 truncate text-sm">{email}</p>
          </div>

          <div className="bg-background/70 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {profile?.emailVerified ? "Verified email" : "Email pending"}
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          <div
            aria-label="Edit display name"
            aria-disabled={!canEditAccount}
            id="edit-profile-name-card-trigger"
            tabIndex={canEditAccount ? 0 : undefined}
            role={canEditAccount ? "button" : undefined}
            onClick={() => canEditAccount && setIsEditModalOpen(true)}
            className="border-accent/20 bg-accent/3 hover:border-accent/40 hover:bg-accent/8 group min-w-0 rounded-xl border p-3 shadow-sm transition-all duration-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
            onKeyDown={(e) => {
              if (canEditAccount && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setIsEditModalOpen(true);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-muted flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
                <UserRound className="h-3.5 w-3.5" />
                Name
              </p>

              <span className="text-accent group-hover:text-accent/80 flex items-center gap-1 text-xs font-bold transition-colors">
                {canEditAccount ? "Edit" : "Sign in required"} <Pencil className="h-3 w-3" />
              </span>
            </div>

            <p className="text-foreground group-hover:text-accent mt-1 truncate text-sm font-bold transition-colors">
              {name}
            </p>
          </div>

          <div
            aria-label={profile?.username ? "View username (locked)" : "Configure username"}
            aria-disabled={!canEditAccount}
            id="edit-profile-username-card-trigger"
            tabIndex={canEditAccount ? 0 : undefined}
            role={canEditAccount ? "button" : undefined}
            onClick={() => {
              if (!canEditAccount) return;
              if (profile?.username) {
                setIsLockedModalOpen(true);
              } else {
                setIsUsernameModalOpen(true);
              }
            }}
            className={`group min-w-0 cursor-pointer rounded-xl border p-3 shadow-sm transition-all duration-200 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 ${
              profile?.username
                ? "border-zinc-200/60 bg-zinc-50/5 hover:border-zinc-300 dark:border-zinc-800/60 dark:bg-zinc-950/10"
                : "border-amber-200/40 bg-amber-500/5 hover:border-amber-300 hover:bg-amber-500/10 dark:border-amber-500/20"
            }`}
            onKeyDown={(e) => {
              if (canEditAccount && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                if (profile?.username) {
                  setIsLockedModalOpen(true);
                } else {
                  setIsUsernameModalOpen(true);
                }
              }
            }}
          >
            <div className="flex items-center justify-between">
              <p className="text-muted flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
                <AtSign className="h-3.5 w-3.5" />
                Username
              </p>

              <span
                className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                  profile?.username
                    ? "text-muted-foreground group-hover:text-foreground"
                    : "text-amber-600 group-hover:text-amber-500 dark:text-amber-400 dark:group-hover:text-amber-300"
                }`}
              >
                {canEditAccount ? (profile?.username ? "Locked" : "Configure") : "Sign in required"}{" "}
                <Pencil className="h-3 w-3" />
              </span>
            </div>

            <p
              className={`mt-1 truncate text-sm font-bold transition-colors ${
                profile?.username
                  ? "text-foreground group-hover:text-accent"
                  : "font-extrabold text-amber-700 dark:text-amber-400"
              }`}
            >
              {profile?.username ? `@${profile.username}` : "Not set"}
            </p>
          </div>

          <DataLine icon={Mail} label="Email" value={email} />
          <DataLine
            icon={RefreshCw}
            label="Auto sync"
            value={profile?.autoSyncEnabled ? "On" : "Off"}
          />
          <DataLine icon={CalendarClock} label="Created" value={formatDate(profile?.createdAt)} />
          <DataLine icon={CalendarClock} label="Updated" value={formatDate(profile?.updatedAt)} />
        </div>
      </section>

      {canEditAccount ? (
        <>
          <EditProfileNameModal
            currentName={name}
            open={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
          />

          <EditProfileUsernameModal
            open={isUsernameModalOpen}
            onClose={() => setIsUsernameModalOpen(false)}
          />

          <UsernameLockedModal
            open={isLockedModalOpen}
            onClose={() => setIsLockedModalOpen(false)}
          />
        </>
      ) : null}
    </>
  );
}
