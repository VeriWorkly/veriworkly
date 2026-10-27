"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@veriworkly/ui";

/** A failed checkout load says so in checkout terms, and that nothing was charged. */
export default function CheckoutError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="bg-background grid min-h-dvh place-items-center p-5">
      <section className="border-border bg-card w-full max-w-lg rounded-3xl border p-7 text-center shadow-sm sm:p-10">
        <h1 className="text-2xl font-black tracking-tight">Checkout could not start</h1>
        <p className="text-muted mt-3 text-sm leading-6">
          We could not load your plan details. Nothing has been charged. Try again in a moment.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => retry()}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/billing">Back to billing</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
