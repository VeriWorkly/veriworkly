import { categoryMeta, scoreTone, sortByCategoryOrder, TONE_CLASSES } from "../../data/categories";
import type { AtsCategoryScore } from "../../types";

export function CategoryBreakdown({ categories }: { categories: AtsCategoryScore[] }) {
  if (!categories.length) return null;

  return (
    <section
      aria-labelledby="ats-breakdown-heading"
      className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2"
    >
      <h2
        id="ats-breakdown-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-white"
      >
        Where your readiness score went
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Each area is scored on the share of its own weight your resume kept.
      </p>

      <ul className="mt-5 space-y-5">
        {sortByCategoryOrder(categories).map((entry) => {
          const meta = categoryMeta(entry.category);
          const tone = scoreTone(entry.score);
          return (
            <li key={entry.category}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
                  <meta.icon
                    className="h-4 w-4 text-zinc-500 dark:text-zinc-400"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  {meta.label}
                </span>
                <span className="flex shrink-0 items-baseline gap-2">
                  <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {entry.passed}/{entry.total} checks
                  </span>
                  <span className={`text-sm font-semibold tabular-nums ${TONE_CLASSES[tone].text}`}>
                    {entry.score}%
                  </span>
                </span>
              </div>
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10"
                role="meter"
                aria-valuenow={entry.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${meta.label}: ${entry.score} percent, ${entry.passed} of ${entry.total} checks passed`}
              >
                <div
                  className={`h-full rounded-full ${TONE_CLASSES[tone].fill}`}
                  style={{ width: `${Math.max(entry.score, 2)}%` }}
                />
              </div>
              {meta.blurb ? (
                <p className="mt-1.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {meta.blurb}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default CategoryBreakdown;
