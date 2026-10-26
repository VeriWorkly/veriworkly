"use client";

import type { ReactNode } from "react";

import { useId, useState } from "react";

import { Input, Select, cn } from "@veriworkly/ui";

import { hasEmoji } from "@/features/documents/utils/strip-emoji";

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

/** What a control needs to announce the error and hint its `Field` renders below it. */
export interface FieldControlProps {
  "aria-invalid"?: true;
  "aria-describedby"?: string;
}

/**
 * `hint` is advisory and renders alongside `error`, not instead of it: a field can be
 * perfectly valid and still worth a nudge — a phone number stored without a country code
 * is the case this exists for.
 *
 * The error waits until the field has been left once: a form someone has not filled in yet
 * is not wrong. Pass `children` as a function to wire the control to the error and hint.
 */
export function Field({
  children,
  error,
  hint,
  label,
}: {
  children: ReactNode | ((control: FieldControlProps) => ReactNode);
  error?: string;
  hint?: ReactNode;
  label: string;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);

  const shownError = touched ? error : undefined;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [shownError ? errorId : "", hint ? hintId : ""].filter(Boolean).join(" ");

  return (
    <div className="space-y-2" onBlur={() => setTouched(true)}>
      <label className="text-foreground block space-y-2 text-sm font-medium">
        <span>{label}</span>
        {typeof children === "function"
          ? children({
              "aria-invalid": shownError ? true : undefined,
              "aria-describedby": describedBy || undefined,
            })
          : children}
      </label>
      {shownError ? (
        <p className="text-xs font-medium text-red-500" id={errorId}>
          {shownError}
        </p>
      ) : null}
      {hint ? (
        <p className="text-muted text-xs" id={hintId}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Every export leaves emoji out (`stripEmoji`), so a field holding one says so. */
function emojiHint(value: string) {
  return hasEmoji(value)
    ? "Emoji are left out of the document: its fonts cannot draw them."
    : undefined;
}

function TextArea({
  className,
  value,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "border-border bg-background text-foreground focus:border-accent/40 focus:ring-accent/20 min-h-24 w-full rounded-3xl border px-4 py-3 text-sm shadow-sm transition outline-none focus:ring-2",
        "aria-invalid:border-destructive/60 aria-invalid:focus:border-destructive aria-invalid:focus:ring-destructive/15",
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
    <Field error={error} hint={hint ?? emojiHint(value)} label={label}>
      {(control) => (
        <Input
          {...props}
          {...control}
          onChange={(event) => onValueChange(event.target.value)}
          value={value}
        />
      )}
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
    <Field error={error} hint={emojiHint(value)} label={label}>
      {(control) => (
        <TextArea
          {...props}
          {...control}
          className={cn("min-h-28 leading-6", className)}
          onChange={(event) => onValueChange(event.target.value)}
          value={value}
        />
      )}
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
      {(control) => (
        <Select
          {...props}
          {...control}
          onChange={(event) => onValueChange(event.target.value)}
          value={value}
        >
          {children}
        </Select>
      )}
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

/**
 * How a list field is typed as text. Short keywords are comma separated; sentence-like
 * entries (highlights) are one per line, because the sentences themselves contain commas.
 */
export type ListDelimiter = "comma" | "newline";

const LIST_DELIMITERS: Record<ListDelimiter, { split: RegExp; join: string }> = {
  comma: { split: /[\n,]/, join: ", " },
  newline: { split: /\n/, join: "\n" },
};

export function parseDelimited(value: string, delimiter: ListDelimiter): string[] {
  return value
    .split(LIST_DELIMITERS[delimiter].split)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function joinDelimited(items: string[], delimiter: ListDelimiter): string {
  return items.join(LIST_DELIMITERS[delimiter].join);
}

function sameItems(left: string[], right: string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

/**
 * Text-box state for a list field. The typed text is the source of truth while it still
 * parses to `value`, so a trailing delimiter, a blank line or a half-typed item survives the
 * round trip through the store. Only a list that no longer matches the text (Reset, Import,
 * AI apply) rewrites it.
 */
export function useDelimitedDraft(
  value: string[],
  delimiter: ListDelimiter,
  onChange: (nextValue: string[]) => void,
) {
  const [draftValue, setDraftValue] = useState(() => joinDelimited(value, delimiter));
  const [syncedValue, setSyncedValue] = useState(value);

  if (!sameItems(value, syncedValue)) {
    setSyncedValue(value);

    if (!sameItems(parseDelimited(draftValue, delimiter), value)) {
      setDraftValue(joinDelimited(value, delimiter));
    }
  }

  return {
    value: draftValue,
    onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraftValue(event.target.value);
      onChange(parseDelimited(event.target.value, delimiter));
    },
  };
}

export function DelimitedTextArea({
  className,
  delimiter,
  onChange,
  value,
}: {
  className?: string;
  delimiter: ListDelimiter;
  onChange: (nextValue: string[]) => void;
  value: string[];
}) {
  return <TextArea className={className} {...useDelimitedDraft(value, delimiter, onChange)} />;
}
