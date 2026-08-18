"use client";

import { useState } from "react";

interface IndexedListEditor<T> {
  /** Always in range for the current list, even after items are removed. */
  index: number;
  activeItem: T | undefined;
  select: (index: number) => void;
  add: () => void;
}

/**
 * Selected-item state for a "pick one entry, edit it" section.
 *
 * Seven section components each wrote this out with only the noun changed: a
 * `useState(0)`, a clamp against the current length, an active-item lookup, and an add
 * handler that appends and then selects the new index. Around three hundred lines of
 * duplication, and a fix to any of the three behaviours had to be applied seven times.
 *
 * The clamp is derived rather than stored, so removing the last item cannot leave the
 * section pointing past the end of the list even for one render. `add` selects what was
 * just added, instead of leaving the previously-selected entry on screen.
 *
 * Per-section validation deliberately stays in the section: only the list mechanics moved.
 */
export function useIndexedListEditor<T>(items: T[], onAdd: () => void): IndexedListEditor<T> {
  const [index, setIndex] = useState(0);

  const safeIndex = Math.min(index, Math.max(0, items.length - 1));

  return {
    index: safeIndex,
    activeItem: items[safeIndex],
    select: setIndex,
    add: () => {
      const newIndex = items.length;

      onAdd();
      setIndex(newIndex);
    },
  };
}
