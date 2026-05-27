"use client";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";

import { Field } from "../EditorFormPrimitives";
import GenericCustomSection from "./GenericCustomSection";

const InterestsSection = (props: BaseSectionProps) => {
  return (
    <GenericCustomSection
      {...props}
      kind="interests"
      label="Interests"
      addLabel="Add interest"
      fallbackItemLabel="Interest"
      emptyMessage="No interests yet. Click Add interest."
    >
      {({ item: activeInterest, update }) => (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Interest">
            <Input
              onChange={(event) => update({ name: event.target.value })}
              value={activeInterest.name}
            />
          </Field>

          <Field label="Keywords (comma separated)">
            <Input
              onChange={(event) =>
                update({
                  details: event.target.value
                    .split(",")
                    .map((part) => part.trim())
                    .filter(Boolean),
                })
              }
              value={activeInterest.details?.join(", ") ?? ""}
            />
          </Field>
        </div>
      )}
    </GenericCustomSection>
  );
};

export default InterestsSection;
