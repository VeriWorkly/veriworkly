import React from "react";

import { Container } from "@veriworkly/ui";

import InteractiveCTA from "@/features/marketing/cta/InteractiveCTA";

interface LegalPageShellProps {
  children: React.ReactNode;
  ambientGlowColor?: "emerald" | "blue" | "accent";
}

export function LegalPageShell({ children, ambientGlowColor = "emerald" }: LegalPageShellProps) {
  const glowClass =
    ambientGlowColor === "blue"
      ? "bg-blue-500/5"
      : ambientGlowColor === "emerald"
        ? "bg-emerald-500/5"
        : "bg-accent/5";

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />
      <div className="bg-accent/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-150 w-150 rounded-full blur-[140px]" />

      <div
        className={`pointer-events-none absolute top-96 right-10 -z-10 h-120 w-120 rounded-full ${glowClass} blur-[130px]`}
      />

      <Container className="space-y-20 pt-28 pb-20 lg:pt-36">{children}</Container>

      <InteractiveCTA />
    </div>
  );
}
