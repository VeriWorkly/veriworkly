"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { portfolioWorkspaceUrl } from "@/config/site";

const primaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-xs font-extrabold text-accent-ink transition hover:-translate-y-0.5 hover:bg-accent-strong";
const secondaryAction =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 text-xs font-extrabold text-ink transition hover:-translate-y-0.5 hover:border-line-strong";

export interface DashboardHeaderProps {
  userName?: string | null;
  slug?: string;
  isLive: boolean;
}

export function DashboardHeader({ userName, slug, isLive }: DashboardHeaderProps) {
  const greeting = useTimeOfDay();

  // Only offer the link when the site actually resolves. It used to appear as soon as a
  // draft existed, so every unpublished user got a prominent button to a 404.
  const publicUrl = isLive && slug ? portfolioWorkspaceUrl(slug).href : null;

  return (
    <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <p className="text-accent text-xs font-extrabold">Your portfolio today</p>
        <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-[-.04em] text-balance sm:text-4xl">
          {greeting}, {firstName(userName)}.
        </h1>
        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          Keep your public story sharp, see what is earning attention, and know exactly what to
          improve next.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {publicUrl ? (
          <a className={secondaryAction} href={publicUrl} target="_blank" rel="noreferrer">
            View live site <ExternalLink size={13} />
          </a>
        ) : null}
        <Link className={primaryAction} href="/editor">
          Continue editing <ArrowRight size={14} />
        </Link>
      </div>
    </header>
  );
}

function firstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] || "there";
}

/**
 * Resolved after mount on purpose. Read during render, `new Date().getHours()` returns
 * the *server's* timezone during SSR and the visitor's on hydration, so the greeting
 * could be generated for one time of day and hydrated as another — a mismatch React
 * has to patch over, and one that shows a user in Sydney "Good evening" at breakfast.
 * The neutral opener renders identically on both passes.
 */
function useTimeOfDay() {
  // Same mounted-check pattern WorkspaceNavigation uses: the server snapshot is `false`
  // and the client snapshot `true`, so the first client render still matches the HTML
  // and the clock is only read once React is running in the browser.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) return "Welcome back";

  const hour = new Date().getHours();

  return `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}`;
}
