"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@veriworkly/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showTrace, setShowTrace] = useState(false);

  useEffect(() => {
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="surface-grid flex min-h-[calc(100dvh-4.25rem)] flex-col items-center justify-center p-6 select-none md:p-12">
      <div className="border-line bg-panel relative w-full max-w-xl rounded-3xl border p-6 shadow-[8px_10px_0_rgba(17,17,15,0.03)] md:p-8">
        <div className="bg-danger absolute -top-3 -right-3 rotate-2 rounded-full px-3 py-1 text-[9px] font-bold tracking-widest text-white uppercase shadow-md select-none">
          DASHBOARD FAULT
        </div>

        <div className="flex flex-col items-start">
          <div className="bg-danger/10 text-danger mb-6 flex items-center justify-center rounded-2xl p-3">
            <AlertCircle className="size-6 animate-pulse" />
          </div>

          <p className="text-danger text-xs font-bold tracking-[0.16em] uppercase">
            Runtime Exception
          </p>

          <h1 className="text-ink mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Dashboard panel failed.
          </h1>

          <p className="text-muted mt-3 text-xs leading-relaxed">
            An unexpected error disrupted the dashboard view. Your published portfolios and drafts
            remain completely safe.
          </p>

          <div className="mt-8 flex w-full flex-wrap items-center gap-3">
            <Button
              onClick={() => reset()}
              className="bg-accent hover:bg-accent-strong inline-flex min-h-9 items-center gap-2 rounded-full px-5 text-xs font-bold tracking-wider text-white uppercase transition-transform active:scale-[0.97]"
            >
              <RefreshCw className="size-3.5" /> Reload View
            </Button>

            <Button
              asChild
              variant="ghost"
              className="border-line text-ink hover:bg-paper-2 inline-flex min-h-9 items-center gap-2 rounded-full border px-5 text-xs font-bold tracking-wider uppercase transition-transform active:scale-[0.97]"
            >
              <Link href="/dashboard">
                <LayoutDashboard className="size-3.5" /> Return to Overview
              </Link>
            </Button>

            <button
              onClick={() => setShowTrace(!showTrace)}
              className="text-muted hover:text-ink ml-auto flex cursor-pointer items-center gap-1 text-[10px] font-bold tracking-wider uppercase transition-colors"
              type="button"
            >
              Trace{" "}
              {showTrace ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </button>
          </div>

          <div
            className={`border-line/60 mt-5 w-full overflow-hidden transition-all duration-300 ease-out ${
              showTrace
                ? "max-h-80 border-t pt-5 opacity-100"
                : "pointer-events-none max-h-0 opacity-0"
            }`}
          >
            <div className="bg-paper-2 text-ink-soft max-h-60 overflow-auto rounded-xl p-4 font-mono text-[10px] leading-relaxed select-text">
              <div className="text-danger mb-2 font-bold tracking-wider uppercase">
                ERROR_DIGEST: {error.digest || "UNKNOWN_SOURCE"}
              </div>
              <div className="font-bold opacity-95">
                {error.message || "No error message provided."}
              </div>
              {error.stack && (
                <pre className="mt-2 whitespace-pre-wrap opacity-60">{error.stack}</pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
