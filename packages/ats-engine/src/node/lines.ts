/**
 * A PDF page's text from pdf.js's positioned items, one line per printed line.
 *
 * pdf-parse's assembly (v2: a line break where the baseline moves, a tab where same-line items
 * are apart), with one rule added. pdf.js reports a wide horizontal gap as a whitespace item that
 * spans it, so pdf-parse saw no gap and printed "Senior Engineer Acme Corp": the title and the
 * employer the parser splits on a tab were merged on every PDF. A blank item wider than two
 * characters' height is that gap, and is a tab here.
 */

/** The fields of a pdf.js text item this reads. */
export type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
};

/** pdf-parse's defaults, in page units. */
const LINE_THRESHOLD = 4.6;
const CELL_THRESHOLD = 7;
/** A blank item at least this many times its height wide is a column gap, not a word space. */
const GAP_HEIGHTS = 2;

export function pageText(
  items: readonly PdfTextItem[],
  toViewport: (x: number, y: number) => number[],
): string {
  const out: string[] = [];
  let lastX: number | undefined;
  let lastY: number | undefined;
  let lineHeight = 0;

  for (const item of items) {
    const [x, y] = toViewport(item.transform[4], item.transform[5]);
    let str = item.str;

    if (lastY !== undefined && Math.abs(lastY - y) > LINE_THRESHOLD) {
      const startsLine = str.startsWith("\n") || (str.trim() === "" && item.hasEOL);
      if (
        out.at(-1)?.endsWith("\n") === false &&
        !startsLine &&
        Math.abs(lastY - y) - 1 > lineHeight
      ) {
        out.push("\n");
        lineHeight = 0;
      }
    }

    const sameLine = lastY !== undefined && Math.abs(lastY - y) < LINE_THRESHOLD;
    if (str.trim() === "" && !item.hasEOL && item.width >= GAP_HEIGHTS * (item.height || 10))
      str = "\t";
    else if (sameLine && lastX !== undefined && Math.abs(lastX - x) > CELL_THRESHOLD)
      str = `\t${str}`;

    out.push(str);
    lastX = x + item.width;
    lastY = y;
    lineHeight = Math.max(lineHeight, item.height);
    if (item.hasEOL) out.push("\n");
    if (item.hasEOL || str.endsWith("\n")) lineHeight = 0;
  }
  return out.join("");
}
