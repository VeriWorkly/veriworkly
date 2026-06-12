"use client";

import type { CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export function SettingsField({
  children,
  className,
  hint,
  label,
}: {
  children: ReactNode;
  className?: string;
  hint?: string;
  label: string;
}) {
  return (
    <label className={cn("grid gap-2 text-sm", className)}>
      <span className="flex items-center justify-between gap-3">
        <span className="text-foreground font-medium">{label}</span>
        {hint ? <span className="text-muted text-xs tabular-nums">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

interface SettingsSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function SettingsSelect({ children, label, className, ...props }: SettingsSelectProps) {
  return (
    <SettingsField label={label}>
      <span className="relative block">
        <select
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
      <input
        className="editor-range"
        style={{ "--range-progress": `${Math.min(100, Math.max(0, progress))}%` } as CSSProperties}
        type="range"
        max={max}
        min={min}
        value={value}
        {...props}
      />
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
      <span
        className={cn(
          "border-border bg-background flex items-center gap-2 rounded-xl border p-1 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_4%,transparent)]",
          compact ? "h-10" : "h-11",
        )}
      >
        <span className="border-border h-full w-10 overflow-hidden rounded-lg border">
          <input
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
    </SettingsField>
  );
}
