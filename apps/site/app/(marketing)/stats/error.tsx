"use client";

import Link from "next/link";
import { Button, Container } from "@veriworkly/ui";

export default function StatsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="surface-grid pointer-events-none absolute inset-0 -z-10 opacity-[0.25]" />

      <div className="bg-destructive/5 pointer-events-none absolute top-0 left-1/4 -z-10 h-[600px] w-[600px] rounded-full blur-[130px]" />

      <Container className="relative pt-28 pb-20 text-center lg:pt-36">
        <header className="mx-auto mb-12 max-w-2xl space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="bg-destructive h-1.5 w-1.5 animate-pulse rounded-full" />

            <span className="text-destructive font-mono text-[9px] font-bold tracking-widest uppercase">
              Sync Error
            </span>
          </div>

          <h1 className="text-foreground font-sans text-4xl font-bold tracking-tight sm:text-5xl">
            GitHub Board Sync Failed
          </h1>

          <p className="text-muted mx-auto max-w-2xl text-sm leading-relaxed">
            We encountered a problem while fetching the latest development activity from GitHub. The
            board might be temporarily unavailable.
          </p>
        </header>

        <section className="border-border/30 bg-card/20 mx-auto flex max-w-2xl flex-col items-center justify-center rounded-3xl border p-8 shadow-[0_1px_3px_rgba(0,0,0,0.01)] backdrop-blur-xs sm:p-12">
          <div className="bg-destructive/10 text-destructive border-destructive/20 mb-6 flex h-16 w-16 items-center justify-center rounded-full border">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>

          <h2 className="text-foreground font-sans text-lg font-bold tracking-tight">
            API Connection Lost
          </h2>

          <p className="text-muted mt-2 max-w-xs text-xs leading-relaxed">
            We couldn&apos;t establish a secure connection to our development activity worker.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              variant="primary"
              className="rounded-full px-6 font-sans text-xs font-bold"
              onClick={() => reset()}
            >
              Reconnect Sync
            </Button>

            <Button
              asChild
              size="lg"
              variant="ghost"
              className="rounded-full px-6 font-sans text-xs font-bold"
            >
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </section>
      </Container>
    </main>
  );
}
