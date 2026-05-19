import Link from "next/link";

import { Button } from "@veriworkly/ui";

export default function EditorPreviewNotFound() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-border bg-card rounded-2xl border p-4">
        <p className="text-accent text-xs font-semibold tracking-[0.24em] uppercase">
          Resume Preview
        </p>

        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Preview not available
        </h1>

        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          This preview link is invalid or resume is no longer available in local storage.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button asChild variant="primary">
            <Link href="/documents">Go to Documents</Link>
          </Button>

          <Button asChild variant="ghost">
            <Link href="/templates">View Templates</Link>
          </Button>
        </div>
      </div>

      <div className="border-border bg-card rounded-3xl border p-4 md:p-6">
        <div className="bg-border border-border h-[62vh] w-full rounded-2xl border border-dashed" />
      </div>
    </div>
  );
}
