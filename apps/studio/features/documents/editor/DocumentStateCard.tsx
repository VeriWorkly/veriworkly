"use client";

import type { ReactNode } from "react";

import { Card } from "@veriworkly/ui";

/**
 * Pre-editor state frame — "loading" and "not found" — shared by the resume and cover
 * letter editors so a missing document looks and reads the same in both.
 */
export function DocumentStateCard({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card className="space-y-3 text-center">
        <h1 className="text-foreground text-xl font-semibold">{title}</h1>
        <p className="text-muted text-sm">{message}</p>
        {children}
      </Card>
    </div>
  );
}
