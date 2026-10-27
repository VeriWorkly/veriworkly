"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, RotateCw } from "lucide-react";

import { StatusPage, statusAction } from "@/components/marketing/StatusPage";
import { reportClientError } from "@/utils/report-client-error";

const MarketingError = ({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(error);
    reportClientError(error, "marketing");
  }, [error]);

  useEffect(() => {
    if (!copied) return;

    const timeout = setTimeout(() => setCopied(false), 1800);

    return () => clearTimeout(timeout);
  }, [copied]);

  const handleCopy = async () => {
    if (!error.digest) return;

    try {
      await navigator.clipboard.writeText(error.digest);
    } catch {
      // Clipboard refused; the reference stays on screen to copy by hand.
      return;
    }

    setCopied(true);
  };

  return (
    <div role="alert">
      <StatusPage
        title="This page"
        highlight="hit a snag."
        lede="It failed to load on our side. Nothing you were working on is lost: your documents live in your browser. Try again, or come back in a minute."
        actions={
          <>
            <button
              type="button"
              onClick={() => retry()}
              className={`group ${statusAction.primary}`}
            >
              <RotateCw
                aria-hidden="true"
                className="size-4 transition-transform duration-500 group-hover:rotate-180"
              />
              Try again
            </button>

            <Link href="/" className={statusAction.secondary}>
              Back to home
            </Link>

            {error.digest ? (
              <button
                type="button"
                onClick={handleCopy}
                className="text-muted hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
              >
                {copied ? "Copied" : `Reference ${error.digest}`}
                {copied ? (
                  <Check className="text-success size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
              </button>
            ) : null}
          </>
        }
      />
    </div>
  );
};

export default MarketingError;
