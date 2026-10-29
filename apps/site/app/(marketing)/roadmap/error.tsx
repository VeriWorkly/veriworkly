"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, Container } from "@veriworkly/ui";

import { reportClientError } from "@/utils/report-client-error";

export default function RoadmapError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Roadmap failed to render:", error);
    // "marketing": the API accepts only root/marketing/global, and the logged URL already says roadmap.
    reportClientError(error, "marketing");
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <p className="sr-only" role="alert">
        The roadmap could not be loaded.
      </p>

      <Container className="pt-28 pb-20 lg:pt-36">
        <header className="mb-10 space-y-4">
          <p className="text-destructive text-xs font-semibold tracking-[0.24em] uppercase">
            Roadmap Error
          </p>

          <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
            Failed to sync roadmap
          </h1>

          <p className="text-muted max-w-2xl text-base leading-7">
            We couldn&apos;t load the roadmap just now. The roadmap service did not answer; nothing
            on your side caused this.
          </p>
        </header>

        <section className="border-border bg-destructive/5 flex flex-col items-center justify-center rounded-3xl border border-dashed py-20 text-center">
          <div className="bg-destructive/10 text-destructive mb-6 flex h-20 w-20 items-center justify-center rounded-full">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-foreground text-2xl font-bold">Sync Interrupted</h2>

          <p className="text-muted mt-2 max-w-sm px-6">
            The roadmap data is currently unavailable. You can retry the sync or explore other parts
            of the platform.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              variant="primary"
              className="rounded-full px-8"
              onClick={() => retry()}
            >
              Retry Sync
            </Button>

            <Button asChild size="lg" variant="ghost" className="rounded-full px-8">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </section>
      </Container>
    </div>
  );
}
