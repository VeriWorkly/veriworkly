"use client";

import React, { useState } from "react";
import { Link2, Check } from "lucide-react";

import { Reveal } from "@/components/marketing/Reveal";

import type { LegalSection } from "../types";

interface LegalSectionCardProps {
  section: LegalSection;
  displayIndex: number;
  isCurrent: boolean;
}

export function LegalSectionCard({ section, displayIndex, isCurrent }: LegalSectionCardProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}${window.location.pathname}#${section.id}`;

      navigator.clipboard.writeText(url);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Reveal>
      <article
        id={section.id}
        className={`border-border/60 bg-card/40 relative scroll-mt-32 rounded-3xl border p-7 shadow-md backdrop-blur-xs transition-all md:p-9 ${
          isCurrent ? "border-accent/40 ring-accent/20 shadow-lg ring-1" : "hover:border-border"
        }`}
      >
        <div className="border-border/40 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2.5">
            <span className="bg-accent/15 text-accent ring-accent/30 flex size-8 items-center justify-center rounded-lg font-mono text-xs font-bold ring-1">
              {String(displayIndex).padStart(2, "0")}
            </span>

            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              {section.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={copyLink}
            title="Copy link to this section"
            className="border-border/60 bg-background/80 text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-500" />
                <span className="font-semibold text-emerald-500">Copied Link</span>
              </>
            ) : (
              <>
                <Link2 className="size-3" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>

        {section.intro?.map((paragraph, i) => (
          <p key={i} className="text-muted mt-5 text-xs leading-relaxed sm:text-sm">
            {paragraph}
          </p>
        ))}

        {section.subsections?.map((sub, si) => (
          <div key={si} className="border-border/30 mt-6 border-t pt-5">
            {sub.heading && (
              <h3 className="text-foreground text-sm font-bold tracking-tight sm:text-base">
                {displayIndex}.{si + 1} {sub.heading}
              </h3>
            )}

            {sub.paragraphs?.map((paragraph, pi) => (
              <p key={pi} className="text-muted mt-2.5 text-xs leading-relaxed sm:text-sm">
                {paragraph}
              </p>
            ))}

            {sub.list && (
              <ul className="text-muted mt-3 space-y-2 text-xs leading-relaxed sm:text-sm">
                {sub.list.map((item, li) => (
                  <li key={li} className="flex items-start gap-2">
                    <span className="bg-accent/20 text-accent mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold">
                      •
                    </span>

                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {sub.orderedList && (
              <ol className="text-muted mt-3 space-y-2 text-xs leading-relaxed sm:text-sm">
                {sub.orderedList.map((item, li) => (
                  <li key={li} className="flex items-start gap-2">
                    <span className="bg-accent/15 text-accent mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold">
                      {li + 1}
                    </span>

                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </article>
    </Reveal>
  );
}
