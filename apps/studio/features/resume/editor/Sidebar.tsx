"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { useSections } from "@/features/resume/hooks/use-sections";
import { useResumeStore } from "@/features/resume/store/resume-store";

const Sidebar = () => {
  const { sections, selectedSection } = useSections();

  const selectSection = useResumeStore((state) => state.selectSection);
  const reorderSections = useResumeStore((state) => state.reorderSections);

  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);

  function handleDrop(targetIndex: number) {
    if (draggedSectionIndex === null || draggedSectionIndex === targetIndex) {
      setDraggedSectionIndex(null);
      return;
    }

    reorderSections(draggedSectionIndex, targetIndex);
    setDraggedSectionIndex(targetIndex);
  }

  return (
    <aside className="border-border bg-card rounded-4xl border p-5 shadow-sm">
      <div className="mb-6">
        <p className="text-muted text-xs font-semibold tracking-[0.24em] uppercase">Editor Map</p>

        <h2 className="text-foreground mt-2 text-xl font-semibold">Resume sections</h2>
      </div>

      <div className="space-y-2">
        {sections.map((section, index) => (
          <button
            draggable
            type="button"
            key={section.id}
            onDrop={() => handleDrop(index)}
            onClick={() => selectSection(section.id)}
            onDragEnd={() => setDraggedSectionIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => setDraggedSectionIndex(index)}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition",
              draggedSectionIndex === index ? "opacity-60" : "opacity-100",
              selectedSection === section.id
                ? "bg-accent text-accent-foreground"
                : "bg-background text-foreground hover:bg-background/80",
            )}
          >
            <span>{section.label}</span>
            <span className="text-xs opacity-80">0{section.order + 1}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
