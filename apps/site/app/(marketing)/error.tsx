"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, RotateCw, TriangleAlert } from "lucide-react";

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timeout);
  }, [copied]);

  const handleCopy = async () => {
    if (!error.digest) return;
    await navigator.clipboard.writeText(error.digest);
    setCopied(true);
  };

  return (
    <section className="w-full bg-[#f3f4f6] p-2 md:p-3 lg:p-4 dark:bg-black">
      <div className="relative flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden rounded-4xl border border-black/5 bg-white px-6 py-24 text-center dark:border-white/5 dark:bg-[#080808]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(120,119,198,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,119,198,0.05)_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

        <div className="relative z-10 flex max-w-xl flex-col items-center">
          <div className="relative mb-8 flex h-20 w-20 items-center justify-center">
            <span className="motion-reduce:animate-none animate-pulse-ring absolute inset-0 rounded-full border border-red-500/30" />
            <span className="motion-reduce:animate-none animate-pulse-ring absolute inset-0 rounded-full border border-red-500/30 [animation-delay:1.2s]" />
            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              <TriangleAlert className="h-8 w-8" aria-hidden="true" />
            </div>
          </div>

          <p className="text-xs font-semibold tracking-[0.18em] text-red-600 uppercase dark:text-red-400">
            System error
          </p>

          <h1 className="mt-4 text-4xl font-semibold tracking-tighter text-balance text-zinc-900 sm:text-5xl dark:text-white">
            This page hit a snag
          </h1>

          <p className="mt-6 max-w-md text-lg leading-relaxed text-zinc-500 dark:text-zinc-400">
            Nothing was lost on your end. Reload this section, or head back and pick up where
            you left off.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => reset()}
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-zinc-950 px-8 text-base font-semibold text-white shadow-md transition-all duration-300 hover:bg-blue-600 active:scale-[0.97] dark:bg-white dark:text-zinc-950 dark:hover:bg-blue-500 dark:hover:text-white"
            >
              <RotateCw
                className="h-4 w-4 transition-transform duration-500 group-hover:rotate-180"
                aria-hidden="true"
              />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-8 text-base font-medium text-zinc-800 backdrop-blur-md transition-colors hover:border-blue-500/30 hover:text-blue-600 dark:border-white/10 dark:bg-black/40 dark:text-zinc-200 dark:hover:text-blue-400"
            >
              Back to Home
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {error.digest ? (
            <button
              type="button"
              onClick={handleCopy}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-black/5 bg-zinc-50 px-3 py-1.5 font-mono text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:border-white/5 dark:bg-white/5 dark:text-zinc-600 dark:hover:text-zinc-300"
            >
              Reference: {error.digest}
              {copied ? (
                <Check className="h-3 w-3 text-emerald-500" aria-hidden="true" />
              ) : (
                <Copy className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
