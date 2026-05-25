"use client";

import { useState } from "react";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import DraggableSection from "./DraggableSection";
import { Field, TextArea } from "../EditorFormPrimitives";

import { useResumeStore } from "@/features/resume/store/resume-store";

const VolunteerSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const volunteerSection =
    useResumeStore((state) =>
      state.resume.customSections.find((section) => section.kind === "volunteer"),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const [volunteerIndex, setVolunteerIndex] = useState(0);

  if (!volunteerSection) {
    return null;
  }

  const safeVolunteerIndex = Math.min(
    volunteerIndex,
    Math.max(0, volunteerSection.items.length - 1),
  );

  const activeVolunteer = volunteerSection.items[safeVolunteerIndex];

  return (
    <DraggableSection
      id="volunteer"
      label="Volunteer"
      isOpen={isOpen}
      onDrop={onDrop}
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {volunteerSection.items.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setVolunteerIndex(Number(event.target.value))}
            value={safeVolunteerIndex}
          >
            {volunteerSection.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Volunteer ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={() => addCustomSectionItem("volunteer")} size="sm" variant="secondary">
          Add volunteer entry
        </Button>

        <Button
          disabled={volunteerSection.items.length === 0}
          onClick={() => removeCustomSectionItem("volunteer", safeVolunteerIndex)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      {activeVolunteer ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Organization">
              <Input
                onChange={(event) =>
                  updateCustomSectionItem("volunteer", safeVolunteerIndex, {
                    name: event.target.value,
                  })
                }
                value={activeVolunteer.name}
              />
            </Field>

            <Field label="Role">
              <Input
                onChange={(event) =>
                  updateCustomSectionItem("volunteer", safeVolunteerIndex, {
                    issuer: event.target.value,
                  })
                }
                value={activeVolunteer.issuer}
              />
            </Field>

            <Field label="Date (YYYY-MM)">
              <Input
                type="month"
                onChange={(event) =>
                  updateCustomSectionItem("volunteer", safeVolunteerIndex, {
                    date: event.target.value,
                  })
                }
                value={activeVolunteer.date}
              />
            </Field>

            <Field label="Location">
              <Input
                onChange={(event) =>
                  updateCustomSectionItem("volunteer", safeVolunteerIndex, {
                    referenceId: event.target.value,
                  })
                }
                value={activeVolunteer.referenceId}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Summary">
              <TextArea
                onChange={(event) =>
                  updateCustomSectionItem("volunteer", safeVolunteerIndex, {
                    description: event.target.value,
                  })
                }
                value={activeVolunteer.description}
              />
            </Field>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">No volunteer entries yet. Click Add volunteer entry.</p>
      )}
    </DraggableSection>
  );
};

export default VolunteerSection;
