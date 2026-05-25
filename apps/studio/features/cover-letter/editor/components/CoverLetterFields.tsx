"use client";

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

export function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>

      <input
        className="accent-accent w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>

      <input
        className="border-border bg-background h-11 w-full rounded-2xl border p-1"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function EditorBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-muted text-xs font-semibold tracking-[0.22em] uppercase">{title}</p>
      </div>
      {children}
    </section>
  );
}
