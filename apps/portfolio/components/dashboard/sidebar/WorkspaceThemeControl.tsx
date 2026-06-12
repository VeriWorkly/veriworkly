"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@veriworkly/ui";

export function WorkspaceThemeControl({ collapsed }: { collapsed?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const dark = resolvedTheme === "dark";

  if (!mounted) {
    if (collapsed) {
      return <div className="size-10 rounded-xl bg-transparent" />;
    }
    return <div className="h-16 rounded-xl bg-transparent" />;
  }

  if (collapsed) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setTheme(dark ? "light" : "dark")}
        title={`Switch to ${dark ? "light" : "dark"} theme`}
        aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
        className="text-muted hover:text-accent hover:bg-paper size-10 rounded-xl p-0"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </Button>
    );
  }

  return (
    <div className="bg-paper rounded-xl p-1">
      <p className="text-muted px-2 pt-1 pb-2 text-[10px] font-extrabold tracking-widest uppercase">
        Appearance
      </p>

      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Workspace theme">
        <ThemeOption
          label="Light"
          active={!dark}
          icon={<Sun size={13} />}
          onClick={() => setTheme("light")}
        />

        <ThemeOption
          label="Dark"
          active={dark}
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
      onClick={onClick}
      aria-pressed={active}
      className={`flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-extrabold transition ${
        active ? "text-accent bg-panel shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
