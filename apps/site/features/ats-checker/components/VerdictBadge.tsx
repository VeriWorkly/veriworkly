import { CheckCircle2, TriangleAlert, XCircle } from "lucide-react";

import type { AtsVerdict } from "@/features/ats-checker/types";

/**
 * The icon is not decoration here: verdict is the one place where a reader could otherwise be
 * asked to distinguish green from amber from red alone, so each state carries a distinct glyph
 * and explicit wording as well as colour.
 */
const CONFIG: Record<AtsVerdict, { label: string; className: string; icon: typeof CheckCircle2 }> =
  {
    strong: {
      label: "Strong - ready to send",
      className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    "needs-work": {
      label: "Needs work before you apply",
      className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      icon: TriangleAlert,
    },
    weak: {
      label: "Weak - likely to be filtered out",
      className: "bg-red-500/10 text-red-700 dark:text-red-400",
      icon: XCircle,
    },
  };

export function VerdictBadge({ verdict }: { verdict: AtsVerdict }) {
  const { label, className, icon: Icon } = CONFIG[verdict];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${className}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" /> {label}
    </span>
  );
}
