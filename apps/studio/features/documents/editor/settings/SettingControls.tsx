"use client";

import type { CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { useId } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@veriworkly/ui";

/**
 * Design-panel controls shared by every document editor: a labelled colour swatch, a range
 * with a progress fill, a styled select, a text field, and the label/hint wrapper they sit in.
 *
 * Moved here from `features/resume/editor/settings/`, where the cover-letter panel had to
 * reach across the feature boundary to import them. Nothing about them is resume-specific,
 * and the old location implied the cover letter is built on the resume — it is not; both
 * are built on `features/documents/`. Same reasoning, and the same destination, as
 * `SectionAccordion`, the form primitives, and `DocumentTemplatePickerModal`.
 */
/** What a control needs from its field: the id the label points at, and what describes it. */
interface SettingsControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

/**
 * The hint and the error sit outside the `<label>` and reach the control through
 * `aria-describedby`: inside it, a screen reader reads them as part of the control's name.
 */
function SettingsField({
  children,
  error,
  hint,
  label,
}: {
  children: (control: SettingsControlProps) => ReactNode;
  error?: string;
  hint?: string;
  label: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <div className="grid gap-2 text-sm">
      <span className="flex items-center justify-between gap-3">
        <label className="text-foreground font-medium" htmlFor={id}>
          {label}
        </label>
        {hint ? (
          <span className="text-muted text-xs tabular-nums" id={hintId}>
            {hint}
          </span>
        ) : null}
      </span>
      {children({
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {error ? (
        <p className="text-xs font-medium text-red-500" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface SettingsSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function SettingsSelect({ children, label, className, ...props }: SettingsSelectProps) {
  return (
    <SettingsField label={label}>
      {(control) => (
        <span className="relative block">
          <select
            {...control}
            className={cn(
              "border-border bg-background text-foreground focus:border-accent/50 focus:ring-accent/20 h-10 w-full appearance-none rounded-xl border px-3 pr-9 text-sm shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent)] transition outline-none focus:ring-2",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="text-muted pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2" />
        </span>
      )}
    </SettingsField>
  );
}

interface SettingsTextProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  error?: string;
  hint?: string;
  label: string;
}

export function SettingsText({ className, error, hint, label, ...props }: SettingsTextProps) {
  return (
    <SettingsField error={error} label={label} hint={hint}>
      {(control) => (
        <input
          {...control}
          className={cn(
            "border-border bg-background text-foreground placeholder:text-muted focus:border-accent/50 focus:ring-accent/20 h-10 w-full rounded-xl border px-3 text-sm shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent)] transition outline-none focus:ring-2",
            "aria-invalid:border-destructive/60 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/15",
            className,
          )}
          type="text"
          {...props}
        />
      )}
    </SettingsField>
  );
}

interface SettingsRangeProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  value: number;
}

export function SettingsRange({ label, max, min, value, ...props }: SettingsRangeProps) {
  const numericMin = Number(min ?? 0);
  const numericMax = Number(max ?? 100);
  const progress =
    numericMax > numericMin ? ((Number(value) - numericMin) / (numericMax - numericMin)) * 100 : 0;

  return (
    <SettingsField label={label} hint={String(value)}>
      {(control) => (
        <input
          {...control}
          className="editor-range"
          style={
            { "--range-progress": `${Math.min(100, Math.max(0, progress))}%` } as CSSProperties
          }
          type="range"
          max={max}
          min={min}
          value={value}
          {...props}
        />
      )}
    </SettingsField>
  );
}

interface SettingsColorProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  compact?: boolean;
  label: string;
  value: string;
}

export function SettingsColor({ compact = false, label, value, ...props }: SettingsColorProps) {
  return (
    <SettingsField label={label} hint={value?.toUpperCase()}>
      {(control) => (
        <span
          className={cn(
            "border-border bg-background flex items-center gap-2 rounded-xl border p-1 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent)]",
            compact ? "h-10" : "h-11",
          )}
        >
          <span className="border-border h-full w-10 overflow-hidden rounded-lg border">
            <input
              {...control}
              className="h-[150%] w-[150%] -translate-x-2 -translate-y-2 cursor-pointer"
              type="color"
              value={value}
              {...props}
            />
          </span>
          <span className="text-muted min-w-0 flex-1 truncate px-1 font-mono text-xs">
            {value?.toUpperCase()}
          </span>
        </span>
      )}
    </SettingsField>
  );
}
