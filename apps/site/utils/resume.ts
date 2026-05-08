import type { ResumeSection } from "@/types/resume";

export const getOrderedSections = (sections: ResumeSection[]) => {
  return [...sections]
    .filter((section) => section.visible)
    .sort((left, right) => left.order - right.order);
};
