"use client";

import type { ReactNode } from "react";

import type { BaseSectionProps } from "./section-types";
import type { IndexedListEditor } from "@/features/documents/editor/useIndexedListEditor";

import SectionAccordion from "@/features/documents/editor/SectionAccordion";
import { ListEditorControls } from "@/features/documents/editor/ListEditorControls";

interface ListSectionProps<T> extends BaseSectionProps {
  /** The accordion id, which is also the section key the panel toggles by. */
  id: string;
  label: string;
  items: T[];
  list: IndexedListEditor<T>;
  onRemove: (index: number) => void;
  /** Moves an entry; the selection follows it. */
  onMove?: (fromIndex: number, toIndex: number) => void;
  labelFor: (item: T, index: number) => string;
  addLabel?: string;
  removeLabel?: string;
  fullWidthWhenEmpty?: boolean;
  emptyMessage: string;
  /** Rendered between the list controls and the active entry. */
  header?: ReactNode;
  /** Rendered after the active entry (or the empty message). */
  footer?: ReactNode;
  /** The active entry's fields. */
  children: (item: T) => ReactNode;
}

/**
 * The shell of a "pick one entry, edit it" resume section: the accordion, the entry
 * picker with Move, Add and Remove, and the empty message. The section keeps its own store
 * bindings, validation and fields.
 */
export default function ListSection<T>({
  id,
  label,
  isOpen,
  onToggle,
  items,
  list,
  onRemove,
  onMove,
  labelFor,
  addLabel,
  removeLabel,
  fullWidthWhenEmpty,
  emptyMessage,
  header,
  footer,
  children,
}: ListSectionProps<T>) {
  return (
    <SectionAccordion id={id} label={label} isOpen={isOpen} onToggle={onToggle}>
      <ListEditorControls
        listLabel={label}
        items={items}
        index={list.index}
        onAdd={list.add}
        onSelect={list.select}
        onRemove={onRemove}
        onMove={
          onMove &&
          ((fromIndex, toIndex) => {
            onMove(fromIndex, toIndex);
            list.select(toIndex);
          })
        }
        labelFor={labelFor}
        addLabel={addLabel}
        removeLabel={removeLabel}
        fullWidthWhenEmpty={fullWidthWhenEmpty}
      />

      {header}

      {list.activeItem !== undefined ? (
        children(list.activeItem)
      ) : (
        <p className="text-muted text-sm">{emptyMessage}</p>
      )}

      {footer}
    </SectionAccordion>
  );
}
