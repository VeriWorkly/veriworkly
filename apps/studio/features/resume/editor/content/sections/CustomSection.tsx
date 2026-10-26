"use client";

import type { BaseSectionProps } from "./section-types";

import { Button } from "@veriworkly/ui";
import { useState } from "react";
import { Trash2 } from "lucide-react";

import { useResumeStore } from "@/features/resume/store/resume-store";

import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";
import { TextAreaField, TextInputField } from "@/features/documents/editor/form";

import ListSection from "./ListSection";

interface CustomSectionProps extends BaseSectionProps {
  /** Which custom section this accordion edits. */
  customSectionId: string;
}

/**
 * One custom section.
 *
 * The panel renders one of these per custom section, addressed by id. It used to render a
 * single instance that looked its section up with `find(section => section.kind ===
 * "custom")` — which found the first and left any others unreachable, and unreachable is
 * how they stayed until the next save dropped them.
 */
const CustomSection = ({ customSectionId, isOpen, onToggle }: CustomSectionProps) => {
  const customSection = useResumeStore(
    (state) =>
      state.resume.customSections.find((section) => section.id === customSectionId) ?? null,
  );
  const removeCustomSection = useResumeStore((state) => state.removeCustomSection);
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const reorderCustomSectionItem = useResumeStore((state) => state.reorderCustomSectionItem);
  const updateCustomSection = useResumeStore((state) => state.updateCustomSection);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const items = customSection?.items ?? [];

  // Called unconditionally: the `if (!customSection)` bail-out below must not sit above a
  // hook. Previously this section's `useState` was above the same early return.
  const list = useIndexedListEditor(items, () => addCustomSectionItem(customSectionId));
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  if (!customSection) {
    return null;
  }

  return (
    <ListSection
      id={`custom:${customSection.id}`}
      label={customSection.title || "Custom"}
      isOpen={isOpen}
      onToggle={onToggle}
      items={items}
      list={list}
      addLabel="Add item"
      removeLabel="Remove item"
      onRemove={(index) => removeCustomSectionItem(customSectionId, index)}
      onMove={(fromIndex, toIndex) => reorderCustomSectionItem(customSectionId, fromIndex, toIndex)}
      labelFor={(item, index) => item.name || `Item ${index + 1}`}
      emptyMessage="No custom items yet. Click Add item."
      header={
        customSection.editableTitle ? (
          <TextInputField
            label="Section header"
            placeholder="e.g. Speaking"
            value={customSection.title}
            onValueChange={(title) => updateCustomSection(customSectionId, { title })}
          />
        ) : null
      }
      footer={
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => setConfirmingRemove(true)} size="sm" variant="ghost">
              <Trash2 className="mr-2 h-4 w-4" />
              Remove this section
            </Button>
          </div>

          <ConfirmDialog
            open={confirmingRemove}
            onClose={() => setConfirmingRemove(false)}
            onConfirm={() => {
              setConfirmingRemove(false);
              removeCustomSection(customSectionId);
            }}
            title="Remove this section?"
            description={`"${customSection.title || "Custom"}" and its ${items.length} item${items.length === 1 ? "" : "s"} will be removed from this resume.`}
            confirmLabel="Remove section"
            tone="destructive"
          />
        </>
      }
    >
      {(activeCustomItem) => (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <TextInputField
              label="Name / Title"
              value={activeCustomItem.name}
              onValueChange={(name) =>
                updateCustomSectionItem(customSectionId, list.index, { name })
              }
            />

            <TextInputField
              type="url"
              label="Link (optional)"
              placeholder="https://..."
              value={activeCustomItem.link}
              onValueChange={(link) =>
                updateCustomSectionItem(customSectionId, list.index, { link })
              }
            />
          </div>

          <TextAreaField
            label="Description"
            value={activeCustomItem.description}
            onValueChange={(description) =>
              updateCustomSectionItem(customSectionId, list.index, { description })
            }
          />
        </>
      )}
    </ListSection>
  );
};

export default CustomSection;
