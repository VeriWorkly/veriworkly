import type { ReactNode } from "react";

export interface PreviewProps {
  title: string;
  children: ReactNode;
}

export function Preview({ title, children }: PreviewProps) {
  return (
    <section className="border-line bg-panel rounded-xl border p-4">
      <h2 className="text-muted text-xs font-bold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
