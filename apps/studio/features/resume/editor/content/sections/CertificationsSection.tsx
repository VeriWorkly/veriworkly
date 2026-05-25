"use client";

import { useState } from "react";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";

import { Field } from "../EditorFormPrimitives";
import DraggableSection from "./DraggableSection";
import type { BaseSectionProps } from "./section-types";

const CertificationsSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const certificationsSection =
    useResumeStore((state) =>
      state.resume.customSections.find((section) => section.kind === "certifications"),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const [certificationIndex, setCertificationIndex] = useState(0);

  if (!certificationsSection) {
    return null;
  }

  const safeCertificationIndex = Math.min(
    certificationIndex,
    Math.max(0, certificationsSection.items.length - 1),
  );

  const activeCertification = certificationsSection.items[safeCertificationIndex];

  return (
    <DraggableSection
      isOpen={isOpen}
      onDrop={onDrop}
      id="certifications"
      label="Certifications"
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {certificationsSection.items.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setCertificationIndex(Number(event.target.value))}
            value={safeCertificationIndex}
          >
            {certificationsSection.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Certification ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button
          onClick={() => addCustomSectionItem("certifications")}
          size="sm"
          variant="secondary"
        >
          Add certification
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={certificationsSection.items.length === 0}
          onClick={() => removeCustomSectionItem("certifications", safeCertificationIndex)}
        >
          Remove
        </Button>
      </div>

      {activeCertification ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Certificate name">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("certifications", safeCertificationIndex, {
                  name: event.target.value,
                })
              }
              value={activeCertification.name}
            />
          </Field>

          <Field label="Issuer">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("certifications", safeCertificationIndex, {
                  issuer: event.target.value,
                })
              }
              value={activeCertification.issuer}
            />
          </Field>

          <Field label="Issue date (YYYY-MM)">
            <Input
              type="month"
              onChange={(event) =>
                updateCustomSectionItem("certifications", safeCertificationIndex, {
                  date: event.target.value,
                })
              }
              value={activeCertification.date}
            />
          </Field>

          <Field label="Credential ID">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("certifications", safeCertificationIndex, {
                  referenceId: event.target.value,
                })
              }
              value={activeCertification.referenceId}
            />
          </Field>

          <Field label="Verification link">
            <Input
              placeholder="https://..."
              type="url"
              onChange={(event) =>
                updateCustomSectionItem("certifications", safeCertificationIndex, {
                  link: event.target.value,
                })
              }
              value={activeCertification.link}
            />
          </Field>
        </div>
      ) : (
        <p className="text-muted text-sm">No certifications yet. Click Add certification.</p>
      )}
    </DraggableSection>
  );
};

export default CertificationsSection;
