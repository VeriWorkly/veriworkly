"use client";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";

import { Field } from "../EditorFormPrimitives";
import { proficiencyOptions } from "../editor-options";
import GenericCustomSection from "./GenericCustomSection";

const LanguagesSection = (props: BaseSectionProps) => {
  return (
    <GenericCustomSection
      {...props}
      kind="languages"
      label="Languages"
      addLabel="Add language"
      fallbackItemLabel="Language"
      emptyMessage="No languages yet. Click Add language."
    >
      {({ item: activeLanguage, update }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Language">
            <Input
              onChange={(event) => update({ name: event.target.value })}
              value={activeLanguage.name}
            />
          </Field>

          <Field label="Proficiency">
            <select
              value={activeLanguage.referenceId}
              className="border-border bg-background h-11 w-full rounded-2xl border px-4 text-sm"
              onChange={(event) => update({ referenceId: event.target.value })}
            >
              {proficiencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </GenericCustomSection>
  );
};

export default LanguagesSection;
