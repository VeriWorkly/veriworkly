import { Trophy } from "lucide-react";

import { AmbassadorApplyForm } from "@/features/ambassador/AmbassadorApplyForm";
import type { AmbassadorStatus } from "@/features/ambassador/types";

export function AmbassadorPage({ status }: { status: AmbassadorStatus | null }) {
  const isAmbassador = status?.role === "AMBASSADOR";
  const isPending = status?.ambassadorStatus === "PENDING";

  return (
    <main className="space-y-5">
      <section className="border-border bg-card rounded-2xl border p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black">
              <Trophy className="h-6 w-6 text-amber-500" />
              Campus Ambassador Program
            </h1>
            <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
              Are you a college student or new grad? Join our Campus Ambassador program to unlock
              exclusive student-only commission rates, promotional material, and direct support.
            </p>
          </div>

          {isAmbassador ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-bold tracking-wider uppercase">
                Active Campus Ambassador
              </span>
            </div>
          ) : isPending ? (
            <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-amber-500">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-xs font-bold tracking-wider uppercase">
                Application Under Review
              </span>
            </div>
          ) : null}
        </div>

        {!isAmbassador && !isPending && <AmbassadorApplyForm />}
      </section>
    </main>
  );
}
