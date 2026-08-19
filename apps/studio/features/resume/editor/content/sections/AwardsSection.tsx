"use client";

import type { BaseSectionProps } from "./section-types";

import { TextAreaField, TextInputField } from "@/features/documents/editor/form";
import TypedSectionEditor from "./TypedSectionEditor";

const AwardsSection = (props: BaseSectionProps) => {
  return (
    <TypedSectionEditor
      {...props}
      sectionKey="awards"
      sectionId="awards"
      label="Awards"
      addLabel="Add award"
      fallbackItemLabel="Award"
      emptyMessage="No awards yet. Click Add award."
      labelFor={(item) => item.title}
    >
      {({ item: award, update }) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="Award name"
              value={award.title}
              onValueChange={(title) => update({ title })}
            />

            <TextInputField
              label="Issuer"
              value={award.awarder}
              onValueChange={(awarder) => update({ awarder })}
            />

            <TextInputField
              type="month"
              label="Date (YYYY-MM)"
              value={award.date}
              onValueChange={(date) => update({ date })}
            />

            <TextInputField
              type="url"
              label="Link (optional)"
              placeholder="https://..."
              value={award.website ?? ""}
              onValueChange={(website) => update({ website })}
            />
          </div>

          <div className="mt-4">
            <TextAreaField
              label="Description"
              value={award.description}
              onValueChange={(description) => update({ description })}
            />
          </div>
        </>
      )}
    </TypedSectionEditor>
  );
};

export default AwardsSection;
