"use client";

import type { BaseSectionProps } from "./section-types";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { AiFieldAssist } from "@/features/ai/AiFieldAssist";
import { resumeAiContext } from "@/features/ai/ai-context";

import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { TextAreaField } from "@/features/documents/editor/form";

const SummarySection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const summary = useResumeStore((state) => state.resume.summary);
  const resumeId = useResumeStore((state) => state.resume.id);
  const updateSummary = useResumeStore((state) => state.updateSummary);

  return (
    <SectionAccordion id="summary" isOpen={isOpen} label="Summary" onToggle={onToggle}>
      <TextAreaField
        className="min-h-40"
        label="Professional summary"
        value={summary}
        onValueChange={updateSummary}
      />
      <AiFieldAssist
        action={summary ? "rewrite_section" : "generate_section"}
        getContext={() => JSON.stringify(resumeAiContext(useResumeStore.getState().resume))}
        documentId={resumeId}
        onApply={updateSummary}
        text={summary}
      />
    </SectionAccordion>
  );
};

export default SummarySection;
