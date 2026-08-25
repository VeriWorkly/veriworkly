"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Card } from "@veriworkly/ui";
import type { BrandColorToken } from "@/config/brand";

/**
 * Both grounds are painted explicitly rather than inherited, because several
 * tokens (--border, --fd-accent) are alpha values that only read correctly when
 * composited over the background of their own theme.
 */
const LIGHT_GROUND = "#F5F4EF";
const DARK_GROUND = "#0D1117";

interface ValueRowProps {
  theme: "Light" | "Dark";
  value: string;
}

const ValueRow = ({ theme, value }: ValueRowProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser - the value stays visible.
    }
  };

  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted shrink-0 font-mono text-[10px] tracking-[0.14em] uppercase">
        {theme}
      </span>

      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy the ${theme.toLowerCase()} value ${value}`}
        className="text-foreground hover:text-accent focus-visible:ring-accent group flex min-w-0 items-center gap-1.5 rounded font-mono text-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <span className="truncate">{value}</span>

        {copied ? (
          <Check className="text-success size-3 shrink-0" aria-hidden="true" />
        ) : (
          <Copy
            className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
          />
        )}
      </button>
    </div>
  );
};

export const TokenSwatch = ({ name, variable, light, dark, description }: BrandColorToken) => (
  <Card className="overflow-hidden p-0">
    <div className="flex h-24">
      <div className="flex-1 p-2.5" style={{ backgroundColor: LIGHT_GROUND }} aria-hidden="true">
        <div className="h-full w-full rounded-sm" style={{ backgroundColor: light }} />
      </div>

      <div className="flex-1 p-2.5" style={{ backgroundColor: DARK_GROUND }} aria-hidden="true">
        <div className="h-full w-full rounded-sm" style={{ backgroundColor: dark }} />
      </div>
    </div>

    <div className="space-y-2 p-4">
      <div>
        <p className="text-foreground font-semibold">{name}</p>
        <p className="text-muted font-mono text-[10px]">{variable}</p>
      </div>

      <div className="space-y-1">
        <ValueRow theme="Light" value={light} />
        <ValueRow theme="Dark" value={dark} />
      </div>

      <p className="text-muted text-xs leading-relaxed">{description}</p>
    </div>
  </Card>
);

export default TokenSwatch;
