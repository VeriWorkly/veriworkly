"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

import { buttonClassName, cn } from "@veriworkly/ui";

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { resolvedTheme, setTheme } = useTheme();

  // Both icons render and CSS picks one: the server cannot know the theme, so choosing the icon
  // in JavaScript gave dark-mode visitors a hydration mismatch.
  return (
    <button
      aria-label="Toggle theme"
      className={cn(buttonClassName("ghost"), className)}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="hidden h-[1.2rem] w-[1.2rem] transition-all dark:block" />
      <Moon className="h-[1.2rem] w-[1.2rem] transition-all dark:hidden" />
    </button>
  );
};

export { ThemeToggle };
