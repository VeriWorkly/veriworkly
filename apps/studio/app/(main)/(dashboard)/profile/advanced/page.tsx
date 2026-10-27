import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";

import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";

import AdvancedProfileClient from "@/features/profile/components/advanced/AdvancedProfileClient";

export const metadata: Metadata = {
  title: "Advanced Profile",
  description: "Bulk JSON operations and master profile data recovery.",
  robots: { index: false, follow: false },
};

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

const AdvancedProfilePage = () => {
  return (
    <main className="space-y-6" aria-labelledby="advanced-profile-title">
      <section className="border-border bg-card overflow-hidden rounded-2xl border">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="p-5 sm:p-6">
            <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">
              Advanced data
            </p>

            <h1
              id="advanced-profile-title"
              className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
            >
              JSON repair tools
            </h1>

            <p className="text-muted mt-2 max-w-2xl text-base">
              Import, export, and check your Master Profile as JSON. Your account details are not
              changed here.
            </p>
          </div>

          <div className="border-border/70 grid gap-3 border-t p-5 lg:border-t-0 lg:border-l">
            <QuickLink href="/profile" icon={ArrowLeft} label="User profile" />
            <QuickLink href="/profile/master" icon={Database} label="Guided editor" />
          </div>
        </div>
      </section>

      <AdvancedProfileClient />
    </main>
  );
};

export default AdvancedProfilePage;
