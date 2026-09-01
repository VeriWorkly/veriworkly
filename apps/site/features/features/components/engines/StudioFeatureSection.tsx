import Link from "next/link";
import { FileText, Sliders, CheckCircle2, ArrowRight, Eye } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { siteConfig } from "@/config/site";

import { Reveal } from "@/components/marketing/Reveal";

export const StudioFeatureSection = () => {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Core Engine 01
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Document Studio: Resumes and Cover Letters
        </h2>

        <p className="text-muted max-w-3xl text-sm leading-relaxed sm:text-base">
          A distraction-free writing environment built for job seekers. Write and format your
          documents with real-time visual feedback and pixel-perfect layout controls.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 sm:p-8">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="bg-accent/10 text-accent ring-accent/20 flex size-10 items-center justify-center rounded-xl ring-1">
                  <FileText className="size-5" />
                </span>

                <div>
                  <h3 className="text-foreground text-lg font-bold">Dual Document Creation</h3>

                  <span className="text-muted text-xs">
                    Resumes, CVs, and matched Cover Letters
                  </span>
                </div>
              </div>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Tailor a resume per application from your Master Profile without duplicating effort.
                Draft cover letters that share the same typographic scale and design theme as your
                resume for a cohesive application package. Work locally on as many drafts as you
                like; a free account syncs one active document per type, and Creator Pro lifts that.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border-border/50 bg-background/50 space-y-1 rounded-xl border p-3.5">
                  <div className="text-foreground flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="text-accent size-3.5" />
                    <span>Typographic Harmony</span>
                  </div>

                  <p className="text-muted text-[11px] leading-relaxed">
                    Switch between three typefaces chosen for on-screen and print legibility: Geist,
                    Manrope, and Inter.
                  </p>
                </div>

                <div className="border-border/50 bg-background/50 space-y-1 rounded-xl border p-3.5">
                  <div className="text-foreground flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="text-accent size-3.5" />
                    <span>Dynamic Margins &amp; Spacing</span>
                  </div>

                  <p className="text-muted text-[11px] leading-relaxed">
                    Fine-tune page margins from 16px to 52px to fit your career history cleanly onto
                    one or two pages.
                  </p>
                </div>

                <div className="border-border/50 bg-background/50 space-y-1 rounded-xl border p-3.5">
                  <div className="text-foreground flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="text-accent size-3.5" />
                    <span>Non-Destructive Sections</span>
                  </div>

                  <p className="text-muted text-[11px] leading-relaxed">
                    Add, reorder, or hide custom sections (Projects, Publications, Awards) with
                    drag-and-drop ease.
                  </p>
                </div>

                <div className="border-border/50 bg-background/50 space-y-1 rounded-xl border p-3.5">
                  <div className="text-foreground flex items-center gap-2 text-xs font-semibold">
                    <CheckCircle2 className="text-accent size-3.5" />
                    <span>Instant Live Preview</span>
                  </div>

                  <p className="text-muted text-[11px] leading-relaxed">
                    The in-browser preview is checked against the compiled PDF by an automated
                    parity suite on every change.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-border/40 mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <span className="text-muted text-xs">
                Includes all core resume and cover letter templates
              </span>

              <Link
                href="/templates/resume"
                className="text-accent inline-flex items-center gap-1.5 text-xs font-bold hover:underline"
              >
                <span>Browse resume templates</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="border-border/60 bg-card/60 relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-md">
            <div className="space-y-4">
              <div className="border-border/40 bg-muted/20 flex items-center justify-between rounded-xl border px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500/70" />
                  <span className="size-2.5 rounded-full bg-amber-500/70" />
                  <span className="size-2.5 rounded-full bg-emerald-500/70" />

                  <span className="text-muted ml-2 font-mono text-[10px]">
                    app.veriworkly.com/editor
                  </span>
                </div>

                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-600 uppercase dark:text-emerald-400">
                  Live Sync
                </span>
              </div>

              <div className="border-border/60 bg-background/90 space-y-4 rounded-2xl border p-5 shadow-inner">
                <div className="border-border/40 border-b pb-3">
                  <div className="text-foreground text-base font-bold">Gautam Raj</div>

                  <div className="text-accent font-mono text-xs">Senior Frontend Engineer</div>

                  <div className="text-muted mt-1 flex flex-wrap gap-2 text-[10px]">
                    <span>San Francisco, CA</span>
                    <span>gautam@veriworkly.com</span>
                    <span>github.com/gautam25raj</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-foreground">Staff Software Engineer</span>

                    <span className="text-muted font-mono text-[10px]">2022 to Present</span>
                  </div>

                  <p className="text-muted text-[11px] leading-relaxed">
                    Led architectural redesign of core web client, reducing initial page load by 42%
                    across 1.2M daily active users.
                  </p>
                </div>

                <div className="border-accent/30 bg-accent/5 rounded-xl border p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-foreground flex items-center gap-1.5 font-semibold">
                      <Sliders className="text-accent size-3" />
                      Page Margin Controls
                    </span>

                    <span className="text-accent font-mono font-bold">24px Compact</span>
                  </div>

                  <div className="bg-muted/30 mt-2 h-1.5 w-full overflow-hidden rounded-full">
                    <div className="bg-accent h-full w-[70%]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href={siteConfig.links.app}
                className="bg-foreground text-background hover:bg-foreground/90 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-colors"
              >
                <Eye className="size-3.5" />
                <span>Try the Live Studio (No Sign-Up)</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default StudioFeatureSection;
