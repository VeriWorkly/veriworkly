import Link from "next/link";
import { Lock, TriangleAlert, Wrench } from "lucide-react";

import { siteConfig } from "@/config/site";
import type { AtsRestrictedReport } from "../../types";
import { ScoreSummary } from "./ScoreSummary";

/**
 * The anonymous view.
 *
 * A real diagnosis — the score, the verdict, and the single most serious problem named in full —
 * followed by an honest inventory of what is still withheld, counted rather than described. The
 * counts are the offer: "7 required keywords missing" is true and specific and impossible to act
 * on without the list, which is exactly what an account unlocks.
 *
 * There is no category rollup and no recovered work-history table here, because the server never
 * sends them to an unauthenticated caller. Nothing on this screen is hidden client-side.
 */
export function RestrictedResults({ report }: { report: AtsRestrictedReport }) {
  const loginHref = `${siteConfig.links.app}/login?callbackURL=${encodeURIComponent(
    `${siteConfig.url}/ats-checker/scan`,
  )}`;

  const locked = [
    report.missingKeywordCount > 0
      ? `Which ${report.missingKeywordCount} job-description ${report.missingKeywordCount === 1 ? "term is" : "terms are"} missing, and which ${report.matchedKeywordCount} you already cover`
      : "Full matched and missing keyword lists once you add a job description",
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
        <section className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" /> Most serious issue found
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
            {report.primaryWarning}
          </p>
        </section>
      ) : null}

      {report.topFix ? (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
            <Wrench className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />{" "}
            Highest-impact fix
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            {report.topFix}
          </p>
        </section>
      ) : null}

      <section className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-white dark:border-white/10">
        <div className="pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full bg-blue-500/20 blur-[80px]" />
        <div className="relative">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="h-4 w-4 text-blue-400" aria-hidden="true" /> What&rsquo;s in the full
            report
          </h2>
          <ul className="mt-4 space-y-2.5">
            {locked.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            href={loginHref}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-zinc-950 transition hover:bg-blue-500 hover:text-white focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
          >
            Create a free account to unlock it
          </Link>
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            Free, no card required, and it raises your limit to 2 scans a day.
          </p>
        </div>
      </section>
    </div>
  );
}

export default RestrictedResults;
