import type { ReactNode } from "react";

export interface MetricProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
}

export function Metric({ icon, label, value, detail }: MetricProps) {
  return (
    <article className="border-line bg-panel rounded-2xl border p-5">
      <div className="text-muted flex items-center justify-between">
        <p className="text-xs font-extrabold">{label}</p>
        <span className="bg-accent-soft text-accent grid size-8 place-items-center rounded-lg">
          {icon}
        </span>
      </div>
      <p className="mt-6 text-3xl font-black tracking-[-.04em] tabular-nums">{value}</p>
      <p className="text-muted mt-2 truncate text-[11px]">{detail}</p>
    </article>
  );
}
