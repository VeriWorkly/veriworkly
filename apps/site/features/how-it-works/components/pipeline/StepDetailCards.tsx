import { Database, Cpu, Globe, CheckCircle2, Sliders, Download } from "lucide-react";

import { Card } from "@veriworkly/ui";

import { Reveal } from "@/components/marketing/Reveal";

export const StepDetailCards = () => {
  return (
    <section className="space-y-12">
      <div className="mx-auto max-w-3xl space-y-2 text-center">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Step-by-Step Architecture
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          Deep Dive: How each engine works
        </h2>

        <p className="text-muted text-xs leading-relaxed sm:text-sm">
          Explore the exact technology, data flow, and privacy controls behind every stage of the
          VeriWorkly pipeline.
        </p>
      </div>

      <div className="space-y-8">
        <Reveal>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative overflow-hidden rounded-3xl p-6 backdrop-blur-sm transition-all duration-300 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-7">
                <div className="flex items-center gap-2.5">
                  <span className="bg-accent/10 text-accent ring-accent/20 rounded-lg px-2.5 py-1 font-mono text-xs font-bold ring-1">
                    Step 01
                  </span>

                  <span className="text-foreground text-lg font-bold">
                    Career Data Ingestion &amp; Master Profile
                  </span>
                </div>

                <p className="text-muted text-xs leading-relaxed sm:text-sm">
                  Your Master Profile is the single source of truth for your entire career history.
                  Instead of copying and pasting across multiple documents, ingest your repositories
                  directly from GitHub or parse your LinkedIn data archive.
                </p>

                <div className="grid gap-2.5 text-xs sm:grid-cols-2">
                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">GitHub OAuth:</strong> Imports starred
                      repos, programming language percentages, and demo URLs.
                    </span>
                  </div>

                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">LinkedIn Parser:</strong> Extracts job
                      titles, dates, degrees, and skills into structured JSON.
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-border/60 bg-background/80 space-y-3 rounded-2xl border p-5 font-mono text-xs shadow-sm lg:col-span-5">
                <div className="border-border/40 flex items-center justify-between border-b pb-2">
                  <span className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                    <Database className="text-accent size-3.5" />
                    MasterProfile.json
                  </span>

                  <span className="text-[10px] font-bold text-emerald-500">Validated</span>
                </div>

                <div className="text-muted space-y-1 text-[11px]">
                  <p>
                    <span className="text-accent">&quot;github_user&quot;</span>:{" "}
                    <span className="text-emerald-500">&quot;gautamraj&quot;</span>,
                  </p>

                  <p>
                    <span className="text-accent">&quot;repositories_synced&quot;</span>:{" "}
                    <span className="text-foreground font-bold">12</span>,
                  </p>

                  <p>
                    <span className="text-accent">&quot;primary_skills&quot;</span>: [
                    <span className="text-emerald-500">&quot;TypeScript&quot;</span>,{" "}
                    <span className="text-emerald-500">&quot;Next.js&quot;</span>,{" "}
                    <span className="text-emerald-500">&quot;Tailwind&quot;</span>],
                  </p>

                  <p>
                    <span className="text-accent">&quot;storage_type&quot;</span>:{" "}
                    <span className="text-foreground">&quot;client_localstorage&quot;</span>
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative overflow-hidden rounded-3xl p-6 backdrop-blur-sm transition-all duration-300 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-7">
                <div className="flex items-center gap-2.5">
                  <span className="bg-accent/10 text-accent ring-accent/20 rounded-lg px-2.5 py-1 font-mono text-xs font-bold ring-1">
                    Step 02
                  </span>

                  <span className="text-foreground text-lg font-bold">
                    Sandboxed Document Studio (Resumes &amp; Cover Letters)
                  </span>
                </div>

                <p className="text-muted text-xs leading-relaxed sm:text-sm">
                  When you open the builder, the studio pulls an isolated snapshot from your Master
                  Profile. You can create tailored resumes for specific job roles and matching cover
                  letters with zero risk of corrupting your master records.
                </p>

                <div className="grid gap-2.5 text-xs sm:grid-cols-2">
                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">Zero Sign-Up Required:</strong> Start
                      typing immediately; no account or credit card needed.
                    </span>
                  </div>

                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">Typographic Scale Controls:</strong> Pair
                      professional serif and sans fonts with dynamic 0.5x to 1.2x margins.
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-border/60 bg-background/80 space-y-3 rounded-2xl border p-5 text-xs shadow-sm lg:col-span-5">
                <div className="border-border/40 flex items-center justify-between border-b pb-2">
                  <span className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                    <Sliders className="text-accent size-3.5" />
                    Layout &amp; Styling Matrix
                  </span>

                  <span className="bg-accent/15 text-accent rounded-md px-2 py-0.5 font-mono text-[9px] font-bold uppercase">
                    Non-Destructive
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted">Active Typography:</span>
                    <span className="text-foreground font-semibold">Inter &amp; Source Serif</span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted">Target Page Count:</span>
                    <span className="font-bold text-emerald-500">1 Page Perfect Fit</span>
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted">Associated Cover Letter:</span>
                    <span className="text-accent font-semibold">Matched Theme</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative overflow-hidden rounded-3xl p-6 backdrop-blur-sm transition-all duration-300 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-7">
                <div className="flex items-center gap-2.5">
                  <span className="bg-accent/10 text-accent ring-accent/20 rounded-lg px-2.5 py-1 font-mono text-xs font-bold ring-1">
                    Step 03
                  </span>

                  <span className="text-foreground text-lg font-bold">
                    Target Job ATS Matching &amp; AI Diff Rewriting
                  </span>
                </div>

                <p className="text-muted text-xs leading-relaxed sm:text-sm">
                  Paste the job posting description you want to apply for. Our scoring engine checks
                  your resume against required skills, keywords, and format safety. Use AI to
                  rephrase bullets into high-impact statements with side-by-side diff previews.
                </p>

                <div className="grid gap-2.5 text-xs sm:grid-cols-2">
                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">Keyword Gap Analysis:</strong> Highlights
                      required technologies and soft skills you have not mentioned.
                    </span>
                  </div>

                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">Diff Review Mode:</strong> You review and
                      approve every single AI suggestion before applying it.
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-border/60 bg-background/80 space-y-3 rounded-2xl border p-5 font-mono text-xs shadow-sm lg:col-span-5">
                <div className="border-border/40 flex items-center justify-between border-b pb-2">
                  <span className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                    <Cpu className="text-accent size-3.5" />
                    AI Bullet Diff
                  </span>

                  <span className="text-[10px] font-bold text-emerald-500">+38% Match</span>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <p className="text-destructive/80 line-through">
                    - &quot;Worked on microservices for data processing.&quot;
                  </p>

                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                    + &quot;Architected 6 event-driven microservices handling 40K req/sec with
                    99.99% uptime.&quot;
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative overflow-hidden rounded-3xl p-6 backdrop-blur-sm transition-all duration-300 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-7">
                <div className="flex items-center gap-2.5">
                  <span className="bg-accent/10 text-accent ring-accent/20 rounded-lg px-2.5 py-1 font-mono text-xs font-bold ring-1">
                    Step 04
                  </span>

                  <span className="text-foreground text-lg font-bold">
                    100% Watermark-Free Multi-Format Exports
                  </span>
                </div>

                <p className="text-muted text-xs leading-relaxed sm:text-sm">
                  Documents compile in your browser tab using native vector rendering. Export in
                  PDF, Word (.docx), Markdown, HTML, JSON Resume, or plain text with zero watermarks
                  and zero subscription paywalls.
                </p>

                <div className="grid gap-2.5 text-xs sm:grid-cols-2">
                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">6 Standard Formats:</strong> PDF, DOCX,
                      Markdown, HTML, Plain Text, and JSON schema.
                    </span>
                  </div>

                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">Unlimited Downloads:</strong> Download as
                      many times as you need throughout your search.
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-border/60 bg-background/80 space-y-3 rounded-2xl border p-5 text-xs shadow-sm lg:col-span-5">
                <div className="border-border/40 flex items-center justify-between border-b pb-2">
                  <span className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                    <Download className="size-3.5 text-emerald-500" />
                    Client-Side Export Engine
                  </span>

                  <span className="font-mono text-[10px] font-bold text-emerald-500">
                    0 Watermarks
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    "PDF Vector",
                    "Word DOCX",
                    "Markdown",
                    "JSON Resume",
                    "Clean HTML",
                    "Plain Text",
                  ].map((f) => (
                    <span
                      key={f}
                      className="border-border/60 bg-card text-foreground rounded-md border px-2.5 py-1 font-mono text-[10px] font-medium"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative overflow-hidden rounded-3xl p-6 backdrop-blur-sm transition-all duration-300 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="space-y-4 lg:col-span-7">
                <div className="flex items-center gap-2.5">
                  <span className="bg-accent/10 text-accent ring-accent/20 rounded-lg px-2.5 py-1 font-mono text-xs font-bold ring-1">
                    Step 05
                  </span>

                  <span className="text-foreground text-lg font-bold">
                    1-Click Web Portfolio on Custom Subdomain
                  </span>
                </div>

                <p className="text-muted text-xs leading-relaxed sm:text-sm">
                  Publish a personal website at{" "}
                  <span className="text-accent font-mono">yourname.veriworkly.com</span>. Showcase
                  your resume, GitHub projects, and bio with responsive design, automatic edge SSL,
                  and zero cookies.
                </p>

                <div className="grid gap-2.5 text-xs sm:grid-cols-2">
                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">Edge Routing:</strong> Fast global CDN
                      delivery with automatic HTTPS certificates.
                    </span>
                  </div>

                  <div className="border-border/50 bg-background/60 flex items-start gap-2 rounded-xl border p-3">
                    <CheckCircle2 className="text-accent mt-0.5 size-3.5 shrink-0" />

                    <span className="text-muted leading-relaxed">
                      <strong className="text-foreground">Clean SEO:</strong> Semantic pre-rendered
                      markup with OpenGraph cards.
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-border/60 bg-background/80 space-y-3 rounded-2xl border p-5 text-xs shadow-sm lg:col-span-5">
                <div className="border-border/40 flex items-center justify-between border-b pb-2">
                  <span className="text-foreground flex items-center gap-1.5 text-[11px] font-semibold">
                    <Globe className="text-accent size-3.5" />
                    Subdomain Router
                  </span>

                  <span className="font-mono text-[10px] font-bold text-emerald-500">
                    Live (200 OK)
                  </span>
                </div>

                <div className="border-border/40 bg-card/60 space-y-1 rounded-xl border p-3">
                  <span className="text-muted font-mono text-[10px]">URL:</span>

                  <p className="text-accent font-mono text-xs font-bold">
                    gautamraj.veriworkly.com
                  </p>

                  <span className="text-muted/80 block pt-1 text-[10px]">
                    Automatic SSL / Zero Cookies / Instant Deploy
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
};

export default StepDetailCards;
