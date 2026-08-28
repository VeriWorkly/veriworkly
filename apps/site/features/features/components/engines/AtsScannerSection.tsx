import {
  Gauge,
  ArrowRight,
  FileCheck2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

import { Card } from "@veriworkly/ui";

import { Reveal } from "@/components/marketing/Reveal";

export const AtsScannerSection = () => {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Core Engine 04
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Free Target Job ATS Resume Scanner
        </h2>

        <p className="text-muted max-w-3xl text-sm leading-relaxed sm:text-base">
          Make sure your resume parses cleanly with standard Applicant Tracking Systems and reaches human recruiters without formatting snags or missing keywords.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <Card className="border-border/60 bg-card/50 relative flex h-full flex-col justify-between overflow-hidden p-6 shadow-xl backdrop-blur-sm sm:p-7">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400">
                    <Gauge className="size-5" />
                  </span>

                  <div>
                    <h3 className="text-foreground text-sm font-bold">ATS Match Score</h3>

                    <span className="text-muted text-xs">Target: Senior Frontend Developer</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-2xl font-bold text-emerald-500">
                  <span>94</span>
                  <span className="text-muted text-sm font-normal">/ 100</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="bg-muted/30 h-2 w-full overflow-hidden rounded-full">
                  <div className="h-full w-[94%] rounded-full bg-emerald-500 transition-all duration-1000" />
                </div>

                <div className="text-muted flex justify-between font-mono text-[10px]">
                  <span>Candidate Score: 94%</span>
                  <span className="font-bold text-emerald-500">Excellent Readiness</span>
                </div>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="border-border/50 bg-background/60 flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="text-foreground font-medium">
                      Core Hard Skills (React, TypeScript, Next.js)
                    </span>
                  </div>

                  <span className="font-mono text-[10px] font-bold text-emerald-500">
                    100% Found
                  </span>
                </div>

                <div className="border-border/50 bg-background/60 flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />

                    <span className="text-foreground font-medium">
                      Standard Section Headings (Experience, Skills)
                    </span>
                  </div>

                  <span className="font-mono text-[10px] font-bold text-emerald-500">Pass</span>
                </div>

                <div className="border-border/50 bg-background/60 flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span className="text-foreground font-medium">
                      Layout &amp; Font Parser Safety
                    </span>
                  </div>

                  <span className="font-mono text-[10px] font-bold text-emerald-500">
                    Single Column Safe
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="size-4 text-amber-500" />

                    <span className="text-foreground font-medium">
                      Suggested keyword: &quot;CI/CD Pipeline Automation&quot;
                    </span>
                  </div>

                  <span className="font-mono text-[10px] font-bold text-amber-500">
                    Recommended
                  </span>
                </div>
              </div>
            </div>

            <div className="border-border/40 mt-6 flex items-center justify-between border-t pt-4">
              <span className="text-muted text-xs">Run as many free scans as you need</span>

              <Link
                href="/ats-checker"
                className="text-accent inline-flex items-center gap-1 text-xs font-bold hover:underline"
              >
                <span>Try the ATS Checker</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-span-6">
          <div className="flex h-full flex-col justify-between space-y-4">
            <div className="space-y-3">
              <Card className="border-border/60 bg-card/40 hover:border-accent/30 p-5 backdrop-blur-sm transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="bg-accent/10 text-accent mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <FileCheck2 className="size-4" />
                  </div>

                  <div>
                    <h4 className="text-foreground text-sm font-bold">
                      Job Description Keyword Gap Analysis
                    </h4>

                    <p className="text-muted mt-1 text-xs leading-relaxed">
                      We highlight the exact phrases, tools, and certifications mentioned in the job
                      posting that are currently missing from your draft so you can add your
                      relevant experience.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="border-border/60 bg-card/40 hover:border-accent/30 p-5 backdrop-blur-sm transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-4" />
                  </div>

                  <div>
                    <h4 className="text-foreground text-sm font-bold">Strict Parser Compliance</h4>

                    <p className="text-muted mt-1 text-xs leading-relaxed">
                      Every VeriWorkly template is engineered to use standard hierarchy, readable
                      UTF-8 text streams, and clean section breaks so parsers never scramble your
                      dates or company names.
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="border-border/60 bg-card/40 hover:border-accent/30 p-5 backdrop-blur-sm transition-all">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Gauge className="size-4" />
                  </div>

                  <div>
                    <h4 className="text-foreground text-sm font-bold">
                      Impact &amp; Action Verb Audits
                    </h4>

                    <p className="text-muted mt-1 text-xs leading-relaxed">
                      Flags passive phrases (&quot;assisted with&quot;, &quot;worked on&quot;) and
                      recommends strong, quantified action verbs (&quot;spearheaded&quot;,
                      &quot;optimized&quot;, &quot;engineered&quot;) to grab attention.
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="border-border/60 bg-background/50 rounded-2xl border p-4 text-xs">
              <span className="text-foreground font-semibold">100% Free Forever: </span>

              <span className="text-muted">
                Unlike other sites that charge $20/month just to view an ATS score, VeriWorkly
                provides unrestricted scoring.
              </span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default AtsScannerSection;
