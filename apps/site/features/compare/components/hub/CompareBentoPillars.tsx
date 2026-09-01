import { LockOpen, ShieldCheck, Globe, CheckCircle2 } from "lucide-react";

import { Card } from "@veriworkly/ui";

export const CompareBentoPillars = () => {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Why We Built VeriWorkly
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Three simple things we do differently
        </h2>

        <p className="text-muted max-w-2xl text-sm leading-relaxed">
          Most resume sites lure you in, wait until you finish writing, and then hit you with a
          subscription paywall on the download button. We built VeriWorkly to fix that.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex flex-col justify-between overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:p-7">
          <div className="space-y-4">
            <div className="bg-accent/10 text-accent ring-accent/20 flex size-10 items-center justify-center rounded-xl ring-1">
              <LockOpen className="size-5" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-foreground text-lg font-bold tracking-tight">
                No Sign-Up Needed to Start
              </h3>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                You do not need to create an account, verify an email, or give us a phone number.
                Open the builder and start typing right away.
              </p>
            </div>

            <div className="border-border/50 bg-background/70 space-y-2 rounded-xl border p-3 font-mono text-[11px]">
              <div className="text-muted flex items-center justify-between">
                <span>Time to start editing:</span>

                <span className="font-bold text-emerald-500">Right now (0s)</span>
              </div>

              <div className="text-muted flex items-center justify-between">
                <span>Personal data saved:</span>

                <span className="font-bold text-emerald-500">100% on your device</span>
              </div>
            </div>
          </div>

          <div className="border-border/40 mt-5 border-t pt-3">
            <span className="text-accent flex items-center gap-1.5 text-xs font-semibold">
              <CheckCircle2 className="size-3.5" />
              <span>Your data stays private with you</span>
            </span>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex flex-col justify-between overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:p-7">
          <div className="space-y-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-foreground text-lg font-bold tracking-tight">
                Free Downloads Without Watermarks
              </h3>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Your resume should look clean and professional, not like a billboard for a software
                company. Download PDF, Word (.docx), and Markdown files with zero logos.
              </p>
            </div>

            <div className="border-border/50 bg-background/70 space-y-2 rounded-xl border p-3 font-mono text-[11px]">
              <div className="text-muted flex items-center justify-between">
                <span>Watermarks or stamps:</span>
                <span className="font-bold text-emerald-500">Zero, never</span>
              </div>

              <div className="text-muted flex items-center justify-between">
                <span>Available formats:</span>
                <span className="text-foreground font-bold">PDF, Word (DOCX), MD</span>
              </div>
            </div>
          </div>

          <div className="border-border/40 mt-5 border-t pt-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              <span>Download whenever you want</span>
            </span>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex flex-col justify-between overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:p-7">
          <div className="space-y-4">
            <div className="bg-accent/10 text-accent ring-accent/20 flex size-10 items-center justify-center rounded-xl ring-1">
              <Globe className="size-5" aria-hidden="true" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-foreground text-lg font-bold tracking-tight">
                Resumes, Cover Letters & Portfolios
              </h3>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Build your resume, draft a matching cover letter, and publish a personal portfolio
                website on your own veriworkly.com subdomain. Free core templates carry a small
                badge; premium templates and badge removal are paid. Opening at launch.
              </p>
            </div>

            <div className="border-border/50 bg-background/70 space-y-2 rounded-xl border p-3 font-mono text-[11px]">
              <div className="text-muted flex items-center justify-between">
                <span>Personal website URL:</span>
                <span className="text-accent font-bold">yourname.veriworkly.com</span>
              </div>

              <div className="text-muted flex items-center justify-between">
                <span>GitHub project import:</span>
                <span className="font-bold text-emerald-500">Included</span>
              </div>
            </div>
          </div>

          <div className="border-border/40 mt-5 border-t pt-3">
            <span className="text-accent flex items-center gap-1.5 text-xs font-semibold">
              <CheckCircle2 className="size-3.5" />
              <span>Everything you need to apply</span>
            </span>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default CompareBentoPillars;
