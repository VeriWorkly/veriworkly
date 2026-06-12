import { BarChart3 } from "lucide-react";

export function EmptyAnalytics() {
  return (
    <div className="mt-8 grid min-h-64 place-items-center rounded-2xl bg-[var(--color-paper)] p-6 text-center">
      <div>
        <BarChart3 className="mx-auto text-[var(--color-accent)]" size={24} aria-hidden="true" />
        <p className="mt-3 text-sm font-extrabold">Analytics start after publishing</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Publish your portfolio to begin collecting aggregate view counts.
        </p>
      </div>
    </div>
  );
}
