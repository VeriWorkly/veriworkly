"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@veriworkly/ui";

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showTrace, setShowTrace] = useState(false);

  useEffect(() => {
    console.error("Editor Error:", error);
  }, [error]);

  return (
    <div className="workspace-theme bg-paper-2 text-ink flex h-dvh min-h-0 flex-col overflow-hidden select-none">
      {/* Mock Editor Header */}
      <header className="z-40 grid min-h-16 shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/10 bg-[#171717] px-3 text-white sm:px-4">
        <Link className="flex items-center gap-2" href="/dashboard">
          <Image src="/veriworkly-logo.png" width={30} height={30} alt="VeriWorkly logo" priority />
          <span className="hidden text-sm font-bold sm:block">VeriWorkly</span>
        </Link>
        <div className="min-w-0 text-center">
          <p className="text-sm font-extrabold">Portfolio editor</p>
          <p className="text-[11px] font-bold text-white/45">Error State</p>
        </div>
        <div className="flex items-center justify-end gap-1.5">
          <Button
            asChild
            variant="ghost"
            className="h-8 rounded-lg border-white/15 bg-white/8 px-4 text-xs font-bold tracking-wider text-white uppercase hover:bg-white/12"
          >
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>

      {/* Editor Workspace Error Layout */}
      <div className="grid min-h-0 flex-1 lg:grid-cols-[15rem_minmax(23rem,31rem)_minmax(0,1fr)]">
        {/* Mocked out StructureRail */}
        <aside className="border-line bg-panel hidden flex-col border-r opacity-25 lg:flex">
          <div className="border-line flex min-h-12 items-center justify-between border-b px-4">
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
              Structure
            </span>
          </div>
          <div className="flex-1 space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div className="flex items-center gap-3 rounded-lg p-2" key={i}>
                <div className="bg-line/30 size-4 rounded" />
                <div className="bg-line/20 h-3 w-2/3 rounded" />
              </div>
            ))}
          </div>
        </aside>

        {/* Mocked out ContentCanvas */}
        <aside className="border-line bg-panel-raised hidden flex-col border-r opacity-25 lg:flex">
          <div className="border-line flex min-h-12 items-center justify-between border-b px-4">
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
              Canvas Editor
            </span>
          </div>
          <div className="flex-1 space-y-6 p-6">
            <div className="bg-line/10 h-10 w-full rounded-xl" />
            <div className="bg-line/10 h-20 w-full rounded-xl" />
          </div>
        </aside>

        {/* Focus Area: Error Canvas */}
        <main className="bg-paper-2 relative flex flex-col items-center justify-center p-6">
          <div className="border-line bg-panel relative w-full max-w-xl rounded-3xl border p-6 shadow-[8px_10px_0_rgba(17,17,15,0.03)] md:p-8">
            <div className="bg-danger absolute -top-3 -right-3 rotate-2 rounded-full px-3 py-1 text-[9px] font-bold tracking-widest text-white uppercase shadow-md">
              CANVAS FAULT
            </div>

            <div className="flex flex-col items-start">
              <div className="bg-danger/10 text-danger mb-6 flex items-center justify-center rounded-2xl p-3">
                <AlertCircle className="size-6 animate-pulse" />
              </div>

              <p className="text-danger text-xs font-bold tracking-[0.16em] uppercase">
                Editor Exception
              </p>

              <h1 className="text-ink mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Canvas rendering halted.
              </h1>

              <p className="text-muted mt-3 text-xs leading-relaxed">
                An error occurred within the interactive editor workspace. Your project structure
                and changes have been preserved safely.
              </p>

              <div className="mt-8 flex w-full flex-wrap items-center gap-3">
                <Button
                  onClick={() => reset()}
                  className="bg-accent hover:bg-accent-strong inline-flex min-h-9 items-center gap-2 rounded-full px-5 text-xs font-bold tracking-wider text-white uppercase transition-transform active:scale-[0.97]"
                >
                  <RefreshCw className="size-3.5" /> Re-align Canvas
                </Button>

                <Button
                  asChild
                  variant="ghost"
                  className="border-line text-ink hover:bg-paper-2 inline-flex min-h-9 items-center gap-2 rounded-full border px-5 text-xs font-bold tracking-wider uppercase transition-transform active:scale-[0.97]"
                >
                  <Link href="/dashboard">
                    <LayoutDashboard className="size-3.5" /> Return to Dashboard
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
        </main>
      </div>
    </div>
  );
}
