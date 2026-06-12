"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      enableSystem
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      storageKey="veriworkly-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
