import type { Metadata } from "next";

import MasterProfileClient from "@/features/profile/components/master/MasterProfileClient";

export const metadata: Metadata = {
  title: `Master Editor`,
  description: "Guided form experience for your global resume data.",
  robots: { index: false, follow: false },
};

const MasterProfilePage = () => {
  return (
    <div className="animate-in fade-in mx-auto max-w-7xl space-y-10 px-4 py-10 duration-500 sm:px-6 lg:px-8">
      <header className="space-y-3 px-1">
        <div className="text-accent flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] uppercase">
          <div className="bg-accent h-0.5 w-6 rounded-full" />
          Data Architecture
        </div>

        <h1 className="text-foreground text-4xl font-black tracking-tight">
          Master Profile Editor
        </h1>

        <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
          The global source of truth for your professional identity. Changes here populate all
          future resume drafts.
        </p>
      </header>

      <MasterProfileClient />
    </div>
  );
};

export default MasterProfilePage;
