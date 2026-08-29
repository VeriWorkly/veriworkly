import Link from "next/link";
import { Lock, Wrench } from "lucide-react";

import { siteConfig } from "@/config/site";
import type { AtsRestrictedReport } from "../../types";
import { CategoryBreakdown } from "./CategoryBreakdown";
import { ScoreSummary } from "./ScoreSummary";

const LOCKED_ITEMS = [
  "Every check's pass/fail evidence, one by one",
  "The full matched and missing keyword lists",
  "All fixes ranked by the points each one recovers",
  "A copyable report you can keep beside your editor",
];

export function RestrictedResults({ report }: { report: AtsRestrictedReport }) {
  const loginHref = `${siteConfig.links.app}/login?callbackURL=${encodeURIComponent(
    `${siteConfig.url}/ats-checker/scan`,
  )}`;

  return (
    <div className="space-y-4">
      <ScoreSummary
        verdict={report.verdict}
        readinessScore={report.readinessScore}
        jobMatchScore={report.jobMatchScore}
        checksPassed={report.checksPassed}
        checksTotal={report.checksTotal}
      />

      <CategoryBreakdown categories={report.categories} />

      {report.jobMatchScore !== null ? (
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Keyword coverage</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            Your resume covers{" "}
            <strong className="font-semibold text-zinc-900 tabular-nums dark:text-white">
              {report.matchedKeywordCount}
            </strong>{" "}
            of the terms this description leans on, and misses{" "}
            <strong className="font-semibold text-zinc-900 tabular-nums dark:text-white">
              {report.missingKeywordCount}
            </strong>
            . The terms themselves are in the full report.
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
            <Lock className="h-4 w-4 text-blue-400" aria-hidden="true" /> The rest is one login away
          </h2>
          <ul className="mt-4 space-y-2.5">
            {LOCKED_ITEMS.map((item) => (
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
            Log in for the full report
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
