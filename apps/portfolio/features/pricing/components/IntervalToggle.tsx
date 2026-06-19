"use client";

interface IntervalToggleProps {
  value: "monthly" | "annual";
  onChange: (value: "monthly" | "annual") => void;
  featured?: boolean;
}

export function IntervalToggle({ value, onChange, featured }: IntervalToggleProps) {
  return (
    <div
      className={`relative mx-auto flex w-full rounded-full p-1 text-xs font-bold select-none ${
        featured ? "bg-white/15" : "bg-black/5 dark:bg-white/10"
      }`}
    >
      <div
        className={`absolute top-1 bottom-1 rounded-full shadow-sm transition-all duration-300 ease-out ${
          featured ? "bg-white" : "bg-white dark:bg-[#121924]"
        }`}
        style={{
          left: value === "annual" ? "4px" : "calc(50% + 2px)",
          width: "calc(50% - 6px)",
        }}
      />

      <button
        type="button"
        onClick={() => onChange("annual")}
        className={`relative z-10 min-w-24 flex-1 cursor-pointer rounded-full px-5 py-2 text-center transition duration-250 ${
          value === "annual"
            ? featured
              ? "text-accent font-bold"
              : "text-accent font-bold"
            : featured
              ? "font-bold text-white/60 hover:text-white"
              : "text-ink/65 hover:text-accent font-bold"
        }`}
      >
        Yearly (Save 15%)
      </button>

      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`relative z-10 min-w-24 flex-1 cursor-pointer rounded-full px-5 py-2 text-center transition duration-250 ${
          value === "monthly"
            ? featured
              ? "text-accent font-bold"
              : "text-accent font-bold"
            : featured
              ? "font-bold text-white/60 hover:text-white"
              : "text-ink/65 hover:text-accent font-bold"
        }`}
      >
        Monthly
      </button>
    </div>
  );
}
