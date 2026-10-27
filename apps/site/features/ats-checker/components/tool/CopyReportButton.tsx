"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { siteConfig } from "@/config/site";
import { reportToPlainText } from "../../services/report-text";
import type { AtsFullReport } from "../../types";

export function CopyReportButton({ report }: { report: AtsFullReport }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = async () => {
    const text = reportToPlainText(report, siteConfig.url);
    try {
      await navigator.clipboard.writeText(text);
      setFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard refused (permissions, an insecure origin): say so instead of doing nothing.
      setFailed(true);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="bg-background hover:bg-foreground hover:text-background focus-visible:ring-accent/40 inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]"
      aria-label="Copy report as plain text"
    >
      {copied ? (
        <>
          <Check className="text-success h-4 w-4" aria-hidden="true" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" aria-hidden="true" />
          <span>{failed ? "Couldn't copy, try again" : "Copy report"}</span>
        </>
      )}
    </button>
  );
}

export default CopyReportButton;
