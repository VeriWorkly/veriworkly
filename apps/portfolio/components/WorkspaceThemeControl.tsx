"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@veriworkly/ui";

export function WorkspaceThemeControl({ collapsed = false }: { collapsed?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  if (collapsed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="size-10 rounded-xl p-0 text-[var(--color-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-accent)]"
        onClick={() => setTheme(dark ? "light" : "dark")}
        aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
        title={`Switch to ${dark ? "light" : "dark"} theme`}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </Button>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--color-paper)] p-1">
      <p className="px-2 pt-1 pb-2 text-[10px] font-extrabold tracking-[.1em] text-[var(--color-muted)] uppercase">
        Appearance
      </p>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Workspace theme">
        <ThemeOption
          active={!dark}
          label="Light"
          icon={<Sun size={13} />}
          onClick={() => setTheme("light")}
        />
        <ThemeOption
          active={dark}
          label="Dark"
          icon={<Moon size={13} />}
          onClick={() => setTheme("dark")}
        />
      </div>
    </div>
  );
}

function ThemeOption({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-extrabold transition ${
        active
          ? "bg-[var(--color-panel)] text-[var(--color-accent)] shadow-sm"
          : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
      }`}
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
