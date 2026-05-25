"use client";

import { useState } from "react";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";

import { Field } from "../EditorFormPrimitives";
import DraggableSection from "./DraggableSection";
import type { BaseSectionProps } from "./section-types";

const PublicationsSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const publicationsSection =
    useResumeStore((state) =>
      state.resume.customSections.find((section) => section.kind === "publications"),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const [publicationIndex, setPublicationIndex] = useState(0);

  if (!publicationsSection) {
    return null;
  }

  const safePublicationIndex = Math.min(
    publicationIndex,
    Math.max(0, publicationsSection.items.length - 1),
  );

  const activePublication = publicationsSection.items[safePublicationIndex];

  return (
    <DraggableSection
      isOpen={isOpen}
      onDrop={onDrop}
      id="publications"
      onToggle={onToggle}
      label="Publications"
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {publicationsSection.items.length ? (
          <select
            value={safePublicationIndex}
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setPublicationIndex(Number(event.target.value))}
          >
            {publicationsSection.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Publication ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button size="sm" variant="secondary" onClick={() => addCustomSectionItem("publications")}>
          Add publication
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={publicationsSection.items.length === 0}
          onClick={() => removeCustomSectionItem("publications", safePublicationIndex)}
        >
          Remove
        </Button>
      </div>

      {activePublication ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Publication title">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("publications", safePublicationIndex, {
                  name: event.target.value,
                })
              }
              value={activePublication.name}
            />
          </Field>

          <Field label="Publisher / Journal">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("publications", safePublicationIndex, {
                  issuer: event.target.value,
                })
              }
              value={activePublication.issuer}
            />
          </Field>

          <Field label="Date (YYYY-MM)">
            <Input
              type="month"
              onChange={(event) =>
                updateCustomSectionItem("publications", safePublicationIndex, {
                  date: event.target.value,
                })
              }
              value={activePublication.date}
            />
          </Field>

          <Field label="Publication link">
            <Input
              placeholder="https://..."
              type="url"
              onChange={(event) =>
                updateCustomSectionItem("publications", safePublicationIndex, {
                  link: event.target.value,
                })
              }
              value={activePublication.link}
            />
          </Field>
        </div>
      ) : (
        <p className="text-muted text-sm">No publications yet. Click Add publication.</p>
      )}
    </DraggableSection>
  );
};

export default PublicationsSection;
