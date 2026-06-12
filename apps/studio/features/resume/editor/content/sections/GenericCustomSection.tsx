"use client";

import type { ReactNode } from "react";

import { useState } from "react";

import type { BaseSectionProps } from "./section-types";
import type { ResumeAdditionalItem, ResumeAdditionalSectionKind } from "@/types/resume";

import { Button } from "@veriworkly/ui";

import { useResumeStore } from "@/features/resume/store/resume-store";

import DraggableSection from "./DraggableSection";

interface GenericCustomSectionProps extends BaseSectionProps {
  kind: ResumeAdditionalSectionKind;
  label: string;
  addLabel: string;
  fallbackItemLabel: string;
  emptyMessage: string;
  children: (props: {
    item: ResumeAdditionalItem;
    index: number;
    update: (values: Partial<ResumeAdditionalItem>) => void;
  }) => ReactNode;
}

export default function GenericCustomSection({
  kind,
  label,
  addLabel,
  emptyMessage,
  fallbackItemLabel,
  isOpen,
  onDragEnd,
  onDragOver,
  onDragStart,
  onDrop,
  onToggle,
  children,
}: GenericCustomSectionProps) {
  const section =
    useResumeStore((state) =>
      state.resume.customSections.find((customSection) => customSection.kind === kind),
    ) ?? null;
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!section) return null;

  const safeIndex = Math.min(selectedIndex, Math.max(0, section.items.length - 1));
  const activeItem = section.items[safeIndex];

  return (
    <DraggableSection
      id={kind}
      label={label}
      isOpen={isOpen}
      onDrop={onDrop}
      onToggle={onToggle}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
    >
      <div className="mb-3 grid gap-2">
        {section.items.length ? (
          <div className="flex flex-wrap gap-2">
            <select
              className="border-border bg-background h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm"
              onChange={(event) => setSelectedIndex(Number(event.target.value))}
              value={safeIndex}
            >
              {section.items.map((item, index) => (
                <option key={item.id} value={index}>
                  {item.name || `${fallbackItemLabel} ${index + 1}`}
                </option>
              ))}
            </select>

            <Button onClick={() => addCustomSectionItem(kind)} size="sm" variant="secondary">
              {addLabel}
            </Button>

            <Button
              onClick={() => removeCustomSectionItem(kind, safeIndex)}
              size="sm"
              variant="ghost"
            >
              Remove
            </Button>
          </div>
        ) : (
          <Button
            className="w-full justify-center"
            onClick={() => addCustomSectionItem(kind)}
            variant="secondary"
          >
            {addLabel}
          </Button>
        )}
      </div>

      {activeItem ? (
        children({
          item: activeItem,
          index: safeIndex,
          update: (values) => updateCustomSectionItem(kind, safeIndex, values),
        })
      ) : (
        <p className="text-muted text-sm">{emptyMessage}</p>
      )}
    </DraggableSection>
  );
}
