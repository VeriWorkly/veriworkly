"use client";

import type { ReactNode } from "react";

import type { ResumeSectionId } from "@/types/resume";
import type { SectionDnDHandlers } from "./section-types";

import SectionAccordion from "../SectionAccordion";

interface DraggableSectionProps extends SectionDnDHandlers {
  children: ReactNode;
  id: ResumeSectionId;
  isOpen: boolean;
  label: string;
  onToggle: (id: ResumeSectionId) => void;
}

const DraggableSection = ({
  children,
  id,
  isOpen,
  label,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: DraggableSectionProps) => {
  return (
    <div onDragOver={onDragOver} onDrop={onDrop}>
      <SectionAccordion
        draggable
        id={id}
        isOpen={isOpen}
        label={label}
        onDragEnd={onDragEnd}
        onDragStart={onDragStart}
        onToggle={onToggle}
      >
        {children}
      </SectionAccordion>
    </div>
  );
};

export default DraggableSection;
