import { BarChart3 } from "lucide-react";

/** `isLive`: a published site with no visits yet is told so, not to publish (P-044). */
export function EmptyAnalytics({ isLive }: { isLive: boolean }) {
  return (
    <div className="mt-8 grid min-h-64 place-items-center rounded-2xl bg-[var(--color-paper)] p-6 text-center">
      <div>
        <BarChart3 className="mx-auto text-[var(--color-accent)]" size={24} aria-hidden="true" />
        <p className="mt-3 text-sm font-extrabold">
          {isLive ? "No visits yet" : "Analytics start after publishing"}
        </p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          {isLive
            ? "Share your portfolio link. Views from the last 30 days show here."
            : "Publish your portfolio to begin collecting aggregate view counts."}
        </p>
      </div>
    </div>
  );
}
