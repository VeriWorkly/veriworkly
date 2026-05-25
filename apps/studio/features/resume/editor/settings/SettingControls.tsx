"use client";

import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from "react";

import { Select } from "@veriworkly/ui";

export function SettingsField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

interface SettingsSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function SettingsSelect({ children, label, ...props }: SettingsSelectProps) {
  return (
    <SettingsField label={label}>
      <Select {...props}>{children}</Select>
    </SettingsField>
  );
}

interface SettingsRangeProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export function SettingsRange({ label, ...props }: SettingsRangeProps) {
  return (
    <SettingsField label={label}>
      <input className="accent-accent w-full" type="range" {...props} />
    </SettingsField>
  );
}

interface SettingsColorProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  compact?: boolean;
  label: string;
}

export function SettingsColor({ compact = false, label, ...props }: SettingsColorProps) {
  return (
    <SettingsField label={label}>
      <input
        className={
          compact
            ? "border-border bg-background h-10 w-full rounded-xl border p-1"
            : "border-border bg-background h-11 w-full rounded-2xl border p-1"
        }
        type="color"
        {...props}
      />
    </SettingsField>
  );
}
