"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";

import { Button, Container } from "@veriworkly/ui";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showTrace, setShowTrace] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-paper text-ink relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 select-none md:p-12">
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-15" />
      <div className="bg-danger/5 pointer-events-none absolute -top-40 -left-40 size-96 rounded-full blur-3xl" />

      <Container className="relative w-full max-w-2xl">
        <div className="border-line-strong bg-panel relative rounded-4xl border-2 p-6 shadow-[12px_14px_0_rgba(239,68,68,0.06)] transition duration-300 hover:shadow-[16px_18px_0_rgba(239,68,68,0.08)] md:p-8">
          <div className="bg-danger absolute -top-3.5 -right-3.5 rotate-3 rounded-full px-4 py-1.5 text-[10px] font-bold tracking-widest text-white uppercase shadow-md select-none">
            ALIGNMENT LOST
          </div>

          <div className="flex flex-col items-start">
            <div className="bg-danger/10 text-danger mb-6 flex items-center justify-center rounded-2xl p-3">
              <AlertTriangle className="size-6 animate-pulse" />
            </div>

            <p className="text-danger text-xs font-bold tracking-[0.16em] uppercase">
              System Crash
            </p>

            <h1 className="text-ink mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
              Canvas failed to align.
            </h1>

            <p className="text-muted mt-4 max-w-xl text-sm leading-relaxed">
              An unexpected error disrupted the editor rendering sequence. Don&apos;t worry, your
              portfolio data is safe in localStorage/cloud cache.
            </p>

            <div className="mt-8 flex w-full flex-wrap items-center gap-4">
              <Button
                onClick={() => reset()}
                className="bg-accent hover:bg-accent-strong inline-flex min-h-9 items-center gap-2 rounded-full text-xs font-bold tracking-wider text-white uppercase transition-transform active:scale-[0.97]"
              >
                <RefreshCw className="size-3.5" /> Re-align Canvas
              </Button>

              <Button
                asChild
                variant="ghost"
                className="border-line text-ink hover:bg-paper-2 inline-flex min-h-9 items-center rounded-full border px-6 text-xs font-bold tracking-wider uppercase transition-transform active:scale-[0.97]"
              >
                <Link href="/">Return to Landing</Link>
              </Button>

              <button
                onClick={() => setShowTrace(!showTrace)}
                className="text-muted hover:text-ink ml-auto flex cursor-pointer items-center gap-1.5 text-xs font-bold tracking-wider uppercase transition-colors"
                type="button"
              >
                Diagnostics{" "}
                {showTrace ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </div>

            <div
              className={`border-line mt-6 w-full overflow-hidden transition-all duration-300 ease-out ${
                showTrace
                  ? "max-h-80 border-t pt-6 opacity-100"
                  : "pointer-events-none max-h-0 opacity-0"
              }`}
            >
              <div className="bg-paper-2 text-ink-soft max-h-60 overflow-auto rounded-xl p-4 font-mono text-[11px] leading-relaxed select-text">
                <div className="text-danger mb-2 font-bold tracking-wide uppercase">
                  ERROR_DIGEST: {error.digest || "UNKNOWN_SOURCE"}
                </div>

                <div className="opacity-95">{error.message || "No message found."}</div>
                {error.stack && (
                  <pre className="mt-3 font-mono text-[10px] whitespace-pre-wrap opacity-70">
                    {error.stack}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
