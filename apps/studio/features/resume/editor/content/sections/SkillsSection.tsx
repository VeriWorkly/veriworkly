"use client";

import { useMemo, useState } from "react";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { Field, invalidClass, DelimitedTextArea } from "../EditorFormPrimitives";

import { useResumeStore } from "@/features/resume/store/resume-store";
import { validateSkillGroup } from "@/features/resume/utils/validation";

import DraggableSection from "./DraggableSection";

const SkillsSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const skills = useResumeStore((state) => state.resume.skills);
  const addSkillGroup = useResumeStore((state) => state.addSkillGroup);
  const removeSkillGroup = useResumeStore((state) => state.removeSkillGroup);
  const updateSkillGroup = useResumeStore((state) => state.updateSkillGroup);

  const [skillIndex, setSkillIndex] = useState(0);

  const safeSkillIndex = Math.min(skillIndex, Math.max(0, skills.length - 1));

  const activeSkillGroup = skills[safeSkillIndex];

  const skillErrors = useMemo(
    () => (activeSkillGroup ? validateSkillGroup(activeSkillGroup) : {}),
    [activeSkillGroup],
  );

  return (
    <DraggableSection
      id="skills"
      label="Skills"
      isOpen={isOpen}
      onDrop={onDrop}
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {skills.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setSkillIndex(Number(event.target.value))}
            value={safeSkillIndex}
          >
            {skills.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Group ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={addSkillGroup} size="sm" variant="secondary">
          Add
        </Button>

        <Button
          disabled={skills.length === 0}
          onClick={() => removeSkillGroup(safeSkillIndex)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      {activeSkillGroup ? (
        <>
          <Field error={skillErrors.name} label="Group name">
            <Input
              className={invalidClass(skillErrors.name)}
              onChange={(event) =>
                updateSkillGroup(safeSkillIndex, {
                  name: event.target.value,
                })
              }
              value={activeSkillGroup.name}
            />
          </Field>

          <Field error={skillErrors.keywords} label="Keywords (comma separated)">
            <DelimitedTextArea
              key={activeSkillGroup.id}
              value={activeSkillGroup.keywords}
              className={invalidClass(skillErrors.keywords)}
              onChange={(nextKeywords) =>
                updateSkillGroup(safeSkillIndex, {
                  keywords: nextKeywords,
                })
              }
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
    </DraggableSection>
  );
};

export default SkillsSection;
