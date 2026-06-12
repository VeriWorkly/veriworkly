import type { ReactNode } from "react";

export interface FieldProps {
  label: string;
  hint: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="grid gap-2 text-xs font-bold">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-medium text-[var(--color-muted)]">{hint}</span>
      </span>
      {children}
    </label>
  );
}
