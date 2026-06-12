import type { ReactNode } from "react";

export interface ItemActionProps {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function ItemAction({ label, danger, disabled, onClick, children }: ItemActionProps) {
  return (
    <button
      type="button"
      className={`grid size-7 place-items-center rounded-md border transition hover:-translate-y-0.5 ${
        danger
          ? "border-danger/25 bg-danger-soft text-danger"
          : "border-line bg-panel text-muted hover:text-ink"
      }`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
