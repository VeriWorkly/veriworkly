export interface TrendChartProps {
  daily: Array<{ date: string; count: number }>;
}

export function TrendChart({ daily }: TrendChartProps) {
  const max = Math.max(...daily.map((item) => item.count), 1);
  const width = 900;
  const height = 260;
  const pad = 24;
  const points = daily.map((item, index) => {
    const x =
      daily.length === 1 ? width / 2 : pad + (index / (daily.length - 1)) * (width - pad * 2);
    const y = height - pad - (item.count / max) * (height - pad * 2);
    return { ...item, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="mt-8">
      <svg
        className="h-auto w-full overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Portfolio views trend chart"
      >
        <title>Portfolio views trend chart</title>
        {[0, 1, 2, 3].map((row) => (
          <line
            key={row}
            x1={pad}
            x2={width - pad}
            y1={pad + row * ((height - pad * 2) / 3)}
            y2={pad + row * ((height - pad * 2) / 3)}
            stroke="rgba(23,23,23,.1)"
          />
        ))}
        <polyline
          points={line}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((point) => (
          <circle
            key={point.date}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="var(--color-panel)"
            stroke="var(--color-accent)"
            strokeWidth="3"
          >
            <title>{`${formatDate(point.date)}: ${point.count} views`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-3 flex justify-between text-[10px] font-bold text-[var(--color-muted)]">
        <span>{formatDate(daily[0].date)}</span>
        <span>{formatDate(daily.at(-1)?.date || daily[0].date)}</span>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(value),
  );
}
