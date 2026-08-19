import type { ResumeSectionId } from "@/types/resume";

export interface BaseSectionProps {
  isOpen: boolean;
  onToggle: (id: ResumeSectionId) => void;
}
