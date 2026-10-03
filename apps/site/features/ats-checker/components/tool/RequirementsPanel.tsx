import { CheckCircle2, CircleDashed, CircleHelp, XCircle } from "lucide-react";

import type { AtsRequirement } from "../../types";

const STATUS: Record<
  AtsRequirement["status"],
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  met: { label: "Met", icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  partial: {
    label: "Partly met",
    icon: CircleDashed,
    className: "text-amber-600 dark:text-amber-400",
  },
  missing: { label: "Not shown", icon: XCircle, className: "text-red-600 dark:text-red-400" },
  unverifiable: {
    label: "Answer in the application",
    icon: CircleHelp,
    className: "text-zinc-500 dark:text-zinc-400",
  },
};

/**
 * The posting's requirements one by one, the way a per-qualification screener reads them: each
 * met or not, with the resume's own lines as evidence. Required ones lead; within each, the gaps
 * come first, because they are what to act on.
 */
export function RequirementsPanel({ requirements }: { requirements: AtsRequirement[] }) {
  if (!requirements.length) return null;

  const order = { missing: 0, partial: 1, unverifiable: 2, met: 3 } as const;
  const sorted = [...requirements].sort(
    (a, b) =>
      Number(a.importance === "preferred") - Number(b.importance === "preferred") ||
      order[a.status] - order[b.status],
  );
  const met = requirements.filter((r) => r.status === "met").length;

  return (
    <section
      aria-labelledby="ats-requirements-heading"
      className="rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-white/2"
    >
      <h2
        id="ats-requirements-heading"
        className="text-sm font-semibold text-zinc-900 dark:text-white"
      >
        Requirement by requirement
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {met} of {requirements.length} shown by the resume. Screeners now grade each requirement on
        its own, so a gap here costs more than a missing keyword.
      </p>
      <ul className="mt-5 space-y-4">
        {sorted.map((requirement) => {
          const status = STATUS[requirement.status];
          return (
            <li
              key={`${requirement.importance}:${requirement.text}`}
              className="flex items-start gap-3 border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0 dark:border-zinc-800/70"
            >
              <status.icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${status.className}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed font-medium text-zinc-900 dark:text-white">
                  {requirement.text}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`font-semibold ${status.className}`}>{status.label}</span>
                  {requirement.importance === "preferred" ? (
                    <span className="text-zinc-500 dark:text-zinc-400">Nice to have</span>
                  ) : null}
                  {requirement.detail ? (
                    <span className="text-zinc-500 dark:text-zinc-400">{requirement.detail}</span>
                  ) : null}
                </div>
                {requirement.evidence.length ? (
                  <ul className="mt-2 space-y-1">
                    {requirement.evidence.map((line) => (
                      <li
                        key={line}
                        className="border-l-2 border-zinc-200 pl-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
