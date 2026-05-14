"use client";

import { useRouter } from "next/navigation";

import { Button } from "@veriworkly/ui";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <div className="space-y-6 py-2">
        <section className="border-border bg-card relative overflow-hidden rounded-3xl border p-6 sm:p-8">
          <div className="bg-accent/10 absolute -top-14 right-0 h-44 w-44 rounded-full blur-2xl" />
          <div className="relative">
            <p className="text-accent text-xs font-semibold tracking-[0.2em] uppercase">
              Workspace Error
            </p>

            <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              We could not load this workspace
            </h1>

            <p className="text-muted mt-2 max-w-xl text-sm leading-6">
              Temporary issue while loading dashboard data. Retry now or return to home workspace.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={() => reset()}>Try again</Button>

              <Button variant="secondary" onClick={() => router.push("/")}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="border-border bg-card/70 h-40 rounded-3xl border border-dashed"
            />
          ))}
        </section>
      </div>
    </main>
  );
}
