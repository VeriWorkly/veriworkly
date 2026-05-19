import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";

import Link from "next/link";
import { ArrowLeft, FileJson } from "lucide-react";

import MasterProfileClient from "@/features/profile/components/master/MasterProfileClient";

export const metadata: Metadata = {
  title: "Master Career Data",
  description: "Guided editor for reusable career data.",
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

const MasterProfilePage = () => {
  return (
    <main className="space-y-6" aria-labelledby="master-profile-title">
      <section className="border-border bg-card grid gap-0 overflow-hidden rounded-2xl border lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="p-5 sm:p-6">
          <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase">
            Master career data
          </p>

          <h1
            id="master-profile-title"
            className="mt-3 text-3xl font-black tracking-tight sm:text-4xl"
          >
            Guided data editor
          </h1>

          <p className="text-muted mt-2 max-w-2xl text-base">
            Reusable resume facts live here. User account profile remains separate.
          </p>
        </div>

        <div className="border-border/70 grid gap-3 border-t p-5 lg:border-t-0 lg:border-l">
          <QuickLink href="/profile" icon={ArrowLeft} label="User profile" />
          <QuickLink href="/profile/advanced" icon={FileJson} label="Advanced JSON" />
        </div>
      </section>

      <MasterProfileClient />
    </main>
  );
};

export default MasterProfilePage;
