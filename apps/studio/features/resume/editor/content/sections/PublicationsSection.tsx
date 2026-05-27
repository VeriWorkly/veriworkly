"use client";

import { Input } from "@veriworkly/ui";

import type { BaseSectionProps } from "./section-types";

import { Field } from "../EditorFormPrimitives";
import GenericCustomSection from "./GenericCustomSection";

const PublicationsSection = (props: BaseSectionProps) => {
  return (
    <GenericCustomSection
      {...props}
      kind="publications"
      label="Publications"
      addLabel="Add publication"
      fallbackItemLabel="Publication"
      emptyMessage="No publications yet. Click Add publication."
    >
      {({ item: activePublication, update }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Publication title">
            <Input
              onChange={(event) => update({ name: event.target.value })}
              value={activePublication.name}
            />
          </Field>

          <Field label="Publisher / Journal">
            <Input
              onChange={(event) => update({ issuer: event.target.value })}
              value={activePublication.issuer}
            />
          </Field>

          <Field label="Date (YYYY-MM)">
            <Input
              type="month"
              onChange={(event) => update({ date: event.target.value })}
              value={activePublication.date}
            />
          </Field>

          <Field label="Publication link">
            <Input
              placeholder="https://..."
              type="url"
              onChange={(event) => update({ link: event.target.value })}
              value={activePublication.link}
            />
          </Field>
        </div>
      )}
    </GenericCustomSection>
  );
};

export default PublicationsSection;
