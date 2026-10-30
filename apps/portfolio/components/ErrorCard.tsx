"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@veriworkly/ui";

/** The error boundary card the platform, dashboard and editor share; only the words differ. */
export function ErrorCard({
  error,
  reset,
  title,
  body,
  back,
  className = "min-h-screen",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  body: string;
  back: { href: string; label: string };
  className?: string;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className={`bg-paper text-ink flex flex-col items-center justify-center p-6 ${className}`}
    >
      <div className="border-line bg-panel w-full max-w-xl rounded-3xl border p-6 md:p-8">
        <div className="bg-danger/10 text-danger mb-6 inline-flex rounded-2xl p-3">
          <AlertCircle className="size-6" aria-hidden="true" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="text-muted mt-3 text-sm leading-relaxed">{body}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => reset()}
            className="bg-accent hover:bg-accent-strong inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-bold text-white"
          >
            <RefreshCw className="size-4" aria-hidden="true" /> Try again
          </Button>
          <Button
            asChild
            variant="ghost"
            className="border-line text-ink hover:bg-paper-2 inline-flex min-h-10 items-center rounded-full border px-5 text-sm font-bold"
          >
            <Link href={back.href}>{back.label}</Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="text-muted mt-6 font-mono text-xs select-text">
            Error reference: {error.digest}
          </p>
        ) : null}
        {process.env.NODE_ENV !== "production" && error.stack ? (
          <pre className="bg-paper-2 mt-4 max-h-60 overflow-auto rounded-xl p-4 font-mono text-[11px] whitespace-pre-wrap select-text">
            {error.stack}
          </pre>
        ) : null}
      </div>
    </main>
  );
}
