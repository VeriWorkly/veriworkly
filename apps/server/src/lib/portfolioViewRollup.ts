/**
 * The `date` of the PortfolioViewDaily rows that hold views older than the retention window, one
 * per publication and referrer host. The retention job folds old daily rows into them, so a
 * portfolio's total (the SUM over its rows) and its referrer totals survive while the day-by-day
 * history goes. A query bounded by a recent date skips these rows on its own; a per-day listing
 * without a lower bound must exclude them.
 */
export const VIEW_ROLLUP_DATE = new Date("1970-01-01T00:00:00.000Z");
