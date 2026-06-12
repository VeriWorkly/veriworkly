import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <label className="grid gap-1.5 text-xs font-bold text-[var(--color-ink-soft)]">
      {label}
      {children}
    </label>
  );
}
