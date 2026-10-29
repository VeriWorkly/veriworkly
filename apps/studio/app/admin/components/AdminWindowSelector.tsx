"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { cn } from "@veriworkly/ui";

import { ADMIN_WINDOWS, parseWindowDays } from "./admin-window";

const AdminWindowSelector = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const active = parseWindowDays(searchParams.get("days") ?? undefined);

  return (
    <div
      role="group"
      aria-label="Time window"
      className="border-border bg-card inline-flex items-center gap-0.5 rounded-lg border p-0.5"
    >
      {ADMIN_WINDOWS.map((window) => (
        <button
          key={window.days}
          type="button"
          aria-pressed={active === window.days}
          onClick={() => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("days", String(window.days));
            router.push(`/admin?${next.toString()}`);
          }}
          className={cn(
            "focus-visible:ring-accent admin-numeric rounded-[6px] px-2.5 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:outline-none",
            active === window.days
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground hover:bg-admin-inset",
          )}
        >
          {window.label}
        </button>
      ))}
    </div>
  );
};

export default AdminWindowSelector;
