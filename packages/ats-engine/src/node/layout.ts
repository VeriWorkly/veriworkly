/**
 * Column detection from positioned text runs. Pure arithmetic, kept apart from the PDF reader so
 * it can be tested without one.
 */

/** A run of text on a page, by horizontal extent and how many characters it carries. */
export type PositionedRun = { left: number; right: number; mass: number };

/**
 * Below this many positioned text runs a page carries no usable layout signal. Set low on
 * purpose: a sparse page cannot produce a false column reading, because the balance term below
 * needs real text on both sides of the gutter before it reports anything.
 */
const MIN_ITEMS_FOR_COLUMN_SIGNAL = 12;

/** Candidate gutters are searched across the middle of the page, in 4pt steps. */
const GUTTER_SEARCH_START = 0.3;
const GUTTER_SEARCH_END = 0.7;
const GUTTER_STEP = 4;

/**
 * Finds the most balanced vertical channel that no text crosses, and reports how much of the
 * page's text sits on the thinner side of it.
 *
 * This measures the layout itself rather than a side effect of it. Inferring columns from the
 * extracted character stream can only ever see a two-column page whose columns happen to share
 * text lines; a PDF that emits its left column in full and then its right — equally unreadable
 * to a parser that maps fields by position — produces a perfectly linear stream.
 *
 * Reported as a share rather than a boolean because the shape matters: a balanced two-column
 * resume lands near 0.5, a narrow sidebar near 0.2, and right-aligned dates in an otherwise
 * single-column layout near 0.1. Those are three different amounts of trouble, and the policy
 * bands grade them separately.
 *
 * The share is measured in characters rather than in text runs, which is what separates the
 * second and third cases: a date pinned to the right margin on every line puts as many runs on
 * the right as on the left, but a column of four-digit years is a tenth of the page's text.
 *
 * `min(left, right)` covers the other end: a page whose lines are simply shorter than the
 * candidate split has no text at all on the far side, so the share is zero and no gutter is
 * reported. Returns `null` when the page has too little text to say.
 */
export function measureColumns(runs: readonly PositionedRun[], pageWidth: number): number | null {
  if (runs.length < MIN_ITEMS_FOR_COLUMN_SIGNAL || pageWidth <= 0) return null;

  // A rule, a full-width heading, or a page border may legitimately cross a real gutter.
  const straddleAllowance = Math.max(1, Math.round(runs.length * 0.02));
  let best = 0;

  for (
    let split = pageWidth * GUTTER_SEARCH_START;
    split <= pageWidth * GUTTER_SEARCH_END;
    split += GUTTER_STEP
  ) {
    let straddling = 0;
    let left = 0;
    let right = 0;

    for (const run of runs) {
      if (run.left < split && run.right > split) straddling += 1;
      else if (run.right <= split) left += run.mass;
      else right += run.mass;
    }

    if (straddling > straddleAllowance || left + right === 0) continue;
    best = Math.max(best, Math.min(left, right) / (left + right));
  }

  return best;
}
