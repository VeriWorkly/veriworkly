import {
  Zap,
  Check,
  Sparkles,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

import { Card } from "@veriworkly/ui";

import { Reveal } from "@/components/marketing/Reveal";

export const AiTailoringSection = () => {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Core Engine 02
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          AI Writing and Resume Tailoring
        </h2>

        <p className="text-muted max-w-3xl text-sm leading-relaxed sm:text-base">
          Target your resume to specific job descriptions with precision. Our AI assistant analyzes
          job requirements, optimizes bullet points with measurable impact, and lets you review
          every change side-by-side before accepting.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <Card className="border-border/60 bg-card/50 relative flex h-full flex-col justify-between overflow-hidden p-6 shadow-lg backdrop-blur-sm sm:p-7">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-accent/15 text-accent ring-accent/30 flex size-8 items-center justify-center rounded-lg ring-1">
                    <Sparkles className="size-4" />
                  </span>

                  <h3 className="text-foreground text-sm font-bold">
                    Live AI Bullet Optimization Diff
                  </h3>
                </div>

                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  +38% ATS Impact
                </span>
              </div>

              <div className="border-destructive/30 bg-destructive/5 space-y-1.5 rounded-xl border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-destructive font-mono text-[10px] font-bold tracking-wider uppercase">
                    Original Bullet Point (Draft)
                  </span>

                  <span className="text-muted text-[10px]">Vague impact</span>
                </div>

                <p className="text-foreground/80 font-mono text-xs line-through opacity-75">
                  &quot;Responsible for improving frontend performance and helping team with react
                  components.&quot;
                </p>
              </div>

              <div className="space-y-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                    AI Optimized Suggestion (Action + Metric)
                  </span>

                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3" />
                    High Match
                  </span>
                </div>

                <p className="text-foreground font-mono text-xs font-medium">
                  &quot;Architected modular React design system across 14 web services, cutting
                  bundle size by 38% and accelerating sprint velocity by 2.4x.&quot;
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="bg-accent text-accent-foreground flex-1 rounded-lg py-2 text-center text-xs font-bold shadow-xs transition-opacity hover:opacity-90"
                >
                  Accept AI Suggestion
                </button>

                <button
                  type="button"
                  className="border-border/60 bg-background text-muted hover:text-foreground flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"
                >
                  <RefreshCw className="size-3" />
                  Regenerate
                </button>
              </div>
            </div>

            <div className="border-border/40 mt-6 border-t pt-3">
              <span className="text-muted flex items-center gap-1.5 text-[11px]">
                <ShieldAlert className="text-accent size-3.5" />
                Never overwrites your master document without explicit approval
              </span>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-6">
          <div className="flex h-full flex-col justify-between space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-border/60 bg-card/40 hover:border-accent/30 space-y-2 rounded-2xl border p-5 backdrop-blur-sm transition-all">
                <div className="bg-accent/10 text-accent flex size-8 items-center justify-center rounded-lg">
                  <Zap className="size-4" />
                </div>

                <h4 className="text-foreground text-sm font-bold">Job Description Tailoring</h4>

                <p className="text-muted text-xs leading-relaxed">
                  Paste target job postings to automatically extract required keywords and reframe
                  your real experience to match hiring manager criteria.
                </p>
              </div>

              <div className="border-border/60 bg-card/40 hover:border-accent/30 space-y-2 rounded-2xl border p-5 backdrop-blur-sm transition-all">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4" />
                </div>

                <h4 className="text-foreground text-sm font-bold">Zero Hallucination Guardrails</h4>

                <p className="text-muted text-xs leading-relaxed">
                  The AI rewrites and sharpens phrasing based solely on your existing facts. It will
                  not invent jobs, degrees, or unearned credentials.
                </p>
              </div>

              <div className="border-border/60 bg-card/40 hover:border-accent/30 space-y-2 rounded-2xl border p-5 backdrop-blur-sm transition-all">
                <div className="bg-accent/10 text-accent flex size-8 items-center justify-center rounded-lg">
                  <Sparkles className="size-4" />
                </div>

                <h4 className="text-foreground text-sm font-bold">AI Cover Letter Drafting</h4>

                <p className="text-muted text-xs leading-relaxed">
                  Generate tailored, human-sounding cover letters that reference specific company
                  initiatives and highlight your most relevant career wins.
                </p>
              </div>

              <div className="border-border/60 bg-card/40 hover:border-accent/30 space-y-2 rounded-2xl border p-5 backdrop-blur-sm transition-all">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <span className="font-mono text-xs font-bold">$0</span>
                </div>

                <h4 className="text-foreground text-sm font-bold">
                  Transparent Pay-As-You-Go Credits
                </h4>

                <p className="text-muted text-xs leading-relaxed">
                  Buy a credit pack when you need one, valid for 90 days, with no subscription
                  required. Monthly plans exist if you prefer them, but nothing here bills you again
                  once your job search ends. Note the free tier includes no AI credits.
                </p>
              </div>
            </div>

            <div className="border-border/50 bg-accent/5 flex items-center justify-between rounded-2xl border p-4">
              <span className="text-foreground text-xs font-semibold">
                Want to know more about our credit model?
              </span>

              <Link
                href="/pricing"
                className="text-accent inline-flex items-center gap-1 text-xs font-bold hover:underline"
              >
                <span>View pricing details</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default AiTailoringSection;
