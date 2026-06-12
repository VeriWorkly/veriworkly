import type { ReactNode } from "react";

export interface PanelProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

export function Panel({ title, icon, children }: PanelProps) {
  return (
    <section className="border-line bg-panel rounded-xl border p-5">
      <div className="flex items-center gap-2">
        <span className="bg-ink text-panel rounded-lg p-2">{icon}</span>
        <h2 className="text-sm font-extrabold">{title}</h2>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}
