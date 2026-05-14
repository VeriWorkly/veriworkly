import Link from "next/link";

import { Button } from "@veriworkly/ui";

export default function EditorByIdNotFound() {
  return (
    <div className="space-y-4 py-2">
      <div className="border-border bg-card rounded-3xl border p-4">
        <p className="text-accent text-xs font-semibold tracking-[0.24em] uppercase">
          Resume Editor
        </p>

        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Resume not found
        </h1>

        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          This resume link is invalid or the draft is not available in the current browser storage.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild variant="primary">
            <Link href="/">Go to Dashboard</Link>
          </Button>

          <Button asChild variant="ghost">
            <Link href="/templates">View Templates</Link>
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
