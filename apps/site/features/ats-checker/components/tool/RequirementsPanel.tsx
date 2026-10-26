import { CheckCircle2, CircleDashed, CircleHelp, XCircle } from "lucide-react";

import { REQUIREMENT_STATUS_LABELS, sortRequirements } from "../../data/requirements";
import type { AtsRequirement } from "../../types";

const STATUS: Record<AtsRequirement["status"], { icon: typeof CheckCircle2; className: string }> = {
  met: { icon: CheckCircle2, className: "text-success" },
  partial: { icon: CircleDashed, className: "text-warning" },
  missing: { icon: XCircle, className: "text-destructive" },
  unverifiable: { icon: CircleHelp, className: "text-muted" },
};

export function RequirementsPanel({ requirements }: { requirements: AtsRequirement[] }) {
  if (!requirements.length) return null;

  const sorted = sortRequirements(requirements);
  const met = requirements.filter((r) => r.status === "met").length;

  return (
    <section aria-labelledby="ats-requirements-heading" className="bg-card rounded-3xl p-6 sm:p-8">
      <h2 id="ats-requirements-heading" className="text-xl font-bold tracking-tight">
        Requirement by requirement
      </h2>
      <p className="text-muted mt-1 text-base leading-7">
        {met} of {requirements.length} shown by the resume. Screeners now grade each requirement on
        its own, so a gap here costs more than a missing keyword.
      </p>
      <ul className="mt-5 space-y-4">
        {sorted.map((requirement) => {
          const status = STATUS[requirement.status];
          return (
            <li
              key={`${requirement.importance}:${requirement.text}`}
              className="border-border flex items-start gap-3 border-t pt-4 first:border-t-0 first:pt-0"
            >
              <status.icon
                className={`mt-1 h-4 w-4 shrink-0 ${status.className}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base leading-7 font-medium">{requirement.text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className={`font-semibold ${status.className}`}>
                    {REQUIREMENT_STATUS_LABELS[requirement.status]}
                  </span>
                  {requirement.importance === "preferred" ? (
                    <span className="text-muted">Nice to have</span>
                  ) : null}
                  {requirement.detail ? (
                    <span className="text-muted">{requirement.detail}</span>
                  ) : null}
                </div>
                {requirement.evidence.length ? (
                  <ul className="mt-3 space-y-1.5">
                    {requirement.evidence.map((line) => (
                      <li
                        key={line}
                        className="bg-background text-muted rounded-xl px-3 py-2 text-sm leading-6"
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
