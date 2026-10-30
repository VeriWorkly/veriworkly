"use client";

import { RefreshCw, ServerCrash } from "lucide-react";

/**
 * Shown instead of the workspace when a signed-in request could not load it. Guest mode
 * here would let the user edit a local copy that the next healthy load overwrites.
 */
export function WorkspaceUnavailable() {
  return (
    <main className="workspace-theme bg-paper text-ink grid min-h-dvh place-items-center p-6">
      <div
        className="border-line bg-panel w-full max-w-md rounded-3xl border p-6 md:p-8"
        role="alert"
      >
        <div className="bg-danger/10 text-danger mb-5 inline-flex rounded-2xl p-3">
          <ServerCrash className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">We can&apos;t reach your workspace</h1>
        <p className="text-muted mt-3 text-sm leading-6">
          The VeriWorkly API is not responding right now. Your saved portfolio is safe. Try again in
          a moment.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-accent text-accent-ink hover:bg-accent-strong mt-6 inline-flex min-h-10 items-center gap-2 rounded-xl px-5 text-xs font-extrabold"
        >
          <RefreshCw className="size-3.5" aria-hidden="true" /> Retry
        </button>
      </div>
    </main>
  );
}
