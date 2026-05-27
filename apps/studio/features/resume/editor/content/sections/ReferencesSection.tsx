"use client";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";

import { Field } from "../EditorFormPrimitives";
import GenericCustomSection from "./GenericCustomSection";

const ReferencesSection = (props: BaseSectionProps) => {
  return (
    <GenericCustomSection
      {...props}
      kind="references"
      label="References"
      addLabel="Add reference"
      fallbackItemLabel="Reference"
      emptyMessage="No references yet. Click Add reference."
    >
      {({ item: activeReference, update }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Name">
            <Input
              onChange={(event) => update({ name: event.target.value })}
              value={activeReference.name}
            />
          </Field>

          <Field label="Title">
            <Input
              onChange={(event) => update({ issuer: event.target.value })}
              value={activeReference.issuer}
            />
          </Field>

          <Field label="Organization">
            <Input
              onChange={(event) => update({ description: event.target.value })}
              value={activeReference.description}
            />
          </Field>

          <Field label="Relationship">
            <Input
              onChange={(event) => update({ referenceId: event.target.value })}
              value={activeReference.referenceId}
            />
          </Field>

          <Field label="Email (optional)">
            <Input
              type="email"
              onChange={(event) => update({ link: event.target.value })}
              value={activeReference.link}
            />
          </Field>

          <Field label="Phone (optional)">
            <Input
              inputMode="numeric"
              maxLength={10}
              onChange={(event) =>
                update({
                  date: event.target.value.replace(/\D/g, "").slice(0, 10),
                })
              }
              pattern="[0-9]*"
              placeholder="1234567890"
              value={activeReference.date}
            />
          </Field>
        </div>
      )}
    </GenericCustomSection>
  );
};

export default ReferencesSection;
