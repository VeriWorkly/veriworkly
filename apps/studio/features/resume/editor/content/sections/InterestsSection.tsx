"use client";

import type { BaseSectionProps } from "./section-types";

import { TextInputField } from "@/features/documents/editor/form";
import TypedSectionEditor from "./TypedSectionEditor";

const InterestsSection = (props: BaseSectionProps) => {
  return (
    <TypedSectionEditor
      {...props}
      sectionKey="interests"
      sectionId="interests"
      label="Interests"
      addLabel="Add interest"
      fallbackItemLabel="Interest"
      emptyMessage="No interests yet. Click Add interest."
      labelFor={(item) => item.name}
    >
      {({ item: interest, update }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <TextInputField
            label="Interest"
            value={interest.name}
            onValueChange={(name) => update({ name })}
          />

          <TextInputField
            label="Keywords (comma separated)"
            value={interest.keywords.join(", ")}
            onValueChange={(value) =>
              update({
                keywords: value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}
    </TypedSectionEditor>
  );
};

export default InterestsSection;
