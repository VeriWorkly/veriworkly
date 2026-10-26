"use client";

import { useMemo } from "react";

import type { BaseSectionProps } from "./section-types";

import ListSection from "./ListSection";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateEducation } from "@/features/resume/utils/validation";

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
  const reorderEducation = useResumeStore((state) => state.reorderEducation);
  const updateEducation = useResumeStore((state) => state.updateEducation);

  const list = useIndexedListEditor(education, addEducation);

  const educationErrors = useMemo(
    () => (list.activeItem ? validateEducation(list.activeItem) : {}),
    [list.activeItem],
  );

  return (
    <ListSection
      id="education"
      label="Education"
      isOpen={isOpen}
      onToggle={onToggle}
      list={list}
      items={education}
      onRemove={removeEducation}
      onMove={reorderEducation}
      labelFor={(item, index) => item.school || item.degree || `Education ${index + 1}`}
      emptyMessage="No education entries yet. Click Add to create one."
    >
      {(activeEducation) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="School"
              value={activeEducation.school}
              onValueChange={(school) => updateEducation(list.index, { school })}
            />

            <TextInputField
              label="Degree"
              value={activeEducation.degree}
              onValueChange={(degree) => updateEducation(list.index, { degree })}
            />

            <TextInputField
              label="Field of study"
              value={activeEducation.field}
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
      )}
    </ListSection>
  );
};

export default EducationSection;
