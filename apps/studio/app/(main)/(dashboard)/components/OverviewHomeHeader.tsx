"use client";

import { useMemo } from "react";

import { useUserStore } from "@/store/useUserStore";

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
  resumeCount,
}: {
  totalCount: number;
  resumeCount: number;
}) => {
  const user = useUserStore((state) => state.user);

  const firstName = useMemo(() => {
    const name = user?.name || user?.email?.split("@")[0] || "builder";
    return name.split(" ")[0] || "builder";
  }, [user]);

  return (
    <header className="border-border bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Overview</p>

          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Good morning, {firstName}.
          </h1>

          <p className="text-muted mt-2 max-w-2xl text-base">
            Recent resumes, useful references, and account shortcuts without duplicating the full
            library page.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Files" value={totalCount} />
          <Stat label="Resumes" value={resumeCount} />
          <Stat label="Shared" value={0} />
        </div>
      </div>
    </header>
  );
};

export default OverviewHomeHeader;
