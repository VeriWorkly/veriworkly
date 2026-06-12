import { Check } from "lucide-react";

export interface HealthRowProps {
  complete: boolean;
  label: string;
}

export function HealthRow({ complete, label }: HealthRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`grid size-4 place-items-center rounded-full ${complete ? "bg-[var(--color-accent-ink)] text-[var(--color-accent)]" : "bg-[var(--color-accent-ink)]/15"}`}
      >
        {complete ? <Check size={10} aria-hidden="true" /> : null}
      </span>
      <span className={complete ? "" : "text-[var(--color-accent-ink)]/55"}>{label}</span>
    </div>
  );
}
