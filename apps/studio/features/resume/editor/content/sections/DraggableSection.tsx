"use client";

import type { ReactNode } from "react";

import type { SectionDnDHandlers } from "./section-types";
import type { ResumeSectionId } from "@/types/resume";

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
  onDragOver,
  onDrop,
  onToggle,
}: DraggableSectionProps) => {
  return (
    <div onDragOver={onDragOver} onDrop={onDrop}>
      <SectionAccordion
        id={id}
        isOpen={isOpen}
        label={label}
        onToggle={(nextId) => onToggle(nextId as ResumeSectionId)}
      >
        {children}
      </SectionAccordion>
    </div>
  );
};

export default DraggableSection;
