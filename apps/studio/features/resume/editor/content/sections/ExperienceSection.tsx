"use client";

import { useMemo, useState } from "react";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateExperience } from "@/features/resume/utils/validation";
import { AiFieldAssist } from "@/features/ai/AiFieldAssist";

import { Field, TextArea, invalidClass, DelimitedTextArea } from "../EditorFormPrimitives";
import DraggableSection from "./DraggableSection";
import type { BaseSectionProps } from "./section-types";

const ExperienceSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const experience = useResumeStore((state) => state.resume.experience);
  const resumeId = useResumeStore((state) => state.resume.id);
  const addExperience = useResumeStore((state) => state.addExperience);
  const removeExperience = useResumeStore((state) => state.removeExperience);
  const updateExperience = useResumeStore((state) => state.updateExperience);

  const [experienceIndex, setExperienceIndex] = useState(0);

  const safeExperienceIndex = Math.min(experienceIndex, Math.max(0, experience.length - 1));

  const activeExperience = experience[safeExperienceIndex];

  const experienceErrors = useMemo(
    () => (activeExperience ? validateExperience(activeExperience) : {}),
    [activeExperience],
  );

  return (
    <DraggableSection
      id="experience"
      isOpen={isOpen}
      onDrop={onDrop}
      label="Experience"
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {experience.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setExperienceIndex(Number(event.target.value))}
            value={safeExperienceIndex}
          >
            {experience.map((_, index) => (
              <option key={index} value={index}>
                Experience {index + 1}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={addExperience} size="sm" variant="secondary">
          Add
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={experience.length === 0}
          onClick={() => removeExperience(safeExperienceIndex)}
        >
          Remove
        </Button>
      </div>

      {activeExperience ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={experienceErrors.role} label="Role">
              <Input
                value={activeExperience.role}
                className={invalidClass(experienceErrors.role)}
                onChange={(event) =>
                  updateExperience(safeExperienceIndex, {
                    role: event.target.value,
                  })
                }
              />
            </Field>

            <Field error={experienceErrors.company} label="Company">
              <Input
                value={activeExperience.company}
                className={invalidClass(experienceErrors.company)}
                onChange={(event) =>
                  updateExperience(safeExperienceIndex, {
                    company: event.target.value,
                  })
                }
              />
            </Field>

            <Field error={experienceErrors.location} label="Location">
              <Input
                value={activeExperience.location}
                className={invalidClass(experienceErrors.location)}
                onChange={(event) =>
                  updateExperience(safeExperienceIndex, {
                    location: event.target.value,
                  })
                }
              />
            </Field>

            <Field error={experienceErrors.startDate} label="Start (YYYY-MM)">
              <Input
                type="month"
                placeholder="2024-01"
                value={activeExperience.startDate}
                className={invalidClass(experienceErrors.startDate)}
                onChange={(event) =>
                  updateExperience(safeExperienceIndex, {
                    startDate: event.target.value,
                  })
                }
              />
            </Field>

            <Field error={experienceErrors.endDate} label="End (YYYY-MM)">
              <Input
                value={activeExperience.endDate}
                placeholder="2025-06"
                disabled={activeExperience.current}
                type="month"
                className={invalidClass(experienceErrors.endDate)}
                onChange={(event) =>
                  updateExperience(safeExperienceIndex, {
                    endDate: event.target.value,
                  })
                }
              />
            </Field>

            <label className="text-foreground border-border flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={activeExperience.current}
                className="accent-accent h-4 w-4"
                onChange={(event) =>
                  updateExperience(safeExperienceIndex, {
                    current: event.target.checked,
                    endDate: event.target.checked ? "" : activeExperience.endDate,
                  })
                }
              />
              I currently work here
            </label>
          </div>

          <div className="mt-4 space-y-4">
            <Field error={experienceErrors.summary} label="Summary">
              <TextArea
                className={invalidClass(experienceErrors.summary)}
                onChange={(event) =>
                  updateExperience(safeExperienceIndex, {
                    summary: event.target.value,
                  })
                }
                value={activeExperience.summary}
              />
            </Field>
            <AiFieldAssist
              action={activeExperience.summary ? "rewrite_section" : "generate_section"}
              context={JSON.stringify({
                role: activeExperience.role,
                company: activeExperience.company,
                highlights: activeExperience.highlights,
              })}
              documentId={resumeId}
              onApply={(summary) => updateExperience(safeExperienceIndex, { summary })}
              text={activeExperience.summary}
            />

            <Field label="Highlights (comma separated)">
              <DelimitedTextArea
                key={activeExperience.id}
                onChange={(nextHighlights) =>
                  updateExperience(safeExperienceIndex, {
                    highlights: nextHighlights,
                  })
                }
                value={activeExperience.highlights}
              />
            </Field>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">No experience entries yet. Click Add to create one.</p>
      )}
    </DraggableSection>
  );
};

export default ExperienceSection;
