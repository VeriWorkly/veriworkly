"use client";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";

import { Field, TextArea } from "../EditorFormPrimitives";
import GenericCustomSection from "./GenericCustomSection";

const VolunteerSection = (props: BaseSectionProps) => {
  return (
    <GenericCustomSection
      {...props}
      kind="volunteer"
      label="Volunteer"
      addLabel="Add volunteer entry"
      fallbackItemLabel="Volunteer"
      emptyMessage="No volunteer entries yet. Click Add volunteer entry."
    >
      {({ item: activeVolunteer, update }) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Organization">
              <Input
                onChange={(event) => update({ name: event.target.value })}
                value={activeVolunteer.name}
              />
            </Field>

            <Field label="Role">
              <Input
                onChange={(event) => update({ issuer: event.target.value })}
                value={activeVolunteer.issuer}
              />
            </Field>

            <Field label="Date (YYYY-MM)">
              <Input
                type="month"
                onChange={(event) => update({ date: event.target.value })}
                value={activeVolunteer.date}
              />
            </Field>

            <Field label="Location">
              <Input
                onChange={(event) => update({ referenceId: event.target.value })}
                value={activeVolunteer.referenceId}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Summary">
              <TextArea
                onChange={(event) => update({ description: event.target.value })}
                value={activeVolunteer.description}
              />
            </Field>
          </div>
        </>
      )}
    </GenericCustomSection>
  );
};

export default VolunteerSection;
