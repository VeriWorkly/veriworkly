"use client";

import Link from "next/link";
import { useEffect } from "react";
import { OctagonAlert } from "lucide-react";

import { Button, Container } from "@veriworkly/ui";

export type ErrorViewProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** The error screen shared by `app/error.tsx` and `app/global-error.tsx`. */
export function ErrorView({ error, reset }: ErrorViewProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="surface-grid flex min-h-screen items-center justify-center">
      <Container className="flex flex-col items-center text-center">
        <div className="bg-destructive/10 text-destructive shadow-destructive/5 mb-8 flex h-24 w-24 items-center justify-center rounded-full shadow-xl">
          <OctagonAlert className="text-destructive h-12 w-12" />
        </div>

        <h1 className="text-foreground text-4xl font-bold tracking-tight">Something went wrong</h1>

        <p className="text-muted mt-4 max-w-md text-base leading-6">
          This page failed to load. It is usually temporary, so trying again often fixes it.
        </p>

        {error.digest && (
          <p className="text-muted mt-4 font-mono text-xs">Reference: {error.digest}</p>
        )}

        <div className="mt-10 flex gap-4">
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>

          <Button asChild variant="secondary" className="rounded-full px-8">
            <Link href="/">Go Home</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
}
