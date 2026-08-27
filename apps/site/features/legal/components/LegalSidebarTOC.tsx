"use client";

import { Search, ArrowUp } from "lucide-react";
import React, { useEffect, useRef } from "react";

import type { LegalSection } from "../types";

interface LegalSidebarTOCProps {
  sections: LegalSection[];
  filteredSections: LegalSection[];
  activeSectionId: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function LegalSidebarTOC({
  sections,
  filteredSections,
  activeSectionId,
  searchQuery,
  onSearchChange,
}: LegalSidebarTOCProps) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!activeSectionId || !navRef.current) return;

    const activeLink = navRef.current.querySelector<HTMLElement>(`a[href="#${activeSectionId}"]`);

    if (activeLink) activeLink.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeSectionId]);

  const scrollToTop = () => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <aside className="hidden lg:sticky lg:top-28 lg:col-span-4 lg:block lg:h-[calc(100vh-8.5rem)] lg:self-start">
      <div className="border-border/60 bg-card/40 relative flex h-full flex-col overflow-hidden rounded-3xl border p-5 shadow-lg backdrop-blur-sm">
        <div className="border-border/40 space-y-3.5 border-b pb-3.5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-accent font-mono text-[10px] font-bold tracking-widest uppercase">
                Document Index
              </span>

              <h3 className="text-foreground text-sm font-bold tracking-tight">
                Table of Contents
              </h3>
            </div>

            <span className="border-border/60 bg-background text-muted rounded-full border px-2.5 py-0.5 font-mono text-[10px]">
              {sections.length} clauses
            </span>
          </div>

          <div className="relative">
            <Search className="text-muted absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />

            <input
              type="text"
              value={searchQuery}
              placeholder="Search clauses..."
              onChange={(e) => onSearchChange(e.target.value)}
              className="border-border/60 bg-background/80 text-foreground placeholder:text-muted focus:border-accent w-full rounded-xl border py-2 pr-7 pl-8 text-xs transition-colors outline-none"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="text-muted hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-xs"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <nav
          ref={navRef}
          aria-label="Table of contents"
          className="min-h-0 flex-1 scrollbar-thin overflow-y-auto py-2 pr-1"
        >
          <ol className="space-y-1">
            {filteredSections.map((section) => {
              const originalIndex = sections.findIndex((s) => s.id === section.id);

              const displayIndex = originalIndex >= 0 ? originalIndex + 1 : 1;
              const isActive = activeSectionId === section.id;

              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-all duration-150 ${
                      isActive
                        ? "bg-accent/15 text-accent border-accent border-l-2 font-bold shadow-xs"
                        : "text-muted hover:bg-muted/10 hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] opacity-70">
                        {String(displayIndex).padStart(2, "0")}.
                      </span>

                      <span className="truncate">{section.title}</span>
                    </span>

                    {isActive && <span className="bg-accent size-1.5 shrink-0 rounded-full" />}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="border-border/40 flex items-center justify-between border-t pt-3 text-xs">
          <button
            type="button"
            onClick={scrollToTop}
            className="text-muted hover:text-foreground inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
          >
            <ArrowUp className="size-3" />
            <span>Back to top</span>
          </button>

          <span className="text-muted/60 font-mono text-[10px]">Auditable MIT Core</span>
        </div>
      </div>
    </aside>
  );
}
