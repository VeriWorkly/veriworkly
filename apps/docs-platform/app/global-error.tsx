"use client";

import "./globals.css";

import { globalFontVariables } from "@veriworkly/ui";

import { ErrorView, type ErrorViewProps } from "@/components/error-view";

/** Replaces the root layout when it fails, so it brings its own `<html>`, styles and fonts. */
export default function GlobalError(props: ErrorViewProps) {
  return (
    <html lang="en">
      <body
        className={`${globalFontVariables} bg-background text-foreground flex min-h-screen flex-col font-sans antialiased`}
      >
        <ErrorView {...props} />
      </body>
    </html>
  );
}
