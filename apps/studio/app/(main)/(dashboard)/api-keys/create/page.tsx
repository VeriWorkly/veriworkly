import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";

import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";

import ApiKeyCreateClient from "@/features/api-keys/components/create/ApiKeyCreateClient";

export const metadata: Metadata = {
  title: "Create API Key",
  description: "Create a scoped VeriWorkly API key.",
  robots: { index: false, follow: false },
};

export default function CreateApiKeyPage() {
  return (
    <main className="space-y-6" aria-labelledby="create-api-key-title">
      <section className="border-border bg-card overflow-hidden rounded-2xl border">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="p-5 sm:p-6">
            <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">API keys</p>

            <h1
              id="create-api-key-title"
              className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
            >
              Create key
            </h1>

            <p className="text-muted mt-2 max-w-2xl text-base">
              Pick exact scopes first, then generate one secret token.
            </p>
          </div>

          <div className="border-border/70 grid gap-3 border-t p-5 lg:border-t-0 lg:border-l">
            <QuickLink href="/api-keys" icon={ArrowLeft} label="Back to keys" />
            <QuickLink href="/settings" icon={Settings} label="Settings" />
          </div>
        </div>
      </section>

      <ApiKeyCreateClient />
    </main>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="bg-background/70 hover:border-accent/40 flex items-center gap-3 rounded-xl border border-transparent p-3 text-sm font-bold transition"
    >
      <Icon className="text-accent h-4 w-4" />
      {label}
    </Link>
  );
}
