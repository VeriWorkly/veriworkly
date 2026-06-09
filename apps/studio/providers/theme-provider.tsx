"use client";

import type { ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

const ThemeProvider = ({ children }: ComponentProps<typeof NextThemesProvider>) => {
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
};

export { ThemeProvider };
