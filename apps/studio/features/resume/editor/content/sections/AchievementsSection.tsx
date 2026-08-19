"use client";

import type { BaseSectionProps } from "./section-types";

import { TextAreaField, TextInputField } from "@/features/documents/editor/form";
import TypedSectionEditor from "./TypedSectionEditor";

const AchievementsSection = (props: BaseSectionProps) => {
  return (
    <TypedSectionEditor
      {...props}
      sectionKey="achievements"
      sectionId="achievements"
      label="Achievements"
      addLabel="Add achievement"
      fallbackItemLabel="Achievement"
      emptyMessage="No achievements yet. Click Add achievement."
      labelFor={(item) => item.title}
    >
      {({ item: achievement, update }) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="Title"
              value={achievement.title}
              onValueChange={(title) => update({ title })}
            />
          </div>

          <div className="mt-4">
            <TextAreaField
              label="Description"
              value={achievement.description}
              onValueChange={(description) => update({ description })}
            />
          </div>
        </>
      )}
    </TypedSectionEditor>
  );
};

export default AchievementsSection;
