import { LayoutTemplate } from "lucide-react";

import type { TemplateSummary } from "@/templates/catalog/templates";

import { templatesShell } from "../constants";
import type { TemplateDetails } from "../data/template-details";

export function TemplateDetailHero({
  template,
  details,
}: {
  template: TemplateSummary;
  details: TemplateDetails;
}) {
  return (
    <header className={`${templatesShell} grid gap-10 pt-20 pb-14 lg:grid-cols-[1fr_26rem] lg:items-end`}>
      <div>
        <p className="bg-accent inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black text-white">
          <LayoutTemplate size={13} /> Live portfolio template
        </p>
        <h1 className="mt-7 max-w-6xl text-[clamp(3.8rem,8vw,7.5rem)] leading-[0.88] font-black tracking-[-0.08em] wrap-normal">
          {template.name} is built for {template.audience.toLowerCase()}.
        </h1>
      </div>
      <div className="border-t-2 border-[#11110f] pt-6">
        <p className="text-sm leading-7 text-[#11110f]/62">{details.positioning}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {template.strengths.map((strength) => (
            <span
              className="rounded-full border border-[#11110f]/15 bg-white px-3 py-1.5 text-xs font-bold"
              key={strength}
            >
              {strength}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
