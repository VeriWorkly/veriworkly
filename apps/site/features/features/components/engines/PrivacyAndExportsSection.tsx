import { Download, ShieldCheck, CheckCircle2 } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { Reveal } from "@/components/marketing/Reveal";

import { EXPORT_FORMATS } from "../../data";

export const PrivacyAndExportsSection = () => {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Core Engine 06
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Multi-Format Exports and Local-First Privacy
        </h2>

        <p className="text-muted max-w-3xl text-sm leading-relaxed sm:text-base">
          You own your career data. Export in six standard formats with zero watermarks, zero
          download limits, and complete local-first storage right in your browser.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_FORMATS.map((fmt) => (
          <Reveal key={fmt.ext}>
            <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between overflow-hidden p-5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="bg-accent/10 text-accent ring-accent/20 rounded-lg px-2.5 py-1 font-mono text-xs font-bold ring-1">
                    .{fmt.ext.toLowerCase()}
                  </span>

                  <span className="border-border/60 bg-background text-muted rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold">
                    {fmt.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-foreground text-sm font-bold">{fmt.name}</h4>

                  <p className="text-muted text-xs leading-relaxed">{fmt.desc}</p>
                </div>
              </div>

              <div className="border-border/40 mt-4 flex items-center justify-between border-t pt-3">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                  <CheckCircle2 className="size-3" />
                  100% Watermark-Free
                </span>

                <Download className="text-muted size-3.5" />
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="border-border/60 bg-card/50 relative overflow-hidden rounded-3xl border p-6 shadow-lg backdrop-blur-md sm:p-8">
          <div className="bg-accent/10 pointer-events-none absolute top-0 right-0 size-80 rounded-full blur-3xl" />

          <div className="grid gap-6 md:grid-cols-12 md:items-center">
            <div className="space-y-3 md:col-span-8">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400">
                  <ShieldCheck className="size-4" />
                </span>

                <span className="text-foreground text-base font-bold">
                  Why Local-First Storage Protects You
                </span>
              </div>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Unlike cloud-only resume builders that monetize your personal phone numbers,
                addresses, and career history, VeriWorkly stores everything in your browser&apos;s
                LocalStorage. If you clear your cache or change devices, you can create a 1-click
                JSON backup or opt into secure passwordless cloud sync.
              </p>
            </div>

            <div className="border-border/50 bg-background/80 space-y-2 rounded-2xl border p-4 font-mono text-xs md:col-span-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Storage:</span>
                <span className="font-bold text-emerald-500">Browser LocalStorage</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Mandatory Sign-Up:</span>
                <span className="font-bold text-emerald-500">None (0s start)</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Watermarks:</span>
                <span className="font-bold text-emerald-500">Zero, never</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
};

export default PrivacyAndExportsSection;
