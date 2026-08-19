"use client";

import type { BaseSectionProps } from "./section-types";

import { SelectField, TextInputField } from "@/features/documents/editor/form";
import { fluencyOptions } from "../editor-options";
import TypedSectionEditor from "./TypedSectionEditor";

const LanguagesSection = (props: BaseSectionProps) => {
  return (
    <TypedSectionEditor
      {...props}
      sectionKey="languages"
      sectionId="languages"
      label="Languages"
      addLabel="Add language"
      fallbackItemLabel="Language"
      emptyMessage="No languages yet. Click Add language."
      labelFor={(item) => item.language}
    >
      {({ item: language, update }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <TextInputField
            label="Language"
            value={language.language}
            onValueChange={(value) => update({ language: value })}
          />

          {/*
            The stored value is the schema's fluency enum, not the free-text proficiency
            list this control used to offer. The old list ("Beginner", "Advanced") was a
            third vocabulary for the same field, and nothing mapped it onto the two the
            master profile and the schema already used.
          */}
          <SelectField
            label="Proficiency"
            value={language.fluency}
            onValueChange={(fluency) => update({ fluency: fluency as typeof language.fluency })}
          >
            {fluencyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </div>
      )}
    </TypedSectionEditor>
  );
};

export default LanguagesSection;
