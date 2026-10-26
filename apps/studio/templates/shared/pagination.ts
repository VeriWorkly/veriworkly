/**
 * Marks a block the PDF lets flow across pages (see `createResumeKeepTogether`), so the paged
 * preview splits it at the page edge too instead of moving it whole.
 */
export const SPLIT_ATTRIBUTE = "data-split";

/**
 * Body lines that must follow a section heading on its page when the section flows rather
 * than moving whole; with less room the heading moves to the next page with its content.
 */
export const HEADING_PRESENCE_LINES = 2;

/**
 * How much a CSS transform on an ancestor scales `element` on screen: 1 when nothing does,
 * 0.78 inside the editor's 78% zoom, under 0.5 in Full Preview on a phone. Measuring probes
 * live inside those transforms, and `getBoundingClientRect()` answers in screen pixels while
 * the page height, padding and line height are CSS pixels, so every CSS length compared with
 * a rect is multiplied by this first. Breaks then land on the same words at any zoom.
 */
export function screenScale(element: HTMLElement): number {
  const height = element.offsetHeight;

  return height > 0 ? element.getBoundingClientRect().height / height : 1;
}

/**
 * A page under construction that can be measured after each addition.
 *
 * Implementations own the measuring surface (an off-screen DOM probe for web
 * previews, an accumulated height for weight-based layouts). The contract is
 * append-then-measure so pagination costs one measurement per item rather than
 * one per candidate page.
 */
export interface IncrementalPageProbe<T> {
  /** Adds one item to the page under construction. */
  append(item: T): void;
  /** Whether the page still fits after the most recent {@link append}. */
  fits(): boolean;
  /**
   * Undoes the most recent {@link append}.
   *
   * Must behave as a stack pop: `paginateIncremental` can call this twice in a row
   * (the keep-with-next lookahead appends a probe item, undoes it, and may then undo
   * the real item as well), so an implementation that only remembers a single last
   * append will leave stale content on the page.
   */
  undo(): void;
  /** Discards the page under construction and starts an empty one. */
  reset(): void;
  /**
   * Breaks the most recent {@link append} at the page edge: the part that stays on this
   * page and the part that continues on the next. Null when none of it fits.
   */
  split?(): [T, T] | null;
}

/**
 * Splits `items` across pages using one measurement per item.
 *
 * The resume preview previously fitted each section by trying every prefix length —
 * rebuilding the probe's `innerHTML` and reading `scrollHeight` (a forced synchronous
 * reflow) once per candidate length. A section with M items cost O(M²) reflows, and it
 * re-ran on every keystroke.
 *
 * Here each item is appended once and measured once; a page break rewinds a single
 * append. Total reflows are O(items + pages) instead of O(items²).
 *
 * `keepWithNext` prevents widows — return true when `item` must not be the last thing
 * on a page (a section heading immediately followed by its first row, say) and the pair
 * will be required to fit together.
 *
 * An item `canSplit` accepts is not moved when it overflows: it is broken at the page edge
 * by `probe.split` and continues on the next page, the way the PDF flows it. Any other item
 * that cannot fit an empty page is kept on its own page rather than dropped, so oversized
 * content overflows visibly instead of disappearing.
 */
export function paginateIncremental<T>(
  items: T[],
  probe: IncrementalPageProbe<T>,
  keepWithNext?: (item: T, nextItem: T | undefined) => boolean,
  canSplit?: (item: T) => boolean,
): T[][] {
  const pages: T[][] = [];
  const queue = [...items];
  let current: T[] = [];

  probe.reset();

  while (queue.length > 0) {
    const item = queue.shift() as T;
    const nextItem = queue[0];

    probe.append(item);

    let fits = probe.fits();

    if (fits && nextItem && keepWithNext?.(item, nextItem)) {
      probe.append(nextItem);
      fits = probe.fits();
      probe.undo();
    }

    if (!fits && probe.split && canSplit?.(item)) {
      const parts = probe.split();

      if (parts) {
        pages.push([...current, parts[0]]);
        current = [];
        probe.reset();
        queue.unshift(parts[1]);
        continue;
      }
    }

    if (fits || current.length === 0) {
      current.push(item);
      continue;
    }

    probe.undo();
    pages.push(current);

    current = [];
    probe.reset();
    queue.unshift(item);
  }

  if (current.length > 0) pages.push(current);

  return pages;
}
