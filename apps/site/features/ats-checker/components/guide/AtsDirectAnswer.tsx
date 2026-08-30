import { BookOpen, Cpu, Sparkles } from "lucide-react";
import { Reveal } from "@/components/marketing/Reveal";

export function AtsDirectAnswer() {
  return (
    <section className="border-border/40 space-y-8 border-t pt-16">
      <div className="space-y-2 text-left">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          Quick Guide &amp; Definitions
        </span>
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          What is an ATS resume checker and how does it work?
        </h2>
        <p className="text-muted max-w-2xl text-xs leading-relaxed sm:text-sm">
          The essential facts about Applicant Tracking Systems and how to make your resume pass
          automated screening.
        </p>
      </div>

      <Reveal>
        <div className="border-border/60 bg-card/40 rounded-3xl border p-6 shadow-md backdrop-blur-sm sm:p-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Box 1: What is ATS */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="bg-accent/10 text-accent ring-accent/20 flex size-8 items-center justify-center rounded-lg ring-1">
                  <Cpu className="size-4" />
                </span>
                <h3 className="text-foreground text-sm font-bold tracking-tight">
                  1. What is an ATS?
                </h3>
              </div>
              <p className="text-muted text-xs leading-relaxed">
                An <strong className="text-foreground">Applicant Tracking System (ATS)</strong> is
                recruitment management software used by mid-market and enterprise employers to
                collect, parse, categorize, and rank job applications before human review.
              </p>
            </div>

            {/* Box 2: How ATS reads your resume */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                  <BookOpen className="size-4" />
                </span>
                <h3 className="text-foreground text-sm font-bold tracking-tight">
                  2. How does ATS scan resumes?
                </h3>
              </div>
              <p className="text-muted text-xs leading-relaxed">
                The software strips formatting to extract plain text, maps work history into
                database rows, and indexes keywords from the job description to calculate search
                relevance for hiring managers.
              </p>
            </div>

            {/* Box 3: How to score higher */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-400">
                  <Sparkles className="size-4" />
                </span>
                <h3 className="text-foreground text-sm font-bold tracking-tight">
                  3. How to pass the scan?
                </h3>
              </div>
              <p className="text-muted text-xs leading-relaxed">
                Use a clean single-column structure, standard section titles (Experience, Education,
                Skills), quantify achievements with concrete numbers, and include relevant keywords
                from the job requirements.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default AtsDirectAnswer;
