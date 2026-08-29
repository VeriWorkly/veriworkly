import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";

/**
 * A static, server-rendered rendition of the real report, shown on the landing page so the page
 * is not asking people to imagine what they get. Deliberately not the live component: it must
 * paint on the server with no API call, no client bundle, and no fabricated interactivity.
 *
 * The numbers are illustrative and labelled as such below the figure.
 */
const AREAS = [
  { label: "Parsing & extraction", score: 100, tone: "good" },
  { label: "Contact & links", score: 86, tone: "good" },
  { label: "Document structure", score: 72, tone: "warn" },
  { label: "Evidence & impact", score: 48, tone: "bad" },
  { label: "Format risk profile", score: 91, tone: "good" },
] as const;

const FILL = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  bad: "bg-rose-500",
} as const;

const TEXT = {
  good: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  bad: "text-rose-600 dark:text-rose-400",
} as const;

const FIXES = [
  { icon: XCircle, tone: "bad", text: "Only 2 of 14 bullets carry measurable numbers", points: 10 },
  { icon: TriangleAlert, tone: "warn", text: "Missing recognized skills header section", points: 6 },
  { icon: CheckCircle2, tone: "good", text: "Contact details sit in the top 30% parsing zone", points: 0 },
] as const;

export function ReportPreview() {
  return (
    <figure className="w-full">
      <div className="border-border/70 bg-card/60 relative overflow-hidden rounded-3xl border shadow-2xl backdrop-blur-md">
        {/* Terminal Header */}
        <div className="border-border/40 flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-rose-500/80" />
            <span className="size-2.5 rounded-full bg-amber-500/80" />
            <span className="size-2.5 rounded-full bg-emerald-500/80" />
            <span className="text-muted/80 ml-2 font-mono text-[11px]">ats-report.json</span>
          </div>

          <span className="border-border/60 bg-background/80 text-muted inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px]">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Sample Report Output
          </span>
        </div>

        <div className="p-6 sm:p-7">
          {/* Dual Scores */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-muted font-mono text-xs font-semibold uppercase tracking-wider">
                ATS Readiness
              </p>
              <p className="text-foreground mt-1 flex items-baseline gap-1.5 font-mono text-4xl font-bold tracking-tight tabular-nums">
                74
                <span className="text-muted font-mono text-base font-normal">/ 100</span>
              </p>
            </div>

            <div className="text-right">
              <p className="text-muted font-mono text-xs font-semibold uppercase tracking-wider">
                Job Match
              </p>
              <p className="text-foreground mt-1 flex items-baseline justify-end gap-1.5 font-mono text-4xl font-bold tracking-tight tabular-nums">
                61
                <span className="text-muted font-mono text-base font-normal">/ 100</span>
              </p>
            </div>
          </div>

          {/* Verdict Badge */}
          <div className="mt-4">
            <span className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
              <TriangleAlert className="size-3.5" />
              Needs work before you apply
            </span>
          </div>

          {/* Area Progress Bars */}
          <ul className="border-border/30 mt-6 space-y-3.5 border-t pt-5">
            {AREAS.map((area) => (
              <li key={area.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground/90 text-xs font-medium">{area.label}</span>
                  <span className={`font-mono text-xs font-bold tabular-nums ${TEXT[area.tone]}`}>
                    {area.score}%
                  </span>
                </div>
                <div className="bg-muted/15 mt-1.5 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-all ${FILL[area.tone]}`}
                    style={{ width: `${area.score}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          {/* Actionable Fixes Strip */}
          <ul className="border-border/30 mt-6 space-y-2.5 border-t pt-5">
            {FIXES.map((fix) => (
              <li key={fix.text} className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2 min-w-0">
                  <fix.icon className={`mt-0.5 size-4 shrink-0 ${TEXT[fix.tone]}`} />
                  <span className="text-muted text-xs leading-relaxed truncate sm:text-wrap">
                    {fix.text}
                  </span>
                </div>
                {fix.points ? (
                  <span className="border-border/60 bg-background/80 text-foreground font-mono shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums">
                    +{fix.points} pts
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <figcaption className="text-muted/80 mt-3.5 text-center font-mono text-[11px]">
        Sample scanner output. Your exact score is computed from your resume text in volatile memory.
      </figcaption>
    </figure>
  );
}

export default ReportPreview;
