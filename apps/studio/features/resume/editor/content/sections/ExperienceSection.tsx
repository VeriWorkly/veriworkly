"use client";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { isMonthDate } from "@/features/documents/validation/rules";
import { normalizeMonthDate } from "@/features/resume/utils/normalize-data";
import { AiFieldAssist } from "@/features/ai/AiFieldAssist";

import {
  Field,
  CheckboxField,
  TextAreaField,
  TextInputField,
  DelimitedTextArea,
} from "@/features/documents/editor/form";
import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";
import type { BaseSectionProps } from "./section-types";

import ListSection from "./ListSection";

/**
 * A date `normalizeMonthDate` cannot read is kept as typed. Chrome's month picker cannot
 * show such a value, so the message repeats it. Shown as the field's error, so it waits
 * until the field has been left, like every other one.
 */
function monthDateError(value: string) {
  return isMonthDate(normalizeMonthDate(value))
    ? undefined
    : `Kept as typed: "${value}". Pick a month so every template can format it.`;
}

const ExperienceSection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const experience = useResumeStore((state) => state.resume.experience);
  const resumeId = useResumeStore((state) => state.resume.id);
  const addExperience = useResumeStore((state) => state.addExperience);
  const removeExperience = useResumeStore((state) => state.removeExperience);
  const reorderExperience = useResumeStore((state) => state.reorderExperience);
  const updateExperience = useResumeStore((state) => state.updateExperience);

  const list = useIndexedListEditor(experience, addExperience);

  return (
    <ListSection
      id="experience"
      label="Experience"
      isOpen={isOpen}
      onToggle={onToggle}
      list={list}
      items={experience}
      onRemove={removeExperience}
      onMove={reorderExperience}
      labelFor={(item, index) => item.role || item.company || `Experience ${index + 1}`}
      emptyMessage="No experience entries yet. Click Add to create one."
    >
      {(activeExperience) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="Role"
              value={activeExperience.role}
              onValueChange={(role) => updateExperience(list.index, { role })}
            />

            <TextInputField
              label="Company"
              value={activeExperience.company}
              onValueChange={(company) => updateExperience(list.index, { company })}
            />

            <TextInputField
              label="Location"
              value={activeExperience.location}
              onValueChange={(location) => updateExperience(list.index, { location })}
            />

            <TextInputField
              type="month"
              label="Start (YYYY-MM)"
              placeholder="2024-01"
              value={activeExperience.startDate}
              error={monthDateError(activeExperience.startDate)}
              onValueChange={(startDate) => updateExperience(list.index, { startDate })}
            />

            <TextInputField
              type="month"
              label="End (YYYY-MM)"
              placeholder="2025-06"
              disabled={activeExperience.current}
              value={activeExperience.endDate}
              error={
                activeExperience.current ? undefined : monthDateError(activeExperience.endDate)
              }
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
              onValueChange={(summary) => updateExperience(list.index, { summary })}
            />

            <AiFieldAssist
              key={activeExperience.id}
              action={activeExperience.summary ? "rewrite_section" : "generate_section"}
              getContext={() =>
                JSON.stringify({
                  role: activeExperience.role,
                  company: activeExperience.company,
                  highlights: activeExperience.highlights,
                })
              }
              documentId={resumeId}
              onApply={(summary) => updateExperience(list.index, { summary })}
              text={activeExperience.summary}
            />

            {/* Children-based `Field`: DelimitedTextArea keeps a local draft string and so
              cannot take the value/onChange contract the `*Field` wrappers impose. */}
            <Field label="Highlights (one per line)">
              <DelimitedTextArea
                delimiter="newline"
                key={activeExperience.id}
                onChange={(highlights) => updateExperience(list.index, { highlights })}
                value={activeExperience.highlights}
              />
            </Field>
          </div>
        </>
      )}
    </ListSection>
  );
};

export default ExperienceSection;
