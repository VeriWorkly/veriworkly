"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

interface UseFocusTrapOptions {
  onEscape?: () => void;
  lockScroll?: boolean;
}

export const useFocusTrap = <T extends HTMLElement>(
  active: boolean,
  containerRef: React.RefObject<T | null>,
  { onEscape, lockScroll = true }: UseFocusTrapOptions = {},
) => {
  const escapeRef = useRef(onEscape);

  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    if (lockScroll) document.body.style.overflow = "hidden";

    const getFocusable = () =>
      Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const focusFrame = requestAnimationFrame(() => {
      const [first] = getFocusable();

      if (first) first.focus();
      else containerRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        escapeRef.current?.();

        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      const activeEl = document.activeElement;

      if (event.shiftKey && (activeEl === first || !containerRef.current?.contains(activeEl))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeEl === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);

      if (lockScroll) document.body.style.overflow = previousOverflow;

      previouslyFocused?.focus?.();
    };
  }, [active, containerRef, lockScroll]);
};
