import type { ReactNode } from "react";

export interface EditorPanelProps {
  title: string;
  detail: string;
  children: ReactNode;
}

export function EditorPanel({ title, detail, children }: EditorPanelProps) {
  return (
    <article className="border-line bg-panel rounded-xl border p-4">
      <h2 className="text-sm font-extrabold">{title}</h2>
      <p className="text-muted mt-1 text-[11px] leading-5">{detail}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}
