"use client";

import type { ReactNode } from "react";

export function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active ? "border-accent border-b-2 pb-2 text-base font-bold" : "text-muted pb-2 text-base"
      }
    >
      {children}
    </button>
  );
}

export function IconToggle({
  active,
  label,
  children,
  onClick,
}: {
  active: boolean;
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={
        active
          ? "bg-card flex h-8 w-8 items-center justify-center rounded-lg shadow-sm"
          : "text-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-lg"
      }
    >
      {children}
    </button>
  );
}
