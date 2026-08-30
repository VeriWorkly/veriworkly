"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyBlockProps {
  label: string;
  text: string;
}

const CopyBlock = ({ label, text }: CopyBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser - the text is still selectable.
    }
  };

  return (
    <div className="border-border bg-background space-y-3 rounded-2xl border p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">{label}</p>

        <button
          type="button"
          onClick={handleCopy}
          className="text-muted hover:text-accent flex shrink-0 items-center gap-1.5 text-xs font-semibold transition-colors"
        >
          {copied ? (
            <>
              <Check className="text-success size-3.5" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>

      <p className="text-foreground text-sm leading-relaxed">{text}</p>
    </div>
  );
};

export default CopyBlock;
