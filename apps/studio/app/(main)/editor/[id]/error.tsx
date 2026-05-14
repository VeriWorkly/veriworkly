"use client";

import { Button } from "@veriworkly/ui";

export default function EditorByIdError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <div className="border-border bg-card rounded-3xl border p-4">
        <p className="text-accent text-xs font-semibold tracking-[0.24em] uppercase">
          Resume Editor
        </p>

        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          This resume could not be opened
        </h1>

        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          The draft may be unavailable in this browser session. Retry, or go back to dashboard to
          choose another resume.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => reset()}>Retry</Button>

          <Button variant="secondary" onClick={() => (window.location.href = "/")}>
            Dashboard
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="border-border bg-card/70 h-[68vh] rounded-3xl border border-dashed" />
        <div className="border-border bg-card/70 h-[68vh] rounded-3xl border border-dashed" />
      </div>
    </div>
  );
}
