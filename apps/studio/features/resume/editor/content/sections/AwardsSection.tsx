"use client";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";

import { Field, TextArea } from "../EditorFormPrimitives";
import GenericCustomSection from "./GenericCustomSection";

const AwardsSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  return (
    <GenericCustomSection
      kind="awards"
      label="Awards"
      addLabel="Add award"
      emptyMessage="No awards yet. Click Add award."
      fallbackItemLabel="Award"
      isOpen={isOpen}
      onDrop={onDrop}
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      {({ item: activeAward, update }) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Award name">
              <Input
                onChange={(event) => update({ name: event.target.value })}
                value={activeAward.name}
              />
            </Field>

            <Field label="Issuer">
              <Input
                onChange={(event) => update({ issuer: event.target.value })}
                value={activeAward.issuer}
              />
            </Field>

            <Field label="Date (YYYY-MM)">
              <Input
                type="month"
                onChange={(event) => update({ date: event.target.value })}
                value={activeAward.date}
              />
            </Field>

            <Field label="Link (optional)">
              <Input
                placeholder="https://..."
                type="url"
                onChange={(event) => update({ link: event.target.value })}
                value={activeAward.link}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Description">
              <TextArea
                onChange={(event) => update({ description: event.target.value })}
                value={activeAward.description}
              />
            </Field>
          </div>
        </>
      )}
    </GenericCustomSection>
  );
};

export default AwardsSection;
