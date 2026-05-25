"use client";

import { useState } from "react";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";

import DraggableSection from "./DraggableSection";
import { Field, TextArea } from "../EditorFormPrimitives";

const AwardsSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const awardsSection =
    useResumeStore((state) =>
      state.resume.customSections.find((section) => section.kind === "awards"),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const [awardIndex, setAwardIndex] = useState(0);

  if (!awardsSection) {
    return null;
  }

  const safeAwardIndex = Math.min(awardIndex, Math.max(0, awardsSection.items.length - 1));

  const activeAward = awardsSection.items[safeAwardIndex];

  return (
    <DraggableSection
      id="awards"
      label="Awards"
      isOpen={isOpen}
      onDrop={onDrop}
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {awardsSection.items.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setAwardIndex(Number(event.target.value))}
            value={safeAwardIndex}
          >
            {awardsSection.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Award ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={() => addCustomSectionItem("awards")} size="sm" variant="secondary">
          Add award
        </Button>

        <Button
          disabled={awardsSection.items.length === 0}
          onClick={() => removeCustomSectionItem("awards", safeAwardIndex)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      {activeAward ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Award name">
              <Input
                onChange={(event) =>
                  updateCustomSectionItem("awards", safeAwardIndex, {
                    name: event.target.value,
                  })
                }
                value={activeAward.name}
              />
            </Field>

            <Field label="Issuer">
              <Input
                onChange={(event) =>
                  updateCustomSectionItem("awards", safeAwardIndex, {
                    issuer: event.target.value,
                  })
                }
                value={activeAward.issuer}
              />
            </Field>

            <Field label="Date (YYYY-MM)">
              <Input
                type="month"
                onChange={(event) =>
                  updateCustomSectionItem("awards", safeAwardIndex, {
                    date: event.target.value,
                  })
                }
                value={activeAward.date}
              />
            </Field>

            <Field label="Link (optional)">
              <Input
                placeholder="https://..."
                type="url"
                onChange={(event) =>
                  updateCustomSectionItem("awards", safeAwardIndex, {
                    link: event.target.value,
                  })
                }
                value={activeAward.link}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Description">
              <TextArea
                onChange={(event) =>
                  updateCustomSectionItem("awards", safeAwardIndex, {
                    description: event.target.value,
                  })
                }
                value={activeAward.description}
              />
            </Field>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">No awards yet. Click Add award.</p>
      )}
    </DraggableSection>
  );
};

export default AwardsSection;
