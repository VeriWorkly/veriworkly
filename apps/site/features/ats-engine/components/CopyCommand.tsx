"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@veriworkly/ui";

export function CopyCommand({ command, className }: { command: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be refused; the command stays selectable.
    }
  };

  return (
    <div
      className={cn(
        "bg-card flex w-full max-w-md items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5",
        className,
      )}
    >
      <span className="text-muted font-mono text-sm select-none" aria-hidden="true">
        $
      </span>
      <code className="w-0 min-w-0 flex-1 truncate font-mono text-sm">{command}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy "${command}"`}
        className="bg-foreground text-background focus-visible:ring-accent/40 inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-150 focus-visible:ring-2 focus-visible:outline-none active:scale-95"
      >
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </div>
  );
}
