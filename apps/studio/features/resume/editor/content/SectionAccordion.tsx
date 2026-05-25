"use client";

import type { ReactNode } from "react";
import type { ResumeSectionId } from "@/types/resume";

import { cn } from "@/lib/utils";

const SectionAccordion = ({
  children,
  draggable,
  id,
  isOpen,
  label,
  onDragEnd,
  onDragStart,
  onToggle,
}: {
  children: ReactNode;
  draggable?: boolean;
  id: ResumeSectionId;
  isOpen: boolean;
  label: string;
  onDragEnd?: () => void;
  onDragStart?: (e: React.DragEvent<HTMLSpanElement>) => void;
  onToggle: (id: ResumeSectionId) => void;
}) => {
  return (
    <div className="border-border overflow-hidden rounded-2xl border transition-opacity">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm font-semibold",
          isOpen ? "bg-accent/10 text-foreground" : "bg-background text-muted",
        )}
      >
        <div className="flex items-center gap-2">
          {draggable ? (
            <span
              draggable
              onDragEnd={onDragEnd}
              onDragStart={onDragStart}
              className="text-muted cursor-grab text-lg leading-none select-none active:cursor-grabbing"
            >
              ⋮⋮
            </span>
          ) : null}

          <span>{label}</span>
        </div>

        <span>{isOpen ? "-" : "+"}</span>
      </button>

      {isOpen ? <div className="bg-card p-4">{children}</div> : null}
    </div>
  );
};

export default SectionAccordion;
