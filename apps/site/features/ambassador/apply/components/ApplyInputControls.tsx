import React from "react";
import { motion } from "framer-motion";
import { Wand2 } from "lucide-react";
import { FORM_ERROR_ID } from "../apply-constants";

export const fieldA11y = (id: string, invalid: boolean) => ({
  id,
  name: id,
  "aria-labelledby": `${id}-label`,
  "aria-describedby": invalid ? `${id}-hint ${FORM_ERROR_ID}` : `${id}-hint`,
  "aria-invalid": invalid || undefined,
});

export function AutofillHint() {
  return (
    <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
      <Wand2 className="h-3 w-3" aria-hidden="true" />
      Filled in from your account — change it if it&apos;s wrong.
    </p>
  );
}

export function BigInput({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  inputMode,
  maxLength,
  autoComplete,
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputMode?: "text" | "numeric";
  maxLength: number;
  autoComplete?: string;
  invalid?: boolean;
}) {
  return (
    <input
      {...fieldA11y(id, invalid)}
      value={value}
      autoFocus={autoFocus}
      inputMode={inputMode}
      placeholder={placeholder}
      maxLength={maxLength}
      autoComplete={autoComplete ?? "off"}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border-b-2 border-zinc-200 bg-transparent pb-3 text-xl font-semibold text-zinc-950 transition-colors outline-none placeholder:text-zinc-300 focus:border-indigo-500 sm:text-2xl dark:border-white/15 dark:text-white dark:placeholder:text-zinc-700"
    />
  );
}

export function BigTextarea({
  id,
  value,
  onChange,
  placeholder,
  autoFocus,
  maxLength,
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  maxLength: number;
  invalid?: boolean;
}) {
  return (
    <textarea
      {...fieldA11y(id, invalid)}
      value={value}
      autoFocus={autoFocus}
      placeholder={placeholder}
      rows={4}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      className="w-full resize-none border-b-2 border-zinc-200 bg-transparent pb-3 text-lg leading-7 font-medium text-zinc-950 transition-colors outline-none placeholder:text-zinc-300 focus:border-indigo-500 dark:border-white/15 dark:text-white dark:placeholder:text-zinc-700"
    />
  );
}

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.95 }}
      className={`rounded-full border px-4 py-2 text-xs font-bold tracking-wide transition-colors ${
        active
          ? "border-indigo-500 bg-indigo-500 text-white"
          : "border-zinc-200 bg-transparent text-zinc-600 hover:border-indigo-500/40 dark:border-white/15 dark:text-zinc-400"
      }`}
    >
      {label}
    </motion.button>
  );
}
