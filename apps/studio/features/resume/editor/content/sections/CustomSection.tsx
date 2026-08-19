"use client";

import type { BaseSectionProps } from "./section-types";
import type { ResumeSectionId } from "@/types/resume";

import { Button } from "@veriworkly/ui";
import { Plus, Trash2 } from "lucide-react";

import { useResumeStore } from "@/features/resume/store/resume-store";

import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { ListEditorControls } from "@/features/documents/editor/ListEditorControls";
import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";
import { TextAreaField, TextInputField } from "@/features/documents/editor/form";

interface CustomSectionProps extends BaseSectionProps {
  /** Which custom section this accordion edits. */
  customSectionId: string;
  /** The last one gets the "Add custom section" button, so it appears exactly once. */
  isLast: boolean;
}

/**
 * One custom section.
 *
 * The panel renders one of these per custom section, addressed by id. It used to render a
 * single instance that looked its section up with `find(section => section.kind ===
 * "custom")` — which found the first and left any others unreachable, and unreachable is
 * how they stayed until the next save dropped them.
 */
const CustomSection = ({ customSectionId, isLast, isOpen, onToggle }: CustomSectionProps) => {
  const customSection = useResumeStore(
    (state) =>
      state.resume.customSections.find((section) => section.id === customSectionId) ?? null,
  );
  const addCustomSection = useResumeStore((state) => state.addCustomSection);
  const removeCustomSection = useResumeStore((state) => state.removeCustomSection);
  const addCustomSectionItem = useResumeStore((state) => state.addCustomSectionItem);
  const removeCustomSectionItem = useResumeStore((state) => state.removeCustomSectionItem);
  const updateCustomSection = useResumeStore((state) => state.updateCustomSection);
  const updateCustomSectionItem = useResumeStore((state) => state.updateCustomSectionItem);

  const items = customSection?.items ?? [];

  // Called unconditionally: the `if (!customSection)` bail-out below must not sit above a
  // hook. Previously this section's `useState` was above the same early return.
  const list = useIndexedListEditor(items, () => addCustomSectionItem(customSectionId));

  if (!customSection) {
    return null;
  }

  const activeCustomItem = list.activeItem;
  const accordionId = `custom:${customSection.id}`;

  return (
    <SectionAccordion
      id={accordionId}
      isOpen={isOpen}
      label={customSection.title || "Custom"}
      onToggle={(nextId) => onToggle(nextId as ResumeSectionId)}
    >
      <ListEditorControls
        items={items}
        index={list.index}
        onAdd={list.add}
        onSelect={list.select}
        addLabel="Add item"
        removeLabel="Remove item"
        onRemove={(index) => removeCustomSectionItem(customSectionId, index)}
        labelFor={(item, index) => item.name || `Item ${index + 1}`}
      />

      {customSection.editableTitle ? (
        <TextInputField
          label="Section header"
          value={customSection.title}
          onValueChange={(title) => updateCustomSection(customSectionId, { title })}
        />
      ) : null}

      {activeCustomItem ? (
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
      ) : (
        <p className="text-muted text-sm">No custom items yet. Click Add item.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {isLast ? (
          <Button onClick={addCustomSection} size="sm" variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            Add custom section
          </Button>
        ) : null}

        <Button onClick={() => removeCustomSection(customSectionId)} size="sm" variant="ghost">
          <Trash2 className="mr-2 h-4 w-4" />
          Remove this section
        </Button>
      </div>
    </SectionAccordion>
  );
};

export default CustomSection;
