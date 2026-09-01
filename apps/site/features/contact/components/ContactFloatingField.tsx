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
  maxLength,
  autoComplete,
  required,
  invalid,
}: FloatingFieldProps) => {
  const sharedClassName =
    "peer w-full rounded-2xl border border-border/60 bg-background/60 px-4 pt-6 pb-2.5 text-sm text-foreground transition-all duration-200 outline-none placeholder:text-transparent focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:opacity-50 disabled:cursor-not-allowed";

  const helperId = helper ? `${id}-helper` : undefined;

  const sharedProps = {
    id,
    value,
    disabled,
    maxLength,
    autoComplete,
    required,
    "aria-invalid": invalid || undefined,
    "aria-describedby": helperId,
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
        className="text-muted peer-placeholder-shown:text-muted peer-focus:text-accent pointer-events-none absolute top-2.5 left-4 font-mono text-[10px] font-bold tracking-wider uppercase transition-all duration-200 peer-placeholder-shown:top-4.5 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:normal-case peer-focus:top-2.5 peer-focus:font-mono peer-focus:text-[10px] peer-focus:font-bold peer-focus:tracking-wider peer-focus:uppercase"
      >
        {label}
      </label>

      {helper ? (
        <p id={helperId} className="text-muted mt-1.5 text-right font-mono text-[11px]">
          {helper}
        </p>
      ) : null}
    </div>
  );
};

export default ContactFloatingField;
