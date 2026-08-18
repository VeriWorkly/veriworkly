"use client";

import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";

import { Input, Select } from "@veriworkly/ui";

import { cn } from "@/lib/utils";

/**
 * Form primitives shared by every document editor.
 *
 * These used to exist twice: `resume/editor/content/EditorFormPrimitives.tsx` and
 * `cover-letter/editor/components/CoverLetterFields.tsx` each exported a `Field` and a
 * `TextField`/`TextArea` with the *same names but incompatible contracts* — one
 * children-based, one value/onChange — so the two editors rendered visibly different
 * labels and spacing for the same kind of input, and a fix to one never reached the other.
 *
 * One module now. `Field` is the children-based wrapper (label + error). The
 * `*Field` components are the value/onChange conveniences built on it.
 */

/**
 * `hint` is advisory and renders alongside `error`, not instead of it: a field can be
 * perfectly valid and still worth a nudge — a phone number stored without a country code
 * is the case this exists for.
 */
export function Field({
  children,
  error,
  hint,
  label,
}: {
  children: ReactNode;
  error?: string;
  hint?: ReactNode;
  label: string;
}) {
  return (
    <label className="text-foreground space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      {hint ? <p className="text-muted text-xs font-normal">{hint}</p> : null}
    </label>
  );
}

export function TextArea({
  className,
  value,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "border-border bg-background text-foreground focus:border-accent/40 focus:ring-accent/20 min-h-24 w-full rounded-3xl border px-4 py-3 text-sm shadow-sm transition outline-none focus:ring-2",
        className,
      )}
      value={value}
      {...props}
    />
  );
}

export function TextInputField({
  error,
  hint,
  label,
  onValueChange,
  value,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  error?: string;
  hint?: ReactNode;
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <Field error={error} hint={hint} label={label}>
      <Input
        {...props}
        className={cn(invalidClass(error), props.className)}
        onChange={(event) => onValueChange(event.target.value)}
        value={value}
      />
    </Field>
  );
}

/**
 * Multi-line counterpart to {@link TextInputField}. Replaces the cover letter's
 * former `TextField`, which rendered a differently-styled label than the resume's.
 */
export function TextAreaField({
  className,
  error,
  label,
  onValueChange,
  value,
  ...props
}: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value"> & {
  error?: string;
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <Field error={error} label={label}>
      <TextArea
        {...props}
        className={cn("min-h-28 leading-6", invalidClass(error), className)}
        onChange={(event) => onValueChange(event.target.value)}
        value={value}
      />
    </Field>
  );
}

export function CheckboxField({
  checked,
  children,
  className,
  onCheckedChange,
}: {
  checked: boolean;
  children: ReactNode;
  className?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "text-foreground border-border flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium",
        className,
      )}
    >
      <input
        checked={checked}
        className="accent-accent h-4 w-4"
        onChange={(event) => onCheckedChange(event.target.checked)}
        type="checkbox"
      />
      {children}
    </label>
  );
}

/**
 * Select counterpart to {@link TextInputField}, on the UI-kit `Select`.
 *
 * Sections used to hand-write `<select className="border-border bg-background h-11 w-full
 * rounded-2xl border px-4 text-sm">`, which is the UI kit's styling copied by hand and
 * therefore free to drift from it.
 */
export function SelectField({
  children,
  error,
  label,
  onValueChange,
  value,
  ...props
}: Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
  children: ReactNode;
  error?: string;
  label: string;
  onValueChange: (value: string) => void;
  value: string;
}) {
  return (
    <Field error={error} label={label}>
      <Select
        {...props}
        className={cn(invalidClass(error), props.className)}
        onChange={(event) => onValueChange(event.target.value)}
        value={value}
      >
        {children}
      </Select>
    </Field>
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

export function invalidClass(error?: string) {
  return error ? "border-red-500 focus:border-red-500 focus:ring-red-200" : undefined;
}

function parseDelimited(value: string) {
  return value
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function DelimitedTextArea({
  className,
  onChange,
  value,
}: {
  className?: string;
  onChange: (nextValue: string[]) => void;
  value: string[];
}) {
  const [draftValue, setDraftValue] = useState(value.join(", "));

  // `onChange` round-trips through the parent store and comes back as a new `value`
  // array on every keystroke — a naive effect that resyncs `draftValue` from `value`
  // on every change would fight the user's typing (e.g. stripping a trailing comma
  // they just typed). This flag distinguishes "value changed because of our own
  // onChange" (skip resync) from "value changed externally" (e.g. Reset/Import/AI
  // apply — resync so the field doesn't keep showing stale text).
  const isSelfUpdateRef = useRef(false);

  useEffect(() => {
    if (isSelfUpdateRef.current) {
      isSelfUpdateRef.current = false;
      return;
    }
    setDraftValue(value.join(", "));
  }, [value]);

  return (
    <TextArea
      value={draftValue}
      className={className}
      onChange={(event) => {
        const nextDraftValue = event.target.value;
        setDraftValue(nextDraftValue);
        isSelfUpdateRef.current = true;
        onChange(parseDelimited(nextDraftValue));
      }}
    />
  );
}
