"use client";

import type { LucideIcon } from "lucide-react";

import { AlertTriangle, Cloud, Database } from "lucide-react";

function StatusMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-muted/10 rounded-xl p-3">
      <div className="text-muted flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>

      <p className="mt-1 truncate text-sm font-black">{value}</p>
    </div>
  );
}

const AdvancedProfileStatusBand = ({ updatedAt }: { updatedAt: string | null }) => {
  return (
    <section className="border-border bg-card grid gap-4 rounded-2xl border p-4 sm:p-5 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
        <StatusMetric
          icon={Database}
          label="Storage"
          value={updatedAt ? "Cloud synced" : "Local only"}
        />

        <StatusMetric
          icon={Cloud}
          label="Last modified"
          value={updatedAt ? new Date(updatedAt).toLocaleDateString() : "Not synced"}
        />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-orange-500/20 bg-orange-500/3 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />

        <div>
          <h2 className="text-sm font-black text-orange-600 dark:text-orange-400">
            Direct JSON editor
          </h2>

          <p className="text-muted-foreground mt-1 text-sm leading-6">
            Use for imports, backups, and data repair. Schema validation runs before save, so broken
            JSON stays local until fixed.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AdvancedProfileStatusBand;
