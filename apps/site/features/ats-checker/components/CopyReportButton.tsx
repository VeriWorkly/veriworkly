"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { siteConfig } from "@/config/site";
import { reportToPlainText } from "@/features/ats-checker/report-text";
import type { AtsFullReport } from "@/features/ats-checker/types";

export function CopyReportButton({ report }: { report: AtsFullReport }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2_400);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reportToPlainText(report, siteConfig.url));
      setState("copied");
    } catch {
      // Clipboard access is denied outside a secure context and in some embedded browsers.
      // Say so instead of silently doing nothing.
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void copy()}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-zinc-200 px-3.5 text-xs font-semibold text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:outline-none dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-white dark:focus-visible:ring-offset-black"
      >
        {state === "copied" ? (
          <Check
            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {state === "copied" ? "Copied" : "Copy report"}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {state === "copied" ? "Report copied to the clipboard." : ""}
        {state === "failed" ? "Copying failed. Select the report text manually." : ""}
      </span>
      {state === "failed" ? (
        <span className="text-xs text-red-700 dark:text-red-400">
          Clipboard blocked - select the text manually.
        </span>
      ) : null}
    </div>
  );
}
