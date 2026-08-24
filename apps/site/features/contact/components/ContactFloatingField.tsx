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
    "peer w-full rounded-xl border border-zinc-200 bg-white px-4 pt-6 pb-2.5 text-sm text-zinc-900 transition outline-none placeholder:text-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-zinc-800 dark:bg-[#080808] dark:text-white";

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
        className="pointer-events-none absolute top-2.5 left-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase transition-all peer-placeholder-shown:top-6 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:tracking-normal peer-placeholder-shown:text-zinc-400 peer-placeholder-shown:normal-case peer-focus:top-2.5 peer-focus:text-xs peer-focus:font-semibold peer-focus:tracking-wide peer-focus:text-blue-500 peer-focus:uppercase dark:text-zinc-500"
      >
        {label}
      </label>
      {helper ? (
        <p id={helperId} className="mt-1.5 text-right text-[11px] text-zinc-400">
          {helper}
        </p>
      ) : null}
    </div>
  );
};

export default ContactFloatingField;
