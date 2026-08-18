"use client";

import { Button, Select } from "@veriworkly/ui";

interface ListEditorControlsProps<T> {
  items: T[];
  index: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
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
 * The index picker / Add / Remove toolbar that sits above an indexed list section.
 *
 * The markup was duplicated verbatim across seven sections, each with its own hand-styled
 * raw `<select>` rather than the UI kit's — which is how that inconsistency spread so far.
 * Pairs with {@link useIndexedListEditor}, which owns the state behind it.
 */
export function ListEditorControls<T>({
  items,
  index,
  onSelect,
  onAdd,
  onRemove,
  labelFor,
  addLabel = "Add",
  removeLabel = "Remove",
  fullWidthWhenEmpty = false,
}: ListEditorControlsProps<T>) {
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

      <Button onClick={onAdd} size="sm" variant="secondary">
        {addLabel}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        disabled={items.length === 0}
        onClick={() => onRemove(index)}
      >
        {removeLabel}
      </Button>
    </div>
  );
}
