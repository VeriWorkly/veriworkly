import Link from "next/link";
import { Lock, TriangleAlert, Wrench } from "lucide-react";

import { siteConfig } from "@/config/site";
import type { AtsRestrictedReport } from "../../types";
import { ScoreSummary } from "./ScoreSummary";

/** Nothing here is hidden client-side: the server never sends the category rollup or work-history table to anonymous callers. */
export function RestrictedResults({ report }: { report: AtsRestrictedReport }) {
  const loginHref = `${siteConfig.links.app}/login?callbackURL=${encodeURIComponent(
    `${siteConfig.url}/ats-checker/scan`,
  )}`;

  const locked = [
    report.missingKeywordCount > 0
      ? `Which ${report.missingKeywordCount} job-description ${report.missingKeywordCount === 1 ? "term is" : "terms are"} missing, and which ${report.matchedKeywordCount} you already cover`
      : report.jobMatchScore === null
        ? "Full matched and missing keyword lists once you add a job description"
        : `The ${report.matchedKeywordCount} job-description ${report.matchedKeywordCount === 1 ? "term" : "terms"} your resume already covers`,
    report.parsedRoleCount > 0
      ? `“What the ATS sees”: the ${report.parsedRoleCount} work-history ${report.parsedRoleCount === 1 ? "row" : "rows"} recovered, with employer, title, dates and tenure`
      : "“What the ATS sees”: the work history a parser can recover from your document",
    report.remainingFixCount > 0
      ? `${report.remainingFixCount} further ${report.remainingFixCount === 1 ? "fix" : "fixes"}, ranked by the points each one returns`
      : "Every check's pass/fail evidence, one by one",
    "A per-area score breakdown and a copyable report",
  ];

  return (
    <div className="space-y-4">
      <ScoreSummary
        verdict={report.verdict}
        readinessScore={report.readinessScore}
        jobMatchScore={report.jobMatchScore}
        checksPassed={report.checksPassed}
        checksTotal={report.checksTotal}
      />

      {report.primaryWarning ? (
        <section className="bg-warning/10 rounded-3xl p-6 sm:p-8">
          <h2 className="text-warning flex items-center gap-2 text-base font-semibold">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" /> Most serious issue found
          </h2>
          <p className="mt-2 text-lg leading-7 font-medium">{report.primaryWarning}</p>
        </section>
      ) : null}

      {report.topFix ? (
        <section className="bg-card rounded-3xl p-6 sm:p-8">
          <h2 className="text-muted flex items-center gap-2 text-base font-semibold">
            <Wrench className="text-accent h-4 w-4" aria-hidden="true" /> Highest-impact fix
          </h2>
          <p className="mt-2 text-lg leading-7 font-semibold">{report.topFix}</p>
        </section>
      ) : null}

      <section className="bg-foreground text-background rounded-3xl p-6 sm:p-8">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <Lock className="h-5 w-5" aria-hidden="true" /> What&rsquo;s in the full report
          </h2>
          <ul className="mt-5 space-y-2">
            {locked.map((item) => (
              <li key={item} className="flex items-start gap-3 text-base leading-7 opacity-85">
                <Lock className="mt-1.5 h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={loginHref}
            className="bg-background text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-accent mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]"
          >
            Create a free account to unlock it
          </Link>
          <p className="mt-3 text-sm leading-6 opacity-70">
            Free, no card required, and it raises your limit to 2 scans a day.
          </p>
        </div>
      </section>
    </div>
  );
}

export default RestrictedResults;
