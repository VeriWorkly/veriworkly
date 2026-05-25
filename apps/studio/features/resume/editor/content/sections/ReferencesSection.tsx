"use client";

import { useState } from "react";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { Field } from "../EditorFormPrimitives";
import DraggableSection from "./DraggableSection";

import { useResumeStore } from "@/features/resume/store/resume-store";

const ReferencesSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const referencesSection =
    useResumeStore((state) =>
      state.resume.customSections.find((section) => section.kind === "references"),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const [referenceIndex, setReferenceIndex] = useState(0);

  if (!referencesSection) {
    return null;
  }

  const safeReferenceIndex = Math.min(
    referenceIndex,
    Math.max(0, referencesSection.items.length - 1),
  );

  const activeReference = referencesSection.items[safeReferenceIndex];

  return (
    <DraggableSection
      id="references"
      label="References"
      isOpen={isOpen}
      onDrop={onDrop}
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {referencesSection.items.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setReferenceIndex(Number(event.target.value))}
            value={safeReferenceIndex}
          >
            {referencesSection.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Reference ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={() => addCustomSectionItem("references")} size="sm" variant="secondary">
          Add reference
        </Button>

        <Button
          disabled={referencesSection.items.length === 0}
          onClick={() => removeCustomSectionItem("references", safeReferenceIndex)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      {activeReference ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("references", safeReferenceIndex, {
                  name: event.target.value,
                })
              }
              value={activeReference.name}
            />
          </Field>

          <Field label="Title">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("references", safeReferenceIndex, {
                  issuer: event.target.value,
                })
              }
              value={activeReference.issuer}
            />
          </Field>

          <Field label="Organization">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("references", safeReferenceIndex, {
                  description: event.target.value,
                })
              }
              value={activeReference.description}
            />
          </Field>

          <Field label="Relationship">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("references", safeReferenceIndex, {
                  referenceId: event.target.value,
                })
              }
              value={activeReference.referenceId}
            />
          </Field>

          <Field label="Email (optional)">
            <Input
              type="email"
              onChange={(event) =>
                updateCustomSectionItem("references", safeReferenceIndex, {
                  link: event.target.value,
                })
              }
              value={activeReference.link}
            />
          </Field>

          <Field label="Phone (optional)">
            <Input
              inputMode="numeric"
              maxLength={10}
              onChange={(event) =>
                updateCustomSectionItem("references", safeReferenceIndex, {
                  date: event.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              pattern="[0-9]*"
              placeholder="1234567890"
              value={activeReference.date}
            />
          </Field>
        </div>
      ) : (
        <p className="text-muted text-sm">No references yet. Click Add reference.</p>
      )}
    </DraggableSection>
  );
};

export default ReferencesSection;
