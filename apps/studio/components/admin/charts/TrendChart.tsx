"use client";

import { useMemo, useState } from "react";

import { cn } from "@veriworkly/ui";

import { formatCompactNumber, formatNumber } from "@/features/admin/utils/admin-format";

import { chartColor, chartFillId, type ChartSeries } from "./ChartDefs";
import { buildAreaPath, buildLinePath, gridSteps, niceMax, toPoints } from "./geometry";

interface TrendDataset {
  label: string;
  values: number[];
  series: ChartSeries;
  /** Off for secondary comparison lines, so overlapping fills don't muddy the primary series. */
  filled?: boolean;
}

interface TrendChartProps {
  /** ISO `YYYY-MM-DD` labels, one per point, aligned across every dataset. */
  buckets: string[];
  datasets: TrendDataset[];
  height?: number;
  /** A name, not a function: Server Components render this chart, and props must serialise. */
  format?: "number" | "compact";
  className?: string;
}

const FORMATTERS = { number: formatNumber, compact: formatCompactNumber } as const;

function formatAxisDate(iso: string) {
  // The bucket is a plain calendar day; parsing it as UTC avoids the local-timezone shift that
  // would otherwise label a day as the one before it for anyone west of Greenwich.
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The dashboard's main chart: one or more daily series over the selected window.
 *
 * The plot itself is an SVG stretched with `preserveAspectRatio="none"`, but every label is
 * HTML positioned around it rather than `<text>` inside it. Stretching an SVG that contains
 * text squashes the glyphs horizontally at wide viewports and shrinks them to unreadable at
 * narrow ones; keeping labels in HTML means they stay at a fixed, legible size at every width
 * without a resize observer.
 */
const TrendChart = ({
  buckets,
  datasets,
  height = 200,
  format = "number",
  className,
}: TrendChartProps) => {
  const formatValue = FORMATTERS[format];
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const scale = useMemo(() => {
    // A shared axis across datasets — per-dataset axes would let two lines with wildly
    // different magnitudes appear to cross.
    const max = Math.max(0, ...datasets.flatMap((dataset) => dataset.values));
    return { min: 0, max: niceMax(max === 0 ? 1 : max) };
  }, [datasets]);

  const width = 100;

  const paths = useMemo(
    () =>
      datasets.map((dataset) => {
        const points = toPoints(dataset.values, width, height, scale);

        return {
          ...dataset,
          points,
          line: buildLinePath(points),
          area: buildAreaPath(points, height),
        };
      }),
    [datasets, height, scale],
  );

  const steps = gridSteps(scale.max);
  const ticks = useMemo(
    () => Array.from({ length: steps + 1 }, (_, step) => (scale.max / steps) * step).reverse(),
    [scale.max, steps],
  );

  if (buckets.length === 0) {
    return (
      <div
        className={cn("text-muted flex items-center justify-center text-sm", className)}
        style={{ height }}
      >
        No data in this window yet.
      </div>
    );
  }

  const pointFromEvent = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0) return;

    const ratio = (event.clientX - bounds.left) / bounds.width;
    const index = Math.round(ratio * (buckets.length - 1));

    setActiveIndex(Math.min(Math.max(index, 0), buckets.length - 1));
  };

  // Anchor the tooltip from whichever edge keeps it inside the plot, so hovering the last day
  // doesn't push it off the panel.
  const activeRatio = activeIndex === null ? 0 : activeIndex / Math.max(1, buckets.length - 1);
  const tooltipFlipped = activeRatio > 0.6;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex gap-2">
        <div
          className="text-muted admin-numeric flex w-10 shrink-0 flex-col justify-between text-right text-xs leading-none"
          aria-hidden="true"
        >
          {ticks.map((tick, index) => (
            <span key={index}>{formatValue(tick)}</span>
          ))}
        </div>

        <div
          className="relative min-w-0 flex-1"
          style={{ height }}
          onPointerMove={pointFromEvent}
          onPointerLeave={() => setActiveIndex(null)}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            role="img"
            aria-label={`${datasets.map((dataset) => dataset.label).join(", ")} from ${formatAxisDate(buckets[0])} to ${formatAxisDate(buckets[buckets.length - 1])}`}
          >
            {ticks.map((_, index) => {
              const y = (height / steps) * index;

              return (
                <line
                  key={index}
                  x1="0"
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            {paths.map((path) =>
              path.filled === false ? null : (
                <path
                  key={`${path.label}-area`}
                  d={path.area}
                  fill={`url(#${chartFillId(path.series)})`}
                  className="admin-chart-animate"
                />
              ),
            )}

            {paths.map((path) => (
              <path
                key={`${path.label}-line`}
                d={path.line}
                fill="none"
                stroke={chartColor(path.series)}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="admin-chart-animate"
              />
            ))}

            {activeIndex !== null ? (
              <line
                x1={activeRatio * width}
                x2={activeRatio * width}
                y1="0"
                y2={height}
                stroke="var(--chart-grid)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>

          {/*
            The hover markers are HTML, not SVG `<circle>`s. The plot's viewBox is stretched
            horizontally by `preserveAspectRatio="none"`, which would draw any circle inside it
            as a wide ellipse — `non-scaling-stroke` fixes stroke width but not shape. Absolutely
            positioning the dots over the plot keeps them round at every viewport width.
          */}
          {activeIndex === null
            ? null
            : paths.map((path) => {
                const point = path.points[activeIndex];
                if (!point) return null;

                return (
                  <span
                    key={`${path.label}-dot`}
                    aria-hidden="true"
                    className="border-card pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                    style={{
                      left: `${activeRatio * 100}%`,
                      top: `${(point.y / height) * 100}%`,
                      background: chartColor(path.series),
                    }}
                  />
                );
              })}

          {activeIndex !== null ? (
            <div
              className="border-border bg-card pointer-events-none absolute top-2 z-10 min-w-36 rounded-lg border p-2.5 shadow-lg"
              style={
                tooltipFlipped
                  ? { right: `${(1 - activeRatio) * 100}%`, marginRight: 8 }
                  : { left: `${activeRatio * 100}%`, marginLeft: 8 }
              }
            >
              <p className="text-muted mb-1.5 text-xs font-medium">
                {formatAxisDate(buckets[activeIndex])}
              </p>

              {datasets.map((dataset) => (
                <div
                  key={dataset.label}
                  className="flex items-center justify-between gap-4 text-xs leading-5"
                >
                  <span className="text-muted flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: chartColor(dataset.series) }}
                    />
                    {dataset.label}
                  </span>

                  <span className="text-foreground admin-numeric font-semibold">
                    {formatValue(dataset.values[activeIndex] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* The values the tooltip shows on hover, for keyboard and screen-reader users too. */}
      <table className="sr-only">
        <caption>{datasets.map((dataset) => dataset.label).join(", ")} per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {datasets.map((dataset) => (
              <th key={dataset.label} scope="col">
                {dataset.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {buckets.map((bucket, index) => (
            <tr key={bucket}>
              <th scope="row">{formatAxisDate(bucket)}</th>
              {datasets.map((dataset) => (
                <td key={dataset.label}>{formatValue(dataset.values[index] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-muted admin-numeric mt-2 ml-12 flex justify-between text-xs">
        <span>{formatAxisDate(buckets[0])}</span>

        {buckets.length > 2 ? (
          <span className="hidden sm:inline">
            {formatAxisDate(buckets[Math.floor(buckets.length / 2)])}
          </span>
        ) : null}

        <span>{formatAxisDate(buckets[buckets.length - 1])}</span>
      </div>
    </div>
  );
};

export default TrendChart;
