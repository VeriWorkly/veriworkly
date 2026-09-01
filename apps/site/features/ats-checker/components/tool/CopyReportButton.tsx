"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { siteConfig } from "@/config/site";
import { reportToPlainText } from "../../services/report-text";
import type { AtsFullReport } from "../../types";

export function CopyReportButton({ report }: { report: AtsFullReport }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = reportToPlainText(report, siteConfig.url);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Degrades gracefully on restricted clipboard permissions.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-zinc-800 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
      aria-label="Copy report as plain text"
    >
      {copied ? (
        <>
          <Check
            className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
            aria-hidden="true"
          />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
          <span>Copy report</span>
        </>
      )}
    </button>
  );
}

export default CopyReportButton;
