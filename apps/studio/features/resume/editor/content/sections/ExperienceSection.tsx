"use client";

import { useMemo } from "react";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateExperience } from "@/features/resume/utils/validation";
import { AiFieldAssist } from "@/features/ai/AiFieldAssist";

import {
  Field,
  CheckboxField,
  TextAreaField,
  TextInputField,
  DelimitedTextArea,
} from "@/features/documents/editor/form";
import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { ListEditorControls } from "@/features/documents/editor/ListEditorControls";
import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";
import type { BaseSectionProps } from "./section-types";
import type { ResumeSectionId } from "@/types/resume";

const ExperienceSection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const experience = useResumeStore((state) => state.resume.experience);
  const resumeId = useResumeStore((state) => state.resume.id);
  const addExperience = useResumeStore((state) => state.addExperience);
  const removeExperience = useResumeStore((state) => state.removeExperience);
  const updateExperience = useResumeStore((state) => state.updateExperience);

  const list = useIndexedListEditor(experience, addExperience);
  const activeExperience = list.activeItem;

  const experienceErrors = useMemo(
    () => (activeExperience ? validateExperience(activeExperience) : {}),
    [activeExperience],
  );

  return (
    <SectionAccordion
      id="experience"
      isOpen={isOpen}
      label="Experience"
      onToggle={(nextId) => onToggle(nextId as ResumeSectionId)}
    >
      <ListEditorControls
        items={experience}
        index={list.index}
        onAdd={list.add}
        onSelect={list.select}
        onRemove={removeExperience}
        labelFor={(item, index) => item.role || item.company || `Experience ${index + 1}`}
      />

      {activeExperience ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="Role"
              value={activeExperience.role}
              error={experienceErrors.role}
              onValueChange={(role) => updateExperience(list.index, { role })}
            />

            <TextInputField
              label="Company"
              value={activeExperience.company}
              error={experienceErrors.company}
              onValueChange={(company) => updateExperience(list.index, { company })}
            />

            <TextInputField
              label="Location"
              value={activeExperience.location}
              error={experienceErrors.location}
              onValueChange={(location) => updateExperience(list.index, { location })}
            />

            <TextInputField
              type="month"
              label="Start (YYYY-MM)"
              placeholder="2024-01"
              value={activeExperience.startDate}
              error={experienceErrors.startDate}
              onValueChange={(startDate) => updateExperience(list.index, { startDate })}
            />

            <TextInputField
              type="month"
              label="End (YYYY-MM)"
              placeholder="2025-06"
              disabled={activeExperience.current}
              value={activeExperience.endDate}
              error={experienceErrors.endDate}
              onValueChange={(endDate) => updateExperience(list.index, { endDate })}
            />

            <CheckboxField
              checked={activeExperience.current}
              onCheckedChange={(current) =>
                updateExperience(list.index, {
                  current,
                  endDate: current ? "" : activeExperience.endDate,
                })
              }
            >
              I currently work here
            </CheckboxField>
          </div>

          <div className="mt-4 space-y-4">
            <TextAreaField
              label="Summary"
              value={activeExperience.summary}
              error={experienceErrors.summary}
              onValueChange={(summary) => updateExperience(list.index, { summary })}
            />

            <AiFieldAssist
              action={activeExperience.summary ? "rewrite_section" : "generate_section"}
              context={JSON.stringify({
                role: activeExperience.role,
                company: activeExperience.company,
                highlights: activeExperience.highlights,
              })}
              documentId={resumeId}
              onApply={(summary) => updateExperience(list.index, { summary })}
              text={activeExperience.summary}
            />

            {/* Children-based `Field`: DelimitedTextArea keeps a local draft string and so
                cannot take the value/onChange contract the `*Field` wrappers impose. */}
            <Field label="Highlights (comma separated)">
              <DelimitedTextArea
                key={activeExperience.id}
                onChange={(highlights) => updateExperience(list.index, { highlights })}
                value={activeExperience.highlights}
              />
            </Field>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">No experience entries yet. Click Add to create one.</p>
      )}
    </SectionAccordion>
  );
};

export default ExperienceSection;
