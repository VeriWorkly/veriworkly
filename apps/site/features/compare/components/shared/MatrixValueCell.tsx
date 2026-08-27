import { Check, Minus, X, AlertTriangle } from "lucide-react";

import { type MatrixValue } from "../../types";

interface MatrixValueCellProps {
  value: MatrixValue | undefined;
  emphasize?: boolean;
}

export const MatrixValueCell = ({ value, emphasize }: MatrixValueCellProps) => {
  if (value === undefined || value === null)
    return (
      <span className="text-muted/40 inline-flex items-center">
        <Minus className="size-4" aria-hidden="true" />
      </span>
    );

  if (typeof value === "boolean") {
    return value ? (
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-transform ${
            emphasize
              ? "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400"
              : "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          }`}
        >
          <Check className="size-3.5 stroke-[2.5]" aria-hidden="true" />
        </span>

        <span className="text-foreground sr-only text-xs font-medium">Yes</span>
      </div>
    ) : (
      <div className="flex items-center gap-1.5">
        <span className="bg-destructive/10 text-destructive/80 ring-destructive/20 inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-1">
          <X className="size-3.5 stroke-[2.5]" aria-hidden="true" />
        </span>

        <span className="text-muted sr-only text-xs">No</span>
      </div>
    );
  }

  const isLimited =
    value.toLowerCase().includes("limit") ||
    value.toLowerCase().includes("trial") ||
    value.toLowerCase().includes("capped") ||
    value.toLowerCase().includes("paid") ||
    value.toLowerCase().includes("watermark") ||
    value.toLowerCase().includes("required");

  const isPositive =
    value.toLowerCase().includes("unlimited") ||
    value.toLowerCase().includes("included") ||
    value.toLowerCase().includes("not required");

  return (
    <div className="flex items-start gap-1.5">
      {isLimited && (
        <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
          <AlertTriangle className="size-2.5" aria-hidden="true" />
        </span>
      )}

      {isPositive && !emphasize && (
        <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Check className="size-2.5 stroke-[2.5]" aria-hidden="true" />
        </span>
      )}

      <span
        className={`text-xs leading-relaxed ${
          emphasize
            ? "text-foreground font-semibold"
            : isLimited
              ? "text-foreground/90 font-medium"
              : "text-muted font-normal"
        }`}
      >
        {value}
      </span>
    </div>
  );
};

export default MatrixValueCell;
