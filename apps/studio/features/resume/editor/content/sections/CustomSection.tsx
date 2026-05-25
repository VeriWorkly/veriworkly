"use client";

import { useState } from "react";

import type { BaseSectionProps } from "./section-types";

import { Input } from "@veriworkly/ui";
import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";

import DraggableSection from "./DraggableSection";
import { Field, TextArea } from "../EditorFormPrimitives";

const CustomSection = ({
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
}: BaseSectionProps) => {
  const customSection =
    useResumeStore((state) =>
      state.resume.customSections.find((section) => section.kind === "custom"),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSection = useResumeStore((state) => state.updateCustomSection);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);
  const [customSectionIndex, setCustomSectionIndex] = useState(0);

  if (!customSection) {
    return null;
  }

  const safeCustomItemIndex = Math.min(
    customSectionIndex,
    Math.max(0, customSection.items.length - 1),
  );
  const activeCustomItem = customSection.items[safeCustomItemIndex];

  return (
    <DraggableSection
      id="custom"
      isOpen={isOpen}
      label="Custom"
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onDrop={onDrop}
      onToggle={onToggle}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {customSection.items.length ? (
          <select
            className="border-border bg-background h-10 rounded-xl border px-3 text-sm"
            onChange={(event) => setCustomSectionIndex(Number(event.target.value))}
            value={safeCustomItemIndex}
          >
            {customSection.items.map((item, index) => (
              <option key={item.id} value={index}>
                {item.name || `Item ${index + 1}`}
              </option>
            ))}
          </select>
        ) : null}
        <Button onClick={() => addCustomSectionItem("custom")} size="sm" variant="secondary">
          Add item
        </Button>
        <Button
          disabled={customSection.items.length === 0}
          onClick={() => removeCustomSectionItem("custom", safeCustomItemIndex)}
          size="sm"
          variant="ghost"
        >
          Remove item
        </Button>
      </div>

      {customSection.editableTitle ? (
        <Field label="Section header">
          <Input
            onChange={(event) =>
              updateCustomSection("custom", {
                title: event.target.value,
              })
            }
            value={customSection.title}
          />
        </Field>
      ) : null}

      {activeCustomItem ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name / Title">
              <Input
                onChange={(event) =>
                  updateCustomSectionItem("custom", safeCustomItemIndex, {
                    name: event.target.value,
                  })
                }
                value={activeCustomItem.name}
              />
            </Field>
            <Field label="Link (optional)">
              <Input
                placeholder="https://..."
                type="url"
                onChange={(event) =>
                  updateCustomSectionItem("custom", safeCustomItemIndex, {
                    link: event.target.value,
                  })
                }
                value={activeCustomItem.link}
              />
            </Field>
          </div>

          <Field label="Description">
            <TextArea
              onChange={(event) =>
                updateCustomSectionItem("custom", safeCustomItemIndex, {
                  description: event.target.value,
                })
              }
              value={activeCustomItem.description}
            />
          </Field>
        </>
      ) : (
        <p className="text-muted text-sm">No custom items yet. Click Add item.</p>
      )}
    </DraggableSection>
  );
};

export default CustomSection;
