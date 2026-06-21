"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="border-line size-10 rounded-full border bg-transparent" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="border-line text-ink/70 hover:text-accent hover:border-accent focus-visible:outline-accent flex size-10 cursor-pointer items-center justify-center rounded-full border bg-transparent transition duration-200 focus-visible:outline-3"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? (
        <Sun size={17} className="animate-reveal" />
      ) : (
        <Moon size={17} className="animate-reveal" />
      )}
    </button>
  );
}
