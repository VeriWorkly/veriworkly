"use client";

import { useState } from "react";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import DraggableSection from "./DraggableSection";
import { Field, TextArea } from "../EditorFormPrimitives";

import { useResumeStore } from "@/features/resume/store/resume-store";

const AchievementsSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const achievementsSection =
    useResumeStore((state) =>
      state.resume.customSections.find((section) => section.kind === "achievements"),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const [achievementIndex, setAchievementIndex] = useState(0);

  if (!achievementsSection) {
    return null;
  }

  const safeAchievementIndex = Math.min(
    achievementIndex,
    Math.max(0, achievementsSection.items.length - 1),
  );

  const activeAchievement = achievementsSection.items[safeAchievementIndex];

  return (
    <DraggableSection
      isOpen={isOpen}
      onDrop={onDrop}
      id="achievements"
      label="Achievements"
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {achievementsSection.items.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setAchievementIndex(Number(event.target.value))}
            value={safeAchievementIndex}
          >
            {achievementsSection.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Achievement ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}

        <Button onClick={() => addCustomSectionItem("achievements")} size="sm" variant="secondary">
          Add achievement
        </Button>

        <Button
          disabled={achievementsSection.items.length === 0}
          onClick={() => removeCustomSectionItem("achievements", safeAchievementIndex)}
          size="sm"
          variant="ghost"
        >
          Remove
        </Button>
      </div>

      {activeAchievement ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <Input
                onChange={(event) =>
                  updateCustomSectionItem("achievements", safeAchievementIndex, {
                    name: event.target.value,
                  })
                }
                value={activeAchievement.name}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Description">
              <TextArea
                onChange={(event) =>
                  updateCustomSectionItem("achievements", safeAchievementIndex, {
                    description: event.target.value,
                  })
                }
                value={activeAchievement.description}
              />
            </Field>
          </div>
        </>
      ) : (
        <p className="text-muted text-sm">No achievements yet. Click Add achievement.</p>
      )}
    </DraggableSection>
  );
};

export default AchievementsSection;
