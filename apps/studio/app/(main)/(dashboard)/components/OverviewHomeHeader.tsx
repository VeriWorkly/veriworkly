"use client";

import { useMemo, useSyncExternalStore } from "react";

import { useSessionUser } from "@/store/session-user";

const subscribeNever = () => () => {};

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";

  return "Good evening";
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border bg-background/70 min-w-20 rounded-xl border px-3 py-2">
      <p className="text-lg font-black">{value}</p>
      <p className="text-muted text-[11px]">{label}</p>
    </div>
  );
}

const OverviewHomeHeader = ({
  totalCount,
  coverLetterCount,
  resumeCount,
}: {
  totalCount: number;
  coverLetterCount: number;
  resumeCount: number;
}) => {
  const user = useSessionUser();

  const firstName = useMemo(() => {
    const name = user?.name || user?.email?.split("@")[0] || "builder";
    return name.split(" ")[0] || "builder";
  }, [user]);

  // The hour is the viewer's, which the server cannot know: it renders a neutral greeting
  // and the client swaps in the timed one after hydration instead of mismatching.
  const greeting = useSyncExternalStore(
    subscribeNever,
    () => greetingForHour(new Date().getHours()),
    () => "Welcome back",
  );

  return (
    <header className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Overview</p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            {greeting}, {firstName}.
          </h1>

          <p className="text-muted mt-2 max-w-2xl text-base">
            Your latest resumes and cover letters, and help when you need it.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Documents" value={totalCount} />
          <Stat label="Resumes" value={resumeCount} />
          <Stat label="Letters" value={coverLetterCount} />
        </div>
      </div>
    </header>
  );
};

export default OverviewHomeHeader;
