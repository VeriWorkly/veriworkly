import { CheckCircle2, GitBranch, Star, Database } from "lucide-react";

import { GithubIcon, LinkedInIcon, Card } from "@veriworkly/ui";

import { Reveal } from "@/components/marketing/Reveal";

export const IngestionSection = () => {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Core Engine 03
        </span>

        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          1-Click Career Ingestion: GitHub and LinkedIn
        </h2>

        <p className="text-muted max-w-3xl text-sm leading-relaxed sm:text-base">
          Stop manually retyping your work history and technical projects. Sync your repositories,
          languages, and career timeline directly into your private Master Profile.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Reveal>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 sm:p-8">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="border-border/80 bg-background flex size-12 items-center justify-center rounded-2xl border shadow-sm">
                    <GithubIcon className="size-6" />
                  </span>

                  <div>
                    <h3 className="text-foreground text-lg font-bold">GitHub Sync</h3>

                    <span className="text-muted text-xs">
                      For Engineers &amp; Open Source Contributors
                    </span>
                  </div>
                </div>

                <span className="bg-accent/15 text-accent rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase">
                  OAuth 2.0
                </span>
              </div>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Connect your GitHub account to import your most recently updated repositories, with
                their primary programming languages, descriptions, and star counts, straight into
                your resume and portfolio project showcases.
              </p>

              <div className="border-border/60 bg-background/70 space-y-2.5 rounded-2xl border p-4 font-mono text-xs">
                <div className="text-muted border-border/40 flex items-center justify-between border-b pb-2 text-[11px]">
                  <span className="text-foreground flex items-center gap-1.5 font-semibold">
                    <GitBranch className="text-accent size-3.5" />
                    veriworkly/core-engine
                  </span>

                  <span className="flex items-center gap-1 text-amber-500">
                    <Star className="size-3 fill-amber-500" />
                    342 stars
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500" />
                    <span className="text-muted">TypeScript (84%)</span>
                  </div>

                  <span className="font-bold text-emerald-500">Imported to Profile</span>
                </div>
              </div>

              <ul className="text-muted space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="text-accent size-3.5 shrink-0" />

                  <span>Imports descriptions, topics, and live demo links</span>
                </li>

                <li className="flex items-center gap-2">
                  <CheckCircle2 className="text-accent size-3.5 shrink-0" />

                  <span>Calculates verified language proficiency breakdown</span>
                </li>
              </ul>
            </div>

            <div className="border-border/40 mt-6 border-t pt-4">
              <span className="text-muted font-mono text-[11px]">
                Read-only repository access. We never request write permissions.
              </span>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card className="border-border/60 bg-card/40 hover:border-accent/40 relative flex h-full flex-col justify-between overflow-hidden p-6 backdrop-blur-sm transition-all duration-300 sm:p-8">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="border-border/80 bg-background flex size-12 items-center justify-center rounded-2xl border shadow-sm">
                    <LinkedInIcon className="size-6 text-[#0077b5]" />
                  </span>

                  <div>
                    <h3 className="text-foreground text-lg font-bold">LinkedIn History Import</h3>
                    <span className="text-muted text-xs">For All Career Paths</span>
                  </div>
                </div>

                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-blue-600 uppercase dark:text-blue-400">
                  PDF &amp; Data Ingest
                </span>
              </div>

              <p className="text-muted text-xs leading-relaxed sm:text-sm">
                Export your LinkedIn profile data and import it in seconds. Our parser extracts your
                work experience, education, certifications, and skills into structured JSON schema
                entries.
              </p>

              <div className="border-border/60 bg-background/70 space-y-2.5 rounded-2xl border p-4 text-xs">
                <div className="border-border/40 flex items-center justify-between border-b pb-2">
                  <span className="text-foreground flex items-center gap-1.5 font-semibold">
                    <Database className="size-3.5 text-blue-500" />
                    LinkedIn Data Archive
                  </span>

                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    100% Parsed
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[11px]">
                  <div className="border-border/40 bg-card rounded-lg border p-1.5">
                    <span className="text-foreground block font-bold">4 Roles</span>

                    <span className="text-muted text-[10px]">Experience</span>
                  </div>

                  <div className="border-border/40 bg-card rounded-lg border p-1.5">
                    <span className="text-foreground block font-bold">2 Degrees</span>

                    <span className="text-muted text-[10px]">Education</span>
                  </div>

                  <div className="border-border/40 bg-card rounded-lg border p-1.5">
                    <span className="text-foreground block font-bold">18 Skills</span>

                    <span className="text-muted text-[10px]">Categorized</span>
                  </div>
                </div>
              </div>

              <ul className="text-muted space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="text-accent size-3.5 shrink-0" />

                  <span>Cleans up informal bullet points into structured achievements</span>
                </li>

                <li className="flex items-center gap-2">
                  <CheckCircle2 className="text-accent size-3.5 shrink-0" />

                  <span>Populates your Master Profile instantly</span>
                </li>
              </ul>
            </div>

            {/*
              This previously read "Processed client-side in your browser for total
              privacy", which was the opposite of what happens: the pasted text is
              POSTed to /profiles/import/linkedin and forwarded to a third-party model
              through parseTextToResumeSchema. Our own privacy policy describes the
              real behaviour, so the marketing copy now matches it.
            */}
            <div className="border-border/40 mt-6 border-t pt-4">
              <span className="text-muted font-mono text-[11px]">
                Parsed on our servers by an AI model, then discarded. Not used for training.
              </span>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
};

export default IngestionSection;
