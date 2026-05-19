import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import Link from "next/link";
import { ArrowRight, Cloud, KeyRound, Palette, ShieldCheck } from "lucide-react";

import SyncSection from "./components/SyncSection";
import AppearanceSection from "./components/AppearanceSection";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage workspace defaults and behavior.",
  robots: { index: false, follow: false },
};

const settingsNav = [
  ["Appearance", "#appearance", Palette],
  ["Sync", "#sync", Cloud],
] satisfies Array<[string, string, LucideIcon]>;

function SettingsPanel({
  children,
  icon: Icon,
  id,
  text,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  id: string;
  text: string;
  title: string;
}) {
  return (
    <section
      id={id}
      className="border-border bg-card rounded-2xl border p-5 sm:p-6"
      aria-labelledby={`${id}-title`}
    >
      <div className="mb-5 flex items-start gap-3">
        <span className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="h-5 w-5" />
        </span>

        <div>
          <h2 id={`${id}-title`} className="text-lg font-black">
            {title}
          </h2>

          <p className="text-muted text-sm">{text}</p>
        </div>
      </div>

      {children}
    </section>
  );
}

const SettingsPage = async () => {
  return (
    <main className="space-y-6" aria-labelledby="settings-title">
      <section className="border-border bg-card grid gap-0 overflow-hidden rounded-2xl border lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="p-5 sm:p-6">
          <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">Settings</p>

          <div className="mt-3">
            <div>
              <h1 id="settings-title" className="text-3xl font-black tracking-tight sm:text-4xl">
                Workspace controls
              </h1>

              <p className="text-muted mt-2 max-w-2xl text-base">
                Tune studio behavior without mixing in profile identity or developer tokens.
              </p>
            </div>
          </div>
        </div>

        <div className="border-border/70 border-t p-5 lg:border-t-0 lg:border-l">
          <div className="bg-background/70 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-accent h-4 w-4" />
              <span className="text-sm font-bold">Private workspace</span>
            </div>

            <p className="text-muted mt-2 text-sm leading-6">
              Account profile lives on Profile. API keys live on their own page.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav
            className="border-border bg-card rounded-2xl border p-2"
            aria-label="Settings sections"
          >
            {settingsNav.map(([label, href, Icon]) => (
              <Link
                key={href}
                href={href}
                className="text-foreground/80 hover:bg-background hover:text-foreground flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="space-y-5">
          <SettingsPanel
            icon={Palette}
            id="appearance"
            title="Appearance"
            text="Theme and visual preferences for the studio."
          >
            <AppearanceSection />
          </SettingsPanel>

          <SettingsPanel
            id="sync"
            icon={Cloud}
            title="Sync"
            text="Cloud behavior and local-first controls."
          >
            <SyncSection />
          </SettingsPanel>

          <Link
            href="/api-keys"
            className="border-border bg-card hover:border-accent/50 group flex items-center justify-between gap-4 rounded-2xl border p-5 transition hover:shadow-sm sm:p-6"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <KeyRound className="h-5 w-5" />
              </span>

              <span className="min-w-0">
                <span className="block text-lg font-black">Developer API keys</span>
                <span className="text-muted block text-sm">
                  Create, rotate, and delete integration tokens on a dedicated page.
                </span>
              </span>
            </span>

            <ArrowRight className="text-muted group-hover:text-accent h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </main>
  );
};

export default SettingsPage;
