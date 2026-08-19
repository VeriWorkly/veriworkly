"use client";

import { useMemo } from "react";

import type { BaseSectionProps } from "./section-types";
import type { ResumeSectionId } from "@/types/resume";

import { Field, TextInputField, DelimitedTextArea } from "@/features/documents/editor/form";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateSkillGroup } from "@/features/resume/utils/validation";

import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { ListEditorControls } from "@/features/documents/editor/ListEditorControls";
import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";

const SkillsSection = ({ isOpen, onToggle }: BaseSectionProps) => {
  const skills = useResumeStore((state) => state.resume.skills);
  const addSkillGroup = useResumeStore((state) => state.addSkillGroup);
  const removeSkillGroup = useResumeStore((state) => state.removeSkillGroup);
  const updateSkillGroup = useResumeStore((state) => state.updateSkillGroup);

  const list = useIndexedListEditor(skills, addSkillGroup);
  const activeSkillGroup = list.activeItem;

  const skillErrors = useMemo(
    () => (activeSkillGroup ? validateSkillGroup(activeSkillGroup) : {}),
    [activeSkillGroup],
  );

  return (
    <SectionAccordion
      id="skills"
      label="Skills"
      isOpen={isOpen}
      onToggle={(nextId) => onToggle(nextId as ResumeSectionId)}
    >
      <ListEditorControls
        items={skills}
        index={list.index}
        onAdd={list.add}
        onSelect={list.select}
        onRemove={removeSkillGroup}
        labelFor={(item, index) => item.name || `Group ${index + 1}`}
      />

      {activeSkillGroup ? (
        <>
          <TextInputField
            label="Group name"
            value={activeSkillGroup.name}
            error={skillErrors.name}
            onValueChange={(name) => updateSkillGroup(list.index, { name })}
          />

          {/* Children-based `Field`: DelimitedTextArea holds a local draft string. */}
          <Field error={skillErrors.keywords} label="Keywords (comma separated)">
            <DelimitedTextArea
              key={activeSkillGroup.id}
              value={activeSkillGroup.keywords}
              onChange={(keywords) => updateSkillGroup(list.index, { keywords })}
            />
          </Field>

          {activeSkillGroup.keywords.length ? (
            <div className="flex flex-wrap gap-2">
              {activeSkillGroup.keywords.map((keyword) => (
                <span
                  className="border-border bg-background text-muted rounded-full border px-3 py-1 text-xs font-medium"
                  key={keyword}
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-muted text-sm">No skill groups yet. Click Add to create one.</p>
      )}
    </SectionAccordion>
  );
};

export default SkillsSection;
