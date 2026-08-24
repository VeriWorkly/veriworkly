"use client";

import Link from "next/link";
import { OctagonAlert } from "lucide-react";

import { Button, Container } from "@veriworkly/ui";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Error = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  return (
    <main className="surface-grid border-border/50 relative mx-auto flex min-h-screen items-center justify-center overflow-hidden border">
      <p className="sr-only" role="alert">
        Something went wrong. An unexpected error occurred.
      </p>

      <div className="from-background/0 via-background/20 to-background/80 pointer-events-none absolute inset-0 bg-linear-to-b" />

      <Container className="relative flex flex-col items-center py-20 text-center">
        <div className="bg-destructive/10 text-destructive shadow-destructive/5 mb-8 flex h-24 w-24 items-center justify-center rounded-full shadow-xl">
          <OctagonAlert className="text-destructive h-12 w-12" />
        </div>

        <p className="text-destructive text-sm font-bold tracking-[0.2em] uppercase">
          Application Error
        </p>

        <h1 className="text-foreground mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
          Something went wrong
        </h1>

        <p className="text-muted mt-6 max-w-md text-base leading-7">
          An unexpected error occurred. This might be a temporary issue or a problem with the server
          connection.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" variant="primary" className="rounded-full px-8" onClick={() => reset()}>
            Try again
          </Button>

          <Button asChild size="lg" variant="ghost" className="rounded-full px-8">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </Container>
    </main>
  );
};

export default Error;
