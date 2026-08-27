import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";

import type { LegalContactBannerProps } from "../types";

export function LegalContactBanner({
  tagline,
  title,
  description,
  primaryActionText,
  primaryActionEmail,
  secondaryActionText,
  secondaryActionHref,
  secondaryActionIcon: SecondaryIcon = ShieldCheck,
}: LegalContactBannerProps) {
  return (
    <div className="border-border/60 bg-card/40 relative flex flex-wrap items-center justify-between gap-6 overflow-hidden rounded-3xl border p-8 shadow-xl backdrop-blur-sm sm:p-10">
      <div className="bg-accent/10 pointer-events-none absolute top-0 left-0 size-80 rounded-full blur-3xl" />

      <div className="max-w-lg space-y-1.5">
        <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
          {tagline}
        </span>

        <h3 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">{title}</h3>

        <p className="text-muted text-xs leading-relaxed sm:text-sm">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`mailto:${primaryActionEmail}`}
          className="bg-accent text-accent-foreground group inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-semibold shadow-md transition-opacity hover:opacity-90 active:scale-[0.97]"
        >
          <Mail className="size-4" />
          <span>{primaryActionText}</span>
        </a>

        <Link
          href={secondaryActionHref}
          className="border-border/80 bg-background/80 text-foreground hover:bg-card inline-flex items-center gap-2 rounded-full border px-5 py-3 text-xs font-semibold transition-colors"
        >
          <SecondaryIcon className="text-accent size-4" />
          <span>{secondaryActionText}</span>
        </Link>
      </div>
    </div>
  );
}
