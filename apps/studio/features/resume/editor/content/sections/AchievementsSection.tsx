"use client";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";

import { Field, TextArea } from "../EditorFormPrimitives";
import GenericCustomSection from "./GenericCustomSection";

const AchievementsSection = (props: BaseSectionProps) => {
  return (
    <GenericCustomSection
      {...props}
      kind="achievements"
      label="Achievements"
      addLabel="Add achievement"
      fallbackItemLabel="Achievement"
      emptyMessage="No achievements yet. Click Add achievement."
    >
      {({ item: activeAchievement, update }) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <Input
                onChange={(event) => update({ name: event.target.value })}
                value={activeAchievement.name}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Description">
              <TextArea
                onChange={(event) => update({ description: event.target.value })}
                value={activeAchievement.description}
              />
            </Field>
          </div>
        </>
      )}
    </GenericCustomSection>
  );
};

export default AchievementsSection;
