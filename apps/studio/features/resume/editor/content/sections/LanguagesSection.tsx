"use client";

import { useState } from "react";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";

import { Field } from "../EditorFormPrimitives";
import DraggableSection from "./DraggableSection";
import { proficiencyOptions } from "../editor-options";

const LanguagesSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const languagesSection =
    useResumeStore((state) =>
      state.resume.customSections.find((section) => section.kind === "languages"),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const [languageIndex, setLanguageIndex] = useState(0);

  if (!languagesSection) {
    return null;
  }

  const safeLanguageIndex = Math.min(languageIndex, Math.max(0, languagesSection.items.length - 1));

  const activeLanguage = languagesSection.items[safeLanguageIndex];

  return (
    <DraggableSection
      id="languages"
      isOpen={isOpen}
      onDrop={onDrop}
      label="Languages"
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {languagesSection.items.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setLanguageIndex(Number(event.target.value))}
            value={safeLanguageIndex}
          >
            {languagesSection.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Language ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button size="sm" variant="secondary" onClick={() => addCustomSectionItem("languages")}>
          Add language
        </Button>

        <Button
          size="sm"
          variant="ghost"
          disabled={languagesSection.items.length === 0}
          onClick={() => removeCustomSectionItem("languages", safeLanguageIndex)}
        >
          Remove
        </Button>
      </div>

      {activeLanguage ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Language">
            <Input
              onChange={(event) =>
                updateCustomSectionItem("languages", safeLanguageIndex, {
                  name: event.target.value,
                })
              }
              value={activeLanguage.name}
            />
          </Field>

          <Field label="Proficiency">
            <select
              value={activeLanguage.referenceId}
              className="border-border bg-background h-11 w-full rounded-2xl border px-4 text-sm"
              onChange={(event) =>
                updateCustomSectionItem("languages", safeLanguageIndex, {
                  referenceId: event.target.value,
                })
              }
            >
              {proficiencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <p className="text-muted text-sm">No languages yet. Click Add language.</p>
      )}
    </DraggableSection>
  );
};

export default LanguagesSection;
