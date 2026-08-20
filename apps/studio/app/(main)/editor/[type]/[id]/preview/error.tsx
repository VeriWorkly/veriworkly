"use client";

import { useRouter } from "next/navigation";

import { Button } from "@veriworkly/ui";

export default function EditorPreviewError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="border-border bg-card rounded-2xl border p-4">
        {/* Type-neutral: this boundary serves every document type and, being an error
            boundary, cannot read the route's `[type]` param to say which. */}
        <p className="text-accent text-xs font-semibold tracking-[0.24em] uppercase">
          Document Preview
        </p>

        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          We could not render this preview
        </h1>

        <p className="text-muted mt-2 max-w-2xl text-sm leading-6">
          Try rendering the preview again, or return to your documents.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={() => reset()}>Try again</Button>
          {/* `/documents`, matching every other surface — `/` is the overview, not the
              document list this button claims to return to. */}
          <Button variant="secondary" onClick={() => router.push("/documents")}>
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
