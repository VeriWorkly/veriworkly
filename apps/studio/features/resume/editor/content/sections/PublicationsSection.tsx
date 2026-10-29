"use client";

import type { BaseSectionProps } from "./section-types";

import { CheckboxField, TextAreaField, TextInputField } from "@/features/documents/editor/form";
import TypedSectionEditor from "./TypedSectionEditor";

const PublicationsSection = (props: BaseSectionProps) => {
  return (
    <TypedSectionEditor
      {...props}
      sectionKey="publications"
      sectionId="publications"
      label="Publications"
      addLabel="Add publication"
      fallbackItemLabel="Publication"
      emptyMessage="No publications yet. Click Add publication."
      labelFor={(item) => item.title}
    >
      {({ item: publication, update }) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="Publication title"
              value={publication.title}
              onValueChange={(title) => update({ title })}
            />

            <TextInputField
              label="Publisher / Journal"
              value={publication.publisher}
              onValueChange={(publisher) => update({ publisher })}
            />

            <TextInputField
              type="month"
              label="Date (YYYY-MM)"
              value={publication.date}
              onValueChange={(date) => update({ date })}
            />

            <TextInputField
              type="url"
              label="Publication link"
              placeholder="https://..."
              value={publication.website ?? ""}
              onValueChange={(website) => update({ website })}
            />

            <CheckboxField
              className="md:col-span-2"
              checked={publication.showLink}
              onCheckedChange={(showLink) => update({ showLink })}
            >
              Show the link on the resume
            </CheckboxField>
          </div>

          <div className="mt-4">
            <TextAreaField
              label="Description"
              value={publication.description}
              onValueChange={(description) => update({ description })}
            />
          </div>
        </>
      )}
    </TypedSectionEditor>
  );
};

export default PublicationsSection;
