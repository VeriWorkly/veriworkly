"use client";

import type { ReactNode } from "react";

import type { BaseSectionProps } from "./section-types";
import type { ResumeSectionId } from "@/types/resume";
import type {
  ResumeTypedSectionKey,
  ResumeTypedSectionItem,
} from "@/features/resume/utils/factories";

import { useResumeStore } from "@/features/resume/store/resume-store";

import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { ListEditorControls } from "@/features/documents/editor/ListEditorControls";
import { useIndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";

/**
 * The list shell every typed optional section shares: add, select, remove, and render the
 * active row's fields.
 *
 * It replaces `GenericCustomSection`, which read its items out of
 * `resume.customSections.find(section => section.kind === kind)` and handed each editor the
 * same flat `{name, issuer, date, link, referenceId, description, details}` record. That is
 * why the references editor had a field labelled "Phone (optional)" writing to `date` and
 * one labelled "Email (optional)" writing to `link`: the labels described the section, the
 * properties described the container. Here `K` ties the row type to the array, so a field
 * can only write to a property the row actually has.
 */
interface TypedSectionEditorProps<K extends ResumeTypedSectionKey> extends BaseSectionProps {
  sectionKey: K;
  /** The section-id the accordion reports, which is not always the array name. */
  sectionId: ResumeSectionId;
  label: string;
  addLabel: string;
  fallbackItemLabel: string;
  emptyMessage: string;
  /** The list control's label for one row, usually its title field. */
  labelFor: (item: ResumeTypedSectionItem<K>) => string;
  children: (props: {
    item: ResumeTypedSectionItem<K>;
    index: number;
    update: (values: Partial<ResumeTypedSectionItem<K>>) => void;
  }) => ReactNode;
}

export default function TypedSectionEditor<K extends ResumeTypedSectionKey>({
  sectionKey,
  sectionId,
  label,
  addLabel,
  emptyMessage,
  fallbackItemLabel,
  labelFor,
  isOpen,
  onToggle,
  children,
}: TypedSectionEditorProps<K>) {
  const items = useResumeStore((state) => state.resume[sectionKey]) as ResumeTypedSectionItem<K>[];
  const addTypedItem = useResumeStore((state) => state.addTypedItem);
  const removeTypedItem = useResumeStore((state) => state.removeTypedItem);
  const updateTypedItem = useResumeStore((state) => state.updateTypedItem);

  const list = useIndexedListEditor(items, () => addTypedItem(sectionKey));

  const activeItem = list.activeItem;

  return (
    <SectionAccordion
      id={sectionId}
      label={label}
      isOpen={isOpen}
      onToggle={(nextId) => onToggle(nextId as ResumeSectionId)}
    >
      <ListEditorControls
        items={items}
        index={list.index}
        onAdd={list.add}
        onSelect={list.select}
        addLabel={addLabel}
        fullWidthWhenEmpty
        onRemove={(index) => removeTypedItem(sectionKey, index)}
        labelFor={(item, index) => labelFor(item) || `${fallbackItemLabel} ${index + 1}`}
      />

      {activeItem ? (
        children({
          item: activeItem,
          index: list.index,
          update: (values) => updateTypedItem(sectionKey, list.index, values),
        })
      ) : (
        <p className="text-muted text-sm">{emptyMessage}</p>
      )}
    </SectionAccordion>
  );
}
