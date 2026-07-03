"use client";

import { CheckCircle, XCircle } from "lucide-react";

type GuidelinesProps = {
  guidelines?: {
    do: string[];
    dont: string[];
  };
  templateName: string;
};

export default function TemplateGuidelines({ guidelines }: GuidelinesProps) {
  if (!guidelines) return null;

  return (
    <article className="animate-fade-in grid gap-8 md:grid-cols-2">
      <div className="border-ink-2/10 dark:bg-panel rounded-3xl border bg-white p-6 md:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <CheckCircle className="shrink-0 text-emerald-500" size={20} />
          <h3 className="text-ink-2 text-xl font-bold tracking-tight uppercase">
            Design Best Practices / Do&apos;s
          </h3>
        </div>

        <ul className="space-y-4">
          {guidelines.do.map((item, idx) => (
            <li key={idx} className="text-ink-2/72 flex gap-3 text-sm leading-relaxed">
              <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-500">
                {idx + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-ink-2/10 dark:bg-panel rounded-3xl border bg-white p-6 md:p-8">
        <div className="mb-6 flex items-center gap-2.5">
          <XCircle className="shrink-0 text-red-500" size={20} />
          <h3 className="text-ink-2 text-xl font-bold tracking-tight uppercase">
            Anti-Patterns to Avoid / Don&apos;ts
          </h3>
        </div>

        <ul className="space-y-4">
          {guidelines.dont.map((item, idx) => (
            <li key={idx} className="text-ink-2/72 flex gap-3 text-sm leading-relaxed">
              <span className="flex size-5.5 shrink-0 items-center justify-center rounded-full bg-red-500/10 font-mono text-xs font-bold text-red-500">
                {idx + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
