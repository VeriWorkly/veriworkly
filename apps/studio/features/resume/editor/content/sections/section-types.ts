import type { DragEvent } from "react";

import type { ResumeSectionId } from "@/types/resume";

export interface SectionDnDHandlers {
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragStart: (event: DragEvent<HTMLSpanElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export interface BaseSectionProps extends SectionDnDHandlers {
  isOpen: boolean;
  onToggle: (id: ResumeSectionId) => void;
}
