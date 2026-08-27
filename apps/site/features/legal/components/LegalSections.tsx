"use client";

import React, { useState, useMemo } from "react";

import type { LegalSection } from "../types";

import { useScrollSpy } from "../hooks/useScrollSpy";
import { useLegalSearch } from "../hooks/useLegalSearch";

import { LegalMobileNav } from "./LegalMobileNav";
import { LegalSidebarTOC } from "./LegalSidebarTOC";
import { LegalSectionCard } from "./LegalSectionCard";

export interface LegalSectionsProps {
  sections: LegalSection[];
}

export function LegalSections({ sections }: LegalSectionsProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  const activeSectionId = useScrollSpy(sectionIds);
  const filteredSections = useLegalSearch(sections, searchQuery);

  return (
    <div className="relative">
      <LegalMobileNav
        sections={sections}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeSectionId={activeSectionId}
        filteredSections={filteredSections}
      />

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start xl:gap-12">
        <LegalSidebarTOC
          sections={sections}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeSectionId={activeSectionId}
          filteredSections={filteredSections}
        />

        <main className="space-y-8 lg:col-span-8">
          {filteredSections.length === 0 ? (
            <div className="border-border/60 bg-card/20 text-muted rounded-3xl border p-12 text-center">
              <p className="text-sm">No sections found matching &quot;{searchQuery}&quot;.</p>

              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-accent mt-2 text-xs font-semibold hover:underline"
              >
                Clear search filter
              </button>
            </div>
          ) : (
            filteredSections.map((section, idx) => {
              const originalIndex = sections.findIndex((s) => s.id === section.id);

              const displayIndex = originalIndex >= 0 ? originalIndex + 1 : idx + 1;
              const isCurrent = activeSectionId === section.id;

              return (
                <LegalSectionCard
                  key={section.id}
                  section={section}
                  displayIndex={displayIndex}
                  isCurrent={isCurrent}
                />
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}

export default LegalSections;
