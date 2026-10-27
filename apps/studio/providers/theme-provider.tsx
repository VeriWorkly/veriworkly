"use client";

import type { ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Loaded with the root layout, before any page parses with zod.
import "@/lib/zod-config";

/** `nonce` is the request's CSP nonce, without which the theme script is blocked. */
const ThemeProvider = ({ children, nonce }: ComponentProps<typeof NextThemesProvider>) => {
  return (
    <NextThemesProvider
      nonce={nonce}
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
