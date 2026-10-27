interface IntervalToggleProps {
  value: "monthly" | "annual";
  onChange: (value: "monthly" | "annual") => void;
  /** Whole-percent annual saving, from annualSavingsPercent. */
  savings: number;
}

const IntervalToggle = ({ value, onChange, savings }: IntervalToggleProps) => {
  return (
    <div className="border-border bg-background grid w-full grid-cols-2 rounded-full border p-1 text-xs font-bold">
      {(["annual", "monthly"] as const).map((interval) => (
        <button
          className={`rounded-full py-2.5 capitalize transition ${
            value === interval
              ? "bg-foreground text-background"
              : "text-muted hover:text-foreground"
          }`}
          key={interval}
          onClick={() => onChange(interval)}
          type="button"
        >
          {interval === "annual" ? `Yearly (Save ${savings}%)` : "Monthly"}
        </button>
      ))}
    </div>
  );
};

export default IntervalToggle;
