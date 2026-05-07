import type { Metadata } from "next";

import type { ApiKeyRecord } from "./components/apiKeys/ApiKeyTypes";

import { backendApiUrl } from "@/lib/constants";

import ProfileCTA from "./components/ProfileCTA";
import SyncSection from "./components/SyncSection";
import ApiKeySection from "./components/ApiKeySection";
import AppearanceSection from "./components/AppearanceSection";

export const metadata: Metadata = {
  title: `Settings`,
  description: "Manage workspace defaults and behavior.",
  robots: { index: false, follow: false },
};

async function fetchInitialApiKeys() {
  try {
    const response = await fetch(backendApiUrl("/api-keys"), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return { keys: [] as ApiKeyRecord[], loaded: false };
    }

    const payload = (await response.json()) as {
      data?: ApiKeyRecord[];
    };

    return { keys: payload.data ?? [], loaded: true };
  } catch {
    return { keys: [] as ApiKeyRecord[], loaded: false };
  }
}

export default async function SettingsPage() {
  const initialApiKeys = await fetchInitialApiKeys();

  return (
    <div className="animate-in fade-in mx-auto max-w-5xl px-6 py-12 duration-500">
      <header className="mb-12 space-y-2">
        <div className="text-accent flex items-center gap-2 text-xs font-bold tracking-[0.2em] uppercase">
          <div className="bg-accent h-1 w-4 rounded-full" />
          System Preferences
        </div>

        <h1 className="text-foreground text-4xl font-extrabold tracking-tight">Workspace</h1>

        <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
          Fine-tune your environment, appearance, and cloud-synchronization behavior.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <nav className="sticky top-24 hidden space-y-1 lg:block">
            {["Appearance", "Sync & Cloud", "Profile", "API Keys"].map((item) => (
              <a
                key={item}
                href={item === "API Keys" ? "#api-keys" : "#"}
                className="text-muted-foreground/60 hover:text-accent hover:bg-accent/5 block rounded-xl p-2.5 text-sm font-semibold transition-all"
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-20 lg:col-span-9">
          <AppearanceSection />
          <SyncSection />
          <ApiKeySection
            initialKeys={initialApiKeys.keys}
            initialKeysLoaded={initialApiKeys.loaded}
          />
          <ProfileCTA />
        </main>
      </div>
    </div>
  );
}
