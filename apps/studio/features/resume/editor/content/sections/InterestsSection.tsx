"use client";

import { useState } from "react";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { Field } from "../EditorFormPrimitives";
import DraggableSection from "./DraggableSection";

import { useResumeStore } from "@/features/resume/store/resume-store";

const InterestsSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const interestsSection =
    useResumeStore((state) =>
      state.resume.customSections.find((section) => section.kind === "interests"),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const [interestIndex, setInterestIndex] = useState(0);

  if (!interestsSection) {
    return null;
  }

  const safeInterestIndex = Math.min(interestIndex, Math.max(0, interestsSection.items.length - 1));

  const activeInterest = interestsSection.items[safeInterestIndex];

  return (
    <DraggableSection
      id="interests"
      label="Interests"
      isOpen={isOpen}
      onDrop={onDrop}
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {interestsSection.items.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setInterestIndex(Number(event.target.value))}
            value={safeInterestIndex}
          >
            {interestsSection.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Interest ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={() => addCustomSectionItem("interests")} size="sm" variant="secondary">
          Add interest
        </Button>

        <Button
          disabled={interestsSection.items.length === 0}
          onClick={() => removeCustomSectionItem("interests", safeInterestIndex)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      {activeInterest ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Interest">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("interests", safeInterestIndex, {
                  name: event.target.value,
                })
              }
              value={activeInterest.name}
            />
          </Field>

          <Field label="Keywords (comma separated)">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("interests", safeInterestIndex, {
                  details: event.target.value
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean),
                })
              }
              value={activeInterest.details.join(", ")}
            />
          </Field>
        </div>
      ) : (
        <p className="text-muted text-sm">No interests yet. Click Add interest.</p>
      )}
    </DraggableSection>
  );
};

export default InterestsSection;
