"use client";

import { Button } from "@veriworkly/ui";

const DashboardSegmentError = ({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) => {
  return (
    <div className="space-y-10 py-10">
      <section className="border-border bg-card relative overflow-hidden rounded-3xl border px-6 py-10 sm:px-10">
        <div className="bg-accent/10 absolute -top-20 -right-12 h-48 w-48 rounded-full blur-2xl" />
        <div className="bg-accent/10 absolute -bottom-24 left-12 h-44 w-44 rounded-full blur-2xl" />

        <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className="text-accent text-xs font-semibold tracking-[0.24em] uppercase">
            Dashboard Error
          </p>

          <h1 className="text-foreground mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            This workspace section failed to load
          </h1>

          <p className="text-muted mt-5 max-w-xl text-base leading-7">
            You can retry this route immediately, or return to dashboard and open a different
            section.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" onClick={() => reset()}>
              Try again
            </Button>

            <Button variant="secondary" onClick={() => (window.location.href = "/")}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="border-border bg-card/70 h-44 rounded-3xl border border-dashed"
          />
        ))}
      </section>
    </div>
  );
};

export default DashboardSegmentError;
