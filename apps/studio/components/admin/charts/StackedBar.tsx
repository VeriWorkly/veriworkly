import { cn } from "@veriworkly/ui";

import { chartColor, type ChartSeries } from "./ChartDefs";

export interface StackedSegment {
  label: string;
  value: number;
  series: ChartSeries;
}

interface StackedBarProps {
  segments: StackedSegment[];
  formatValue?: (value: number) => string;
  emptyMessage?: string;
  className?: string;
}

/**
 * A single horizontal bar split into proportional segments, with a legend beneath.
 *
 * This is the composition-of-a-whole shape — subscription status mix, document visibility mix,
 * commission status mix. It replaces the donut a dashboard would traditionally use here: at
 * these sizes a donut's arcs are harder to compare than segment widths, and the legend has to
 * carry the numbers either way, so the donut adds geometry without adding information.
 *
 * Zero-value segments are dropped from the bar but kept in the legend, so an operator can still
 * see that a status exists and is currently empty.
 */
const StackedBar = ({
  segments,
  formatValue = (value) => value.toLocaleString("en-US"),
  emptyMessage = "Nothing recorded yet.",
  className,
}: StackedBarProps) => {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total === 0) {
    return <p className="text-muted py-6 text-center text-sm">{emptyMessage}</p>;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="bg-admin-inset flex h-2.5 w-full overflow-hidden rounded-full">
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <div
              key={segment.label}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(segment.value / total) * 100}%`,
                background: chartColor(segment.series),
              }}
              // The legend below is the accessible representation; the bar itself is decorative.
              aria-hidden="true"
            />
          ))}
      </div>

      {/*
        One column, not two. The two-column legend paired statuses arbitrarily (two unrelated
        ones on a line) which invited a comparison the layout didn't mean, squeezed each label/value/
        percent trio into half the width, and left an odd status stranded alone on the last row
        whenever the count was odd. Stacked, it reads as the ranked breakdown it actually is —
        and it gives the panel enough height to sit level with its neighbours in a grid row
        instead of leaving a card-sized void beneath it.
      */}
      <ul className="divide-border/60 divide-y">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="flex items-center justify-between gap-3 py-1.5 text-sm"
          >
            <span className="text-muted flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: chartColor(segment.series) }}
              />
              <span className="truncate">{segment.label}</span>
            </span>

            <span className="admin-numeric shrink-0 tracking-tight">
              <span className="text-foreground font-semibold">{formatValue(segment.value)}</span>
              <span className="text-muted ml-1.5 text-xs">
                {Math.round((segment.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StackedBar;
