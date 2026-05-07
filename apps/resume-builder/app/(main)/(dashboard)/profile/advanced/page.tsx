import type { Metadata } from "next";

import AdvancedProfileClient from "@/features/profile/components/advanced/AdvancedProfileClient";

export const metadata: Metadata = {
  title: `Advanced Profile`,
  description: "Bulk JSON operations and master profile data recovery.",
  robots: { index: false, follow: false },
};

export default function AdvancedProfilePage() {
  return (
    <div className="animate-in fade-in mx-auto max-w-5xl space-y-8 py-10 duration-500">
      <header className="space-y-3 px-1">
        <div className="text-accent flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] uppercase">
          <div className="bg-accent h-0.5 w-6 rounded-full" />
          Power Tools
        </div>

        <h1 className="text-foreground text-4xl font-black tracking-tight">Advanced Data</h1>

        <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
          Direct JSON access for bulk migrations, environment porting, and manual backup recovery.
        </p>
      </header>

      <AdvancedProfileClient />
    </div>
  );
}
