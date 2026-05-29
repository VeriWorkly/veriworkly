import type { ReactNode } from "react";

import { Input, TextArea } from "@veriworkly/ui";

import { cn } from "@/lib/utils";

export function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-muted text-xs font-semibold">{label}</span>
      <Input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextField({
  label,
  value,
  placeholder,
  className,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-muted text-xs font-semibold">{label}</span>

      <TextArea
        className={cn("min-h-28 leading-6", className)}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function EditorBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-4">
      <div className="sr-only">
        <p className="text-foreground text-sm font-semibold">{title}</p>
      </div>

      {children}
    </section>
  );
}
