"use client";

import { Button } from "@veriworkly/ui";

export default function EditorPreviewError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-border bg-card rounded-2xl border p-4">
        <p className="text-accent text-xs font-semibold tracking-[0.24em] uppercase">
          Resume Preview
        </p>

        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          We could not render this preview
        </h1>

        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          Try rendering preview again or return to editor route.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/documents")}>
            Dashboard
          </Button>
        </div>
      </div>

      <div className="border-border bg-card rounded-3xl border p-4 md:p-6">
        <div className="bg-border border-border h-[62vh] w-full rounded-2xl border border-dashed" />
      </div>
    </div>
  );
}
