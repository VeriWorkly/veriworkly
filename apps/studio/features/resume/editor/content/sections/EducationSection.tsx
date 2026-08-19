"use client";

import { useMemo } from "react";

import type { BaseSectionProps } from "./section-types";
import type { ResumeSectionId } from "@/types/resume";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateEducation } from "@/features/resume/utils/validation";

import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { ListEditorControls } from "@/features/documents/editor/ListEditorControls";
import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";
import { CheckboxField, TextAreaField, TextInputField } from "@/features/documents/editor/form";

/** Year inputs are typed freely and coerced to four digits, matching the stored shape. */
function toYear(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

const EducationSection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const education = useResumeStore((state) => state.resume.education);
  const addEducation = useResumeStore((state) => state.addEducation);
  const removeEducation = useResumeStore((state) => state.removeEducation);
  const updateEducation = useResumeStore((state) => state.updateEducation);

  const list = useIndexedListEditor(education, addEducation);
  const activeEducation = list.activeItem;

  const educationErrors = useMemo(
    () => (activeEducation ? validateEducation(activeEducation) : {}),
    [activeEducation],
  );

  return (
    <SectionAccordion
      id="education"
      isOpen={isOpen}
      label="Education"
      onToggle={(nextId) => onToggle(nextId as ResumeSectionId)}
    >
      <ListEditorControls
        items={education}
        index={list.index}
        onAdd={list.add}
        onSelect={list.select}
        onRemove={removeEducation}
        labelFor={(item, index) => item.school || item.degree || `Education ${index + 1}`}
      />

      {activeEducation ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="School"
              value={activeEducation.school}
              error={educationErrors.school}
              onValueChange={(school) => updateEducation(list.index, { school })}
            />

            <TextInputField
              label="Degree"
              value={activeEducation.degree}
              error={educationErrors.degree}
              onValueChange={(degree) => updateEducation(list.index, { degree })}
            />

            <TextInputField
              label="Field of study"
              value={activeEducation.field}
              error={educationErrors.field}
              onValueChange={(field) => updateEducation(list.index, { field })}
            />

            <TextInputField
              label="Start year"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]*"
              placeholder="2019"
              value={activeEducation.startDate}
              error={educationErrors.startDate}
              onValueChange={(startDate) =>
                updateEducation(list.index, { startDate: toYear(startDate) })
              }
            />

            <TextInputField
              label="End year"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]*"
              placeholder="2023"
              disabled={activeEducation.current}
              value={activeEducation.endDate}
              error={educationErrors.endDate}
              onValueChange={(endDate) => updateEducation(list.index, { endDate: toYear(endDate) })}
            />

            <CheckboxField
              checked={activeEducation.current}
              onCheckedChange={(current) =>
                updateEducation(list.index, {
                  current,
                  endDate: current ? "" : activeEducation.endDate,
                })
              }
            >
              I currently study here
            </CheckboxField>
          </div>

          <div className="mt-4">
            <TextAreaField
              label="Summary"
              value={activeEducation.summary}
              onValueChange={(summary) => updateEducation(list.index, { summary })}
            />
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">No education entries yet. Click Add to create one.</p>
      )}
    </SectionAccordion>
  );
};

export default EducationSection;
