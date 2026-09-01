import { ScoreGauge } from "./ScoreGauge";
import { VerdictBadge } from "./VerdictBadge";
import type { AtsVerdict } from "../../types";

interface ScoreSummaryProps {
  verdict: AtsVerdict;
  readinessScore: number;
  jobMatchScore: number | null;
  checksPassed: number;
  checksTotal: number;
}

export function ScoreSummary({
  verdict,
  readinessScore,
  jobMatchScore,
  checksPassed,
  checksTotal,
}: ScoreSummaryProps) {
  return (
    <section
      aria-labelledby="ats-score-heading"
      className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2"
    >
      <div className="flex flex-col items-center gap-4">
        <h2 id="ats-score-heading" className="sr-only">
          Your scores
        </h2>
        <VerdictBadge verdict={verdict} />
        <div className="flex w-full flex-wrap items-start justify-center gap-8 sm:gap-12">
          <ScoreGauge
            score={readinessScore}
            label="ATS readiness"
            caption="Parsing and formatting. Fixed by editing the layout, not the role."
          />
          {jobMatchScore !== null ? (
            <ScoreGauge
              score={jobMatchScore}
              label="Job match"
              size="sm"
              caption="Keyword coverage against the description you pasted."
            />
          ) : (
            <div className="flex max-w-52 flex-col items-center gap-2 self-center rounded-2xl border border-dashed border-zinc-300 px-5 py-6 text-center dark:border-zinc-700">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                No job match yet
              </p>
              <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                Add a job description to score keyword coverage for a specific role.
              </p>
            </div>
          )}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          <span className="font-semibold text-zinc-900 tabular-nums dark:text-white">
            {checksPassed} of {checksTotal}
          </span>{" "}
          checks passed
        </p>
      </div>
    </section>
  );
}

export default ScoreSummary;
