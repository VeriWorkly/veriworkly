import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  children: ReactNode;
  /** Optional hint shown under the control (e.g. "Comma separated."). */
  help?: string;
  /** Text length against the server's limit; the counter shows once it is close. */
  count?: { length: number; max: number };
  /** Shown under the control in place of the hint, e.g. an email that will not save. */
  error?: string;
}

export function Field({ label, children, help, count, error }: FieldProps) {
  const showCount = count && count.length >= count.max * 0.8;
  return (
    <label className="grid gap-1.5 text-xs font-bold text-[var(--color-ink-soft)]">
      <span className="flex items-baseline justify-between gap-2">
        {label}
        {showCount ? (
          <span
            className={`text-[11px] font-medium tabular-nums ${
              count.length >= count.max ? "text-danger" : "text-muted"
            }`}
          >
            {count.length}/{count.max}
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="text-danger text-[11px] font-medium" role="alert">
          {error}
        </span>
      ) : help ? (
        <span className="text-muted text-[11px] font-medium">{help}</span>
      ) : null}
    </label>
  );
}
