"use client";

import { useState } from "react";

import { ArrowDown, ArrowUp } from "lucide-react";

import { Button, Select } from "@veriworkly/ui";

import ConfirmDialog from "@/components/modals/ConfirmDialog";

interface ListEditorControlsProps<T> {
  /** The section the list belongs to, e.g. "Experience". Names the picker for screen readers. */
  listLabel: string;
  items: T[];
  index: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** Moves an entry; the up and down buttons show only when it is given. */
  onMove?: (fromIndex: number, toIndex: number) => void;
  /** Entry label for the picker, e.g. `(item, i) => item.name || \`Award ${i + 1}\``. */
  labelFor: (item: T, index: number) => string;
  addLabel?: string;
  removeLabel?: string;
  /**
   * Renders Add on its own, full width, when the list is empty. The custom sections used
   * this shape and it reads better than a lone button beside an empty picker.
   */
  fullWidthWhenEmpty?: boolean;
}

/**
 * The index picker / Move / Add / Remove toolbar that sits above an indexed list section.
 *
 * The markup was duplicated verbatim across seven sections, each with its own hand-styled
 * raw `<select>` rather than the UI kit's — which is how that inconsistency spread so far.
 * Pairs with {@link useIndexedListEditor}, which owns the state behind it.
 */
export function ListEditorControls<T>({
  listLabel,
  items,
  index,
  onSelect,
  onAdd,
  onRemove,
  onMove,
  labelFor,
  addLabel = "Add",
  removeLabel = "Remove",
  fullWidthWhenEmpty = false,
}: ListEditorControlsProps<T>) {
  // The entry being removed, captured when Remove is clicked so switching entries behind
  // the dialog cannot change what gets deleted.
  const [pendingRemoval, setPendingRemoval] = useState<number | null>(null);
  // Read out after a move: focus stays on the move button, so nothing else says where
  // the entry went.
  const [moveAnnouncement, setMoveAnnouncement] = useState("");

  function move(offset: -1 | 1) {
    const toIndex = index + offset;

    if (!onMove || toIndex < 0 || toIndex >= items.length) return;

    onMove(index, toIndex);
    setMoveAnnouncement(
      `"${labelFor(items[index], toIndex)}" moved to position ${toIndex + 1} of ${items.length}.`,
    );
  }

  const activeLabel = items[index] === undefined ? "" : labelFor(items[index], index);

  if (!items.length && fullWidthWhenEmpty) {
    return (
      <div className="mb-3">
        <Button className="w-full justify-center" onClick={onAdd} variant="secondary">
          {addLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {items.length ? (
        <Select
          aria-label={`${listLabel} entry to edit`}
          className="h-10 min-w-0 flex-1"
          onChange={(event) => onSelect(Number(event.target.value))}
          value={index}
        >
          {items.map((item, itemIndex) => (
            <option key={itemIndex} value={itemIndex}>
              {labelFor(item, itemIndex)}
            </option>
          ))}
        </Select>
      ) : null}

      {onMove && items.length > 1 ? (
        <>
          {/* `aria-disabled`, not `disabled`: a disabled button drops keyboard focus the
              moment the entry reaches the end it was moving towards. */}
          <Button
            aria-disabled={index === 0 || undefined}
            aria-label={`Move "${activeLabel}" up`}
            className="aria-disabled:opacity-40"
            onClick={() => move(-1)}
            size="sm"
            variant="ghost"
          >
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            aria-disabled={index === items.length - 1 || undefined}
            aria-label={`Move "${activeLabel}" down`}
            className="aria-disabled:opacity-40"
            onClick={() => move(1)}
            size="sm"
            variant="ghost"
          >
            <ArrowDown aria-hidden="true" className="h-4 w-4" />
          </Button>
        </>
      ) : null}

      <Button onClick={onAdd} size="sm" variant="secondary">
        {addLabel}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        disabled={items.length === 0}
        onClick={() => setPendingRemoval(index)}
      >
        {removeLabel}
      </Button>

      <ConfirmDialog
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        onConfirm={() => {
          if (pendingRemoval !== null) onRemove(pendingRemoval);
          setPendingRemoval(null);
        }}
        title="Remove this entry?"
        description={
          pendingRemoval !== null && items[pendingRemoval]
            ? `"${labelFor(items[pendingRemoval], pendingRemoval)}" will be removed.`
            : "This entry will be removed."
        }
        confirmLabel={removeLabel}
        tone="destructive"
      />

      <p aria-live="polite" className="sr-only">
        {moveAnnouncement}
      </p>
    </div>
  );
}
