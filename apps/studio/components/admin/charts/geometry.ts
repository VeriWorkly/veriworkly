/**
 * Chart geometry shared by every admin chart.
 *
 * These are pure functions over plain numbers so the SVG components stay declarative and the
 * maths is testable on its own. No chart library is used anywhere in the admin: the shapes
 * needed here are four, they all have to be driven by the theme's CSS custom properties, and
 * a charting dependency would cost ~100kb of client JS to draw a polyline.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Scale {
  min: number;
  max: number;
}

/**
 * The y-axis range for a series.
 *
 * Always anchored at zero for count data — a chart whose baseline floats to the series minimum
 * turns a 2% wobble into a dramatic cliff, which is exactly the kind of chart that makes an
 * operator act on noise. A flat all-zero series gets a nominal max of 1 so it renders as a line
 * along the bottom rather than dividing by zero.
 */
export function computeScale(values: number[], headroom = 1.15): Scale {
  const max = Math.max(0, ...values);
  return { min: 0, max: max === 0 ? 1 : max * headroom };
}

/** Rounds an axis maximum up to a readable step (1/2/5 x 10^n) so tick labels aren't noise. */
export function niceMax(value: number) {
  if (value <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;

  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * How many grid bands split `0..max` into whole-number steps: four where they divide evenly,
 * else five, two or one. A count axis split in four at a max of 1 or 2 printed "0, 0, 1, 1, 1".
 * `max` is a `niceMax` result (1, 2 or 5 times a power of ten), so one of these always fits.
 */
export function gridSteps(max: number) {
  return [4, 5, 2, 1].find((steps) => Number.isInteger(max / steps)) ?? 1;
}

/** Maps a series onto pixel coordinates inside `width` x `height`. */
export function toPoints(values: number[], width: number, height: number, scale: Scale): Point[] {
  if (values.length === 0) return [];

  const span = scale.max - scale.min || 1;
  // A single-point series has no horizontal step to divide by; pin it to the left edge.
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  return values.map((value, index) => ({
    x: index * stepX,
    y: height - ((value - scale.min) / span) * height,
  }));
}

/**
 * Fritsch-Carlson tangents for monotone cubic interpolation.
 *
 * Plain Catmull-Rom smoothing overshoots: on a series like `[0, 0, 40, 0]` it dips the curve
 * below zero, drawing negative signups. Constraining the tangents this way keeps the curve
 * inside the data's own range, so a smooth line can never imply a value that was never
 * recorded.
 */
function monotoneTangents(points: Point[]) {
  const count = points.length;
  const slopes: number[] = [];
  const tangents: number[] = new Array(count).fill(0);

  for (let index = 0; index < count - 1; index += 1) {
    const dx = points[index + 1].x - points[index].x;
    slopes.push(dx === 0 ? 0 : (points[index + 1].y - points[index].y) / dx);
  }

  tangents[0] = slopes[0] ?? 0;
  tangents[count - 1] = slopes[count - 2] ?? 0;

  for (let index = 1; index < count - 1; index += 1) {
    const previous = slopes[index - 1];
    const next = slopes[index];

    // A sign change is a local extremum: flatten the tangent so the curve turns without
    // bulging past the point it is turning at.
    tangents[index] = previous * next <= 0 ? 0 : (previous + next) / 2;
  }

  for (let index = 0; index < count - 1; index += 1) {
    if (slopes[index] === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }

    const alpha = tangents[index] / slopes[index];
    const beta = tangents[index + 1] / slopes[index];
    const magnitude = Math.hypot(alpha, beta);

    // Fritsch-Carlson: project tangents back inside the circle of radius 3 to guarantee
    // monotonicity on each segment.
    if (magnitude > 3) {
      tangents[index] = (3 / magnitude) * alpha * slopes[index];
      tangents[index + 1] = (3 / magnitude) * beta * slopes[index];
    }
  }

  return tangents;
}

/** An `M ... C ...` path through every point, smoothed without overshoot. */
export function buildLinePath(points: Point[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const tangents = monotoneTangents(points);
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const third = (next.x - current.x) / 3;

    path +=
      ` C ${current.x + third} ${current.y + tangents[index] * third},` +
      ` ${next.x - third} ${next.y - tangents[index + 1] * third},` +
      ` ${next.x} ${next.y}`;
  }

  return path;
}

/** The line path closed down to the baseline, for the gradient fill under an area chart. */
export function buildAreaPath(points: Point[], height: number) {
  if (points.length === 0) return "";

  const line = buildLinePath(points);
  const last = points[points.length - 1];

  return `${line} L ${last.x} ${height} L ${points[0].x} ${height} Z`;
}

/**
 * Percent change between the first and second half of a window.
 *
 * Comparing halves rather than first-point-to-last-point means one freak day at either end
 * cannot invent a trend. The halves are the same length (an odd window drops its middle day),
 * so a flat series reads 0%. Returns null when the earlier half is empty, because "up from
 * zero" has no percentage — the caller renders that as "—" rather than as infinity.
 */
export function trendFromSeries(values: number[]): number | null {
  if (values.length < 4) return null;

  const half = Math.floor(values.length / 2);
  const sum = (slice: number[]) => slice.reduce((total, value) => total + value, 0);

  const earlier = sum(values.slice(0, half));
  const later = sum(values.slice(values.length - half));

  if (earlier === 0) return null;

  return Number((((later - earlier) / earlier) * 100).toFixed(1));
}
