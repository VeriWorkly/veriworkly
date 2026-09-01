"use client";

import { useState } from "react";
import { BookOpen, Search, Menu, X } from "lucide-react";

import type { LegalSection } from "../types";

interface LegalMobileNavProps {
  sections: LegalSection[];
  filteredSections: LegalSection[];
  activeSectionId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function LegalMobileNav({
  sections,
  filteredSections,
  activeSectionId,
  searchQuery,
  onSearchChange,
}: LegalMobileNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentSection = sections.find((s) => s.id === activeSectionId);

  return (
    <div className="sticky top-20 z-30 mb-8 block lg:hidden">
      <div className="border-border/80 bg-background/95 flex items-center justify-between rounded-2xl border p-3.5 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 truncate pr-2">
          <span className="bg-accent/15 text-accent flex size-7 shrink-0 items-center justify-center rounded-lg">
            <BookOpen className="size-3.5" />
          </span>

          <span className="text-foreground truncate text-xs font-bold">
            {currentSection?.title ?? "Table of Contents"}
          </span>
        </div>

        <button
          type="button"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="border-border/60 bg-card text-foreground inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold"
        >
          {mobileMenuOpen ? <X className="size-3.5" /> : <Menu className="size-3.5" />}
          <span>{mobileMenuOpen ? "Close" : "Index"}</span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-border/80 bg-card/95 absolute top-full right-0 left-0 mt-2 max-h-96 overflow-y-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-xl">
          <div className="relative mb-3">
            <Search className="text-muted absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />

            <input
              type="text"
              value={searchQuery}
              placeholder="Search clauses..."
              onChange={(e) => onSearchChange(e.target.value)}
              className="border-border/60 bg-background/90 text-foreground placeholder:text-muted focus:border-accent w-full rounded-xl border py-2 pr-3 pl-8 text-xs outline-none"
            />
          </div>

          <ol className="space-y-1">
            {filteredSections.map((sec, idx) => (
              <li key={sec.id}>
                <a
                  href={`#${sec.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                    activeSectionId === sec.id
                      ? "bg-accent/15 text-accent font-bold"
                      : "text-muted hover:text-foreground hover:bg-muted/10"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-70">
                    {String(idx + 1).padStart(2, "0")}.
                  </span>
                  <span className="truncate">{sec.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
