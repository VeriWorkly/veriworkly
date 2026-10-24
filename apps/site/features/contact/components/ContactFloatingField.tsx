import React from "react";

export interface FloatingFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  as?: "input" | "textarea";
  rows?: number;
  helper?: string;
  /** Shown under the field and announced with it. */
  error?: string;
  maxLength?: number;
  autoComplete?: string;
  required?: boolean;
  invalid?: boolean;
}

export const ContactFloatingField = ({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  as = "input",
  rows,
  helper,
  error,
  maxLength,
  autoComplete,
  required,
  invalid,
}: FloatingFieldProps) => {
  const sharedClassName =
    "peer w-full rounded-2xl border border-border bg-card px-4 pt-8 pb-3 text-base text-foreground transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-transparent focus:border-accent focus:ring-4 focus:ring-accent/15 aria-invalid:border-destructive/60 disabled:cursor-not-allowed disabled:opacity-50";

  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const sharedProps = {
    id,
    value,
    disabled,
    maxLength,
    autoComplete,
    required,
    "aria-invalid": invalid || Boolean(error) || undefined,
    "aria-describedby": [errorId, helperId].filter(Boolean).join(" ") || undefined,
    placeholder: placeholder ?? label,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
  };

  return (
    <div className="relative">
      {as === "textarea" ? (
        <textarea {...sharedProps} rows={rows ?? 5} className={`${sharedClassName} resize-none`} />
      ) : (
        <input {...sharedProps} type={type} className={sharedClassName} />
      )}

      <label
        htmlFor={id}
        className="text-muted peer-focus:text-accent pointer-events-none absolute top-2 left-4 text-sm font-semibold transition-[top,font-size,color] duration-200 peer-placeholder-shown:top-5 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-sm peer-focus:font-semibold"
      >
        {label}
      </label>

      {error ? (
        <p id={errorId} className="text-destructive mt-2 text-sm font-semibold">
          {error}
        </p>
      ) : null}

      {helper ? (
        <p id={helperId} className="text-muted mt-2 text-right text-sm tabular-nums">
          {helper}
        </p>
      ) : null}
    </div>
  );
};

export default ContactFloatingField;
