"use client";

import type { BaseSectionProps } from "./section-types";

import ListSection from "./ListSection";

import { Field, TextInputField, DelimitedTextArea } from "@/features/documents/editor/form";

import { useResumeStore } from "@/features/resume/store/resume-store";

import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";

const SkillsSection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const skills = useResumeStore((state) => state.resume.skills);
  const addSkillGroup = useResumeStore((state) => state.addSkillGroup);
  const removeSkillGroup = useResumeStore((state) => state.removeSkillGroup);
  const reorderSkillGroups = useResumeStore((state) => state.reorderSkillGroups);
  const updateSkillGroup = useResumeStore((state) => state.updateSkillGroup);

  const list = useIndexedListEditor(skills, addSkillGroup);

  return (
    <ListSection
      id="skills"
      label="Skills"
      isOpen={isOpen}
      onToggle={onToggle}
      list={list}
      items={skills}
      onRemove={removeSkillGroup}
      onMove={reorderSkillGroups}
      labelFor={(item, index) => item.name || `Group ${index + 1}`}
      emptyMessage="No skill groups yet. Click Add to create one."
    >
      {(activeSkillGroup) => (
        <>
          <TextInputField
            label="Group name"
            value={activeSkillGroup.name}
            onValueChange={(name) => updateSkillGroup(list.index, { name })}
          />

          {/* Children-based `Field`: DelimitedTextArea holds a local draft string. */}
          <Field label="Keywords (comma separated)">
            <DelimitedTextArea
              delimiter="comma"
              key={activeSkillGroup.id}
              value={activeSkillGroup.keywords}
              onChange={(keywords) => updateSkillGroup(list.index, { keywords })}
            />
          </Field>

          {activeSkillGroup.keywords.length ? (
            <div className="flex flex-wrap gap-2">
              {activeSkillGroup.keywords.map((keyword, index) => (
                <span
                  className="border-border bg-background text-muted rounded-full border px-3 py-1 text-xs font-medium"
                  // The same keyword can be typed twice.
                  key={`${index}-${keyword}`}
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}
    </ListSection>
  );
};

export default SkillsSection;
