import { Search } from "lucide-react";

export const UniversalSearch = () => {
  return (
    <section className="border-border bg-card relative overflow-hidden rounded-4xl border px-6 py-12 text-center md:px-10 md:py-24">
      <div className="bg-accent/5 pointer-events-none absolute inset-0 blur-3xl" />

      <div className="relative mx-auto max-w-2xl space-y-8">
        <div className="bg-foreground text-background mx-auto flex size-20 items-center justify-center rounded-3xl shadow-2xl shadow-black/20">
          <Search className="size-10" />
        </div>

        <div className="space-y-4">
          <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Search</p>

          <h2 className="text-foreground text-4xl font-semibold tracking-tight md:text-5xl">
            Universal Search.
          </h2>

          <p className="text-muted text-xl leading-relaxed font-medium">
            Find guides, ATS Engine docs and API reference pages in one unified search interface.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 pt-4">
          <kbd className="bg-background border-border rounded-2xl border px-6 py-3 font-mono text-xl font-bold shadow-sm">
            ⌘ K or Ctrl K
          </kbd>

          <span className="text-muted text-xs font-bold tracking-[0.2em] uppercase">
            Instant Access
          </span>
        </div>
      </div>
    </section>
  );
};
