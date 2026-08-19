"use client";

import type { BaseSectionProps } from "./section-types";
import type { ResumeSectionId } from "@/types/resume";

import { useResumeStore } from "@/features/resume/store/resume-store";

import { LinksEditor } from "@/features/documents/editor/LinksEditor";
import SectionAccordion from "@/features/documents/editor/SectionAccordion";

/**
 * Accordion plus store wiring; the editing UI itself is `LinksEditor`, shared with the
 * cover letter. This file used to be 151 lines of link UI that had drifted away from the
 * cover letter's equivalent on layout, controls, options, and validation.
 */
const LinksSection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const links = useResumeStore((state) => state.resume.links);
  const addLinkItem = useResumeStore((state) => state.addLinkItem);
  const removeLinkItem = useResumeStore((state) => state.removeLinkItem);
  const updateLinkItem = useResumeStore((state) => state.updateLinkItem);
  const updateLinkDisplayMode = useResumeStore((state) => state.updateLinkDisplayMode);

  return (
    <SectionAccordion
      id="links"
      label="Links"
      isOpen={isOpen}
      onToggle={(nextId) => onToggle(nextId as ResumeSectionId)}
    >
      <LinksEditor
        links={links}
        onAddLink={addLinkItem}
        onUpdateLink={updateLinkItem}
        onRemoveLink={removeLinkItem}
        onUpdateLinks={(patch) => {
          if (patch.displayMode) updateLinkDisplayMode(patch.displayMode);
        }}
        emptyMessage="No links yet. Add GitHub, LinkedIn, portfolio, X, or custom links."
      />
    </SectionAccordion>
  );
};

export default LinksSection;
