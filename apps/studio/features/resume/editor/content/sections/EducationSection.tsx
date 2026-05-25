"use client";

import { useMemo, useState } from "react";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateEducation } from "@/features/resume/utils/validation";

import DraggableSection from "./DraggableSection";
import { Field, invalidClass, TextArea } from "../EditorFormPrimitives";

const EducationSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const education = useResumeStore((state) => state.resume.education);
  const addEducation = useResumeStore((state) => state.addEducation);
  const removeEducation = useResumeStore((state) => state.removeEducation);
  const updateEducation = useResumeStore((state) => state.updateEducation);

  const [educationIndex, setEducationIndex] = useState(0);

  const safeEducationIndex = Math.min(educationIndex, Math.max(0, education.length - 1));

  const activeEducation = education[safeEducationIndex];

  const educationErrors = useMemo(
    () => (activeEducation ? validateEducation(activeEducation) : {}),
    [activeEducation],
  );

  return (
    <DraggableSection
      id="education"
      isOpen={isOpen}
      onDrop={onDrop}
      label="Education"
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {education.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setEducationIndex(Number(event.target.value))}
            value={safeEducationIndex}
          >
            {education.map((_, index) => (
              <option key={index} value={index}>
                Education {index + 1}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={addEducation} size="sm" variant="secondary">
          Add
        </Button>

        <Button
          disabled={education.length === 0}
          onClick={() => removeEducation(safeEducationIndex)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      {activeEducation ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={educationErrors.school} label="School">
              <Input
                className={invalidClass(educationErrors.school)}
                onChange={(event) =>
                  updateEducation(safeEducationIndex, {
                    school: event.target.value,
                  })
                }
                value={activeEducation.school}
              />
            </Field>

            <Field error={educationErrors.degree} label="Degree">
              <Input
                className={invalidClass(educationErrors.degree)}
                onChange={(event) =>
                  updateEducation(safeEducationIndex, {
                    degree: event.target.value,
                  })
                }
                value={activeEducation.degree}
              />
            </Field>

            <Field error={educationErrors.field} label="Field of study">
              <Input
                className={invalidClass(educationErrors.field)}
                onChange={(event) =>
                  updateEducation(safeEducationIndex, {
                    field: event.target.value,
                  })
                }
                value={activeEducation.field}
              />
            </Field>

            <Field error={educationErrors.startDate} label="Start year">
              <Input
                className={invalidClass(educationErrors.startDate)}
                inputMode="numeric"
                maxLength={4}
                onChange={(event) =>
                  updateEducation(safeEducationIndex, {
                    startDate: event.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
                pattern="[0-9]*"
                placeholder="2019"
                value={activeEducation.startDate}
              />
            </Field>

            <Field error={educationErrors.endDate} label="End year">
              <Input
                className={invalidClass(educationErrors.endDate)}
                disabled={activeEducation.current}
                inputMode="numeric"
                maxLength={4}
                onChange={(event) =>
                  updateEducation(safeEducationIndex, {
                    endDate: event.target.value.replace(/\D/g, "").slice(0, 4),
                  })
                }
                pattern="[0-9]*"
                placeholder="2023"
                value={activeEducation.endDate}
              />
            </Field>

            <label className="text-foreground border-border flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium">
              <input
                checked={activeEducation.current}
                className="accent-accent h-4 w-4"
                onChange={(event) =>
                  updateEducation(safeEducationIndex, {
                    current: event.target.checked,
                    endDate: event.target.checked ? "" : activeEducation.endDate,
                  })
                }
                type="checkbox"
              />
              I currently study here
            </label>
          </div>

          <div className="mt-4">
            <Field label="Summary">
              <TextArea
                onChange={(event) =>
                  updateEducation(safeEducationIndex, {
                    summary: event.target.value,
                  })
                }
                value={activeEducation.summary}
              />
            </Field>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">No education entries yet. Click Add to create one.</p>
      )}
    </DraggableSection>
  );
};

export default EducationSection;
