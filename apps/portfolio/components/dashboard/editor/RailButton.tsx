import type { ReactNode } from "react";

export interface RailButtonProps {
  label: string;
  danger?: boolean;
  selected?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function RailButton({ label, danger, selected, onClick, children }: RailButtonProps) {
  return (
    <button
      className={`grid size-6 place-items-center rounded-md transition hover:opacity-100 ${
        selected
          ? danger
            ? "bg-white/10 text-red-300"
            : "text-white/70 hover:bg-white/10 hover:text-white"
          : danger
            ? "text-[var(--color-danger)] opacity-65"
            : "text-[var(--color-muted)] opacity-60"
      }`}
      aria-label={label}
      title={label}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
