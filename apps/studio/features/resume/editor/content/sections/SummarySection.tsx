"use client";

import type { BaseSectionProps } from "./section-types";

import { cn } from "@/lib/utils";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateSummary } from "@/features/resume/utils/validation";

import DraggableSection from "./DraggableSection";
import { Field, invalidClass, TextArea } from "../EditorFormPrimitives";

const SummarySection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const summary = useResumeStore((state) => state.resume.summary);
  const updateSummary = useResumeStore((state) => state.updateSummary);

  const summaryErrors = validateSummary(summary);

  return (
    <DraggableSection
      id="summary"
      isOpen={isOpen}
      label="Summary"
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onToggle={onToggle}
    >
      <Field error={summaryErrors.summary} label="Professional summary">
        <TextArea
          className={cn("min-h-40", invalidClass(summaryErrors.summary))}
          onChange={(event) => updateSummary(event.target.value)}
          value={summary}
        />
      </Field>
    </DraggableSection>
  );
};

export default SummarySection;
